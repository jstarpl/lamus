import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSupabaseClient } from "./_supabase.js";
import {
  acceptContentType,
  acceptMethod,
  deArray,
  handleCrossOrigin,
  sendStatus,
} from "./_utils.js";
import { loginDeviceId } from "./_auth.js";

export default async function login(req: VercelRequest, res: VercelResponse) {
  if (handleCrossOrigin(req, res, "GET", "POST")) return;
  if (!acceptMethod(req, res, "GET", "POST")) return;
  if (!acceptContentType(req, res, null, "application/json")) return;

  res.setHeader("Cache-Control", "no-cache");

  const deviceId: string | null =
    deArray(req.query.device_id) ?? req.body?.device_id ?? null;
  const scopes: string[] | null =
    deArray(req.query.scopes)?.split(/[\s,]/).filter(Boolean) ??
    req.body?.scopes ??
    [];

  if (!deviceId || !scopes) {
    sendStatus(res, 401);
    return;
  }

  const noCreate = deArray(req.query.no_create) ?? req.body?.no_create ?? false;

  const supabase = createSupabaseClient();
  // @ts-ignore
  const { data: deviceSettings, error } = await supabase
    .from("device_settings")
    .select(
      "device_id,cloud_mode,nextcloud_url,nextcloud_user,nextcloud_password"
    )
    .eq("device_id", deviceId);
  if (error || !deviceSettings) {
    sendStatus(res, 500);
    console.error(error);
    return;
  }

  const { jwt } = await loginDeviceId(deviceId, scopes);

  if (deviceSettings.length === 1) {
    // @ts-ignore
    let { error } = await supabase
      .from("device_settings")
      .update({ last_seen: new Date().toISOString() })
      .eq("device_id", deviceId);
    sendStatus(res, 200, { ...deviceSettings[0], token: jwt });
    if (error) {
      console.error(
        `Could not update last seen value. Key: "${deviceId}"`,
        error
      );
    }
    return;
  } else if (deviceSettings.length === 0) {
    if (noCreate) {
      sendStatus(res, 404);
      return;
    }
    // @ts-ignore
    let { error } = await supabase
      .from("device_settings")
      .insert({ device_id: deviceId, last_seen: new Date().toISOString() });
    if (error) {
      sendStatus(res, 500);
      console.error(`Could not insert new device. Key: "${deviceId}"`, error);
      return;
    }
    sendStatus(res, 200, {
      deviceId,
      token: jwt,
    });
    return;
  } else {
    // this scenario is very unlikely
    sendStatus(res, 500);
    console.error(
      `Internal error: deviceId should be a unique key, multiple items found. Key: "${deviceId}"`
    );
    return;
  }
}
