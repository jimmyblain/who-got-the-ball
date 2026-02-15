# Deployment Checklist

Things to do before and during deployment of "Who's Got The Ball?"

## Pre-Deployment

- [ ] **Enable email confirmation in Supabase**
  - In Supabase dashboard: **Authentication → Providers → Email** → enable "Confirm email"
  - In Supabase dashboard: **Authentication → URL Configuration** → set **Site URL** to your production URL (e.g. `https://yourdomain.com`)
  - In the same URL Configuration page, add `/auth/confirm` to **Redirect URLs**
  - In code: Update `components/sign-up-form.tsx` — change `emailRedirectTo` to `/auth/confirm` and redirect after signup to `/auth/sign-up-success` instead of `/dashboard`

- [ ] **Set environment variables in hosting provider**
  - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your Supabase anon/public key

- [ ] **Configure custom domain** (if applicable)
  - Point your domain's DNS to the hosting provider
  - Update Supabase Site URL to match the custom domain
