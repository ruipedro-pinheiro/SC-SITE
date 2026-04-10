/**
 * Item routes — weapons, shields, coolers, power plants, quantum drives, etc.
 *
 *   GET /items       → paged + filtered list
 *   GET /items/:id   → single item by UUID
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { wrap } from "../lib/envelope";
import { NotFoundError } from "../lib/errors";
import { getItemById, listItems } from "../services/items-service";

const listQuerySchema = z.object({
  type: z.string().min(1).max(64).optional(),
  size: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : undefined))
    .pipe(z.number().int().min(0).max(10).optional()),
  manufacturer: z.string().min(1).max(64).optional(),
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
  id: z.string().min(1).max(128),
});

export const itemsRoute = new Hono()
  .get("/items", zValidator("query", listQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const { items, total } = await listItems({
      limit: q.limit,
      offset: q.offset,
      ...(q.type !== undefined ? { category: q.type } : {}),
      ...(q.size !== undefined ? { size: q.size } : {}),
      ...(q.manufacturer !== undefined ? { manufacturer: q.manufacturer } : {}),
    });
    return c.json(
      wrap(items, {
        source: "sc.db",
        count: items.length,
        total,
      }),
    );
  })
  .get("/items/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const item = await getItemById(id);
    if (!item) {
      throw new NotFoundError(`item '${id}' not found`);
    }
    return c.json(wrap(item, { source: "sc.db" }));
  });
