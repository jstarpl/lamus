import type { VercelRequest, VercelResponse } from "@vercel/node";
import { acceptMethod, handleCrossOrigin, sendStatus } from "./../_utils.js";

export default async function disconnect(req: VercelRequest, res: VercelResponse) {
  if (handleCrossOrigin(req, res, "POST")) return;
  if (!acceptMethod(req, res, "POST")) return;

  sendStatus(res, 405)
}
