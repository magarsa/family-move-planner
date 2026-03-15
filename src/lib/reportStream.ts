// ─────────────────────────────────────────────────────────────────────────────
// src/lib/reportStream.ts
//
// Thin wrapper around the Edge Function SSE stream.
// Calls the Edge Function, parses SSE chunks, and invokes callbacks.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReportType, SSEEvent } from "../types/reports";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface StreamCallbacks {
  /** Fired once at the start with the DB row ID */
  onReportId?: (id: string) => void;
  /** Fired for every HTML chunk Claude streams */
  onChunk:     (chunk: string) => void;
  /** Fired once when generation is fully complete */
  onDone?:     (reportId: string) => void;
  /** Fired if something goes wrong */
  onError?:    (message: string) => void;
}

/**
 * Kick off a report generation stream.
 * Returns an AbortController so the caller can cancel mid-stream.
 */
export function streamReport(
  reportType: ReportType,
  requestedBy: string,
  callbacks: StreamCallbacks,
): AbortController {
  const abort = new AbortController();

  (async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-report`,
        {
          method:  "POST",
          signal:  abort.signal,
          headers: {
            "Content-Type":  "application/json",
            Authorization:   `Bearer ${SUPABASE_ANON}`,
            apikey:          SUPABASE_ANON,
          },
          body: JSON.stringify({ reportType, requestedBy }),
        },
      );

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "Unknown error");
        callbacks.onError?.(`HTTP ${res.status}: ${text}`);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // keep incomplete last part

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw) as SSEEvent;

            switch (event.type) {
              case "report_id": callbacks.onReportId?.(event.reportId); break;
              case "chunk":     callbacks.onChunk(event.text);           break;
              case "done":      callbacks.onDone?.(event.reportId);     break;
              case "error":     callbacks.onError?.(event.message);     break;
            }
          } catch {
            // malformed JSON — skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // user cancelled — silent
      callbacks.onError?.((err as Error).message ?? "Stream error");
    }
  })();

  return abort;
}
