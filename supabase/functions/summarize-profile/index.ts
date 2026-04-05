const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProfilePriorities {
  must: string[]
  dealbreak: string[]
  strong: string[]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { priorities } = await req.json() as { priorities: ProfilePriorities }

    if (!priorities || !priorities.must || !priorities.dealbreak || !priorities.strong) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: priorities' }),
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

    const systemPrompt = `You are a friendly real estate assistant helping a family communicate their home search criteria to their agent. Write 2–3 concise sentences summarizing what this family is looking for. Be specific, warm, and agent-friendly. No bullet points. No headers. Plain prose only.`

    const userPrompt = `Here are the Rana Magar family's home search priorities in the Charlotte metro area (Indian Land / Fort Mill / Waxhaw / Tega Cay):

Must Have (${priorities.must.length}):
${priorities.must.map(s => `- ${s}`).join('\n')}

Deal Breakers (${priorities.dealbreak.length}):
${priorities.dealbreak.map(s => `- ${s}`).join('\n')}

Strong Wants (${priorities.strong.length}):
${priorities.strong.map(s => `- ${s}`).join('\n')}

Write a 2–3 sentence summary a real estate agent can read at a glance.`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
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

    const summary = anthropicData.content?.[0]?.text?.trim() || ''

    return new Response(
      JSON.stringify({ ok: true, summary }),
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
