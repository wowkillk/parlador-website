"use strict";
// PARLADOR frontend-only profile connection. Never include secret/service_role tokens here.
(() => {
  const PROJECT_URL = "https://feesigkukeameucnoyfz.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_4ODVSKckRH60zw36uE3d9Q_CePLf6xh";
  const status = document.getElementById("auth-status");
  const form = document.getElementById("email-login");
  const email = document.getElementById("auth-email");
  const google = document.getElementById("google-login");
  const logout = document.getElementById("sign-out");
  const previewSwitch = document.querySelector(".switcher");
  const profileGrid = document.getElementById("profile-grid");
  const heading = document.getElementById("profile-mode");
  const setStatus = (message) => { status.textContent = message; };

  if (!window.supabase?.createClient) {
    setStatus("Не удалось загрузить модуль авторизации. Проверь соединение и обнови страницу.");
    return;
  }
  const client = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const redirectTo = new URL("profile.html", document.baseURI).href;

  const setFields = (selector, value) => {
    document.querySelectorAll(selector).forEach((el) => { el.textContent = String(value ?? ""); });
  };

  async function showSession(session) {
    if (!session?.user?.id) {
      logout.hidden = true;
      form.hidden = false;
      google.hidden = false;
      previewSwitch.hidden = false;
      profileGrid.hidden = false;
      heading.textContent = "DESIGN PREVIEW / Для своего профиля войдите ниже";
      setStatus("Вы не вошли. Ниже показан только макет, не реальный аккаунт.");
      window.render?.();
      return;
    }
    const uid = session.user.id;
    logout.hidden = false;
    form.hidden = true;
    google.hidden = true;
    previewSwitch.hidden = true;
    profileGrid.hidden = true;
    heading.textContent = "ЗАГРУЗКА ВАШЕГО ПРОФИЛЯ";
    setStatus("Сессия подтверждена. Читаем только ваш профиль.");
    try {
      const { data, error } = await client.from("member_profiles")
        .select("user_id,display_name,nickname,bio,member_number")
        .eq("user_id", uid).maybeSingle();
      if (error) throw error;
      if (!data || data.user_id !== uid) {
        heading.textContent = "ПРОФИЛЬ ПОКА НЕ СОЗДАН";
        setStatus("Вы вошли, но запись member_profiles для этого аккаунта не найдена. Мы ничего не создавали и не меняли.");
        return;
      }
      const number = Number(data.member_number);
      const founderNumber = number === 1;
      // Server-side no-argument RPC checks only this session's Founder status.
      // Fail closed: missing/unavailable RPC never grants a badge.
      let verifiedFounder = false;
      let verificationPending = false;
      if (founderNumber) {
        const check = await client.rpc("is_current_user_verified_founder");
        if (check.error) verificationPending = true;
        else verifiedFounder = check.data === true;
      }
      const code = Number.isSafeInteger(number) && number > 0
        ? founderNumber ? "PLDR-001" : "P-" + String(number).padStart(6, "0")
        : "ID NOT SET";
      setFields("[data-name]", data.display_name || data.nickname || "PARLADOR MEMBER");
      setFields("[data-handle]", data.nickname ? "@" + data.nickname.replace(/^@/, "") : "@member");
      setFields("[data-id]", code);
      setFields("[data-role]", verifiedFounder ? "FOUNDER VERIFIED" : founderNumber ? "FOUNDER / ВЕРИФИКАЦИЯ НЕ ПОДТВЕРЖДЕНА" : "COMMUNITY MEMBER");
      setFields("[data-bio]", data.bio || "PARLADOR COMMUNITY");
      setFields("[data-access]", founderNumber ? "CORE" : "MEMBER");
      setFields("[data-events]", "—");
      document.getElementById("small-avatar").textContent = founderNumber ? "?" : "P";
      document.getElementById("small-avatar").classList.toggle("founder", founderNumber);
      // Founder verification lives in the private member_verifications table.
      // Do not infer verified status from user-controlled text or a client flag.
      document.querySelectorAll("[data-founder-badge]").forEach(el => { el.hidden = !verifiedFounder; });
      document.getElementById("badges").replaceChildren();
      const marker = document.createElement("div");
      marker.className = "badge-item";
      marker.textContent = verifiedFounder ? "FOUNDER VERIFIED" : founderNumber ? "FOUNDER ID / без подтверждённой галочки" : "NO BADGES YET";
      document.getElementById("badges").appendChild(marker);
      document.querySelectorAll("[data-copy]").forEach(button => {
        button.onclick = async () => {
          try { await navigator.clipboard.writeText(code); button.textContent = "COPIED ✓"; }
          catch { button.textContent = "Скопируйте ID вручную"; }
        };
      });
      profileGrid.hidden = false;
      heading.textContent = "LIVE PROFILE / " + code;
      setStatus(verifiedFounder ? "Профиль и подтверждённый Founder-бейдж загружены из Supabase." : verificationPending ? "Профиль загружен, но серверная проверка бейджа пока недоступна. Убедитесь, что RPC создана и открыта для Data API." : "Профиль загружен из Supabase. Подтверждённого Founder-бейджа у этой сессии нет.");
    } catch (error) {
      heading.textContent = "НЕ УДАЛОСЬ ЗАГРУЗИТЬ ПРОФИЛЬ";
      setStatus("Ошибка чтения member_profiles: " + (error?.message || "проверьте Data API и RLS") + ". Данные не изменены.");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = email.value.trim();
    if (!value || !email.checkValidity()) return;
    setStatus("Отправляем ссылку для входа…");
    const { error } = await client.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: redirectTo }
    });
    setStatus(error ? "Не удалось отправить письмо: " + error.message : "Проверь почту: ссылка для входа отправлена. Если письмо не пришло, проверь Spam.");
  });

  google.addEventListener("click", async () => {
    setStatus("Открываем Google…");
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) setStatus("Ошибка Google: " + error.message);
  });

  logout.addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) setStatus("Не удалось выйти: " + error.message);
    else window.location.reload();
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) setStatus("Ошибка авторизации: " + error.message);
    else showSession(data.session);
  }).catch(e => setStatus("Ошибка инициализации: " + e.message));
  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      setTimeout(() => showSession(session), 0);
    }
  });
})();
