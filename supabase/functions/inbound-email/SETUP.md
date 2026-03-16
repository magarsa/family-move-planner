# Inbound Email → Contact Note Setup

Forwarding an email from your realtor, lender, or contractor to a special address will auto-log it as a contact note in the app.

---

## How it works

1. You forward (or CC) any email to `move@yourdomain.com`
2. Resend receives it and POSTs the payload to this edge function
3. The function matches the sender's email address to a contact in your app
4. It logs the email subject + body snippet as a contact note (type: Email)
5. It appears immediately in Contacts and in the Comms Log

If no contact matches, a new **Prospect** contact is auto-created for that sender.

---

## One-time setup (~15 minutes)

### Step 1 — Create a free Resend account
Go to https://resend.com and sign up (free tier covers this use case entirely).

### Step 2 — Add your domain to Resend
- Resend dashboard → **Domains** → Add Domain
- Enter the domain you own (e.g. `yourdomain.com`)
- Resend will give you DNS records to add (MX, TXT, CNAME)
- Add them in your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
- Wait for DNS to verify (usually 5–30 minutes)

> **Don't own a domain?** Buy one from Namecheap (~$10/yr for `.com`).
> Even a cheap `.info` or `.co` works fine for this purpose.

### Step 3 — Create an inbound route in Resend
- Resend dashboard → **Inbound** → New Route
- Email address: `move@yourdomain.com` (or any address you like)
- Webhook URL: `https://<your-supabase-project-ref>.supabase.co/functions/v1/inbound-email`
  - Find your project ref in: Supabase dashboard → Project Settings → General

### Step 4 — Set a webhook secret (recommended)
- In the Resend inbound route settings, add a custom header:
  - Header name: `x-inbound-secret`
  - Header value: any random string, e.g. `my-super-secret-abc123`
- Add the same string as a Supabase secret:
  ```
  supabase secrets set INBOUND_EMAIL_SECRET=my-super-secret-abc123
  ```

### Step 5 — Deploy the edge function
```bash
supabase functions deploy inbound-email
```

### Step 6 — Test it
Send a test email from your personal address to `move@yourdomain.com`.
Within seconds, check Contacts — a new contact should appear (or an existing one gets a new Email note), and it should show up in the Comms Log.

---

## Tips for daily use

- **Quick log a realtor call:** Forward the email chain to `move@yourdomain.com` — the whole thread snippet gets captured.
- **New contractor estimate:** Forward the estimate email — it logs as an Email note. Then manually edit to add the `amount` field in the Contacts view.
- **Lender updates:** Forward rate lock confirmations, approval emails, etc. directly from your inbox — no need to open the app.
- **Subject becomes the title:** The subject line is used as the first line of the note, so keep subjects clear when forwarding.

---

## Matching logic

The function tries to match the sender in this order:
1. **Exact email match** — sender's full email matches a contact's email field
2. **Domain match** — sender's `@company.com` matches any contact's email domain
3. **Auto-create** — if no match, creates a new Prospect contact for that sender

To improve matching accuracy, make sure your contacts in the app have their email addresses filled in.
