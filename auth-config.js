// Public browser configuration. Never put service_role, OAuth client secrets, or Apple .p8 keys here.
// Find Project URL and publishable (or legacy anon) key in Supabase > Project Settings > API.
window.PARLADOR_AUTH_CONFIG = Object.freeze({
  url: "",
  publishableKey: "",
  // Set true ONLY after enabling each provider in Supabase Auth dashboard.
  providers: { google: false, apple: false },
});
