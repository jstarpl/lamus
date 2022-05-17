import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { acceptMethod, sendStatus } from "./_utils";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function login(req: VercelRequest, res: VercelResponse) {
  acceptMethod(req, res, "GET", "POST");

  const deviceId = req.query["deviceId"];

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let { data: deviceSettings, error } = await supabase
    .from("deviceSettings")
    .select(
      "cloud_mode,dropbox_refresh_token,webdav_url,webdav_user,webdav_password"
    )
    .eq("device_id", deviceId);
  if (error) {
    sendStatus(res, 500);
    console.error(error);
    return;
  }

  if (deviceSettings.length > 1) {
    sendStatus(res, 500);
    console.error(
      `Internal error: deviceId should be a unique key, multiple items found. Key: "${deviceId}"`
    );
    return;
  } else if (deviceSettings.length === 1) {
    let { error } = await supabase
      .from("deviceSettings")
      .update([{ last_seen: new Date().toISOString() }])
      .eq("device_id", deviceId);
    sendStatus(res, 200, deviceSettings[0]);
    if (error) {
      console.error(
        `Could not update last seen value. Key: "${deviceId}"`,
        error
      );
    }
    return;
  } else {
    let { error } = await supabase
      .from("deviceSettings")
      .insert([
        { device_id: deviceId },
        { last_seen: new Date().toISOString() },
      ]);
    if (error) {
      sendStatus(res, 500);
      console.error(`Could not insert new device. Key: "${deviceId}"`, error);
      return;
    }
    sendStatus(res, 200, {
      deviceId,
    });
    return;
  }
}
