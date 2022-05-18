import fetch from "node-fetch";
const clientId = process.env.DROPBOX_CLIENT_ID;
const apiUri = process.env.API_URI;

export const DROPBOX_CONFIG = {
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
