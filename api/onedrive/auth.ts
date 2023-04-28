import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils.js";
import { getAccessTokenFromCode } from "./_onedrive.js";
import { createSupabaseClient } from "../_supabase.js";
import { authorize, Scope, TOKEN_COOKIE_NAME } from "../_auth.js";
import { ALLOWED_ORIGINS } from "../_security.js";

export default async function auth(req: VercelRequest, res: VercelResponse) {
  if (handleCrossOrigin(req, res, "GET")) return;
  if (!acceptMethod(req, res, "GET")) return;

  let { code } = req.query;
  if (Array.isArray(code)) code = code[0];

  // TODO: Decrypt Code-Verifier
  const cookie = req.cookies[TOKEN_COOKIE_NAME];
  if (!cookie) {
    sendStatus(res, 401, { error: "Unauthorized." });
    return;
  }

  const cookieSplit = cookie.split(".");
  const token = [cookieSplit[0], cookieSplit[1], cookieSplit[2]].join(".");
  const codeVerifier = cookieSplit[3];
  const redirectUrlEncoded = cookieSplit[4];
  let redirectUrl = undefined;

  if (redirectUrlEncoded) {
    try {
      // check if the URL is directing to an allowed origin
      const url = new URL(
        Buffer.from(redirectUrlEncoded, "base64").toString("utf-8")
      );
      if (ALLOWED_ORIGINS.includes(url.origin)) {
        redirectUrl = url.toString();
      } else {
        console.error(`Illegal redirection after auth: "${url.toString()}"`);
      }
    } catch {}
  }

  let deviceId: string;
  {
    const { error, deviceId: localDeviceId } = await authorize(
      req,
      res,
      Scope.OneDriveConnect,
      token
    );
    if (error || !localDeviceId) return;
    deviceId = localDeviceId;
  }

  // TODO: verify req.query.state to contain a valid nonce, created for Scope.DropboxConnect and current deviceId

  {
    const supabase = createSupabaseClient();

    if (!codeVerifier) {
      sendStatus(res, 400, { error: "Could not authorize OneDrive response." });
      return;
    }

    const tokenRes = await getAccessTokenFromCode(code, codeVerifier);
    if (!tokenRes) {
      sendStatus(res, 500, { error: "Could not get OneDrive access token" });
      return;
    }

    // @ts-ignore
    const { error } = await supabase
      .from("device_settings")
      .update({
        cloud_mode: "onedrive",
        onedrive_refresh_token: tokenRes.refresh_token,
      })
      .eq("device_id", deviceId);
    if (error) {
      console.error(error);
      sendStatus(res, 500, {
        error: "Could not update onedrive_refresh_token.",
      });
      return;
    }
    if (redirectUrl) {
      sendStatus(res, 302, { message: "OneDrive succesfully connected." }, [
        ["location", redirectUrl],
      ]);
    } else {
      sendStatus(res, 200, { message: "OneDrive succesfully connected." });
    }
  }
}
