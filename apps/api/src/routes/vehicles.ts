/**
 * Vehicle routes — the main read API the catalog frontend consumes.
 *
 *   GET /vehicles                      → paged + filtered list of Ship DTOs
 *   GET /vehicles/:slug                → single Ship DTO with joined nesteds
 *   GET /vehicles/:slug/hardpoints     → hardpoints only (thin subset)
 *   GET /manufacturers                 → all manufacturer rows
 *
 * Handlers stay thin: parse input with Zod, call a service, wrap the result.
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { wrap } from "../lib/envelope";
import { NotFoundError } from "../lib/errors";
import {
  getHardpointsBySlug,
  getVehicleBySlug,
  listManufacturers,
  listVehicles,
} from "../services/vehicles-service";

// -- Query schema -----------------------------------------------------------

const listQuerySchema = z.object({
  company: z.string().min(1).max(32).optional(),
  size: z.enum(["Snub", "Small", "Medium", "Large", "Capital"]).optional(),
  is_exploration: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  is_concept: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  buyable: z
    .enum(["true"])
    .optional()
    .transform((v) => v === "true"),
  sort: z.enum(["name", "price-asc", "price-desc"]).optional(),
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

const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
});

// -- Router -----------------------------------------------------------------

export const vehiclesRoute = new Hono()
  .get("/vehicles", zValidator("query", listQuerySchema), async (c) => {
    const q = c.req.valid("query");
    const filters = {
      limit: q.limit,
      offset: q.offset,
      ...(q.company !== undefined ? { company: q.company } : {}),
      ...(q.size !== undefined ? { size: q.size } : {}),
      ...(q.is_exploration !== undefined ? { isExploration: q.is_exploration } : {}),
      ...(q.is_concept !== undefined ? { isConcept: q.is_concept } : {}),
      ...(q.buyable ? { buyable: true as const } : {}),
      ...(q.sort !== undefined ? { sort: q.sort } : {}),
    };
    const { ships, total, latestUpdatedAt } = await listVehicles(filters);
    return c.json(
      wrap(ships, {
        source: "sc.db",
        count: ships.length,
        total,
        ...(latestUpdatedAt ? { updatedAt: latestUpdatedAt } : {}),
      }),
    );
  })
  .get("/vehicles/:slug", zValidator("param", slugParamSchema), async (c) => {
    const { slug } = c.req.valid("param");
    const ship = await getVehicleBySlug(slug);
    if (!ship) {
      throw new NotFoundError(`vehicle '${slug}' not found`);
    }
    return c.json(wrap(ship, { source: "sc.db" }));
  })
  .get("/vehicles/:slug/hardpoints", zValidator("param", slugParamSchema), async (c) => {
    const { slug } = c.req.valid("param");
    const result = await getHardpointsBySlug(slug);
    if (!result.found) {
      throw new NotFoundError(`vehicle '${slug}' not found`);
    }
    return c.json(
      wrap(result.hardpoints, {
        source: "sc.db",
        count: result.hardpoints.length,
      }),
    );
  })
  .get("/manufacturers", async (c) => {
    const rows = await listManufacturers();
    return c.json(
      wrap(rows, {
        source: "sc.db",
        count: rows.length,
      }),
    );
  });
