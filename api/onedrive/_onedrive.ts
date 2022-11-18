import crypto from "crypto";
import fetch from "node-fetch";
import { ALLOWED_ORIGINS } from "../_security";

export const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID as string;
const apiUri = process.env.API_URI as string;

const AZURE_TOKEN_URI =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const AZURE_AUTH_URI =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";

export const SCOPES = [
  "offline_access",
  "User.Read",
  "Files.ReadWrite.AppFolder",
];

export const REDIRECT_URI = `${apiUri}/onedrive/auth`;

function base64URLEncode(str: string | Buffer) {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateVerifierAndChallange() {
  const verifier = base64URLEncode(crypto.randomBytes(32));

  if (!verifier) throw new Error("Could not generate verifier");
  const challenge = base64URLEncode(sha256(verifier));

  return {
    verifier,
    challenge,
  };
}

function sha256(buffer: string | Buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

export function getAuthUrl(challenge: string) {
  const url = new URL(AZURE_AUTH_URI);
  url.searchParams.append("client_id", AZURE_CLIENT_ID);
  url.searchParams.append("redirect_uri", REDIRECT_URI);
  url.searchParams.append("scope", SCOPES.join(" "));
  url.searchParams.append("response_type", "code");
  // url.searchParams.append('state', null)
  url.searchParams.append("code_challenge", challenge);
  url.searchParams.append("code_challenge_method", "S256");
  return url.toString();
}

export async function getAccessTokenFromCode(code: string, verifier: string) {
  const body = new URLSearchParams();
  body.append("tenant", "common");
  body.append("client_id", AZURE_CLIENT_ID);
  body.append("redirect_uri", REDIRECT_URI);
  body.append("grant_type", "authorization_code");
  body.append("code", code);
  body.append("code_verifier", verifier);
  const res = await fetch(AZURE_TOKEN_URI, {
    method: "post",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: ALLOWED_ORIGINS[0],
    },
    body,
  });
  if (!res.ok) {
    console.error(JSON.stringify(await res.json()));
    return null;
  }
  return res.json();
}

export async function getAccessTokenFromRefreshToken(refreshToken: string) {
  const body = new URLSearchParams();
  body.append("tenant", "common");
  body.append("client_id", AZURE_CLIENT_ID);
  body.append("grant_type", "refresh_token");
  body.append("refresh_token", refreshToken);
  const res = await fetch(AZURE_TOKEN_URI, {
    method: "post",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: ALLOWED_ORIGINS[0],
    },
    body,
  });
  if (!res.ok) {
    console.error(JSON.stringify(await res.json()));
    return null;
  }
  return res.json();
}
