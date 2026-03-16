// inbound-email — Cloudmailin inbound webhook → contact_note
//
// Setup (one-time, ~10 minutes, no domain needed):
//   1. Sign up free at https://cloudmailin.com — gives you a unique @cloudmailin.net address
//   2. In Cloudmailin → Address settings → set Target URL to:
//        https://<INBOUND_EMAIL_USER>:<INBOUND_EMAIL_PASS>@<project-ref>.supabase.co/functions/v1/inbound-email
//   3. Set Post Format to "JSON (Normalised)"
//   4. supabase secrets set INBOUND_EMAIL_USER=<any username> INBOUND_EMAIL_PASS=<any password>
//   5. supabase functions deploy inbound-email
//
// Usage:
//   Forward any email to your @cloudmailin.net address.
//   The function auto-matches the original sender → contact and logs it as a contact note.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CloudmailinPayload {
  headers: {
    from?:    string   // "Name <email>" or "email"
    subject?: string
    [k: string]: string | undefined
  }
  plain:       string | null
  html:        string | null
  spam_score?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract plain email address from "Name <email>" or "email" */
function extractEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/)
  return (m ? m[1] : raw).trim().toLowerCase()
}

/** Extract display name from "Name <email>" */
function extractName(raw: string): string {
  const m = raw.match(/^([^<]+)</)
  return m ? m[1].trim() : ''
}

/** Strip the domain from an email: "foo@bar.com" → "bar.com" */
function emailDomain(email: string): string {
  return email.split('@')[1] ?? ''
}

/** Trim to plain text and cap at maxLen chars. */
function toSnippet(plain: string | null, html: string | null, maxLen = 600): string {
  const src = plain
    ?? html?.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
    ?? ''
  return src.length > maxLen ? src.slice(0, maxLen) + '…' : src
}

/**
 * Parse a forwarded email body for the original sender's email address.
 * Handles Gmail ("---------- Forwarded message ---------\nFrom: ...")
 * and Outlook ("-----Original Message-----\nFrom: ...") formats.
 * Returns the extracted email, or null if not found.
 */
function extractForwardedFrom(body: string): string | null {
  // Gmail / standard forwarded block — look for "From:" line after the divider
  const m = body.match(
    /(?:forwarded message|original message)[^\n]*\n(?:[^\n]*\n)*?from:\s*([^\n]+)/i
  )
  if (m) {
    const email = extractEmail(m[1].trim())
    if (email.includes('@')) return email
  }
  // Fallback: bare "> From:" line in a quoted reply
  const m2 = body.match(/^>?\s*from:\s*([^\n]+)/im)
  if (m2) {
    const email = extractEmail(m2[1].trim())
    if (email.includes('@') && !email.endsWith('@cloudmailin.net')) return email
  }
  return null
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // HTTP Basic Auth — credentials are embedded by Cloudmailin in the target URL
  const expectedUser = Deno.env.get('INBOUND_EMAIL_USER')
  const expectedPass = Deno.env.get('INBOUND_EMAIL_PASS')
  if (expectedUser && expectedPass) {
    const authHeader = req.headers.get('authorization') ?? ''
    const b64 = authHeader.replace(/^Basic\s+/i, '')
    const decoded = b64 ? atob(b64) : ''
    const [user, pass] = decoded.split(':')
    if (user !== expectedUser || pass !== expectedPass) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let payload: CloudmailinPayload
  try {
    payload = await req.json() as CloudmailinPayload
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  // Basic spam filter
  if ((payload.spam_score ?? 0) > 5) {
    return new Response('Spam filtered', { status: 200 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const senderRaw   = payload.headers.from ?? ''
  const senderEmail = extractEmail(senderRaw)
  const senderName  = extractName(senderRaw)
  const subject     = payload.headers.subject?.trim() ?? '(no subject)'
  const snippet     = toSnippet(payload.plain, payload.html)

  // Detect forwarded email — use original sender as the primary match target
  const bodyText       = payload.plain ?? payload.html?.replace(/<[^>]+>/g, ' ') ?? ''
  const forwardedEmail = extractForwardedFrom(bodyText)
  const targetEmail    = forwardedEmail ?? senderEmail
  const targetDomain   = emailDomain(targetEmail)

  // ── 1. Try to match a contact ────────────────────────────────────────────

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, email')

  let matchedContactId: string | null = null
  let matchMethod = ''

  if (contacts && contacts.length > 0) {
    // Exact email match against the target (forwarded-from if available, else envelope sender)
    const exact = contacts.find(
      c => c.email && extractEmail(c.email) === targetEmail
    )
    if (exact) {
      matchedContactId = exact.id
      matchMethod = forwardedEmail ? 'forwarded-from exact' : 'exact email match'
    }

    // Domain match
    if (!matchedContactId && targetDomain) {
      const domainMatch = contacts.find(
        c => c.email && emailDomain(extractEmail(c.email)) === targetDomain
      )
      if (domainMatch) {
        matchedContactId = domainMatch.id
        matchMethod = forwardedEmail ? 'forwarded-from domain' : 'email domain match'
      }
    }
  }

  // ── 2. If no match, create a new contact ─────────────────────────────────

  if (!matchedContactId) {
    const newName = senderName || targetEmail
    const { data: newContact, error: createErr } = await supabase
      .from('contacts')
      .insert({
        name:     newName,
        email:    targetEmail,
        status:   'Prospect',
        added_by: 'inbound-email',
        notes:    `Auto-created from inbound email on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      })
      .select('id')
      .single()

    if (createErr || !newContact) {
      console.error('Failed to create contact:', createErr)
      return new Response('Failed to create contact', { status: 500 })
    }

    matchedContactId = newContact.id
    matchMethod = 'new contact auto-created'
  }

  // ── 3. Build the note content ─────────────────────────────────────────────

  const noteLines: string[] = []
  noteLines.push(`📧 ${subject}`)
  if (snippet) noteLines.push('', snippet)
  noteLines.push('', `— forwarded from ${senderEmail} (${matchMethod})`)

  const content = noteLines.join('\n').trim()

  // ── 4. Insert contact note ───────────────────────────────────────────────

  const { error: noteErr } = await supabase
    .from('contact_notes')
    .insert({
      contact_id: matchedContactId,
      content,
      note_type:  'Email',
      note_date:  new Date().toISOString().slice(0, 10),
      added_by:   'inbound-email',
    })

  if (noteErr) {
    console.error('Failed to insert note:', noteErr)
    return new Response('Failed to insert note', { status: 500 })
  }

  console.log(`Logged email from ${senderEmail} → contact ${matchedContactId} (${matchMethod})`)
  return new Response(JSON.stringify({ ok: true, matchMethod }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
