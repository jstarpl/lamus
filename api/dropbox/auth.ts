import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils";
import { DropboxAuth } from "dropbox";
import { DROPBOX_CONFIG, REDIRECT_URI } from "./_dropbox";
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
        redirectUrl = url;
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
      Scope.DropboxConnect,
      token
    );
    if (error || !localDeviceId) return;
    deviceId = localDeviceId;
  }

  // TODO: verify req.query.state to contain a valid nonce, created for Scope.DropboxConnect and current deviceId

  {
    const supabase = createSupabaseClient();

    if (!codeVerifier) {
      sendStatus(res, 400, { error: "Could not authorize Dropbox response." });
      return;
    }

    try {
      const dbxAuth = new DropboxAuth(DROPBOX_CONFIG);
      dbxAuth.setCodeVerifier(codeVerifier);
      const tokenRes = await dbxAuth.getAccessTokenFromCode(REDIRECT_URI, code);

      // @ts-ignore
      const { error } = await supabase
        .from("device_settings")
        .update({
          cloud_mode: "dropbox",
          dropbox_refresh_token: (tokenRes.result as any).refresh_token,
        })
        .eq("device_id", deviceId);
      if (error) {
        console.error(error);
        redirectUrl?.searchParams.set("error", "Internal error")
        sendStatus(
          res,
          500,
          {
            error: "Could not update dropbox_refresh_token.",
          },
          redirectUrl ? [["location", redirectUrl.toString()]] : undefined
        );
        return;
      }
      redirectUrl?.searchParams.set("ok", "Success")
      sendStatus(
        res,
        302,
        { message: "Dropbox succesfully connected." },
        redirectUrl ? [["location", redirectUrl.toString()]] : undefined
      );
    } catch (e) {
      console.error(e);
      redirectUrl?.searchParams.set("error", "Internal error")
      sendStatus(
        res,
        500,
        {
          error: "Could not authorize with Dropbox.",
        },
        redirectUrl ? [["location", redirectUrl.toString()]] : undefined
      );
    }
  }
}
