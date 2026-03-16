# Inbound Email → Contact Note Setup

Forward any email to your free Cloudmailin address and it auto-logs as a contact note — no domain purchase needed.

---

## How it works

1. You forward (or CC) any email to `your-address@cloudmailin.net`
2. Cloudmailin POSTs the payload to the Supabase edge function
3. The function matches the **original sender** to a contact in your app
4. It logs the email subject + body snippet as a contact note (type: Email)
5. It appears immediately in Contacts and the Comms Log

If no contact matches the sender, a new **Prospect** contact is auto-created.

---

## One-time setup (~10 minutes, completely free)

### Step 1 — Sign up for Cloudmailin
Go to https://cloudmailin.com and create a free account.

The free tier gives you **200 inbound emails/month** — more than enough for personal move coordination.

### Step 2 — Get your inbound address
After signing up, Cloudmailin assigns you a unique address like:

```
a1b2c3d4e5f6@cloudmailin.net
```

Copy this address — you'll forward emails here.

### Step 3 — Choose your Basic Auth credentials
Pick any username and password (you'll use these in the next two steps):

```
username: moveplanner          ← anything you like
password: some-random-string   ← anything you like
```

### Step 4 — Set the Cloudmailin target URL
In Cloudmailin → your address → **Target URL**, enter:

```
https://<USERNAME>:<PASSWORD>@<PROJECT-REF>.supabase.co/functions/v1/inbound-email
```

Replace:
- `<USERNAME>` / `<PASSWORD>` with the credentials you chose above
- `<PROJECT-REF>` with your Supabase project ref (find it in Supabase → Project Settings → General)

Example:
```
https://moveplanner:some-random-string@abcdefghijk.supabase.co/functions/v1/inbound-email
```

Also set **Post Format** to `JSON (Normalised)`.

### Step 5 — Set Supabase secrets
```bash
supabase secrets set INBOUND_EMAIL_USER=moveplanner
supabase secrets set INBOUND_EMAIL_PASS=some-random-string
```

Use the same username and password from Step 3.

### Step 6 — Deploy the edge function
```bash
supabase functions deploy inbound-email
```

### Step 7 — Test it
Forward any email to your `@cloudmailin.net` address.
Within seconds, check Contacts — a new note should appear (type: Email), and the Comms Log will show the entry.

---

## Daily workflow

- **Realtor update:** Forward the email to your Cloudmailin address — logged automatically
- **Lender rate lock:** Forward the confirmation email — appears as a note on your lender contact
- **Contractor estimate:** Forward the quote email — logged under the contractor's contact
- **No match?** A new Prospect contact is created automatically; you can rename/merge it later

The subject line becomes the first line of the note, so keep it descriptive when forwarding.

---

## Matching logic

The function matches the email **sender** in this order:

1. **Exact email match** — sender's full address matches a contact's email field
2. **Domain match** — sender's `@company.com` matches any contact's email domain
3. **Auto-create** — new Prospect contact created for unrecognised senders

Fill in email addresses for your contacts in the app to get the best matching.
