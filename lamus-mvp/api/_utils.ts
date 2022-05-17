import type { VercelRequest, VercelResponse } from "@vercel/node";

export function sendStatus(
  res: VercelResponse,
  status: number,
  message?: object
): void {
  res
    .status(status)
    .setHeader("content-type", "application/json")
    .end(JSON.stringify(message));
}

export function acceptMethod(
  req: VercelRequest,
  res: VercelResponse,
  ...methods: string[]
): void {
  if (methods.includes(req.method)) return;
  sendStatus(res, 400, { error: `Method not accepted: "${req.method}"` });
  throw new Error(`Method not accepted: "${req.method}"`);
}
