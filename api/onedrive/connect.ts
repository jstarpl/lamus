import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils";
import { generateVerifierAndChallange, getAuthUrl } from "./_onedrive";
import { authorize, Scope, TOKEN_COOKIE_NAME } from "../_auth";

export default async function connect(req: VercelRequest, res: VercelResponse) {
  if (handleCrossOrigin(req, res, "POST")) return;
  if (!acceptMethod(req, res, "POST")) return;

  const { error, token } = await authorize(req, res, Scope.OneDriveConnect);
  if (error || !token) {
    return;
  }

  const redirectUrl = req.body?.redirect_url ?? "";

  // TODO: Generate a nonce, store in nonces table and pass as state
  const { challenge, verifier } = generateVerifierAndChallange();
  const authUrl = getAuthUrl(challenge);
  // TODO: Encrypt code verifier
  sendStatus(res, 303, { url: authUrl.toString() }, [
    [
      "set-cookie",
      `${TOKEN_COOKIE_NAME}=${token}.${verifier}.${Buffer.from(
        redirectUrl,
        "utf-8"
      ).toString("base64")}; Max-Age=900; Secure; HttpOnly; SameSite=Lax`,
    ],
  ]);
}
