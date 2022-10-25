import { VercelRequest, VercelResponse } from "@vercel/node";
import { sendStatus } from "./_utils";

export default async function login(_: VercelRequest, res: VercelResponse) {
  sendStatus(res, 404);
  return;
}
