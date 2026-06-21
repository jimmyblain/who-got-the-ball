# Deployment Checklist

Things to do before and during deployment of "Who's Got The Ball?"

## Pre-Deployment

- [ ] **Enable email confirmation in Supabase**
  - In Supabase dashboard: **Authentication → Providers → Email** → enable "Confirm email"
  - In Supabase dashboard: **Authentication → URL Configuration** → set **Site URL** to your production URL (e.g. `https://yourdomain.com`)
  - In the same URL Configuration page, add `https://yourdomain.com/auth/confirm*` to **Redirect URLs** (the trailing `*` allows the `?next=` query param the app appends; entries must be full URLs including scheme and host)
  - No code change needed: `components/sign-up-form.tsx` already points `emailRedirectTo` at `/auth/confirm?next=/dashboard` and automatically sends users to `/auth/sign-up-success` when confirmation is pending (and straight to `/dashboard` when it's disabled)

- [ ] **Set environment variables in hosting provider**
  - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your Supabase anon/public key

- [ ] **Configure custom domain** (if applicable)
  - Point your domain's DNS to the hosting provider
  - Update Supabase Site URL to match the custom domain
