/**
 * Tiny structured logger for the sc-data package.
 *
 * The biome config bans bare `console.log` everywhere; we still need a way to
 * emit pipeline progress. This module is the ONLY place in the package that
 * may call `console.*`, and we restrict ourselves to `console.warn` and
 * `console.error` (which biome allows via its noConsole allow-list).
 *
 * Output shape: a single JSON line per event, so orchestrator runs can be
 * piped to `jq` / grepped mechanically. Silent by default when
 * `SC_DATA_LOG_SILENT=1` is set (useful in tests).
 *
 * NO HARDCODE: the logger does not care about payload content; it just
 * serialises whatever it is handed.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  level: LogLevel;
  ts: number;
  msg: string;
  [key: string]: unknown;
}

function isSilent(): boolean {
  return process.env.SC_DATA_LOG_SILENT === "1";
}

function emit(level: LogLevel, msg: string, extra?: Record<string, unknown>): void {
  if (isSilent()) return;
  const payload: LogEvent = {
    level,
    ts: Date.now(),
    msg,
    ...(extra ?? {}),
  };
  const line = JSON.stringify(payload);
  // Biome's `noConsole` rule allows `warn` and `error`; route everything
  // through one of those two channels so we don't smuggle a `console.log`
  // into the package.
  if (level === "error") {
    console.error(line);
  } else {
    console.warn(line);
  }
}

export const logger = {
  debug(msg: string, extra?: Record<string, unknown>): void {
    if (process.env.SC_DATA_LOG_DEBUG === "1") emit("debug", msg, extra);
  },
  info(msg: string, extra?: Record<string, unknown>): void {
    emit("info", msg, extra);
  },
  warn(msg: string, extra?: Record<string, unknown>): void {
    emit("warn", msg, extra);
  },
  error(msg: string, extra?: Record<string, unknown>): void {
    emit("error", msg, extra);
  },
};

export type Logger = typeof logger;
