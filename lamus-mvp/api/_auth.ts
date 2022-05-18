import { VercelRequest, VercelResponse } from "@vercel/node";
import { importJWK, jwtVerify, SignJWT } from "jose";
import { API_URI } from "./_env";
import { getSigKeys, KEY_ALGORITHM } from "./_keys";
import { sendStatus } from "./_utils";

export async function loginDeviceId(deviceId: string) {
  const privateKey = await importJWK(getSigKeys().private, KEY_ALGORITHM);
  const jwt = await new SignJWT({ "urn:lamus.jsbg.pl:deviceId": deviceId })
    .setProtectedHeader({ alg: KEY_ALGORITHM })
    .setIssuedAt()
    .setAudience("urn:lamus.jsbg.pl:lamus-mvp")
    .setIssuer(API_URI)
    .setExpirationTime("2h")
    .sign(privateKey);

  const cookieMaxAge = 2 * 3600;
  const cookie = `token=${jwt}; Max-Age=${cookieMaxAge}; Secure; HttpOnly; SameSite=Strict`;

  return { jwt, cookie };
}

export function loginUri(): string {
  return API_URI + "/login";
}

interface AuthorizationResponse {
  error?: string;
  deviceId?: string;
}

export async function authorize(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthorizationResponse> {
  const token = req.cookies["token"];
  if (!token) {
    const error = { error: "No token present" };
    sendStatus(res, 401, error, [["location", loginUri()]]);
    return error;
  }

  const publicKey = await importJWK(getSigKeys().public, KEY_ALGORITHM);
  let deviceId = "";
  try {
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: API_URI,
      audience: "urn:lamus.jsbg.pl:lamus-mvp",
    });
    deviceId = payload.deviceId as string;
    if (!deviceId) {
      const error = { error: "DeviceId is empty" };
      sendStatus(res, 401, error, [["location", loginUri()]]);
      return error;
    }
    return { deviceId };
  } catch (e) {
    const error = { error: "Could not authorize token" };
    sendStatus(res, 401, error, [["location", loginUri()]]);
    return error;
  }
}
