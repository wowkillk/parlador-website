(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.PARLADOR_AUTH_CONFIG || {};
  const valid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url || "") &&
    typeof cfg.publishableKey === "string" && cfg.publishableKey.length > 15;
  const client = valid && window.supabase?.createClient
    ? window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      }) : null;
  const target = new URLSearchParams(location.search).get("id");
  const isUuid = typeof target === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
  let currentUser = null;
  let sequence = 0;
  function reset() { $("guest").hidden = true; $("missing").hidden = true; $("profile-card").hidden = true; }
  async function render(session) {
    const seq = ++sequence;
    const user = session?.user;
    currentUser = user?.id || null;
    reset();
    if (!user) { $("loading").hidden = true; $("guest").hidden = false; return; }
    if (!isUuid) { $("loading").hidden = true; $("missing").hidden = false; return; }
    $("loading").hidden = false; $("loading").textContent = "Загружаем профиль…";
    // RLS lets authenticated users read opted-in profiles and their own draft only.
    const {data,error} = await client.from("member_profiles")
      .select("user_id,display_name,nickname,bio,is_listed").eq("user_id",target).maybeSingle();
    if (sequence !== seq || currentUser !== user.id) return;
    $("loading").hidden = true;
    if (error || !data || (!data.is_listed && data.user_id !== user.id)) {
      $("missing").hidden = false; return;
    }
    $("profile-name").textContent = data.display_name;
    $("profile-nickname").textContent = data.nickname ? "@"+data.nickname : "";
    $("profile-nickname").hidden = !data.nickname;
    $("profile-bio").textContent = data.bio || "Участник пока ничего не рассказал о себе.";
    $("profile-card").hidden = false;
  }
  if (!client) { $("loading").textContent = "Авторизация сейчас недоступна."; return; }
  client.auth.onAuthStateChange((_event,session) => {
    // Defer Supabase operations outside auth callback to avoid auth callback lock issues.
    setTimeout(() => render(session).catch(() => { $("loading").textContent = "Ошибка загрузки профиля."; }),0);
  });
  client.auth.getSession().then(({data,error}) => {
    if(error) throw error;
    return render(data.session);
  }).catch(() => { $("loading").textContent = "Не удалось проверить авторизацию."; });
})();