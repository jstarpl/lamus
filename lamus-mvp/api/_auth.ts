import { VercelRequest, VercelResponse } from "@vercel/node";
import { importJWK, jwtVerify, SignJWT } from "jose";
import { API_URI } from "./_env";
import { getSigKeys, KEY_ALGORITHM } from "./_keys";
import { sendStatus } from "./_utils";

export const TOKEN_COOKIE_NAME = "token";

const ISSUER = API_URI;
const CLIENT_AUDIENCE = "urn:lamus.jsbg.pl:lamus-mvp";
const NAMESPACE = "https://lamus.jsbg.pl";
export enum Scope {
  DropboxConnect = "dropbox.connect",
  DropboxAccessToken = "dropbox.access_token",
}

export async function loginDeviceId(deviceId: string, scopes?: string[]) {
  const privateKey = await importJWK(getSigKeys().private, KEY_ALGORITHM);
  const jwt = await new SignJWT({
    scopes:
      scopes.filter((scope) => Object.values(Scope).includes(scope as Scope)) ??
      [],
  })
    .setProtectedHeader({ alg: KEY_ALGORITHM })
    .setIssuedAt()
    .setAudience(CLIENT_AUDIENCE)
    .setIssuer(ISSUER)
    .setSubject(deviceId)
    .setExpirationTime("2h")
    .sign(privateKey);

  return { jwt };
}

export function loginUri(): string {
  return API_URI + "/login";
}

type AuthorizationResponse =
  | {
      error?: void;
      deviceId: string;
      token: string;
    }
  | {
      error: string;
      deviceId?: void;
      token?: void;
    };

function authFailed(res: VercelResponse, error: AuthorizationResponse) {
  sendStatus(res, 401, error, [["www-authenticate", 'Bearer realm="service"']]);
}

export async function authorize(
  req: VercelRequest,
  res: VercelResponse,
  scope?: Scope,
  customToken?: string
): Promise<AuthorizationResponse> {
  const authHeader = req.headers["authorization"];
  if (!authHeader && !customToken) {
    const error = { error: "Unauthorized." };
    authFailed(res, error);
    return error;
  }
  let token = "";
  if (customToken) {
    token = customToken;
  } else {
    const [scheme, authToken] = authHeader.split(/\s+/, 2);
    if (scheme.toLowerCase() !== "bearer") {
      const error = { error: "Invalid authorization scheme." };
      authFailed(res, error);
      return error;
    }
    token = authToken;
  }

  if (!token) {
    const error = { error: "Invalid authorization parameters." };
    authFailed(res, error);
    return;
  }

  const publicKey = await importJWK(getSigKeys().public, KEY_ALGORITHM);
  let deviceId = "";
  try {
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: API_URI,
      audience: CLIENT_AUDIENCE,
    });
    deviceId = payload.sub as string;
    if (!deviceId) {
      const error = { error: "DeviceId is empty" };
      authFailed(res, error);
      return error;
    }
    if (scope) {
      if (!payload.scopes) {
        const error = { error: "Scope is undefined" };
        authFailed(res, error);
        return error;
      }

      const grantedScopes = payload.scopes as string[];
      if (grantedScopes.includes(scope)) {
        return { deviceId, token };
      }
      const error = { error: "Forbiden" };
      sendStatus(res, 403, error);
      return error;
    }
    return { deviceId, token };
  } catch (e) {
    const error = { error: "Could not authorize token" };
    authFailed(res, error);
    return error;
  }
}
