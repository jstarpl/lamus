import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, sendStatus } from "./../_utils";
import { DropboxAuth } from "dropbox";
import { DROPBOX_CONFIG, REDIRECT_URI, SCOPES } from "./_dropbox";
import { authorize } from "../_auth";

export default async function connect(req: VercelRequest, res: VercelResponse) {
  acceptMethod(req, res, "GET");

  {
    const { error } = await authorize(req, res);
    if (error) return;
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
