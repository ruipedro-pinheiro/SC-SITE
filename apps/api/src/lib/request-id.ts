/**
 * Per-request correlation id.
 *
 * We use `crypto.randomUUID()` because it's in the Bun runtime globals and
 * doesn't pull in a ULID dep just for log correlation. If the client already
 * sent an `x-request-id` header, we honour it so distributed traces compose.
 */

export function makeRequestId(incoming?: string | null): string {
  if (incoming && incoming.length > 0 && incoming.length <= 128) {
    return incoming;
  }
  return crypto.randomUUID();
}
