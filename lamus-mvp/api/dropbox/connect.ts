import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils";
import { DropboxAuth } from "dropbox";
import {
  DROPBOX_CONFIG,
  DROPBOX_VERIFIER_COOKIE,
  REDIRECT_URI,
  SCOPES,
} from "./_dropbox";
import { authorize, Scope, TOKEN_COOKIE_NAME } from "../_auth";

export default async function connect(req: VercelRequest, res: VercelResponse) {
  if (handleCrossOrigin(req, res, "POST")) return;
  if (!acceptMethod(req, res, "POST")) return;

  const { error, token } = await authorize(req, res, Scope.DropboxConnect);
  if (error || !token) {
    return;
  }

  const dbxAuth = new DropboxAuth(DROPBOX_CONFIG);
  const authUrl = await dbxAuth.getAuthenticationUrl(
    REDIRECT_URI,
    null,
    "code",
    "offline",
    SCOPES,
    "none",
    true
  );
  // TODO: Encrypt code verifier
  const codeVerifier = dbxAuth.getCodeVerifier();
  sendStatus(res, 303, { url: authUrl.toString() }, [
    [
      "set-cookie",
      `${TOKEN_COOKIE_NAME}=${token}.${codeVerifier}; Max-Age=900; Secure; HttpOnly; SameSite=Lax`,
    ],
  ]);
}
