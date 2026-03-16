import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildResearchContext, buildPropertyPrompt, buildSchoolPrompt } from './researchContext.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entityType, entityId, entityData } = await req.json() as {
      entityType: 'property' | 'school'
      entityId: string
      entityData: Record<string, unknown>
    }

    if (!entityType || !entityId || !entityData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: entityType, entityId, entityData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client (service role — needed to write analysis back)
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase     = createClient(supabaseUrl, serviceKey)

    // Fetch live profile data to personalize the AI context
    const { data: profileRows } = await supabase.from('profile').select('key, value')
    const profile = Object.fromEntries(
      (profileRows || []).map((r: { key: string; value: string | null }) => [r.key, r.value || ''])
    )

    // Build prompts with live profile data
    const systemPrompt = buildResearchContext(profile)
    const userPrompt   = entityType === 'property'
      ? buildPropertyPrompt(entityData, profile)
      : buildSchoolPrompt(entityData, profile)

    // Call Anthropic API
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${anthropicRes.status}`, detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicData = await anthropicRes.json() as {
      content: Array<{ type: string; text: string }>
    }

    const rawText = anthropicData.content?.[0]?.text || ''

    // Strip markdown fences if present
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    let analysis: Record<string, unknown>
    try {
      analysis = JSON.parse(jsonText)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse Claude response as JSON', raw: rawText }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Write result back to the property or school row
    const table = entityType === 'property' ? 'properties' : 'schools'
    const { error: dbError } = await supabase
      .from(table)
      .update({
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq('id', entityId)

    if (dbError) {
      console.error('Supabase write error:', dbError)
      // Still return analysis even if write fails — client can retry
    }

    return new Response(
      JSON.stringify({ ok: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
