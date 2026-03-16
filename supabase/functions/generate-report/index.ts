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

type ReportType = "move-overview" | "home-sale" | "house-hunt";

const REPORT_TITLES: Record<ReportType, string> = {
  "move-overview": "Full Move Planning Report",
  "home-sale":     "Home Sale Preparation Report",
  "house-hunt":    "House Hunt & School Research Report",
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

    // 2. Fetch all data in parallel (only columns Claude or the template needs)
    const ctx = await fetchContext(supabase, reportType);

    // 3. Pre-build data HTML (server-side, no AI tokens spent)
    const { header, footer } = buildReportShell(reportType, ctx);

    // 4. Compact prompt: Claude writes only the analysis narrative
    const { system, userMessage } = buildPrompt(reportType, ctx);

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

          const finalMessage = await claudeStream.finalMessage();

          // Append closing HTML
          accumulatedHtml += footer;
          send({ type: "chunk", text: footer });

          // Persist
          await supabase
            .from("reports")
            .update({
              status:       "complete",
              html_content: accumulatedHtml,
              metadata: {
                input_tokens:  finalMessage.usage.input_tokens,
                output_tokens: finalMessage.usage.output_tokens,
              },
            })
            .eq("id", reportId);

          send({ type: "done", reportId });
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
    "move-overview": "overall move readiness, sell/buy coordination, and timeline risk",
    "home-sale":     "listing readiness, sell-side task priority, and path to market",
    "house-hunt":    "property options, school fit for a kindergartener, and buy-side decision criteria",
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
