/**
 * Supabase Edge Function: generate-report
 *
 * POST /functions/v1/generate-report
 * Body: { reportType: ReportType, requestedBy: string }
 *
 * Strategy: pre-render ALL data sections as HTML on the server (zero AI tokens).
 * Claude writes ONLY a short analysis narrative (~1000 output tokens, ~15-20s).
 * This keeps total runtime well within Supabase's 150-second free-tier limit.
 *
 * Stream layout:
 *   1. Pre-built HTML header + all data tables  → sent as first SSE chunk immediately
 *   2. Claude's analysis sections               → streamed in real-time
 *   3. Pre-built HTML footer                    → sent as final SSE chunk
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.27";

// ── Types ──────────────────────────────────────────────────────────────────────

type ReportType = "move-overview" | "home-sale" | "house-hunt" | "charlotte-relocation";

const REPORT_TITLES: Record<ReportType, string> = {
  "move-overview":        "Full Move Planning Report",
  "home-sale":            "Home Sale Preparation Report",
  "house-hunt":           "House Hunt & School Research Report",
  "charlotte-relocation": "Charlotte Relocation Guide",
};

interface Todo     { id: string; text: string; tier: string; completed: boolean | null }
interface Property { address: string; area: string | null; status: string | null; price: number | null; beds: number | null; baths: number | null; sqft: number | null; notes: string | null }
interface School   { name: string; district: string | null; area: string | null; grades: string | null; school_type: string | null; notes: string | null; status: string | null }
interface Contact  { name: string; role: string | null; company: string | null; phone: string | null; email: string | null }
interface Branch   { title: string; description: string | null; status: string | null; decision_made: string | null; notes: string | null }

interface Context {
  profile:    Record<string, string | null>;
  todos:      Todo[];
  properties: Property[];
  schools:    School[];
  contacts:   Contact[];
  branches:   Branch[];
}

// ── CORS ───────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const claude   = new Anthropic({ apiKey: anthropicKey });

  let reportId: string | undefined;

  try {
    const { reportType, requestedBy } = (await req.json()) as { reportType: ReportType; requestedBy: string };

    if (!REPORT_TITLES[reportType]) {
      return new Response(JSON.stringify({ error: "Invalid reportType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create report row
    const { data: reportRow, error: insertError } = await supabase
      .from("reports")
      .insert({ report_type: reportType, title: REPORT_TITLES[reportType], status: "generating", requested_by: requestedBy })
      .select("id")
      .single();

    if (insertError || !reportRow) throw new Error(`Failed to create report row: ${insertError?.message}`);
    reportId = reportRow.id;

    // 2. Fetch all data in parallel (charlotte-relocation is fully static — skip DB fetch)
    const ctx = reportType === "charlotte-relocation" ? null : await fetchContext(supabase, reportType);

    // 3. Pre-build data HTML (server-side, no AI tokens spent)
    // charlotte-relocation uses its own static HTML inside the stream — skip shell/prompt
    const { header, footer } = ctx ? buildReportShell(reportType, ctx) : { header: "", footer: "" };

    // 4. Compact prompt: Claude writes only the analysis narrative
    const { system, userMessage } = ctx ? buildPrompt(reportType, ctx) : { system: "", userMessage: "" };

    // 5. Stream assembly
    let accumulatedHtml = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (payload: object) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch { /* client disconnected — generation still continues for DB save */ }
        };

        send({ type: "report_id", reportId });

        try {
          if (reportType === "charlotte-relocation") {
            // ── Static report — no Claude API call ────────────────────────
            const staticHtml = getCharlotteRelocationHtml();
            accumulatedHtml = staticHtml;
            send({ type: "chunk", text: staticHtml });
            send({ type: "done", reportId });
            try { controller.close(); } catch { /* already closed */ }
            await supabase.from("reports").update({ status: "complete", html_content: accumulatedHtml, metadata: {} }).eq("id", reportId);
          } else {
            // ── AI-generated report ────────────────────────────────────────
            // Send pre-built data HTML immediately — client sees full tables before AI starts
            accumulatedHtml += header;
            send({ type: "chunk", text: header });

            // Stream Claude's short analysis (~1000 tokens, ~15-20s)
            const claudeStream = claude.messages.stream({
              model:      "claude-sonnet-4-6",
              max_tokens: 1000,
              system,
              messages:   [{ role: "user", content: userMessage }],
            });

            for await (const event of claudeStream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                accumulatedHtml += event.delta.text;
                send({ type: "chunk", text: event.delta.text });
              }
            }

            // Append closing HTML
            accumulatedHtml += footer;
            send({ type: "chunk", text: footer });

            // Signal done to client immediately — DB write must not block this
            send({ type: "done", reportId });
            try { controller.close(); } catch { /* already closed */ }

            // Persist in background after client is unblocked
            const finalMessage = await claudeStream.finalMessage().catch(() => null);
            await supabase
              .from("reports")
              .update({
                status:       "complete",
                html_content: accumulatedHtml,
                metadata: finalMessage ? {
                  input_tokens:  finalMessage.usage.input_tokens,
                  output_tokens: finalMessage.usage.output_tokens,
                } : {},
              })
              .eq("id", reportId);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await supabase.from("reports").update({ status: "error", error_message: msg }).eq("id", reportId);
          send({ type: "error", message: msg });
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (reportId) {
      await createClient(supabaseUrl, serviceKey)
        .from("reports").update({ status: "error", error_message: msg }).eq("id", reportId);
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Data fetching ──────────────────────────────────────────────────────────────

async function fetchContext(
  supabase: ReturnType<typeof createClient>,
  reportType: ReportType,
): Promise<Context> {
  const [profileRes, todosRes, propsRes, schoolsRes, contactsRes, branchesRes] =
    await Promise.all([
      supabase.from("profile").select("key, value"),
      supabase.from("todos").select("id, text, tier, completed").order("sort_order").order("created_at"),
      supabase.from("properties").select("address, area, status, price, beds, baths, sqft, notes").order("created_at"),
      supabase.from("schools").select("name, district, area, grades, school_type, notes, status").order("created_at"),
      supabase.from("contacts").select("name, role, company, phone, email").order("created_at"),
      supabase.from("branches").select("title, description, status, decision_made, notes").order("sort_order").order("created_at"),
    ]);

  const profile = Object.fromEntries(
    (profileRes.data ?? []).map((r: { key: string; value: string | null }) => [r.key, r.value]),
  );

  const allTodos = (todosRes.data ?? []) as Todo[];
  const isSell   = (t: Todo) => t.tier.startsWith("sell_");
  const todos    = reportType === "home-sale"  ? allTodos.filter(isSell)
                 : reportType === "house-hunt" ? allTodos.filter(t => !isSell(t))
                 : allTodos;

  const allContacts = (contactsRes.data ?? []) as Contact[];
  const sellRoles   = new Set(["listing-agent", "contractor", "stager", "photographer"]);
  const contacts    = reportType === "home-sale"
    ? allContacts.filter(c => sellRoles.has(c.role ?? ""))
    : allContacts;

  return {
    profile,
    todos,
    properties: (propsRes.data    ?? []) as Property[],
    schools:    (schoolsRes.data  ?? []) as School[],
    contacts,
    branches:   (branchesRes.data ?? []) as Branch[],
  };
}

// ── HTML helpers ───────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmtPrice(n: number | null): string {
  return n == null ? "—" : "$" + n.toLocaleString("en-US");
}

// ── Pre-built report shell (server-side HTML, no AI) ──────────────────────────

function buildReportShell(
  reportType: ReportType,
  ctx: Context,
): { header: string; footer: string } {
  const title = REPORT_TITLES[reportType];
  const now   = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const p     = ctx.profile;

  // ── Inline CSS ──────────────────────────────────────────────────────────────
  const css = `<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#F5F7FA;color:#1a1a1a;font-size:15px;line-height:1.5}
.wrap{max-width:900px;margin:0 auto;padding:24px 16px}
.hero{background:linear-gradient(135deg,#1F497D 0%,#2E75B6 100%);color:#fff;border-radius:12px;padding:28px 32px;margin-bottom:18px}
.hero h1{font-size:1.55rem;font-weight:700;margin-bottom:4px}
.hero p{opacity:.75;font-size:.85rem}
.card{background:#fff;border-radius:10px;box-shadow:0 1px 5px rgba(0,0,0,.08);padding:20px 22px;margin-bottom:16px}
.card h2{font-size:.95rem;font-weight:700;color:#1F497D;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #EBF0F8}
table{width:100%;border-collapse:collapse;font-size:.84rem}
th{background:#EBF0F8;color:#1F497D;text-align:left;padding:7px 10px;font-size:.73rem;text-transform:uppercase;letter-spacing:.04em}
td{padding:7px 10px;border-bottom:1px solid #F0F0F0;vertical-align:top}
tr:last-child td{border-bottom:none}
small{color:#9CA3AF;font-size:.78rem}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.74rem;font-weight:600;white-space:nowrap}
.bg{background:#DCFCE7;color:#166534}
.bb{background:#DBEAFE;color:#1E40AF}
.bo{background:#FEF3C7;color:#92400E}
.br{background:#FEE2E2;color:#991B1B}
.bs{background:#F3F4F6;color:#4B5563}
.bp{background:#F3E8FF;color:#6B21A8}
.kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px 16px;margin-top:4px}
.kv-item label{font-size:.72rem;color:#6B7280;text-transform:uppercase;letter-spacing:.04em;display:block}
.kv-item span{font-size:.9rem;font-weight:500}
.prog-wrap{margin:10px 0 14px}
.prog-meta{display:flex;justify-content:space-between;font-size:.78rem;color:#6B7280;margin-bottom:5px}
.prog-bar{background:#EBF0F8;border-radius:4px;height:8px;overflow:hidden}
.prog-fill{height:100%;background:linear-gradient(90deg,#2E75B6,#1F497D);border-radius:4px}
.empty{color:#9CA3AF;font-style:italic;font-size:.85rem;padding:4px 0}
.ai-card{background:#fff;border-radius:10px;box-shadow:0 1px 5px rgba(0,0,0,.08);padding:20px 22px;margin-bottom:16px;border-left:4px solid #2E75B6}
.ai-card h2{font-size:.95rem;font-weight:700;color:#1F497D;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #EBF0F8;display:flex;align-items:center;gap:8px}
.ai-badge{font-size:.7rem;background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;border-radius:20px;padding:1px 7px;font-weight:600}
.ai-body h3{font-size:.92rem;font-weight:600;color:#1F497D;margin:14px 0 6px}
.ai-body p{line-height:1.65;color:#374151;margin-bottom:9px;font-size:.9rem}
.ai-body ul,.ai-body ol{padding-left:20px;margin-bottom:10px}
.ai-body li{margin-bottom:5px;line-height:1.6;color:#374151;font-size:.9rem}
.ai-body strong{color:#111}
@media(max-width:600px){.kv{grid-template-columns:1fr 1fr}.hero{padding:20px}}
</style>`;

  // ── Profile summary ─────────────────────────────────────────────────────────
  const profileFields: [string, string][] = [
    ["Selling",     p["current_address"] ?? "6805 Brookview Dr, Urbandale IA"],
    ["Target Area", p["target_area"]     ?? "Charlotte NC/SC area"],
    ["Move Date",   p["move_date"]       ?? "—"],
    ["Budget",      p["budget"]          ? fmtPrice(Number(p["budget"])) : "—"],
    ["Family",      "4 members · 2 kids (5y, 22m)"],
    ["School",      p["school_start"]    ?? "Kindergarten Aug 2026"],
  ];
  const profileCard = `<div class="card">
  <h2>📋 Move Overview</h2>
  <div class="kv">${profileFields.map(([k, v]) =>
    `<div class="kv-item"><label>${esc(k)}</label><span>${esc(v)}</span></div>`
  ).join("")}</div>
</div>`;

  // ── Todos ───────────────────────────────────────────────────────────────────
  function todosCard(): string {
    const todos   = ctx.todos;
    const done    = todos.filter(t => t.completed).length;
    const pct     = todos.length ? Math.round(done / todos.length * 100) : 0;
    const pending = todos.filter(t => !t.completed);

    const TIER_LABEL: Record<string, string> = {
      "Do First": "🔴 Do First", "Do Soon": "🟡 Do Soon",
      "Do When Ready": "🟢 Do When Ready", "Later": "🔵 Later",
      "sell_Do First": "🔴 Must Fix", "sell_Do Soon": "🟡 Pre-Listing",
      "sell_Do When Ready": "🟢 Curb Appeal", "sell_Later": "🔵 Post-Closing",
    };
    const tierBadge = (tier: string) => {
      if (tier === "Do First"  || tier === "sell_Do First")      return "br";
      if (tier === "Do Soon"   || tier === "sell_Do Soon")       return "bo";
      if (tier === "Do When Ready" || tier === "sell_Do When Ready") return "bg";
      return "bb";
    };

    const heading = reportType === "home-sale"  ? "🏡 Sell-Side Tasks"
                  : reportType === "house-hunt" ? "🔑 Buy-Side Tasks"
                  : "📝 All Tasks";

    const rows = pending.length === 0
      ? '<p class="empty">All tasks complete ✓</p>'
      : `<table>
          <thead><tr><th>Task</th><th>Priority</th></tr></thead>
          <tbody>${pending.map(t =>
            `<tr><td>${esc(t.text)}</td><td><span class="badge ${tierBadge(t.tier)}">${esc(TIER_LABEL[t.tier] ?? t.tier)}</span></td></tr>`
          ).join("")}</tbody>
        </table>`;

    return `<div class="card">
  <h2>${heading} <span class="badge bs">${done}/${todos.length} done</span></h2>
  ${todos.length === 0
    ? '<p class="empty">No tasks recorded yet</p>'
    : `<div class="prog-wrap">
        <div class="prog-meta"><span>${done} complete · ${pending.length} remaining</span><span>${pct}%</span></div>
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      </div>${rows}`}
</div>`;
  }

  // ── Properties ──────────────────────────────────────────────────────────────
  function propertiesCard(): string {
    const props = ctx.properties;
    if (props.length === 0) return `<div class="card"><h2>🏠 Properties</h2><p class="empty">No properties tracked yet</p></div>`;

    const statusBadge = (s: string | null) => {
      if (s === "Secured")        return "bg";
      if (s === "Ruled Out")      return "br";
      if (s === "Offer Made")     return "bp";
      if (s === "Visited" || s === "Visit Scheduled") return "bo";
      return "bs";
    };

    return `<div class="card">
  <h2>🏠 Properties <span class="badge bb">${props.length}</span></h2>
  <table>
    <thead><tr><th>Address</th><th>Price</th><th>Size</th><th>Status</th></tr></thead>
    <tbody>${props.map(p => `<tr>
      <td>${esc(p.address)}${p.area ? `<br><small>${esc(p.area)}</small>` : ""}</td>
      <td>${esc(fmtPrice(p.price))}</td>
      <td style="white-space:nowrap">${[
        p.beds  ? `${p.beds}bd`  : null,
        p.baths ? `${p.baths}ba` : null,
        p.sqft  ? `${p.sqft.toLocaleString()}sqft` : null,
      ].filter(Boolean).join(" · ") || "—"}</td>
      <td><span class="badge ${statusBadge(p.status)}">${esc(p.status ?? "—")}</span></td>
    </tr>`).join("")}</tbody>
  </table>
</div>`;
  }

  // ── Schools ─────────────────────────────────────────────────────────────────
  function schoolsCard(): string {
    const schools = ctx.schools;
    if (schools.length === 0) return `<div class="card"><h2>🎓 Schools</h2><p class="empty">No schools tracked yet</p></div>`;

    const statusBadge = (s: string | null) => {
      if (s === "Top Choice") return "bg";
      if (s === "Ruled Out")  return "br";
      if (s === "Toured")     return "bo";
      return "bs";
    };

    return `<div class="card">
  <h2>🎓 Schools <span class="badge bb">${schools.length}</span></h2>
  <table>
    <thead><tr><th>School</th><th>Grades</th><th>Area</th><th>Status</th></tr></thead>
    <tbody>${schools.map(s => `<tr>
      <td>${esc(s.name)}${s.district ? `<br><small>${esc(s.district)}</small>` : ""}</td>
      <td>${esc(s.grades ?? "—")}</td>
      <td>${esc(s.area ?? s.district ?? "—")}</td>
      <td><span class="badge ${statusBadge(s.status)}">${esc(s.status ?? "Researching")}</span></td>
    </tr>`).join("")}</tbody>
  </table>
</div>`;
  }

  // ── Contacts ────────────────────────────────────────────────────────────────
  function contactsCard(): string {
    if (ctx.contacts.length === 0) return "";
    return `<div class="card">
  <h2>👥 Key Contacts</h2>
  <table>
    <thead><tr><th>Name</th><th>Role</th><th>Company</th><th>Phone</th></tr></thead>
    <tbody>${ctx.contacts.map(c => `<tr>
      <td>${esc(c.name)}</td>
      <td>${esc(c.role ?? "—")}</td>
      <td>${esc(c.company ?? "—")}</td>
      <td>${esc(c.phone ?? "—")}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>`;
  }

  // ── Decision branches (overview only) ───────────────────────────────────────
  function branchesCard(): string {
    if (reportType !== "move-overview" || ctx.branches.length === 0) return "";
    return `<div class="card">
  <h2>🔀 Decision Branches</h2>
  <table>
    <thead><tr><th>Decision</th><th>Status</th></tr></thead>
    <tbody>${ctx.branches.map(b => `<tr>
      <td><strong>${esc(b.title)}</strong>${b.description ? `<br><small>${esc(b.description)}</small>` : ""}</td>
      <td>${b.decision_made
        ? `<span class="badge bg">✓ ${esc(b.decision_made)}</span>`
        : `<span class="badge bs">${esc(b.status ?? "Open")}</span>`}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>`;
  }

  // ── Assemble sections by report type ────────────────────────────────────────
  const sections = reportType === "home-sale"
    ? [profileCard, todosCard(), contactsCard()]
    : reportType === "house-hunt"
    ? [profileCard, propertiesCard(), schoolsCard(), todosCard()]
    : [profileCard, todosCard(), propertiesCard(), schoolsCard(), contactsCard(), branchesCard()];

  const header = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  ${css}
</head>
<body>
<div class="wrap">
  <div class="hero">
    <h1>${esc(title)}</h1>
    <p>Generated ${esc(now)} · Family Move Planner</p>
  </div>
  ${sections.filter(Boolean).join("\n  ")}
  <div class="ai-card">
    <h2>✦ AI Analysis <span class="ai-badge">Claude</span></h2>
    <div class="ai-body">
`;

  const footer = `    </div>
  </div>
</div>
</body>
</html>`;

  return { header, footer };
}

// ── Compact Claude prompt (analysis narrative only) ────────────────────────────

function buildPrompt(reportType: ReportType, ctx: Context) {
  const p    = ctx.profile;
  const done = ctx.todos.filter(t => t.completed).length;

  const criticalPending = ctx.todos
    .filter(t => !t.completed && (t.tier === "Do First" || t.tier === "sell_Do First"))
    .map(t => `- ${t.text}`)
    .join("\n") || "None";

  const propLines = (() => {
    if (ctx.properties.length === 0) return "None tracked";
    const byStatus: Record<string, number> = {};
    const active: string[] = [];
    for (const pr of ctx.properties) {
      const s = pr.status ?? "Researching";
      byStatus[s] = (byStatus[s] ?? 0) + 1;
      if (s !== "Ruled Out") {
        active.push(`- ${pr.address}${pr.area ? ` (${pr.area})` : ""} | ${s} | ${fmtPrice(pr.price)}${pr.notes ? ` | ${pr.notes.slice(0, 60)}` : ""}`);
      }
    }
    const summary = Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(", ");
    return `Total: ${ctx.properties.length} (${summary})\nActive:\n${active.join("\n") || "None"}`;
  })();

  const schoolLines = (() => {
    if (ctx.schools.length === 0) return "None tracked";
    const byStatus: Record<string, number> = {};
    const active: string[] = [];
    for (const s of ctx.schools) {
      const st = s.status ?? "Researching";
      byStatus[st] = (byStatus[st] ?? 0) + 1;
      if (st !== "Ruled Out") {
        active.push(`- ${s.name}${s.district ? ` (${s.district})` : ""} | ${s.grades ?? "?"} | ${st}${s.notes ? ` | ${s.notes.slice(0, 50)}` : ""}`);
      }
    }
    const summary = Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(", ");
    return `Total: ${ctx.schools.length} (${summary})\nActive:\n${active.join("\n") || "None"}`;
  })();

  const contactLines = ctx.contacts.length === 0 ? "None" : ctx.contacts
    .map(c => `- ${c.name} | ${c.role ?? "?"}${c.company ? ` @ ${c.company}` : ""}`)
    .join("\n");

  const branchLines = ctx.branches.length === 0 ? "None" : ctx.branches
    .map(b => `- ${b.title}: ${b.decision_made ? `DECIDED → ${b.decision_made}` : (b.status ?? "open")}`)
    .join("\n");

  const dataContext =
`PROFILE:
Selling: ${p["current_address"] ?? "6805 Brookview Dr, Urbandale IA"}
Target: ${p["target_area"] ?? "Charlotte NC/SC (Fort Mill, Tega Cay, Indian Land)"}
Move date: ${p["move_date"] ?? "not set"} | Budget: ${p["budget"] ?? "not set"}
Kids: 5-year-old (kindergarten Aug 2026), 22-month-old

TASKS: ${done}/${ctx.todos.length} complete
Critical pending:
${criticalPending}

PROPERTIES (${ctx.properties.length}):
${propLines}

SCHOOLS (${ctx.schools.length}):
${schoolLines}

CONTACTS (${ctx.contacts.length}):
${contactLines}

DECISIONS:
${branchLines}`;

  const focusMap: Record<ReportType, string> = {
    "move-overview":        "overall move readiness, sell/buy coordination, and timeline risk",
    "home-sale":            "listing readiness, sell-side task priority, and path to market",
    "house-hunt":           "property options, school fit for a kindergartener, and buy-side decision criteria",
    "charlotte-relocation": "Charlotte relocation financial analysis and planning",
  };

  const system =
`You are a concise real estate analyst writing the AI Analysis section of a family's move planning report. All data tables are already rendered — write ONLY the narrative analysis.

Output ONLY HTML fragments. Allowed tags: <h3> <p> <ul> <ol> <li> <strong> <em>. No DOCTYPE, no html/head/body/style tags.

Write exactly three sections:
1. <h3>📊 Status Summary</h3> — 2 short paragraphs on where things stand
2. <h3>⚠️ Key Risks</h3> — <ul> with 3–5 specific risks based on the actual data
3. <h3>✅ Top 5 Actions</h3> — <ol> with exactly 5 concrete next steps, most urgent first

Focus on: ${focusMap[reportType]}
Target 350–500 words. Be specific — reference actual addresses, names, and tasks from the data.`;

  const userMessage = `Write the analysis for this move planning data:\n\n${dataContext}`;

  return { system, userMessage };
}

// ── Charlotte Relocation static HTML ──────────────────────────────────────────

function getCharlotteRelocationHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Charlotte Relocation Report — Safal & Family · 2026</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --navy: #0f1923;
    --navy2: #162232;
    --teal: #1a9e7a;
    --teal-light: #e6f7f2;
    --teal-mid: #0d6e56;
    --amber: #d4890a;
    --amber-light: #fef3e2;
    --red: #c0392b;
    --red-light: #fdecea;
    --blue: #2463ae;
    --blue-light: #e8f0fb;
    --purple: #6c4fcf;
    --purple-light: #f0edfb;
    --gray: #f5f5f3;
    --gray2: #e8e8e4;
    --gray3: #b0aea8;
    --text: #1a1a18;
    --text2: #4a4a45;
    --text3: #7a7a74;
    --white: #ffffff;
    --border: #e0dfd8;
    --serif: 'Playfair Display', Georgia, serif;
    --sans: 'IBM Plex Sans', sans-serif;
    --mono: 'IBM Plex Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--sans); background: #f0efea; color: var(--text); font-size: 14px; line-height: 1.6; }
  .report-header { background: var(--navy); color: white; padding: 52px 64px 44px; position: relative; overflow: hidden; }
  .report-header::before { content: ''; position: absolute; top: -60px; right: -60px; width: 320px; height: 320px; border-radius: 50%; border: 1px solid rgba(26,158,122,0.15); }
  .report-header::after { content: ''; position: absolute; top: -20px; right: -20px; width: 180px; height: 180px; border-radius: 50%; border: 1px solid rgba(26,158,122,0.25); }
  .report-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; }
  .report-title { font-family: var(--serif); font-size: 38px; font-weight: 700; line-height: 1.15; color: white; margin-bottom: 8px; max-width: 520px; }
  .report-sub { font-size: 14px; color: rgba(255,255,255,0.55); font-weight: 300; margin-bottom: 36px; }
  .header-scorecards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; max-width: 820px; }
  .header-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); border-radius: 10px; padding: 16px 18px; }
  .header-card .hc-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 6px; font-family: var(--mono); }
  .header-card .hc-val { font-size: 22px; font-weight: 600; color: white; line-height: 1; margin-bottom: 3px; }
  .header-card .hc-sub { font-size: 10px; color: rgba(255,255,255,0.4); }
  .header-card.teal .hc-val { color: #4cd9ac; }
  .header-card.amber .hc-val { color: #f0b84e; }
  .page { max-width: 1100px; margin: 0 auto; padding: 40px 40px 80px; }
  .section { margin-bottom: 52px; }
  .section-header { display: flex; align-items: baseline; gap: 14px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid var(--navy); }
  .section-num { font-family: var(--mono); font-size: 11px; color: var(--teal); background: var(--teal-light); padding: 2px 8px; border-radius: 4px; font-weight: 500; }
  .section-title { font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--navy); }
  .section-desc { font-size: 13px; color: var(--text3); margin-left: auto; max-width: 340px; text-align: right; line-height: 1.4; }
  .card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 22px 24px; }
  .card-title { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); margin-bottom: 14px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .metric-card { background: var(--gray); border-radius: 10px; padding: 16px 18px; }
  .metric-label { font-size: 11px; color: var(--text3); margin-bottom: 5px; font-family: var(--mono); letter-spacing: 0.04em; }
  .metric-val { font-size: 24px; font-weight: 600; color: var(--text); line-height: 1; margin-bottom: 3px; }
  .metric-sub { font-size: 11px; color: var(--text3); }
  .metric-card.green { background: var(--teal-light); }
  .metric-card.green .metric-val { color: var(--teal-mid); }
  .metric-card.amber { background: var(--amber-light); }
  .metric-card.amber .metric-val { color: var(--amber); }
  .metric-card.red { background: var(--red-light); }
  .metric-card.red .metric-val { color: var(--red); }
  .metric-card.blue { background: var(--blue-light); }
  .metric-card.blue .metric-val { color: var(--blue); }
  .metric-card.purple { background: var(--purple-light); }
  .metric-card.purple .metric-val { color: var(--purple); }
  .badge { display: inline-block; font-size: 10px; padding: 3px 9px; border-radius: 5px; font-weight: 600; font-family: var(--mono); letter-spacing: 0.04em; }
  .badge-green { background: var(--teal-light); color: var(--teal-mid); }
  .badge-amber { background: var(--amber-light); color: var(--amber); }
  .badge-red { background: var(--red-light); color: var(--red); }
  .badge-blue { background: var(--blue-light); color: var(--blue); }
  .badge-navy { background: rgba(15,25,35,0.08); color: var(--navy); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); border-bottom: 1px solid var(--border); font-weight: 500; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--gray2); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr.highlight td { background: var(--teal-light); }
  tr.highlight td:first-child { border-left: 3px solid var(--teal); }
  .bar-track { background: var(--gray2); border-radius: 4px; height: 8px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .bar-row .bar-label { width:180px; font-size:12px; color:var(--text2); flex-shrink:0; line-height:1.3; }
  .bar-row .bar-pct { width:64px; font-size:12px; font-weight:600; color:var(--text); text-align:right; flex-shrink:0; }
  .bar-row .bar-track { flex:1; }
  .scenario-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; position: relative; overflow: hidden; }
  .scenario-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .scenario-card.green::before { background: var(--teal); }
  .scenario-card.amber::before { background: var(--amber); }
  .scenario-card.blue::before { background: var(--blue); }
  .scenario-title { font-family: var(--serif); font-size: 16px; font-weight: 600; color: var(--navy); margin-bottom: 4px; }
  .scenario-sub { font-size: 11px; color: var(--text3); margin-bottom: 14px; }
  .s-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid var(--gray2); }
  .s-row:last-of-type { border-bottom: none; }
  .s-row .key { color: var(--text2); }
  .s-row .val { font-weight: 600; color: var(--text); }
  .scenario-note { font-size: 11px; color: var(--text3); margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border); }
  .dti-row { margin-top: 12px; }
  .dti-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--text3); margin-bottom: 4px; }
  .dti-track { background: var(--gray2); border-radius: 4px; height: 6px; overflow: hidden; }
  .dti-fill { height: 100%; border-radius: 4px; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
  .footnote { font-size: 11px; color: var(--text3); font-style: italic; margin-top: 10px; }
  .program-card { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; }
  .program-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 10px; }
  .program-name { font-weight: 600; font-size: 13px; color: var(--navy); margin-bottom: 2px; }
  .program-type { font-size: 10px; font-family: var(--mono); color: var(--text3); margin-bottom: 8px; letter-spacing: 0.06em; }
  .program-amount { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
  .program-detail { font-size: 11px; color: var(--text2); line-height: 1.5; }
  .timeline { position: relative; padding-left: 24px; }
  .timeline::before { content: ''; position: absolute; left: 7px; top: 8px; bottom: 8px; width: 2px; background: var(--gray2); }
  .tl-item { position: relative; margin-bottom: 16px; }
  .tl-dot { position: absolute; left: -20px; top: 4px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--white); background: var(--teal); }
  .tl-time { font-family: var(--mono); font-size: 10px; color: var(--teal); font-weight: 500; }
  .tl-label { font-size: 13px; font-weight: 500; color: var(--text); }
  .tl-detail { font-size: 11px; color: var(--text3); }
  .report-footer { background: var(--navy); color: rgba(255,255,255,0.4); text-align: center; padding: 24px; font-size: 11px; font-family: var(--mono); letter-spacing: 0.06em; }
  .opp-row { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--gray2); }
  .opp-row:last-child { border-bottom: none; }
  .opp-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .opp-label { font-weight: 600; font-size: 13px; color: var(--text); margin-bottom: 2px; }
  .opp-detail { font-size: 11px; color: var(--text3); }
  .opp-range { font-size: 18px; font-weight: 600; margin-left: auto; white-space: nowrap; }
  @media print {
    body { background: white; }
    .page { padding: 20px; }
    .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  @media (max-width: 640px) {
    .report-header { padding: 32px 20px 28px; }
    .report-title { font-size: 26px; }
    .report-sub { margin-bottom: 20px; }
    .header-scorecards { grid-template-columns: 1fr 1fr; }
    .page { padding: 20px 16px 48px; }
    .grid-2, .grid-3, .grid-4, .grid-5 { grid-template-columns: 1fr; }
    .section-header { flex-wrap: wrap; }
    .section-desc { margin-left: 0; text-align: left; max-width: 100%; }
    table { font-size: 12px; }
    th, td { padding: 8px; }
    .opp-row { flex-wrap: wrap; gap: 10px; }
    .opp-range { margin-left: 0; }
    .bar-row .bar-label { width: 120px; }
  }
  @media (max-width: 400px) {
    .header-scorecards { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<div class="report-header">
  <div class="report-label">Financial Impact Report · April 2026</div>
  <div class="report-title">Des Moines → Charlotte<br>Relocation Analysis</div>
  <div class="report-sub">Safal & Family · Combined Household · Based on Origin Financial Data + Market Research</div>
  <div class="header-scorecards">
    <div class="header-card teal"><div class="hc-label">Combined gross/mo (today)</div><div class="hc-val">$13.5K</div><div class="hc-sub">Safal + wife est.</div></div>
    <div class="header-card teal"><div class="hc-label">Target combined (Charlotte)</div><div class="hc-val">$19–22K</div><div class="hc-sub">EMC adj. + RN upgrade</div></div>
    <div class="header-card amber"><div class="hc-label">COL premium</div><div class="hc-val">+21%</div><div class="hc-sub">Charlotte vs Des Moines</div></div>
    <div class="header-card"><div class="hc-label">Nursing incentives</div><div class="hc-val">$30–50K</div><div class="hc-sub">Sign-on + housing assist.</div></div>
    <div class="header-card"><div class="hc-label">State tax delta</div><div class="hc-val">+0.19%</div><div class="hc-sub">IA 3.8% → NC 3.99%</div></div>
  </div>
</div>

<div class="page">

  <!-- SECTION 1: CURRENT BASELINE -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">01</span>
      <span class="section-title">Current Household Baseline — Des Moines</span>
      <span class="section-desc">Your starting point before the move. All figures from Origin Financial data.</span>
    </div>
    <div class="grid-5" style="margin-bottom:18px">
      <div class="metric-card blue"><div class="metric-label">Your net/mo (Origin avg)</div><div class="metric-val">$7,355</div><div class="metric-sub">Nov–Mar 5-mo avg</div></div>
      <div class="metric-card"><div class="metric-label">Avg monthly spend</div><div class="metric-val">$6,978</div><div class="metric-sub">excl. March outlier</div></div>
      <div class="metric-card green"><div class="metric-label">Wife avg net/mo</div><div class="metric-val">~$2,500</div><div class="metric-sub">$1,000–$1,300 biweekly</div></div>
      <div class="metric-card"><div class="metric-label">Combined net/mo</div><div class="metric-val">~$10,275</div><div class="metric-sub">True household baseline</div></div>
      <div class="metric-card amber"><div class="metric-label">Real net after expenses</div><div class="metric-val">~$2,920</div><div class="metric-sub">vs. $643 without wife</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">6-Month Cash Flow — Your Income (Origin)</div>
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:10px;font-family:var(--mono);color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">
            <span>Month</span><span style="width:80px;text-align:right">Income</span><span style="width:80px;text-align:right">Expenses</span><span style="width:72px;text-align:right">Net</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray2);font-size:12px"><span style="width:30px;font-family:var(--mono);color:var(--text3)">Nov</span><div style="flex:1;margin:0 10px"><div class="bar-track" style="margin-bottom:3px"><div class="bar-fill" style="width:47%;background:var(--teal)"></div></div><div class="bar-track"><div class="bar-fill" style="width:39%;background:var(--amber)"></div></div></div><span style="width:80px;text-align:right;color:var(--text2)">$5,648</span><span style="width:80px;text-align:right;color:var(--text2)">$4,626</span><span style="width:72px;text-align:right;font-weight:600;color:var(--teal)">+$1,022</span></div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray2);font-size:12px"><span style="width:30px;font-family:var(--mono);color:var(--text3)">Dec</span><div style="flex:1;margin:0 10px"><div class="bar-track" style="margin-bottom:3px"><div class="bar-fill" style="width:70%;background:var(--teal)"></div></div><div class="bar-track"><div class="bar-fill" style="width:42%;background:var(--amber)"></div></div></div><span style="width:80px;text-align:right;color:var(--text2)">$8,429</span><span style="width:80px;text-align:right;color:var(--text2)">$5,024</span><span style="width:72px;text-align:right;font-weight:600;color:var(--teal)">+$3,405</span></div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray2);font-size:12px"><span style="width:30px;font-family:var(--mono);color:var(--text3)">Jan</span><div style="flex:1;margin:0 10px"><div class="bar-track" style="margin-bottom:3px"><div class="bar-fill" style="width:56%;background:var(--teal)"></div></div><div class="bar-track"><div class="bar-fill" style="width:55%;background:var(--amber)"></div></div></div><span style="width:80px;text-align:right;color:var(--text2)">$6,673</span><span style="width:80px;text-align:right;color:var(--text2)">$6,566</span><span style="width:72px;text-align:right;font-weight:600;color:var(--teal)">+$107</span></div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray2);font-size:12px"><span style="width:30px;font-family:var(--mono);color:var(--text3)">Feb</span><div style="flex:1;margin:0 10px"><div class="bar-track" style="margin-bottom:3px"><div class="bar-fill" style="width:79%;background:var(--teal)"></div></div><div class="bar-track"><div class="bar-fill" style="width:60%;background:var(--amber)"></div></div></div><span style="width:80px;text-align:right;color:var(--text2)">$9,509</span><span style="width:80px;text-align:right;color:var(--text2)">$7,251</span><span style="width:72px;text-align:right;font-weight:600;color:var(--teal)">+$2,258</span></div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:12px"><span style="width:30px;font-family:var(--mono);color:var(--text3)">Mar</span><div style="flex:1;margin:0 10px"><div class="bar-track" style="margin-bottom:3px"><div class="bar-fill" style="width:72%;background:var(--teal)"></div></div><div class="bar-track"><div class="bar-fill" style="width:95%;background:var(--amber)"></div></div></div><span style="width:80px;text-align:right;color:var(--text2)">$8,618</span><span style="width:80px;text-align:right;color:var(--text2)">$11,421</span><span style="width:72px;text-align:right;font-weight:600;color:var(--red)">−$2,803</span></div>
        </div>
        <div style="display:flex;gap:16px;font-size:11px;color:var(--text3);margin-bottom:4px"><span><span style="display:inline-block;width:10px;height:10px;background:var(--teal);border-radius:2px;margin-right:4px"></span>Income</span><span><span style="display:inline-block;width:10px;height:10px;background:var(--amber);border-radius:2px;margin-right:4px"></span>Expenses</span></div>
        <p class="footnote">March spike to $11.4K in expenses is an outlier worth auditing before lender review.</p>
      </div>
      <div class="card">
        <div class="card-title">Where The Money Goes (Avg Monthly)</div>
        <div style="margin:8px 0 12px">
          <div class="bar-row"><span class="bar-label">Housing (est.)</span><div class="bar-track"><div class="bar-fill" style="width:31%;background:var(--blue)"></div></div><span class="bar-pct">$1,800</span></div>
          <div class="bar-row"><span class="bar-label">Other expenses</span><div class="bar-track"><div class="bar-fill" style="width:52%;background:var(--amber)"></div></div><span class="bar-pct">$5,204</span></div>
          <div class="bar-row"><span class="bar-label">Net savings</span><div class="bar-track"><div class="bar-fill" style="width:100%;background:var(--teal)"></div></div><span class="bar-pct">$2,920</span></div>
        </div>
        <p class="footnote">Housing includes current Des Moines mortgage est. $1,800/mo.</p>
      </div>
    </div>
  </div>

  <!-- SECTION 2: SALARY -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">02</span>
      <span class="section-title">Safal's Salary — EMC Geo-Adjustment vs. Market</span>
      <span class="section-desc">Staying at EMC is safe but likely below COL break-even. Open market is the upside play post-move.</span>
    </div>
    <div class="card" style="margin-bottom:18px">
      <div class="card-title">Salary Comparison — Des Moines vs Charlotte (SE / SE III)</div>
      <div style="margin:8px 0 4px">
        <div class="bar-row"><span class="bar-label">Current (Des Moines)</span><div class="bar-track"><div class="bar-fill" style="width:20%;background:var(--gray3)"></div></div><span class="bar-pct">$118K</span></div>
        <div class="bar-row"><span class="bar-label">EMC geo-adj. conservative</span><div class="bar-track"><div class="bar-fill" style="width:30%;background:#2463ae88"></div></div><span class="bar-pct">$127K</span></div>
        <div class="bar-row"><span class="bar-label">EMC geo-adj. mid (likely)</span><div class="bar-track"><div class="bar-fill" style="width:37%;background:var(--blue)"></div></div><span class="bar-pct">$133K</span></div>
        <div class="bar-row"><span class="bar-label">EMC geo-adj. optimistic</span><div class="bar-track"><div class="bar-fill" style="width:43%;background:#1a9e7a88"></div></div><span class="bar-pct">$139K</span></div>
        <div class="bar-row"><span class="bar-label">COL break-even threshold</span><div class="bar-track"><div class="bar-fill" style="width:48%;background:var(--amber)"></div></div><span class="bar-pct">$143K</span></div>
        <div class="bar-row"><span class="bar-label">Charlotte market (SE avg)</span><div class="bar-track"><div class="bar-fill" style="width:52%;background:#6c4fcf44"></div></div><span class="bar-pct">$147K</span></div>
        <div class="bar-row"><span class="bar-label">Open market target (SE III)</span><div class="bar-track"><div class="bar-fill" style="width:72%;background:var(--teal)"></div></div><span class="bar-pct">$165K</span></div>
        <div class="bar-row"><span class="bar-label">Financial sector ceiling</span><div class="bar-track"><div class="bar-fill" style="width:100%;background:var(--purple)"></div></div><span class="bar-pct">$185K</span></div>
      </div>
      <p class="footnote" style="margin-top:8px">Bars scaled relative to $100K baseline. COL break-even = minimum required for household neutral in Charlotte.</p>
    </div>
    <div class="grid-4" style="margin-bottom:18px">
      <div class="metric-card"><div class="metric-label">Current base (DM)</div><div class="metric-val">$118K</div><div class="metric-sub">EMC Insurance · SE III</div></div>
      <div class="metric-card blue"><div class="metric-label">EMC geo-adj. mid</div><div class="metric-val">$133K</div><div class="metric-sub">+12.7% estimated</div></div>
      <div class="metric-card amber"><div class="metric-label">COL break-even</div><div class="metric-val">$143K</div><div class="metric-sub">Neutral at Charlotte COL</div></div>
      <div class="metric-card green"><div class="metric-label">Open market target</div><div class="metric-val">$165K</div><div class="metric-sub">Charlotte SE III avg</div></div>
    </div>
    <div class="grid-3">
      <div class="scenario-card green">
        <div class="scenario-title">Conservative — Stay at EMC</div>
        <div class="scenario-sub">Geo-adjusted, low estimate</div>
        <div class="s-row"><span class="key">Your base</span><span class="val">$127K</span></div>
        <div class="s-row"><span class="key">Wife (Iowa RN)</span><span class="val">~$45K</span></div>
        <div class="s-row"><span class="key">Combined gross</span><span class="val">$172K</span></div>
        <div class="s-row"><span class="key">vs COL break-even</span><span class="val" style="color:var(--red)">−$16K short</span></div>
        <div class="scenario-note">Tight. Wife must upgrade quickly or lifestyle compresses.</div>
      </div>
      <div class="scenario-card amber">
        <div class="scenario-title">Base Case — EMC Mid + Wife CLT RN</div>
        <div class="scenario-sub">Most likely near-term scenario</div>
        <div class="s-row"><span class="key">Your base</span><span class="val">$133K</span></div>
        <div class="s-row"><span class="key">Wife (Charlotte RN)</span><span class="val">~$100K</span></div>
        <div class="s-row"><span class="key">Combined gross</span><span class="val">$233K</span></div>
        <div class="s-row"><span class="key">vs COL break-even</span><span class="val" style="color:var(--teal)">+$74K headroom</span></div>
        <div class="scenario-note">This is the scenario that makes the move financially sound.</div>
      </div>
      <div class="scenario-card blue">
        <div class="scenario-title">Upside — Open Market + Wife CLT RN</div>
        <div class="scenario-sub">12–24 months post-move</div>
        <div class="s-row"><span class="key">Your base</span><span class="val">$165K+</span></div>
        <div class="s-row"><span class="key">Wife (Charlotte RN)</span><span class="val">~$100K</span></div>
        <div class="s-row"><span class="key">Combined gross</span><span class="val">$265K+</span></div>
        <div class="s-row"><span class="key">vs COL break-even</span><span class="val" style="color:var(--teal)">+$122K headroom</span></div>
        <div class="scenario-note">Strong buy position. 20% down on $550K home is achievable.</div>
      </div>
    </div>
  </div>

  <!-- SECTION 3: WIFE'S NURSING OPPORTUNITY -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">03</span>
      <span class="section-title">Wife's Nursing Career — The Income Lever</span>
      <span class="section-desc">Iowa RN rate ≈ $45K gross. Charlotte market pays $84–119K. This gap funds the move.</span>
    </div>
    <div class="grid-4" style="margin-bottom:18px">
      <div class="metric-card"><div class="metric-label">Iowa RN gross (est.)</div><div class="metric-val">~$45K</div><div class="metric-sub">Based on $2,500/mo net</div></div>
      <div class="metric-card green"><div class="metric-label">Charlotte RN avg (Atrium)</div><div class="metric-val">$84–119K</div><div class="metric-sub">Full-time floor/ceiling</div></div>
      <div class="metric-card amber"><div class="metric-label">Sign-on bonus range</div><div class="metric-val">$15–30K</div><div class="metric-sub">Atrium / Novant typical</div></div>
      <div class="metric-card blue"><div class="metric-label">Housing assist. programs</div><div class="metric-val">$5–20K</div><div class="metric-sub">NCHFA + hospital programs</div></div>
    </div>
    <div class="grid-3" style="margin-bottom:18px">
      <div class="program-card">
        <div class="program-icon" style="background:var(--teal-light)">🏥</div>
        <div class="program-name">Atrium Health</div>
        <div class="program-type">Primary Target</div>
        <div class="program-amount" style="color:var(--teal)">$15–25K sign-on</div>
        <div class="program-detail">Largest Charlotte health system. ICU/ED RNs command top rates. 2-year commitment typical. Interview pipeline: 4–8 weeks.</div>
      </div>
      <div class="program-card">
        <div class="program-icon" style="background:var(--blue-light)">🏥</div>
        <div class="program-name">Novant Health</div>
        <div class="program-type">Secondary Target</div>
        <div class="program-amount" style="color:var(--blue)">$10–20K sign-on</div>
        <div class="program-detail">Strong benefits package. Presbyterian Medical Center flagship. Competitive with Atrium in base pay. Often faster hiring.</div>
      </div>
      <div class="program-card">
        <div class="program-icon" style="background:var(--purple-light)">🏠</div>
        <div class="program-name">NCHFA Programs</div>
        <div class="program-type">Down Payment Assist.</div>
        <div class="program-amount" style="color:var(--purple)">Up to $15K</div>
        <div class="program-detail">NC Home Advantage Mortgage. Healthcare workers qualify. Forgivable after 15 years. Must use approved lender.</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Household Income Transformation</div>
      <div style="margin:8px 0 12px">
        <div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text2);margin-bottom:4px">Today (Des Moines) — <strong>$163K</strong></div><div class="bar-track" style="height:14px;border-radius:6px;overflow:hidden;display:flex"><div style="width:45%;background:var(--blue);height:100%"></div><div style="width:17%;background:var(--teal);height:100%"></div></div></div>
        <div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text2);margin-bottom:4px">EMC mid + Wife Iowa RN — <strong>$178K</strong></div><div class="bar-track" style="height:14px;border-radius:6px;overflow:hidden;display:flex"><div style="width:50%;background:var(--blue);height:100%"></div><div style="width:17%;background:var(--teal);height:100%"></div></div></div>
        <div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text2);margin-bottom:4px">EMC mid + Wife Charlotte RN — <strong>$233K</strong></div><div class="bar-track" style="height:14px;border-radius:6px;overflow:hidden;display:flex"><div style="width:50%;background:var(--blue);height:100%"></div><div style="width:38%;background:var(--teal);height:100%"></div></div></div>
        <div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text2);margin-bottom:4px">EMC opt. + Wife Charlotte RN — <strong>$239K</strong></div><div class="bar-track" style="height:14px;border-radius:6px;overflow:hidden;display:flex"><div style="width:52%;background:var(--blue);height:100%"></div><div style="width:38%;background:var(--teal);height:100%"></div></div></div>
        <div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text2);margin-bottom:4px">Open market + Wife Charlotte RN — <strong>$265K</strong></div><div class="bar-track" style="height:14px;border-radius:6px;overflow:hidden;display:flex"><div style="width:62%;background:var(--blue);height:100%"></div><div style="width:38%;background:var(--teal);height:100%"></div></div></div>
      </div>
      <div style="display:flex;gap:16px;font-size:11px;color:var(--text3);margin-bottom:8px"><span><span style="display:inline-block;width:10px;height:10px;background:var(--blue);border-radius:2px;margin-right:4px"></span>Your income</span><span><span style="display:inline-block;width:10px;height:10px;background:var(--teal);border-radius:2px;margin-right:4px"></span>Wife's income</span></div>
      <p class="footnote">Wife's current gross estimated at ~$45K based on $26–34K/yr net take-home. Charlotte RN avg ($100K) assumes full-time at Atrium. Open market scenario = you switching employers 12+ months post-move.</p>
    </div>
  </div>

  <!-- SECTION 4: MOVE ECONOMICS -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">04</span>
      <span class="section-title">Move Economics — Cost of Living & Housing</span>
      <span class="section-desc">Charlotte COL is 21% above Des Moines. Housing is the primary driver.</span>
    </div>
    <div class="grid-4" style="margin-bottom:18px">
      <div class="metric-card amber"><div class="metric-label">COL premium</div><div class="metric-val">+21%</div><div class="metric-sub">Charlotte vs Des Moines</div></div>
      <div class="metric-card"><div class="metric-label">Median home price (CLT)</div><div class="metric-val">$415K</div><div class="metric-sub">Charlotte metro 2026</div></div>
      <div class="metric-card blue"><div class="metric-label">Target price range</div><div class="metric-val">$450–550K</div><div class="metric-sub">Good schools + commute</div></div>
      <div class="metric-card green"><div class="metric-label">State income tax delta</div><div class="metric-val">+0.19%</div><div class="metric-sub">IA 3.8% → NC 3.99%</div></div>
    </div>
    <div class="grid-2" style="margin-bottom:18px">
      <div class="card">
        <div class="card-title">Monthly Cost Comparison — Des Moines vs Charlotte</div>
        <table>
          <thead><tr><th>Category</th><th>Des Moines</th><th>Charlotte</th><th>Delta</th></tr></thead>
          <tbody>
            <tr><td>Housing (PITI est.)</td><td>$1,800</td><td>$2,800–3,200</td><td style="color:var(--red)">+$1,000–1,400</td></tr>
            <tr><td>Childcare / K-12</td><td>~$800</td><td>~$1,000</td><td style="color:var(--amber)">+$200</td></tr>
            <tr><td>Groceries</td><td>~$900</td><td>~$1,050</td><td style="color:var(--amber)">+$150</td></tr>
            <tr><td>Transportation</td><td>~$600</td><td>~$700</td><td style="color:var(--amber)">+$100</td></tr>
            <tr><td>Utilities</td><td>~$200</td><td>~$180</td><td style="color:var(--teal)">−$20</td></tr>
            <tr class="highlight"><td><strong>Total est.</strong></td><td><strong>~$4,300</strong></td><td><strong>~$5,730–6,130</strong></td><td><strong style="color:var(--red)">+$1,430–1,830</strong></td></tr>
          </tbody>
        </table>
        <p class="footnote">Housing delta is the dominant cost driver. Wife's RN upgrade covers this gap entirely.</p>
      </div>
      <div class="card">
        <div class="card-title">DTI Analysis — Target Home Scenarios</div>
        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px">$450K home · 10% down · 7% rate</div>
          <div class="dti-row"><div class="dti-label"><span>PITI ≈ $2,990/mo</span><span>DTI on $233K combined: <strong>15.4%</strong></span></div><div class="dti-track"><div class="dti-fill" style="width:41%;background:var(--teal)"></div></div></div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px">$500K home · 10% down · 7% rate</div>
          <div class="dti-row"><div class="dti-label"><span>PITI ≈ $3,322/mo</span><span>DTI on $233K combined: <strong>17.1%</strong></span></div><div class="dti-track"><div class="dti-fill" style="width:46%;background:var(--teal)"></div></div></div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px">$550K home · 20% down · 7% rate</div>
          <div class="dti-row"><div class="dti-label"><span>PITI ≈ $3,253/mo</span><span>DTI on $265K upside: <strong>14.7%</strong></span></div><div class="dti-track"><div class="dti-fill" style="width:39%;background:var(--blue)"></div></div></div>
        </div>
        <p class="footnote" style="margin-top:12px">All DTI scenarios are well below the 43% conventional limit. Lenders will approve this household.</p>
      </div>
    </div>

    <!-- TIMELINE -->
    <div class="card">
      <div class="card-title">Recommended Move Sequencing</div>
      <div class="grid-2">
        <div class="timeline">
          <div class="tl-item"><div class="tl-dot"></div><div class="tl-time">NOW — Apr 2026</div><div class="tl-label">Confirm EMC geo-adjustment amount</div><div class="tl-detail">Get the number in writing before making financial decisions</div></div>
          <div class="tl-item"><div class="tl-dot"></div><div class="tl-time">Apr–May 2026</div><div class="tl-label">Wife secures Atrium/Novant offer + sign-on</div><div class="tl-detail">Target $15–30K sign-on. Read commitment clause carefully.</div></div>
          <div class="tl-item"><div class="tl-dot"></div><div class="tl-time">May–Jun 2026</div><div class="tl-label">List Des Moines home</div><div class="tl-detail">Audit March expense spike first for lender review</div></div>
          <div class="tl-item"><div class="tl-dot"></div><div class="tl-time">Jun–Aug 2026</div><div class="tl-label">Bridge rental in Charlotte (3–6 months)</div><div class="tl-detail">Sell DM + Rent CLT. Let sign-on bonuses land.</div></div>
        </div>
        <div class="timeline">
          <div class="tl-item"><div class="tl-dot" style="background:var(--amber)"></div><div class="tl-time">Aug–Dec 2026</div><div class="tl-label">Accumulate to 20% down payment</div><div class="tl-detail">DM sale proceeds + combined savings + sign-on bonuses</div></div>
          <div class="tl-item"><div class="tl-dot" style="background:var(--amber)"></div><div class="tl-time">Jan–Jun 2027</div><div class="tl-label">Buy Charlotte home — $450–550K range</div><div class="tl-detail">Good schools + commute. Fort Mill / Tega Cay / Waxhaw.</div></div>
          <div class="tl-item"><div class="tl-dot" style="background:var(--purple)"></div><div class="tl-time">12–24 mo post-move</div><div class="tl-label">Pursue open market (Safal)</div><div class="tl-detail">Charlotte fintech/banking pays $155–175K for .NET/DDD</div></div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 5: OPPORTUNITY SUMMARY -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">05</span>
      <span class="section-title">Income Upside Opportunities</span>
      <span class="section-desc">Total addressable upside beyond current household income over 2–3 years.</span>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Opportunity Stack</div>
        <div class="opp-row"><div class="opp-icon" style="background:var(--teal-light)">💊</div><div><div class="opp-label">Wife: Iowa → Charlotte RN upgrade</div><div class="opp-detail">Atrium/Novant full-time RN. Base rate jump alone.</div></div><div class="opp-range" style="color:var(--teal)">+$55K/yr</div></div>
        <div class="opp-row"><div class="opp-icon" style="background:var(--amber-light)">🏦</div><div><div class="opp-label">Wife: Nursing sign-on bonus</div><div class="opp-detail">One-time. Clawback if leaving before commitment period.</div></div><div class="opp-range" style="color:var(--amber)">+$15–30K</div></div>
        <div class="opp-row"><div class="opp-icon" style="background:var(--blue-light)">💻</div><div><div class="opp-label">Safal: EMC geo-adjustment</div><div class="opp-detail">Mid estimate. Confirm before finalizing move plan.</div></div><div class="opp-range" style="color:var(--blue)">+$15K/yr</div></div>
        <div class="opp-row"><div class="opp-icon" style="background:var(--purple-light)">🚀</div><div><div class="opp-label">Safal: Charlotte open market (.NET/DDD)</div><div class="opp-detail">Charlotte financial sector (.NET/DDD) pays $155–175K. Pursue 6–12 months post-move.</div></div><div class="opp-range" style="color:var(--blue)">+$40K/yr</div></div>
      </div>
      <div style="background:var(--navy); border-radius:14px; padding:28px 32px; color:white">
        <div style="font-family:var(--serif); font-size:20px; font-weight:600; margin-bottom:6px">The Bottom Line</div>
        <div style="font-size:13px; color:rgba(255,255,255,0.6); margin-bottom:22px">What this analysis says about your household's financial trajectory</div>
        <div style="display:grid; grid-template-columns:1fr; gap:20px">
          <div><div style="font-family:var(--mono); font-size:10px; letter-spacing:0.1em; color:var(--teal); text-transform:uppercase; margin-bottom:8px">The math that makes it work</div><div style="font-size:13px; color:rgba(255,255,255,0.8); line-height:1.7">EMC's geo-adjustment alone does <strong style="color:white">not</strong> cover Charlotte's COL premium at the mid estimate. But your wife's move into the Charlotte nursing market at $84–119K — versus her current Iowa RN rate — is the income lever that makes the whole equation work. The sign-on bonus ($15–30K) is essentially a moving cost subsidy.</div></div>
          <div><div style="font-family:var(--mono); font-size:10px; letter-spacing:0.1em; color:#f0b84e; text-transform:uppercase; margin-bottom:8px">Key risk to manage</div><div style="font-size:13px; color:rgba(255,255,255,0.8); line-height:1.7">The March $11.4K expense spike in your Origin data needs to be explained before you go to a lender. One-time outlier = fine. Recurring category = problem. Also: sign-on bonuses are clawed back if she leaves before the commitment period — read the contract carefully.</div></div>
          <div><div style="font-family:var(--mono); font-size:10px; letter-spacing:0.1em; color:#a78bfa; text-transform:uppercase; margin-bottom:8px">Recommended sequencing</div><div style="font-size:13px; color:rgba(255,255,255,0.8); line-height:1.7"><strong style="color:white">1.</strong> Confirm EMC adjustment amount before finalizing move<br><strong style="color:white">2.</strong> Wife secures Atrium or Novant offer with sign-on<br><strong style="color:white">3.</strong> Consider bridge rental (Sell DM + Rent CLT)<br><strong style="color:white">4.</strong> Let sign-on bonuses land, accumulate to 20% down<br><strong style="color:white">5.</strong> Buy Charlotte home 12–18 months post-move</div></div>
        </div>
      </div>
    </div>
  </div>

</div>

<div class="report-footer">
  Generated April 2026 · Based on Origin Financial Data, Glassdoor, Numbeo, NCHFA, Atrium Health, Novant Health, Tax Foundation · All figures are estimates for planning purposes only
</div>

</body>
</html>`;
}
