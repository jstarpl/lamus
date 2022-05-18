import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod } from "./../_utils";
import { DropboxAuth } from "dropbox";
import { DROPBOX_CONFIG } from "./_dropbox";
import { createSupabaseClient } from "../_supabase";
import { authorize } from "../_auth";

export default async function accessKey(
  req: VercelRequest,
  res: VercelResponse
) {
  acceptMethod(req, res, "GET");

  let deviceId;
  {
    const { error, deviceId: localDeviceId } = await authorize(req, res);
    deviceId = localDeviceId;
    if (error) return;
  }

  const dbxAuth = new DropboxAuth(DROPBOX_CONFIG);

  const supabase = createSupabaseClient();
  const { data: deviceSettings, error } = await supabase
    .from("device_settings")
    .select("dropbox_refresh_token")
    .eq("device_id", deviceId);
  if (error) {
    // TODO: ERROR
  }

  const { dropbox_refresh_token: refreshToken } = deviceSettings[0];

  dbxAuth.setRefreshToken(refreshToken);
  await (dbxAuth.checkAndRefreshAccessToken() as any as Promise<void>);
}
