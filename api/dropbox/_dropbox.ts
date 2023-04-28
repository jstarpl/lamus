import { DropboxAuthOptions } from "dropbox";
import fetch from "node-fetch";
const clientId = process.env.DROPBOX_CLIENT_ID as string;
const apiUri = process.env.API_URI as string;

export const DROPBOX_CONFIG: DropboxAuthOptions = {
  fetch,
  clientId,
};

export const SCOPES = [
  "account_info.read",
  "files.metadata.write",
  "files.metadata.read",
  "files.content.write",
  "files.content.read",
];

export const REDIRECT_URI = `${apiUri}/dropbox/auth`;
