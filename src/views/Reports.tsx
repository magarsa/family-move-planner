// ─────────────────────────────────────────────────────────────────────────────
// src/views/Reports.tsx
//
// Route: /reports
//
// Three panels:
//   1. Report type picker  — choose which report to run
//   2. ReportViewer        — live streaming preview + download
//   3. History sidebar     — past reports (from `reports` table via Realtime)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { streamReport } from "../lib/reportStream";
import { ReportViewer } from "../components/ReportViewer";
import {
  REPORT_TYPE_CONFIGS,
  type Report,
  type ReportStatus,
  type ReportType,
} from "../types/reports";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function downloadHtml(html: string, title: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href:     url,
    download: `${title.replace(/\s+/g, "-").toLowerCase()}-${
      new Date().toISOString().slice(0, 10)
    }.html`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Reports() {
  // Who is currently using the app (from your existing auth pattern)
  const userName = localStorage.getItem("userName") ?? "Unknown";

  // ── Active generation state ────────────────────────────────────────────────
  const [activeType,    setActiveType]    = useState<ReportType | null>(null);
  const [streamedHtml,  setStreamedHtml]  = useState("");
  const [streamStatus,  setStreamStatus]  = useState<ReportStatus>("pending");
  const [streamError,   setStreamError]   = useState<string | undefined>();
  const [activeTitle,   setActiveTitle]   = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // ── Past reports (Realtime-subscribed) ────────────────────────────────────
  const [history,     setHistory]     = useState<Report[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ── Fetch initial history ──────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setHistory(data as Report[]); });
  }, []);

  // ── Subscribe to Realtime changes on `reports` ────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("reports-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        ({ eventType, new: newRow, old: oldRow }) => {
          setHistory((prev) => {
            if (eventType === "INSERT") {
              return [newRow as Report, ...prev].slice(0, 20);
            }
            if (eventType === "UPDATE") {
              return prev.map((r) => (r.id === (newRow as Report).id ? (newRow as Report) : r));
            }
            if (eventType === "DELETE") {
              return prev.filter((r) => r.id !== (oldRow as { id: string }).id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Start a new generation ─────────────────────────────────────────────────
  const generate = useCallback((type: ReportType) => {
    // Cancel any in-flight stream
    abortRef.current?.abort();

    const config = REPORT_TYPE_CONFIGS.find((c) => c.type === type)!;

    setActiveType(type);
    setActiveTitle(config.label);
    setStreamedHtml("");
    setStreamStatus("generating");
    setStreamError(undefined);

    abortRef.current = streamReport(type, userName, {
      onChunk:  (chunk) => setStreamedHtml((prev) => prev + chunk),
      onDone:   ()      => setStreamStatus("complete"),
      onError:  (msg)   => { setStreamStatus("error"); setStreamError(msg); },
    });
  }, [userName]);

  // ── Load a past report ─────────────────────────────────────────────────────
  const loadHistoryReport = useCallback((report: Report) => {
    if (!report.html_content) return;
    const config = REPORT_TYPE_CONFIGS.find((c) => c.type === report.report_type)!;
    setActiveType(report.report_type);
    setActiveTitle(config.label);
    setStreamedHtml(report.html_content);
    setStreamStatus("complete");
    setStreamError(undefined);
    setHistoryOpen(false);
  }, []);

  // ── Reset to picker ────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setActiveType(null);
    setStreamedHtml("");
    setStreamStatus("pending");
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4
                      flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate a live report from your move planning data
          </p>
        </div>
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm font-semibold
                     text-gray-600 hover:text-gray-900 border border-gray-200
                     hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          📋 History
          {history.length > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold
                             px-1.5 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* ── Report type picker (shown when no active generation) ─────────── */}
        <AnimatePresence mode="wait">
          {!activeType && (
            <motion.div
              key="picker"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
                Choose a report type
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {REPORT_TYPE_CONFIGS.map((cfg) => (
                  <button
                    key={cfg.type}
                    onClick={() => generate(cfg.type)}
                    className={`
                      group text-left rounded-2xl border-2 p-5
                      transition-all duration-200 cursor-pointer
                      bg-white hover:shadow-md active:scale-[0.98]
                      ${cfg.borderColor} hover:${cfg.bgColor}
                    `}
                  >
                    <div className="text-3xl mb-3">{cfg.icon}</div>
                    <div className={`text-base font-bold mb-1 ${cfg.color}`}>{cfg.label}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{cfg.description}</div>
                    <div className={`mt-4 text-xs font-semibold ${cfg.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      Generate →
                    </div>
                  </button>
                ))}
              </div>

              {/* Re-run hint if there are past reports */}
              {history.length > 0 && (
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Or{" "}
                  <button
                    onClick={() => setHistoryOpen(true)}
                    className="underline hover:text-gray-600"
                  >
                    load a past report
                  </button>{" "}
                  from history
                </p>
              )}
            </motion.div>
          )}

          {/* ── Live viewer ─────────────────────────────────────────────────── */}
          {activeType && (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ReportViewer
                html={streamedHtml}
                status={streamStatus}
                errorMessage={streamError}
                reportTitle={activeTitle}
                onDownload={() => downloadHtml(streamedHtml, activeTitle)}
                onClose={reset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── History drawer (slide-over) ─────────────────────────────────────── */}
      <AnimatePresence>
        {historyOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setHistoryOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50
                         flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">Report History</h2>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-12">No reports yet</p>
                ) : (
                  history.map((r) => {
                    const cfg = REPORT_TYPE_CONFIGS.find((c) => c.type === r.report_type);
                    return (
                      <button
                        key={r.id}
                        onClick={() => r.status === "complete" ? loadHistoryReport(r) : undefined}
                        disabled={r.status !== "complete"}
                        className={`
                          w-full text-left px-5 py-4 border-b border-gray-50
                          hover:bg-gray-50 transition-colors
                          ${r.status !== "complete" ? "opacity-50 cursor-default" : "cursor-pointer"}
                        `}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-xl mt-0.5">{cfg?.icon ?? "📄"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {r.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {timeAgo(r.created_at)} · by {r.requested_by ?? "—"}
                            </p>
                          </div>
                          <span className={`
                            text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0
                            ${r.status === "complete"   ? "bg-green-50 text-green-700" : ""}
                            ${r.status === "generating" ? "bg-blue-50 text-blue-700"   : ""}
                            ${r.status === "error"      ? "bg-red-50 text-red-700"     : ""}
                            ${r.status === "pending"    ? "bg-gray-100 text-gray-500"  : ""}
                          `}>
                            {r.status === "complete"   ? "✓"     : ""}
                            {r.status === "generating" ? "…"     : ""}
                            {r.status === "error"      ? "✗"     : ""}
                            {r.status === "pending"    ? "queue" : ""}
                          </span>
                        </div>
                        {r.metadata?.output_tokens && (
                          <p className="text-xs text-gray-300 mt-1 ml-8">
                            {r.metadata.output_tokens.toLocaleString()} tokens
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
