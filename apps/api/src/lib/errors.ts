/**
 * Typed error classes — every HTTP failure path throws one of these, and the
 * error-handler middleware maps them to the envelope response. Keeping the
 * class hierarchy flat avoids `instanceof` chains in the handler.
 */

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("BAD_REQUEST", 400, message, details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", 401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", 403, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super("NOT_FOUND", 404, message);
    this.name = "NotFoundError";
  }
}

export class InternalError extends ApiError {
  constructor(message = "Internal server error", details?: Record<string, unknown>) {
    super("INTERNAL", 500, message, details);
    this.name = "InternalError";
  }
}
