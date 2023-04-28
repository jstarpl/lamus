import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, sendStatus } from "../_utils.js";
import { DropboxAuth } from "dropbox";
import { DROPBOX_CONFIG } from "./_dropbox.js";
import { createSupabaseClient } from "../_supabase.js";
import { authorize, Scope } from "../_auth.js";

export default async function accessKey(
  req: VercelRequest,
  res: VercelResponse
) {
  if (!acceptMethod(req, res, "GET")) return;

  let deviceId;
  {
    const { error, deviceId: localDeviceId } = await authorize(
      req,
      res,
      Scope.DropboxAccessToken
    );
    deviceId = localDeviceId;
    if (error) return;
  }

  const dbxAuth = new DropboxAuth(DROPBOX_CONFIG);

  const supabase = createSupabaseClient();
  // @ts-ignore
  const { data: deviceSettingsAll, error } = await supabase
    .from("device_settings")
    .select("dropbox_refresh_token")
    .eq("device_id", deviceId);
  if (!deviceSettingsAll || deviceSettingsAll.length === 0) {
    console.error(error);
    sendStatus(res, 500, { error: "Internal Server Error" });
    return;
  }

  if (error) {
    console.error(error);
    sendStatus(res, 500, { error: "Internal Server Error" });
    return;
  }

  const deviceSettings = deviceSettingsAll[0] as unknown as {
    dropbox_refresh_token: string;
  };
  const { dropbox_refresh_token: refreshToken } = deviceSettings;

  dbxAuth.setRefreshToken(refreshToken);
  await (dbxAuth.checkAndRefreshAccessToken() as any as Promise<void>);
  const accessToken = dbxAuth.getAccessToken();
  const accessTokenExpiresAt = dbxAuth.getAccessTokenExpiresAt();
  sendStatus(res, 200, {
    access_token: accessToken,
    expires_at: accessTokenExpiresAt,
  });
}
