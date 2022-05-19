import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ALLOWED_HEADERS, ALLOWED_ORIGINS } from "./_security";

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

export function deArray(val: string | string[] | undefined): string | null {
  if (!val) {
    return null;
  }
  if (Array.isArray(val)) {
    return val[val.length - 1];
  }
  return val;
}

export function acceptContentType(
  req: VercelRequest,
  res: VercelResponse,
  ...contentTypes: (undefined | string | RegExp)[]
): void {
  const contentType = req.headers["content-type"];
  if (contentType === undefined) {
    if (contentTypes.indexOf(contentType) < 0) {
      sendStatus(res, 400, {
        error: `Content-Type not accepted: "${contentType}"`,
      });
      throw new Error(`Content-Type not accepted: "${contentType}"`);
    }
  }
  for (const match of contentTypes) {
    if (typeof match === "string" && match === contentType) {
      return;
    } else if (typeof match === "object" && match.test(contentType)) {
      return;
    }
  }
  sendStatus(res, 400, {
    error: `Content-Type not accepted: "${contentType}"`,
  });
  throw new Error(`Content-Type not accepted: "${contentType}"`);
}

export function handleCrossOrigin(
  req: VercelRequest,
  res: VercelResponse,
  ...methods: string[]
): boolean {
  res.setHeader(
    "access-control-allow-methods",
    ["OPTIONS", ...methods].join(", ")
  );
  res.setHeader("access-control-allow-origin", ALLOWED_ORIGINS.join(", "));
  res.setHeader("access-control-allow-headers", ALLOWED_HEADERS.join(", "));
  if (req.method !== "OPTIONS") return false;
  res.status(200);
  res.end();
  return true;
}
