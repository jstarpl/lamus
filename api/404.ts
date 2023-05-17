import { VercelRequest, VercelResponse } from "@vercel/node";
import { sendStatus } from "./_utils.js";

export default async function notFound(_: VercelRequest, res: VercelResponse) {
  sendStatus(res, 404);
  return;
}
