(() => {
  "use strict";
  const cfg = window.PARLADOR_AUTH_CONFIG || {};
  const valid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url || "") &&
    typeof cfg.publishableKey === "string" && cfg.publishableKey.length > 15;
  const client = valid && window.supabase?.createClient
    ? window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      }) : null;
  const $ = id => document.getElementById(id);
  const feedback = $("feedback");
  let activeId = null;
  function say(message) { feedback.textContent = message; }
  function hideAreas() { $("members-area").hidden = true; $("guest").hidden = true; }
  function memberName(user) {
    const m = user.user_metadata || {};
    return [m.parlador_display_name, m.full_name, m.name, m.user_name, m.preferred_username, user.email?.split("@")[0]]
      .find(value => typeof value === "string" && value.trim()) || "PARLADOR MEMBER";
  }
  async function showDirectory(expectedId) {
    const { data, error } = await client.from("member_profiles")
      .select("user_id,display_name,nickname,bio")
      .eq("is_listed", true).order("updated_at", { ascending: false }).limit(100);
    if (activeId !== expectedId) return;
    const list = $("member-list");
    list.replaceChildren();
    if (error) { $("list-state").textContent = "Не удалось загрузить каталог. Проверь настройку таблицы."; return; }
    $("list-state").textContent = data?.length ? "Участники, открывшие свои профили для сообщества" : "Пока никто не опубликовал профиль. Ты можешь стать первым.";
    for (const p of data || []) {
      const article = document.createElement("article");
      article.className = "person";
      const name = document.createElement("h3");
      name.textContent = p.display_name;
      article.appendChild(name);
      if (p.nickname) {
        const nick = document.createElement("p");
        nick.className = "nick"; nick.textContent = "@" + p.nickname;
        article.appendChild(nick);
      }
      if (p.bio) {
        const bio = document.createElement("p");
        bio.className = "bio"; bio.textContent = p.bio;
        article.appendChild(bio);
      }
      const link = document.createElement("a");
      link.className = "person-link";
      link.href = "profile.html?id=" + encodeURIComponent(p.user_id);
      link.textContent = "ОТКРЫТЬ ПРОФИЛЬ →";
      link.setAttribute("aria-label", "Открыть профиль " + p.display_name);
      article.appendChild(link);
      list.appendChild(article);
    }
  }
  async function showUser(user) {
    activeId = user.id;
    hideAreas();
    $("loading").hidden = true;
    $("members-area").hidden = false;
    const { data, error } = await client.from("member_profiles")
      .select("display_name,nickname,bio,is_listed").eq("user_id",user.id).maybeSingle();
    if (activeId !== user.id) return;
    if (error) say("Не удалось загрузить профиль. Сначала создай таблицу через SQL Editor.");
    $("display-name").value = data?.display_name || memberName(user).slice(0,60);
    $("nickname").value = data?.nickname || user.user_metadata?.parlador_nickname || "";
    $("bio").value = data?.bio || "";
    $("listed").checked = Boolean(data?.is_listed);
    await showDirectory(user.id);
  }
  $("profile-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!client || !activeId || !e.currentTarget.reportValidity()) return;
    const name = $("display-name").value.trim().replace(/\s+/g, " ");
    const nickname = $("nickname").value.trim();
    const bio = $("bio").value.trim();
    if (name.length < 2 || name.length > 60 || nickname.length > 32 || bio.length > 280) {
      say("Проверь длину имени, никнейма и описания."); return;
    }
    const button = $("save-profile"); button.disabled = true;
    say("Сохраняем…");
    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user || authData.user.id !== activeId) throw Error("Session changed");
      const { error } = await client.from("member_profiles").upsert({
        user_id: activeId, display_name: name, nickname, bio, is_listed: $("listed").checked, updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) throw error;
      say($("listed").checked ? "Профиль сохранён и виден участникам." : "Профиль сохранён и скрыт от других.");
      await showDirectory(activeId);
    } catch (error) {
      console.error("PARLADOR member profile",error);
      say("Не удалось сохранить. Проверь права доступа Supabase.");
    } finally { button.disabled = false; }
  });
  if (!client) { $("loading").textContent = "Авторизация пока недоступна."; return; }
  client.auth.onAuthStateChange((_event,session) => {
    if (!session?.user) { activeId = null; hideAreas(); $("loading").hidden=true; $("guest").hidden=false; }
    else if (activeId !== session.user.id) showUser(session.user).catch(err => { console.error(err); say("Ошибка загрузки профиля."); });
  });
  client.auth.getSession().then(({data,error}) => {
    if (error || !data.session?.user) {
      activeId = null; hideAreas(); $("loading").hidden=true; $("guest").hidden=false;
    } else if (activeId !== data.session.user.id) showUser(data.session.user);
  }).catch(() => { $("loading").textContent = "Не удалось проверить авторизацию."; });
})();