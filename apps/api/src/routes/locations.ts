/**
 * Location routes — starmap locations (planets, moons, stations, etc.).
 *
 *   GET /locations       → paged + filtered list
 *   GET /locations/:id   → single location by UUID reference
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { wrap } from "../lib/envelope";
import { NotFoundError } from "../lib/errors";
import { getLocationById, listLocations } from "../services/locations-service";

const listQuerySchema = z.object({
  type: z
    .enum(["Planet", "Moon", "Station", "Outpost", "LandingZone", "Star", "Default"])
    .optional(),
  parent: z.string().min(1).max(128).optional(),
  root: z.string().optional(),
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

export const locationsRoute = new Hono()
  .get("/locations", zValidator("query", listQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const rootOnly = q.root === "1";
    const { locations, total } = await listLocations({
      limit: q.limit,
      offset: q.offset,
      ...(q.type !== undefined ? { type: q.type } : {}),
      ...(rootOnly ? { rootOnly: true } : {}),
      ...(!rootOnly && q.parent !== undefined ? { parent: q.parent } : {}),
    });
    return c.json(
      wrap(locations, {
        source: "sc.db",
        count: locations.length,
        total,
      }),
    );
  })
  .get("/locations/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const location = await getLocationById(id);
    if (!location) {
      throw new NotFoundError(`location '${id}' not found`);
    }
    return c.json(wrap(location, { source: "sc.db" }));
  });
