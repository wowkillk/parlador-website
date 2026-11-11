(() => {
  "use strict";
  const cfg = window.PARLADOR_AUTH_CONFIG || {};
  const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url || "");
  const hasCredentials = validUrl && typeof cfg.publishableKey === "string" && cfg.publishableKey.length > 15;
  const client = hasCredentials && window.supabase?.createClient
    ? window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      }) : null;
  const googleEnabled = Boolean(client && cfg.providers?.google);
  const emailEnabled = Boolean(client && cfg.providers?.email);
  const telegramEnabled = Boolean(client && cfg.providers?.telegram);
  const header = document.querySelector(".header");
  if (!header) return;
  const entry = document.createElement("button");
  entry.type = "button";
  entry.className = "auth-entry";
  entry.textContent = "ACCOUNT";
  entry.setAttribute("aria-label", "Аккаунт PARLADOR");
  const menuToggle = header.querySelector(".menu-toggle");
  if (menuToggle) header.insertBefore(entry, menuToggle);
  else header.appendChild(entry);

  const dialog = document.createElement("dialog");
  dialog.className = "auth-dialog";
  dialog.setAttribute("aria-labelledby", "auth-title");
  dialog.innerHTML = `
    <div class="auth-top"><span>● PARLADOR ACCESS</span><button class="auth-close" type="button" aria-label="Закрыть">×</button></div>
    <h2 id="auth-title" class="auth-heading">ENTER THE<br>UNDERGROUND<span>.</span></h2>
    <p class="auth-description">ONE COMMUNITY / NO COMPROMISE</p>
    <div class="auth-guest">
      <div class="auth-actions">
        <button type="button" class="auth-provider google">CONTINUE WITH GOOGLE</button>
        <button type="button" class="auth-provider telegram">CONTINUE WITH TELEGRAM</button>
      </div>
      <form class="auth-email-form">
        <label for="auth-email">CONTINUE WITH EMAIL</label>
        <div class="auth-email-row">
          <input id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="you@example.com" required />
          <button class="auth-email-submit" type="submit">SEND LINK</button>
        </div>
        <p class="auth-email-hint">Пришлём ссылку для входа. Пароль не нужен.</p>
      </form>
    </div>
    <div class="auth-member" hidden>
      <div class="member-card">
        <p class="member-tag">● PARLADOR MEMBER / 001</p>
        <div class="member-identity">
          <div class="member-avatar" aria-hidden="true"><img class="member-avatar-image" alt="" hidden><span class="member-initial">P</span></div>
          <div class="member-identity-copy">
            <p class="member-name">PARLADOR MEMBER</p>
            <p class="member-email"></p>
          </div>
        </div>
        <dl class="member-details">
          <div><dt>ACCESS VIA</dt><dd class="member-provider">—</dd></div>
          <div><dt>MEMBER SINCE</dt><dd class="member-since">—</dd></div>
          <div><dt>STATUS</dt><dd class="member-status">ACTIVE</dd></div>
        </dl>
        <p class="member-footer">ONE COMMUNITY / NO COMPROMISE</p>
      </div>
      <button class="auth-signout" type="button">SIGN OUT</button>
    </div>
    <p class="auth-message" role="status" aria-live="polite"></p>`;
  document.body.appendChild(dialog);

  const closeButton = dialog.querySelector(".auth-close");
  const guest = dialog.querySelector(".auth-guest");
  const member = dialog.querySelector(".auth-member");
  const memberName = dialog.querySelector(".member-name");
  const memberEmail = dialog.querySelector(".member-email");
  const memberProvider = dialog.querySelector(".member-provider");
  const memberSince = dialog.querySelector(".member-since");
  const memberInitial = dialog.querySelector(".member-initial");
  const memberAvatar = dialog.querySelector(".member-avatar-image");
  const authHeading = dialog.querySelector(".auth-heading");
  const message = dialog.querySelector(".auth-message");
  const google = dialog.querySelector(".google");
  const telegram = dialog.querySelector(".telegram");
  const emailForm = dialog.querySelector(".auth-email-form");
  const emailInput = dialog.querySelector("#auth-email");
  const emailSubmit = dialog.querySelector(".auth-email-submit");
  const signout = dialog.querySelector(".auth-signout");
  google.disabled = !googleEnabled;
  telegram.disabled = !telegramEnabled;
  emailInput.disabled = !emailEnabled;
  emailSubmit.disabled = !emailEnabled;

  function showStatus(text) { message.textContent = text; }
  function render(session) {
    const user = session?.user;
    guest.hidden = Boolean(user);
    member.hidden = !user;
    entry.textContent = user ? "MY ACCOUNT" : "ACCOUNT";
    authHeading.hidden = Boolean(user);
    if (user) {
      const meta = user.user_metadata || {};
      const name = [meta.full_name, meta.name, meta.user_name, meta.username, user.email?.split("@")[0]]
        .find(value => typeof value === "string" && value.trim()) || "PARLADOR MEMBER";
      memberName.textContent = name.slice(0, 80);
      memberEmail.textContent = user.email || "Email не указан";
      const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
      const currentProvider = user.app_metadata?.provider || providers[0] || "";
      memberProvider.textContent = currentProvider === "google" ? "GOOGLE"
        : currentProvider === "email" ? "EMAIL"
        : currentProvider.includes("telegram") ? "TELEGRAM" : "PARLADOR";
      const joined = user.created_at ? new Date(user.created_at) : null;
      memberSince.textContent = joined && !Number.isNaN(joined.getTime())
        ? new Intl.DateTimeFormat("ru-RU", {day:"2-digit",month:"short",year:"numeric"}).format(joined)
        : "—";
      memberInitial.textContent = name.trim().charAt(0).toUpperCase();
      const rawAvatar = meta.avatar_url || meta.picture;
      let safeAvatar = null;
      try {
        const url = new URL(rawAvatar);
        if (url.protocol === "https:" && !url.username && !url.password) safeAvatar = url.href;
      } catch {}
      memberAvatar.hidden = !safeAvatar;
      memberInitial.hidden = Boolean(safeAvatar);
      if (safeAvatar) memberAvatar.src = safeAvatar;
      else memberAvatar.removeAttribute("src");
      showStatus("Ты внутри PARLADOR.");
    }
    else if (!client) showStatus("Вход готовится к запуску. Сайт открыт для всех.");
    else showStatus("Вход добровольный. Сайт доступен и без аккаунта.");
  }
  entry.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  function close() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }
  closeButton.addEventListener("click", close);
  dialog.addEventListener("click", event => { if (event.target === dialog) close(); });
  const redirectTo = window.location.origin + window.location.pathname;
  google.addEventListener("click", async () => {
    if (!googleEnabled) return;
    google.disabled = true;
    showStatus("Перенаправляем в Google…");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google", options: { redirectTo }
      });
      if (error) throw error;
    } catch (err) {
      showStatus("Не удалось начать вход через Google. Попробуй позже.");
      console.error("PARLADOR Google auth:", err);
      google.disabled = false;
    }
  });
  telegram.addEventListener("click", async () => {
    if (!telegramEnabled) return;
    telegram.disabled = true;
    showStatus("Перенаправляем в Telegram…");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "custom:telegram", options: { redirectTo }
      });
      if (error) throw error;
    } catch (err) {
      showStatus("Не удалось начать вход через Telegram. Попробуй позже.");
      console.error("PARLADOR Telegram auth:", err);
      telegram.disabled = false;
    }
  });
  emailForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!emailEnabled || !emailForm.reportValidity()) return;
    const email = emailInput.value.trim();
    if (!email) return;
    emailSubmit.disabled = true;
    showStatus("Отправляем ссылку для входа…");
    try {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
      });
      if (error) throw error;
      showStatus("Если письмо разрешено отправить, ссылка придёт на указанную почту. Проверь также «Спам».");
    } catch (err) {
      showStatus("Не удалось отправить письмо. Попробуй позже.");
      console.error("PARLADOR email auth:", err);
    } finally {
      emailSubmit.disabled = false;
    }
  });
  signout.addEventListener("click", async () => {
    if (!client) return;
    signout.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      render(null);
    } catch (err) {
      showStatus("Не удалось выйти. Повтори попытку.");
      console.error("PARLADOR sign out:", err);
    } finally {
      signout.disabled = false;
    }
  });
  render(null);
  if (client) {
    client.auth.onAuthStateChange((_event, session) => render(session));
    client.auth.getSession().then(({ data, error }) => {
      if (error) showStatus("Сеанс недоступен. Попробуй войти снова.");
      else render(data.session);
    }).catch(() => showStatus("Не удалось проверить сеанс."));
  }
})();
