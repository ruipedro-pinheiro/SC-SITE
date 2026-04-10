/**
 * Hono `Variables` map — the shape of `c.get(...)` / `c.set(...)` keys used
 * across middleware and route handlers.
 *
 * Kept in its own file (rather than re-exported from app.ts) so routes can
 * import the type without pulling in app.ts's full route chain — which
 * would create a circular dependency at module-load time.
 */

export interface AppVariables {
  requestId: string;
}
