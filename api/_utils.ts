import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ALLOWED_HEADERS, ALLOWED_ORIGINS } from "./_security";

export function sendStatus(
  res: VercelResponse,
  status: number,
  message?: object | string,
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
): boolean {
  if (req.method && methods.includes(req.method)) return true;
  sendStatus(res, 400, { error: `Method not accepted: "${req.method}"` });
  return false;
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
  ...contentTypes: (string | RegExp | null)[]
): boolean {
  const contentType = req.headers["content-type"];
  if (contentType === undefined) {
    if (contentTypes.indexOf(null) < 0) {
      sendStatus(res, 400, {
        error: `Content-Type not accepted: "${contentType}"`,
      });
      return false;
    }
    return true;
  }
  for (const match of contentTypes) {
    if (typeof match === "string" && match === contentType) {
      return true;
    } else if (
      match !== null &&
      typeof match === "object" &&
      match.test(contentType)
    ) {
      return true;
    }
  }
  sendStatus(res, 400, {
    error: `Content-Type not accepted: "${contentType}"`,
  });
  return false;
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
  let responseOrigin = ALLOWED_ORIGINS[0];
  if (req.headers.origin) {
    if (ALLOWED_ORIGINS.includes(req.headers.origin)) {
      responseOrigin = req.headers.origin;
    }
  }
  res.setHeader("access-control-allow-origin", responseOrigin);
  res.setHeader("access-control-allow-headers", ALLOWED_HEADERS.join(", "));
  res.setHeader("access-control-allow-credentials", "true");
  if (req.method !== "OPTIONS") return false;
  res.status(200);
  res.end();
  return true;
}
