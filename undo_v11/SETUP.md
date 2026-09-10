# UNDO V11 setup

The public intake page works with the existing Supabase publishable key and `anon` INSERT RLS policy.

For the internal tools, add these Vercel Production environment variables:

- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SECRET_KEY` = Supabase Secret Key (`sb_secret_...`)
- `ADMIN_EMAIL` = Rodrigo.empresarial@gmail.com
- `RESEND_API_KEY` = your Resend API key
- `ADMIN_TOKEN` = a private admin password/token you choose

Optional:
- `OPENAI_API_KEY` = for richer AI analysis; otherwise the app uses conservative local triage
- `OPENAI_MODEL` = optional model name
- `SUCCESS_FEE_PERCENT` = default 25
- `STRIPE_SECRET_KEY` = optional, for charging the success fee through Stripe Checkout
- `PUBLIC_BASE_URL` = optional, defaults to https://undo-ai.vercel.app

Keep secret keys server-side. Never place `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, or `STRIPE_SECRET_KEY` in browser code.
