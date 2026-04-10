/**
 * Consistent response envelope. Every route either returns `wrap(data, meta)`
 * or throws a typed ApiError — the error middleware renders the failure
 * envelope uniformly.
 *
 * Shape matches the directive in CLAUDE.md for apps/api:
 *   { data, meta: { updatedAt, source?, count?, total?, revalidateIn? } }
 *   { error: { code, message, requestId }, meta: {...} }
 */

import type { ApiErrorCode } from "./errors";

export interface ResponseMeta {
  updatedAt: string;
  source?: string;
  count?: number;
  total?: number;
  revalidateIn?: number;
  requestId?: string;
}

export interface SuccessEnvelope<T> {
  data: T;
  meta: ResponseMeta;
}

export interface ErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
  meta: ResponseMeta;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function wrap<T>(data: T, meta: Partial<ResponseMeta> = {}): SuccessEnvelope<T> {
  return {
    data,
    meta: {
      updatedAt: meta.updatedAt ?? nowIso(),
      ...(meta.source !== undefined ? { source: meta.source } : {}),
      ...(meta.count !== undefined ? { count: meta.count } : {}),
      ...(meta.total !== undefined ? { total: meta.total } : {}),
      ...(meta.revalidateIn !== undefined ? { revalidateIn: meta.revalidateIn } : {}),
      ...(meta.requestId !== undefined ? { requestId: meta.requestId } : {}),
    },
  };
}

export function errorEnvelope(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      requestId,
      ...(details !== undefined ? { details } : {}),
    },
    meta: {
      updatedAt: nowIso(),
      requestId,
    },
  };
}
