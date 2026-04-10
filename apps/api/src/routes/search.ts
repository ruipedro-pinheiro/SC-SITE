/**
 * Cross-entity search route.
 *
 *   GET /search?q=  → mixed results from vehicles, items, shops, commodities, locations
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { wrap } from "../lib/envelope";
import { BadRequestError } from "../lib/errors";
import { searchAll } from "../services/search-service";

const searchQuerySchema = z.object({
  q: z.string().min(1).max(128),
  limit: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : 25))
    .pipe(z.number().int().positive().max(100)),
});

export const searchRoute = new Hono().get(
  "/search",
  zValidator("query", searchQuerySchema),
  async (c) => {
    const { q, limit } = c.req.valid("query");
    if (!q.trim()) {
      throw new BadRequestError("search query must not be blank");
    }
    const results = await searchAll(q.trim(), limit);
    return c.json(
      wrap(results, {
        source: "sc.db",
        count: results.length,
      }),
    );
  },
);
