# PARLADOR optional sign-in

Public content remains accessible. Account dialog is an optional entry point.

## Setup (owner actions)

1. Create a project at https://supabase.com/dashboard
2. Copy **Project URL** and **publishable key** (or legacy **anon** key) from Project Settings > API into `auth-config.js`. These are designed for browser use. **NEVER** paste service_role keys, OAuth client secrets, or Apple private keys into GitHub.
3. In Supabase Authentication > URL Configuration set:
   - Site URL: `https://wowkillk.github.io/parlador-website/`
   - Redirect URLs: `https://wowkillk.github.io/parlador-website/`
4. To enable Google: follow https://supabase.com/docs/guides/auth/social-sign-in/auth-google ; set the Google OAuth redirect URI to `https://YOUR-PROJECT.supabase.co/auth/v1/callback` in Google Cloud, enter client ID and secret in Supabase Authentication > Providers > Google; then set `providers.google = true` in `auth-config.js`.
5. To enable Apple: follow https://supabase.com/docs/guides/auth/social-sign-in/auth-apple ; Apple Developer Program, Service ID and signing key are required. Configure the Supabase OAuth callback in Apple developer settings, enter credentials *only* in Supabase, then set `providers.apple = true`.
6. Test on the deployed HTTPS GitHub Pages site with a test account; check sign-in, refresh, sign-out, phone width, and both providers separately.

The providers stay disabled until configured. No member-specific privileged data or custom profiles are stored. GitHub Pages is public; front-end UI is **not** access control. Protect any future private data with Supabase Row Level Security (RLS) policies.

The browser implementation depends on supabase-js v2 UMD CDN. A production bundling step can pin and self-host that library later.

**Caveat:** The Apple OAuth client secret needs periodic rotation, per Apple/Supabase guidance.
