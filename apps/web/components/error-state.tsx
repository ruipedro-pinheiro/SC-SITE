import { PanelShell } from "@sc-site/ui";
import type { JSX } from "react";

interface ErrorStateProps {
  /** HTTP status code from the failed upstream fetch. */
  code: number;
  /** Optional short explanation shown under the status line. */
  message?: string;
  /** Where the retry link points. Defaults to the current page. */
  retryHref?: string;
}

/**
 * Calm error panel used when the Hono API is unreachable or returns a
 * non-2xx status. Follows the MOCKUP.md §11 ban list: no emojis, no
 * marketing copy, no modals, no glows — a single hairline panel floating
 * over the hangar backdrop.
 *
 * Kept deliberately minimal so it can be rendered from both the ships list
 * and the ship detail page without prop drilling.
 */
export function ErrorState({ code, message, retryHref }: ErrorStateProps): JSX.Element {
  return (
    <main className="relative min-h-screen flex items-center justify-center">
      <PanelShell className="relative max-w-md px-8 py-6">
        <div className="text-10 tracking-micro text-overlay0 uppercase">api unreachable</div>
        <div className="mt-2 text-14 text-text">upstream responded with HTTP {code}</div>
        {message ? <div className="mt-1 text-12 text-subtext0">{message}</div> : null}
        <div className="mt-4 text-11 text-subtext0">
          the hangar is offline.{" "}
          <a
            href={retryHref ?? "/ships"}
            className="text-text underline decoration-surface1 underline-offset-4 hover:decoration-text transition-colors duration-180 ease-deliberate"
          >
            retry
          </a>
        </div>
      </PanelShell>
    </main>
  );
}
