// ─────────────────────────────────────────────────────────────────────────────
// src/types/reports.ts
// ─────────────────────────────────────────────────────────────────────────────

export type ReportType = "move-overview" | "home-sale" | "house-hunt";

export type ReportStatus = "pending" | "generating" | "complete" | "error";

export interface Report {
  id:            string;
  report_type:   ReportType;
  title:         string;
  html_content:  string | null;
  status:        ReportStatus;
  requested_by:  string | null;
  generated_by:  string;
  error_message: string | null;
  metadata:      {
    input_tokens?:  number;
    output_tokens?: number;
    [key: string]:  unknown;
  };
  created_at: string;
  updated_at: string;
}

// What the Edge Function sends over SSE
export type SSEEvent =
  | { type: "report_id"; reportId: string }
  | { type: "chunk";     text: string }
  | { type: "done";      reportId: string }
  | { type: "error";     message: string };

// UI configuration per report type
export interface ReportTypeConfig {
  type:        ReportType;
  label:       string;
  description: string;
  icon:        string;
  color:       string; // Tailwind text color class
  bgColor:     string; // Tailwind bg color class
  borderColor: string; // Tailwind border color class
}

export const REPORT_TYPE_CONFIGS: ReportTypeConfig[] = [
  {
    type:        "move-overview",
    label:       "Full Move Plan",
    description: "Everything in one place — sell side, buy side, schools, decisions, and next steps.",
    icon:        "🏡",
    color:       "text-blue-800",
    bgColor:     "bg-blue-50",
    borderColor: "border-blue-400",
  },
  {
    type:        "home-sale",
    label:       "Home Sale Report",
    description: "Selling progress, completed improvements, pre-listing tasks, contacts, and net proceeds.",
    icon:        "🔑",
    color:       "text-orange-700",
    bgColor:     "bg-orange-50",
    borderColor: "border-orange-400",
  },
  {
    type:        "house-hunt",
    label:       "House Hunt Report",
    description: "Property pipeline, school districts, neighborhood analysis, and Charlotte-area research.",
    icon:        "🔍",
    color:       "text-green-800",
    bgColor:     "bg-green-50",
    borderColor: "border-green-400",
  },
];
