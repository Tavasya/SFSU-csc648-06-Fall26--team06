# Notification email worker

The notification worker processes rows in `public.notification_queue`
and sends cancellation, event-update, and reminder emails through
the GatorAid Gmail SMTP account.

## Required server environment variables

Add these to `.env.local` for local testing and to the Vercel
project's server environment for deployment:

- `GMAIL_USER` — the GatorAid Gmail address.
- `GMAIL_APP_PASSWORD` — the Gmail App Password.
- `SUPABASE_SECRET_KEY` — server only; never prefix with `NEXT_PUBLIC_`.
- `CRON_SECRET` — a long random secret used to authorize the worker endpoint.

Restart the local Next.js server after changing `.env.local`.
Do not commit `.env.local`.

## Database setup

Apply `supabase/migrations/20261122170000_notification_email_worker.sql`
to the Supabase project containing `public.notification_queue`.

It creates three service-role-only RPC functions:

- `claim_notification_queue`
- `complete_notification_queue`
- `fail_notification_queue`

The claim function uses `FOR UPDATE SKIP LOCKED` to prevent
concurrent workers from claiming the same queue entries.

A processing row is considered abandoned after 10 minutes.
Each claim increments `attempts`.

## Local test

Start the Next.js app, then call the worker endpoint:

```bash
curl -X POST http://localhost:3000/api/notifications/process \
  -H "Authorization: Bearer $CRON_SECRET"