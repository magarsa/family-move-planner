// inbound-email — Resend inbound webhook → contact_note
//
// Setup (one-time):
//   1. Add your domain to Resend → Domains → verify DNS
//   2. Resend → Inbound → create route for move@yourdomain.com
//   3. Set webhook URL to: https://<project-ref>.supabase.co/functions/v1/inbound-email
//   4. Set env var INBOUND_EMAIL_SECRET to any random string
//   5. In Resend webhook settings, add header: x-inbound-secret: <same string>
//
// Usage:
//   Forward or CC move@yourdomain.com on any email with a contact.
//   The function auto-matches sender → contact and logs it as a contact note.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResendInboundPayload {
  from:        string        // "Name <email@example.com>" or "email@example.com"
  to:          string[]
  subject:     string | null
  text:        string | null
  html:        string | null
  headers?:    Record<string, string>
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

/**
 * Trim HTML to plain text and cap at maxLen chars.
 * Falls back to text/plain if html is absent.
 */
function toSnippet(text: string | null, html: string | null, maxLen = 600): string {
  const src = text
    ?? html?.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
    ?? ''
  return src.length > maxLen ? src.slice(0, maxLen) + '…' : src
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify shared secret (prevents random internet traffic from logging fake notes)
  const expectedSecret = Deno.env.get('INBOUND_EMAIL_SECRET')
  if (expectedSecret) {
    const provided = req.headers.get('x-inbound-secret')
    if (provided !== expectedSecret) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let payload: ResendInboundPayload
  try {
    payload = await req.json() as ResendInboundPayload
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

  const senderRaw   = payload.from ?? ''
  const senderEmail = extractEmail(senderRaw)
  const senderName  = extractName(senderRaw)
  const senderDomain = emailDomain(senderEmail)
  const subject     = payload.subject?.trim() ?? '(no subject)'
  const snippet     = toSnippet(payload.text, payload.html)

  // ── 1. Try to match a contact ────────────────────────────────────────────

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, email')

  let matchedContactId: string | null = null
  let matchMethod = ''

  if (contacts && contacts.length > 0) {
    // Exact email match (case-insensitive)
    const exact = contacts.find(
      c => c.email && extractEmail(c.email) === senderEmail
    )
    if (exact) {
      matchedContactId = exact.id
      matchMethod = 'exact email match'
    }

    // Domain match — same @domain as a contact's email
    if (!matchedContactId && senderDomain) {
      const domainMatch = contacts.find(
        c => c.email && emailDomain(extractEmail(c.email)) === senderDomain
      )
      if (domainMatch) {
        matchedContactId = domainMatch.id
        matchMethod = 'email domain match'
      }
    }
  }

  // ── 2. If no match, create a new contact ─────────────────────────────────

  if (!matchedContactId) {
    const newName = senderName || senderEmail
    const { data: newContact, error: createErr } = await supabase
      .from('contacts')
      .insert({
        name:      newName,
        email:     senderEmail,
        status:    'Prospect',
        added_by:  'inbound-email',
        notes:     `Auto-created from inbound email on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
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
