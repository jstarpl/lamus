import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils";
import { DropboxAuth } from "dropbox";
import {
  DROPBOX_CONFIG,
  DROPBOX_VERIFIER_COOKIE,
  REDIRECT_URI,
} from "./_dropbox";
import { createSupabaseClient } from "../_supabase";
import { authorize, Scope, TOKEN_COOKIE_NAME } from "../_auth";
import { ALLOWED_ORIGINS } from "../_security";

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

  let deviceId;
  {
    const { error, deviceId: localDeviceId } = await authorize(
      req,
      res,
      Scope.DropboxConnect,
      token
    );
    deviceId = localDeviceId;
    if (error) return;
  }

  {
    const supabase = createSupabaseClient();

    if (!codeVerifier) {
      sendStatus(res, 400, { error: "Could not authorize Dropbox response." });
      return;
    }

    const dbxAuth = new DropboxAuth(DROPBOX_CONFIG);
    dbxAuth.setCodeVerifier(codeVerifier);
    const tokenResult = await dbxAuth.getAccessTokenFromCode(
      REDIRECT_URI,
      code
    );

    const { error } = await supabase
      .from("device_settings")
      .update({
        dropbox_refresh_token: (tokenResult.result as any).refresh_token,
      })
      .eq("device_id", deviceId);
    if (error) {
      console.error(error);
      sendStatus(res, 500, {
        error: "Could not update dropbox_refresh_token.",
      });
      return;
    }
    if (redirectUrl) {
      sendStatus(res, 302, { message: "Dropbox succesfully connected." }, [
        ["location", redirectUrl],
      ]);
    } else {
      sendStatus(res, 200, { message: "Dropbox succesfully connected." });
    }
  }
}
