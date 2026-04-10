/**
 * Generic field-level diff engine.
 *
 * Takes an existing record (or `null` if this is the first write), an
 * incoming record, and run metadata (source + timestamp + entity coords),
 * and returns a list of `change_log` row inserts plus the "final" row to
 * persist. The final row is the incoming one — the engine does not merge,
 * it just reports what moved.
 *
 * Rules:
 *  - When `existing === null` the record is new: emit a change_log row per
 *    non-null field (`oldValue === null`, `newValue === <stringified>`).
 *    This is the behaviour INGESTION.md §1.a prescribes.
 *  - When `existing !== null` walk every key of the incoming record and
 *    emit a row iff the value changed under deep equality. Deep equality
 *    is JSON-stringify based, which is fine because all our JSON columns
 *    are typed shallow objects or arrays of primitives.
 *  - Keys to ignore: timestamps / ingestion bookkeeping columns
 *    (`ingestedAt`, `updatedAt`) that always move on every run.
 *
 * This engine is 100% generic — it knows nothing about vehicles, items,
 * or commodities.
 */

import type { NewChangeLogRow } from "@sc-site/db";

/** Fields that always change on every upsert and should be suppressed. */
const DEFAULT_IGNORE_KEYS = new Set<string>(["ingestedAt", "updatedAt"]);

export interface DiffMeta {
  /** Source identifier (e.g. "uex"). Persisted into change_log.source. */
  source: string;
  /** Unix ms. */
  ts: number;
  /** Entity type — must match change_log.entity_type union. */
  entityType: NewChangeLogRow["entityType"];
  /** Stable lookup key for this entity (slug or uuid). */
  entityUuid: string;
  /** Additional keys to ignore beyond the defaults. */
  ignoreKeys?: ReadonlySet<string>;
}

export interface DiffResult<T> {
  /** Change log rows to insert, in order. */
  changes: NewChangeLogRow[];
  /** The record that should be written (same as `incoming`). */
  final: T;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep equality using JSON serialization. Safe for primitives, arrays of
 * primitives, and flat JSON objects — which is exactly what our `*_json`
 * columns store. Falls through to `===` for functions and symbols
 * (neither should ever reach this engine).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  // Canonicalise object key order so `{a:1,b:2}` equals `{b:2,a:1}`.
  if (isObject(a) && isObject(b)) {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return false;
    }
    try {
      return JSON.stringify(a, ka) === JSON.stringify(b, kb);
    } catch {
      return false;
    }
  }
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Stringify a value for `change_log.old_value` / `new_value`. `null` and
 * `undefined` collapse to `null` so the DB column stays nullable. Objects
 * and arrays get JSON-encoded.
 */
function stringifyValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Compute the field-level diff between `existing` and `incoming`.
 *
 * Type parameter `T extends Record<string, unknown>` keeps the engine
 * generic; callers should pass `NewVehicle`, `NewItem`, etc.
 */
export function diffRecord<T extends Record<string, unknown>>(
  existing: T | null,
  incoming: T,
  meta: DiffMeta,
): DiffResult<T> {
  const ignore = new Set<string>([...DEFAULT_IGNORE_KEYS, ...(meta.ignoreKeys ?? [])]);
  const changes: NewChangeLogRow[] = [];

  if (existing === null) {
    // New row — emit one change per non-null incoming field.
    for (const key of Object.keys(incoming)) {
      if (ignore.has(key)) continue;
      const value = incoming[key];
      if (value === null || value === undefined) continue;
      changes.push({
        ts: meta.ts,
        entityType: meta.entityType,
        entityUuid: meta.entityUuid,
        field: key,
        oldValue: null,
        newValue: stringifyValue(value),
        source: meta.source,
      });
    }
    return { changes, final: incoming };
  }

  // Update path — walk the union of keys so we catch columns that were
  // cleared (`old != null`, `new == null`).
  const seen = new Set<string>();
  const walk = (keys: ReadonlyArray<string>): void => {
    for (const key of keys) {
      if (seen.has(key) || ignore.has(key)) continue;
      seen.add(key);
      const prev = existing[key];
      const next = incoming[key];
      if (deepEqual(prev, next)) continue;
      changes.push({
        ts: meta.ts,
        entityType: meta.entityType,
        entityUuid: meta.entityUuid,
        field: key,
        oldValue: stringifyValue(prev),
        newValue: stringifyValue(next),
        source: meta.source,
      });
    }
  };
  walk(Object.keys(existing));
  walk(Object.keys(incoming));

  return { changes, final: incoming };
}
