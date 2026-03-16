/**
 * Supabase Edge Function: generate-report
 *
 * POST /functions/v1/generate-report
 * Body: { reportType: ReportType, requestedBy: string, reportId: string }
 *
 * Flow:
 *  1. Create a `reports` row (status = 'generating')
 *  2. Fetch all relevant data from the DB
 *  3. Stream Claude's HTML response back via SSE
 *  4. When stream ends, update the row (status = 'complete', html_content = full HTML)
 *
 * The client subscribes to the SSE stream for the live preview, and also
 * watches the `reports` table via Supabase Realtime for status changes.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.27";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportType = "move-overview" | "home-sale" | "house-hunt";

const REPORT_TITLES: Record<ReportType, string> = {
  "move-overview": "Full Move Planning Report",
  "home-sale":     "Home Sale Preparation Report",
  "house-hunt":    "House Hunt & School Research Report",
};

// ── CORS headers (adjust origin for production) ───────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
  const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey  = Deno.env.get("ANTHROPIC_API_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const claude   = new Anthropic({ apiKey: anthropicKey });

  let reportId: string | undefined;

  try {
    const { reportType, requestedBy } = (await req.json()) as {
      reportType: ReportType;
      requestedBy: string;
    };

    if (!REPORT_TITLES[reportType]) {
      return new Response(
        JSON.stringify({ error: "Invalid reportType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 1. Insert a pending report row ──────────────────────────────────────
    const { data: reportRow, error: insertError } = await supabase
      .from("reports")
      .insert({
        report_type:  reportType,
        title:        REPORT_TITLES[reportType],
        status:       "generating",
        requested_by: requestedBy,
      })
      .select("id")
      .single();

    if (insertError || !reportRow) {
      throw new Error(`Failed to create report row: ${insertError?.message}`);
    }
    reportId = reportRow.id;

    // ── 2. Fetch context data ────────────────────────────────────────────────
    const context = await fetchContext(supabase, reportType);

    // ── 3. Build the prompt ──────────────────────────────────────────────────
    const { system, userMessage } = buildPrompt(reportType, context);

    // ── 4. Stream Claude's response back as SSE ──────────────────────────────
    let accumulatedHtml = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Wrap enqueue so a disconnected client never throws and corrupts
        // the DB status — generation continues and saves even if the SSE
        // stream is cancelled mid-flight.
        const send = (payload: object) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
            );
          } catch {
            // client disconnected; ignore
          }
        };

        // Send the report ID first so the client can watch Realtime
        send({ type: "report_id", reportId });

        try {
          const claudeStream = claude.messages.stream({
            model:      "claude-sonnet-4-6",
            max_tokens: 16000,
            system,
            messages:   [{ role: "user", content: userMessage }],
          });

          for await (const event of claudeStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = event.delta.text;
              accumulatedHtml += chunk;
              send({ type: "chunk", text: chunk });
            }
          }

          const finalMessage = await claudeStream.finalMessage();

          // ── 5. Persist completed report ────────────────────────────────────
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
        } catch (streamError) {
          const msg = streamError instanceof Error ? streamError.message : String(streamError);

          await supabase
            .from("reports")
            .update({ status: "error", error_message: msg })
            .eq("id", reportId);

          send({ type: "error", message: msg });
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (reportId) {
      await (createClient(supabaseUrl, serviceKey))
        .from("reports")
        .update({ status: "error", error_message: msg })
        .eq("id", reportId);
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchContext(supabase: ReturnType<typeof createClient>, reportType: ReportType) {
  // Always fetch profile (the flat key/value store)
  const [profileRes, todosRes, branchesRes, whatIfsRes, propertiesRes, schoolsRes, contactsRes] =
    await Promise.all([
      supabase.from("profile").select("*"),
      supabase.from("todos").select("*").order("tier").order("created_at"),
      supabase.from("branches").select("*").order("created_at"),
      supabase.from("whatifs").select("*").order("created_at"),
      supabase.from("properties").select("*").order("created_at"),
      supabase.from("schools").select("*").order("created_at"),
      supabase.from("contacts").select("*, contact_notes(*)").order("created_at"),
    ]);

  const profile    = profileRes.data    ?? [];
  const todos      = todosRes.data      ?? [];
  const branches   = branchesRes.data   ?? [];
  const whatifs    = whatIfsRes.data    ?? [];
  const properties = propertiesRes.data ?? [];
  const schools    = schoolsRes.data    ?? [];
  const contacts   = contactsRes.data   ?? [];

  // Convert the flat profile rows to a readable key/value map
  const profileMap = Object.fromEntries(
    profile.map((r: { key: string; value: unknown }) => [r.key, r.value]),
  );

  // Filter todos by sell-side tiers for home-sale report
  const sellTiers = ["sell1", "sell2", "sell3", "sell4"];
  const buytTiers = ["buy1",  "buy2",  "buy3",  "buy4"];

  return {
    profile: profileMap,
    todos: reportType === "home-sale"
      ? todos.filter((t: { tier: string }) => sellTiers.includes(t.tier))
      : reportType === "house-hunt"
      ? todos.filter((t: { tier: string }) => buytTiers.includes(t.tier))
      : todos,
    branches,
    whatifs,
    properties,
    schools,
    contacts: reportType === "home-sale"
      ? contacts.filter((c: { role: string }) =>
          ["listing-agent", "contractor", "stager", "photographer"].includes(c.role))
      : contacts,
  };
}

// ── Prompt building ───────────────────────────────────────────────────────────

function buildPrompt(reportType: ReportType, context: Record<string, unknown>) {
  const system = `You are a home planning report generator for a family of 4 who is simultaneously selling their home at 6805 Brookview Dr, Urbandale, IA and relocating to the Charlotte, NC/SC area (Fort Mill, Tega Cay, Indian Land). The family has two children: a 5-year-old starting kindergarten in August 2026 and a 22-month-old.

Generate a COMPLETE, self-contained HTML report using the data provided. The HTML must:
- Include ALL styles inline in a <style> tag in the <head>. Zero external CSS or JS dependencies.
- Use system fonts: 'Segoe UI', Arial, sans-serif
- Use this color palette:
    --blue-dark:   #1F497D
    --blue-mid:    #2E75B6
    --green:       #237523
    --orange:      #C55A11
    --red:         #C00000
    --gold:        #BF9A00
    --bg:          #F5F7FA
- Include a hero header with the report title, family name, and date
- Use cards, tables, and colored callout boxes to present information
- Have clear H2/H3 section headings
- Be mobile-responsive (use CSS flexbox/grid, max-width: 900px centered)
- For any empty data sections, say "No data recorded yet" rather than omitting the section
- Conclude with a "Priority Actions" section summarizing the top 5 things to do next

Output ONLY the HTML document starting with <!DOCTYPE html>. No markdown, no code fences, no explanation.`;

  const reportDescriptions: Record<ReportType, string> = {
    "move-overview": `Generate a FULL MOVE PLANNING REPORT covering all aspects: current sell-side progress, buy-side house hunt, school research, pending decisions, contingency scenarios, and key contacts. Give a holistic view of where the family stands in their move.`,
    "home-sale":     `Generate a HOME SALE PREPARATION REPORT focused entirely on selling 6805 Brookview Dr. Cover: current listing readiness, completed improvements and their value impact, outstanding pre-listing tasks organized by priority tier, key contacts (agents, contractors), and an estimated net proceeds calculation if data is available.`,
    "house-hunt":    `Generate a HOUSE HUNT & SCHOOL RESEARCH REPORT focused on the Charlotte-area buy side. Cover: all properties in the pipeline with their status and any AI analysis, school district research and ratings, neighborhood comparisons, and key criteria for the decision.`,
  };

  const userMessage = `${reportDescriptions[reportType]}

Here is all current data from the family's move planning app:

\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

Generate the complete HTML report now.`;

  return { system, userMessage };
}
