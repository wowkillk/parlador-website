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
  // Telegram is intentionally unavailable until a verified server-side login flow is implemented.
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
        <button type="button" class="auth-provider telegram" disabled aria-describedby="telegram-note">CONTINUE WITH TELEGRAM</button>
      </div>
      <p class="auth-telegram-note" id="telegram-note">Telegram: скоро появится</p>
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
      <p class="auth-signed-in"></p>
      <button class="auth-signout" type="button">SIGN OUT</button>
    </div>
    <p class="auth-message" role="status" aria-live="polite"></p>`;
  document.body.appendChild(dialog);

  const closeButton = dialog.querySelector(".auth-close");
  const guest = dialog.querySelector(".auth-guest");
  const member = dialog.querySelector(".auth-member");
  const memberName = dialog.querySelector(".auth-signed-in");
  const message = dialog.querySelector(".auth-message");
  const google = dialog.querySelector(".google");
  const emailForm = dialog.querySelector(".auth-email-form");
  const emailInput = dialog.querySelector("#auth-email");
  const emailSubmit = dialog.querySelector(".auth-email-submit");
  const signout = dialog.querySelector(".auth-signout");
  google.disabled = !googleEnabled;
  emailInput.disabled = !emailEnabled;
  emailSubmit.disabled = !emailEnabled;

  function showStatus(text) { message.textContent = text; }
  function render(session) {
    const user = session?.user;
    guest.hidden = Boolean(user);
    member.hidden = !user;
    entry.textContent = user ? "MY ACCOUNT" : "ACCOUNT";
    memberName.textContent = user
      ? "Выполнен вход: " + (user.email || "участник PARLADOR") : "";
    if (user) showStatus("Ты внутри PARLADOR.");
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
