import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils";
import { DropboxAuth } from "dropbox";
import { DROPBOX_CONFIG, REDIRECT_URI } from "./_dropbox";
import { createSupabaseClient } from "../_supabase";
import { authorize, Scope } from "../_auth";

export default async function auth(req: VercelRequest, res: VercelResponse) {
  if (handleCrossOrigin(req, res, "GET")) return;
  if (!acceptMethod(req, res, "GET")) return;

  let { code } = req.query;
  if (Array.isArray(code)) code = code[0];

  let deviceId;
  {
    const { error, deviceId: localDeviceId } = await authorize(
      req,
      res,
      Scope.DropboxConnect
    );
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
    if (error) {
      console.error(error);
      sendStatus(res, 500, { error: "Could not update dropbox_refresh_token" });
      return;
    }
    sendStatus(res, 200, { message: "Dropbox succesfully connected" });
  }
}
