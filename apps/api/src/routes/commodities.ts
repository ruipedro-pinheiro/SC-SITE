/**
 * Commodity routes — trade goods and per-terminal prices.
 *
 *   GET /commodities            → paged list of commodities
 *   GET /commodities/:id/prices → all terminal prices for a commodity
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { wrap } from "../lib/envelope";
import { NotFoundError } from "../lib/errors";
import {
  getCommodityById,
  getCommodityPrices,
  listCommodities,
} from "../services/commodities-service";

const listQuerySchema = z.object({
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

export const commoditiesRoute = new Hono()
  .get("/commodities", zValidator("query", listQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const { commodities, total } = await listCommodities({
      limit: q.limit,
      offset: q.offset,
    });
    return c.json(
      wrap(commodities, {
        source: "sc.db",
        count: commodities.length,
        total,
      }),
    );
  })
  .get("/commodities/:id/prices", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const commodity = await getCommodityById(id);
    if (!commodity) {
      throw new NotFoundError(`commodity '${id}' not found`);
    }
    const prices = await getCommodityPrices(id);
    return c.json(
      wrap(prices, {
        source: "sc.db",
        count: prices.length,
      }),
    );
  });
