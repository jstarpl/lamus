import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, sendStatus } from "../_utils.js";
import { createSupabaseClient } from "../_supabase.js";
import { authorize, Scope } from "../_auth.js";
import { getAccessTokenFromRefreshToken } from "./_onedrive.js";

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
      Scope.OneDriveAccessToken
    );
    deviceId = localDeviceId;
    if (error) return;
  }

  const supabase = createSupabaseClient();
  // @ts-ignore
  const { data: deviceSettingsAll, error } = await supabase
    .from("device_settings")
    .select("onedrive_refresh_token")
    .eq("device_id", deviceId);
  if (error || !deviceSettingsAll) {
    console.error(error);
    sendStatus(res, 500, { error: "Internal Server Error" });
    return;
  }

  const deviceSettings = deviceSettingsAll[0] as unknown as {
    onedrive_refresh_token: string;
  };
  const { onedrive_refresh_token: refreshToken } = deviceSettings;

  const tokenRes = await getAccessTokenFromRefreshToken(refreshToken);
  if (!tokenRes) {
    sendStatus(res, 500, {
      error: "Could not get new access token",
    });
    return;
  }

  await supabase
    .from("device_settings")
    .update({ onedrive_refresh_token: tokenRes.refresh_token })
    .eq("device_id", deviceId);

  sendStatus(res, 200, {
    access_token: tokenRes.access_token,
    expires_at: new Date(Date.now() + tokenRes.expires_in * 1000),
  });
}
