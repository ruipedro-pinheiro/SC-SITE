/**
 * Bun entry point. Imports the typed `app` from `app.ts` and hands its
 * `fetch` function to `Bun.serve`. Nothing else lives here on purpose:
 * `app.ts` is the unit of test + type export, this file is just the
 * process shell.
 */

import { app } from "./app";
import { env } from "./env";

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.warn(
  `[api] @sc-site/api listening on http://${server.hostname}:${server.port} (NODE_ENV=${env.NODE_ENV})`,
);
