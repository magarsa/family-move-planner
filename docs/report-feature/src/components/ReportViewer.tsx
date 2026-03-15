// ─────────────────────────────────────────────────────────────────────────────
// src/components/ReportViewer.tsx
//
// Renders a streaming (or completed) HTML report.
//
// While streaming:  shows a pulsing progress bar + live HTML in an iframe
// When complete:    hides progress bar, shows download button
// On error:        shows an error callout
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReportStatus } from "../types/reports";

interface Props {
  /** Accumulated HTML string (grows as chunks arrive) */
  html:         string;
  status:       ReportStatus;
  errorMessage?: string;
  reportTitle:  string;
  /** Called when the user clicks "Download HTML" */
  onDownload:   () => void;
  /** Called when the user clicks "New Report" or × */
  onClose:      () => void;
}

// Descriptive status messages shown while Claude works
const STATUS_MESSAGES = [
  "Pulling your data…",
  "Analysing your move timeline…",
  "Reviewing properties and schools…",
  "Calculating net proceeds…",
  "Drafting recommendations…",
  "Formatting report…",
];

export function ReportViewer({
  html,
  status,
  errorMessage,
  reportTitle,
  onDownload,
  onClose,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [msgIdx, setMsgIdx]     = useState(0);
  const [iframeH, setIframeH]   = useState(600);

  // Rotate status messages while generating
  useEffect(() => {
    if (status !== "generating") return;
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 3500);
    return () => clearInterval(id);
  }, [status]);

  // Push HTML into the iframe as it accumulates
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    // Write the whole accumulated string each time.
    // Browsers handle partial HTML gracefully — we get a live preview.
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  // Auto-resize iframe to content height when complete
  useEffect(() => {
    if (status !== "complete") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      const h = iframe.contentDocument?.body?.scrollHeight;
      if (h && h > 200) setIframeH(h + 40);
    };
    // slight delay to let the browser finish layout
    const id = setTimeout(resize, 200);
    return () => clearTimeout(id);
  }, [status]);

  const isGenerating = status === "generating";
  const isComplete   = status === "complete";
  const isError      = status === "error";
  const progress     = isComplete ? 100 : isGenerating ? Math.min(90, (html.length / 120)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">{reportTitle}</span>
          {isGenerating && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                             text-blue-700 bg-blue-50 border border-blue-200
                             px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Generating…
            </span>
          )}
          {isComplete && (
            <span className="text-xs font-semibold text-green-700 bg-green-50
                             border border-green-200 px-2.5 py-0.5 rounded-full">
              ✓ Ready
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isComplete && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 text-sm font-semibold text-white
                         bg-blue-700 hover:bg-blue-800 active:bg-blue-900
                         px-3 py-1.5 rounded-lg transition-colors"
            >
              ⬇ Download HTML
            </button>
          )}
          <button
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800
                       border border-gray-200 hover:border-gray-400
                       px-3 py-1.5 rounded-lg transition-colors"
          >
            {isComplete ? "New Report" : "Cancel"}
          </button>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(isGenerating || (isComplete && progress < 100)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1.5"
          >
            <div className="flex justify-between text-xs text-gray-500">
              <span className="italic">{STATUS_MESSAGES[msgIdx]}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full"
                initial={{ width: "2%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            {isGenerating && html.length > 0 && (
              <p className="text-xs text-gray-400">
                {(html.length / 1024).toFixed(1)} KB generated so far…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Report generation failed</p>
          <p className="text-red-600">{errorMessage ?? "Unknown error"}</p>
          <button
            onClick={onClose}
            className="mt-3 text-xs font-semibold text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Live iframe preview ──────────────────────────────────────────── */}
      {(isGenerating || isComplete) && html.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white"
        >
          <iframe
            ref={iframeRef}
            title={reportTitle}
            sandbox="allow-same-origin"   /* no scripts in generated HTML */
            style={{ width: "100%", height: `${iframeH}px`, border: "none", display: "block" }}
          />
        </motion.div>
      )}

      {/* ── Empty generating state (before first chunk) ──────────────────── */}
      {isGenerating && html.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3
                        h-48 rounded-xl border-2 border-dashed border-blue-200
                        bg-blue-50 text-blue-600">
          <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600
                          rounded-full animate-spin" />
          <p className="text-sm font-medium">{STATUS_MESSAGES[msgIdx]}</p>
        </div>
      )}
    </motion.div>
  );
}
