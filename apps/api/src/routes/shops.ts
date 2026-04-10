/**
 * Shop routes — store locations and their inventory.
 *
 *   GET /shops       → paged list (optional name/system search via `q`)
 *   GET /shops/:id   → single shop with full inventory
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { wrap } from "../lib/envelope";
import { NotFoundError } from "../lib/errors";
import { getShopById, listShops } from "../services/shops-service";

const listQuerySchema = z.object({
  q: z.string().min(1).max(128).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : 50))
    .pipe(z.number().int().positive().max(500)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : 0))
    .pipe(z.number().int().min(0)),
});

const idParamSchema = z.object({
  id: z
    .string()
    .min(1)
    .transform((v) => Number(v))
    .pipe(z.number().int().positive()),
});

export const shopsRoute = new Hono()
  .get("/shops", zValidator("query", listQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const { shops, total } = await listShops({
      limit: q.limit,
      offset: q.offset,
      ...(q.q !== undefined ? { q: q.q } : {}),
    });
    return c.json(
      wrap(shops, {
        source: "sc.db",
        count: shops.length,
        total,
      }),
    );
  })
  .get("/shops/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const result = await getShopById(id);
    if (!result) {
      throw new NotFoundError(`shop '${id}' not found`);
    }
    return c.json(
      wrap(
        { ...result.shop, inventory: result.inventory },
        {
          source: "sc.db",
          count: result.inventory.length,
        },
      ),
    );
  });
