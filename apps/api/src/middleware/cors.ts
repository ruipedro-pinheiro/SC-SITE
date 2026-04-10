/**
 * CORS allow-list.
 *
 * - localhost:3000 — Next dev on the Pi.
 * - 100.105.42.81:3000 — same Next dev reached over Tailscale from Fedora.
 * - *.trycloudflare.com — future Cloudflare tunnel previews.
 *
 * Anything else is denied (no wildcard `*`).
 */

import { cors } from "hono/cors";

const STATIC_ORIGINS: ReadonlyArray<string> = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://100.105.42.81:3000",
];

const TRYCLOUDFLARE_SUFFIX = ".trycloudflare.com";

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return null;
    if (STATIC_ORIGINS.includes(origin)) return origin;
    try {
      const host = new URL(origin).hostname;
      if (host.endsWith(TRYCLOUDFLARE_SUFFIX)) return origin;
    } catch {
      return null;
    }
    return null;
  },
  allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  exposeHeaders: ["x-request-id"],
  maxAge: 600,
  credentials: false,
});
