# PARLADOR optional sign-in (Google / Email / Telegram planned)

The public PARLADOR site remains accessible without login. Auth is currently previewed on a separate GitHub Pages repo.

## Implemented
- Google OAuth through Supabase (configured; tested with an allowlisted test user).
- Email magic-link through Supabase Auth signInWithOtp (requires email provider and template settings, mail delivery tests).
- Telegram button is visibly disabled. It is **not** a login mechanism yet.
- Apple login removed.

## Supabase setup
1. Set URL and publishable key in `auth-config.js` (browser-safe only). Never commit service_role, secret keys, OAuth secrets, or bot tokens.
2. Authentication > URL Configuration: allow exact return URLs for both `https://wowkillk.github.io/parlador-website/` and `https://wowkillk.github.io/parlador-auth-test/`.
3. Google OAuth provider: Client ID and secret remain solely in Supabase; Google Cloud must permit Supabase callback URI.
4. Authentication > Providers > Email: enable email sign-in and ensure the confirmation/magic-link template is suitable for PKCE or implicit-flow redirect as configured. Confirm `{{ .ConfirmationURL }}` is used as the login link. Test that clicked links establish a session on the preview domain.
5. Supabase built-in email service has strict sending/rate limits and is unsuitable for broad public release; configure custom SMTP, sender domain and appropriate deliverability before launch. Check abuse/rate limits and consent/privacy notices.
6. For Telegram, a future verified implementation needs Telegram Login (bot and allowed origin) and **server-side verification of the signed identity**, plus a trusted session exchange. Never trust Telegram user IDs supplied from browser code or expose a bot token in GitHub Pages.
7. Rotate the previously screenshot-exposed Google OAuth Client Secret before publicly releasing social login.

To test: deploy preview from `codex/parlador-optional-auth`, sign in via Google, refresh, sign out, request email link, click link on same browser, verify session; then test on Safari/iPhone.

Important: static front-end UI does not protect data. Apply RLS to any future user data. No protected user-profile database is added by this change.
