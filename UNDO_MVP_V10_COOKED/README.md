# UNDO MVP v10

This build keeps the public case form working even if the server email/AI layer is not configured: it first tries `/api/cases`, then falls back to a direct Supabase insert.

## Production environment variables

Set these in the Vercel project (Production):
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SECRET_KEY` = your Supabase Secret key (server only)
- `RESEND_API_KEY` = your Resend API key (server only)
- `ADMIN_EMAIL` = your inbox, e.g. Rodrigo.empresarial@gmail.com
- `ADMIN_TOKEN` = create a strong private token for the admin dashboard
- `SUCCESS_FEE_PERCENT` = `25`
- Optional: `OPENAI_API_KEY` and `OPENAI_MODEL` (defaults to `gpt-5`)

## URLs
- `/` public intake
- `/admin` internal case desk
- `/api/health` safe environment diagnostic (only reports whether variables exist; never returns secret values)

## Supabase RLS
The public form requires an INSERT policy for `anon`. Do not grant public SELECT/UPDATE/DELETE.

## Notes
- The server uses native fetch against Supabase REST, avoiding SDK initialization failures when a secret is missing.
- AI analysis uses OpenAI when configured; otherwise it uses a deterministic local triage so the dashboard is still useful without an OpenAI key.
- Resend notifications are best-effort and do not block case creation if email delivery fails.
