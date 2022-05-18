import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export function sendStatus(
  res: VercelResponse,
  status: number,
  message?: object,
  headers?: [string, string][]
): void {
  res.status(status).setHeader("content-type", "application/json");

  if (headers) {
    headers.forEach(([header, value]) => {
      res.setHeader(header, value);
    });
  }

  res.end(message ? JSON.stringify(message) : undefined);
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
