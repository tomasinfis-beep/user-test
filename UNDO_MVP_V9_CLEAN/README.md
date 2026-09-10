# UNDO MVP V9

This build submits case intake directly to Supabase REST using the public publishable key. It does not expose any secret/service-role key.

Required Supabase setup: public.cases must have an INSERT RLS policy for role anon. No SELECT policy is needed for the public form.

For Vercel/GitHub, keep index.html and styles.css at the repository root.
