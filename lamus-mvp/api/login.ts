import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSupabaseClient } from "./_supabase";
import { acceptMethod, sendStatus } from "./_utils";
import { getSigKeys, KEY_ALGORITHM } from "./_keys";
import { EncryptJWT, importJWK, SignJWT } from "jose";
import { loginDeviceId } from "./_auth";

export default async function login(req: VercelRequest, res: VercelResponse) {
  acceptMethod(req, res, "GET", "POST");

  let deviceId = req.query["deviceId"];
  if (Array.isArray(deviceId)) deviceId = deviceId[0];

  const supabase = createSupabaseClient();
  const { data: deviceSettings, error } = await supabase
    .from("device_settings")
    .select("device_id,cloud_mode,webdav_url,webdav_user,webdav_password")
    .eq("device_id", deviceId);
  if (error) {
    sendStatus(res, 500);
    console.error(error);
    return;
  }

  const { cookie } = await loginDeviceId(deviceId);

  if (deviceSettings.length === 1) {
    let { error } = await supabase
      .from("device_settings")
      .update({ last_seen: new Date().toISOString() })
      .eq("device_id", deviceId);
    sendStatus(res, 200, deviceSettings[0], [["set-cookie", cookie]]);
    if (error) {
      console.error(
        `Could not update last seen value. Key: "${deviceId}"`,
        error
      );
    }
    return;
  } else if (deviceSettings.length === 0) {
    let { error } = await supabase
      .from("device_settings")
      .insert({ device_id: deviceId, last_seen: new Date().toISOString() });
    if (error) {
      sendStatus(res, 500);
      console.error(`Could not insert new device. Key: "${deviceId}"`, error);
      return;
    }
    sendStatus(
      res,
      200,
      {
        deviceId,
      },
      [["set-cookie", cookie]]
    );
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
