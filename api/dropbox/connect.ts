import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils";
import { DropboxAuth } from "dropbox";
import { DROPBOX_CONFIG, REDIRECT_URI, SCOPES } from "./_dropbox";
import { authorize, Scope, TOKEN_COOKIE_NAME } from "../_auth";

export default async function connect(req: VercelRequest, res: VercelResponse) {
  if (handleCrossOrigin(req, res, "POST")) return;
  if (!acceptMethod(req, res, "POST")) return;

  const { error, token } = await authorize(req, res, Scope.DropboxConnect);
  if (error || !token) {
    return;
  }

  const redirectUrl = req.body?.redirect_url ?? "";

  // TODO: Generate a nonce, store in nonces table and pass as state (2nd paramterer)
  const dbxAuth = new DropboxAuth(DROPBOX_CONFIG);
  const authUrl = await dbxAuth.getAuthenticationUrl(
    REDIRECT_URI,
    undefined,
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
      `${TOKEN_COOKIE_NAME}=${token}.${codeVerifier}.${Buffer.from(
        redirectUrl,
        "utf-8"
      ).toString("base64")}; Max-Age=900; Secure; HttpOnly; SameSite=Lax`,
    ],
  ]);
}
