import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils";
import { DropboxAuth } from "dropbox";
import { DROPBOX_CONFIG, REDIRECT_URI, SCOPES } from "./_dropbox";
import { authorize, Scope } from "../_auth";

export default async function connect(req: VercelRequest, res: VercelResponse) {
  if (handleCrossOrigin(req, res, "GET")) return;
  if (!acceptMethod(req, res, "GET")) return;

  {
    const { error } = await authorize(req, res, Scope.DropboxConnect);
    if (error) {
      return;
    }
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
  sendStatus(res, 302, undefined, [["location", authUrl.toString()]]);
}
