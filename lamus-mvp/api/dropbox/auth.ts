import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, sendStatus } from "./../_utils";
import { DropboxAuth } from "dropbox";
import { DROPBOX_CONFIG, REDIRECT_URI } from "./_dropbox";
import { createSupabaseClient } from "../_supabase";
import { authorize } from "../_auth";

export default async function auth(req: VercelRequest, res: VercelResponse) {
  acceptMethod(req, res, "GET");

  let { code } = req.query;
  if (Array.isArray(code)) code = code[0];

  let deviceId;
  {
    const { error, deviceId: localDeviceId } = await authorize(req, res);
    deviceId = localDeviceId;
    if (error) return;
  }

  {
    const supabase = createSupabaseClient();

    const dbxAuth = new DropboxAuth(DROPBOX_CONFIG);
    const tokenResult = await dbxAuth.getAccessTokenFromCode(
      REDIRECT_URI,
      code
    );

    const { error } = await supabase
      .from("device_settings")
      .update({
        dropbox_refresh_token: (tokenResult.result as any).refresh_token,
      })
      .eq("device_id", deviceId);
    sendStatus(res, 200, { message: "Dropbox succesfully connected" });
  }
}
