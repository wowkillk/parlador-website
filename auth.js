(() => {
  "use strict";
  const cfg = window.PARLADOR_AUTH_CONFIG || {};
  const hasCredentials =
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url || "") &&
    typeof cfg.publishableKey === "string" && cfg.publishableKey.length > 15;
  const sdk = window.supabase;
  const client = hasCredentials && sdk?.createClient
    ? sdk.createClient(cfg.url, cfg.publishableKey, { auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } })
    : null;

  const entry = document.createElement("button");
  entry.type = "button";
  entry.className = "auth-entry";
  entry.textContent = "ACCOUNT";
  entry.setAttribute("aria-label", "Аккаунт PARLADOR");
  // Insert into the existing header, without changing navigation links.
  const header = document.querySelector(".header");
  if (!header) return;
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
        <button type="button" class="auth-provider apple">CONTINUE WITH APPLE</button>
      </div>
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
  const apple = dialog.querySelector(".apple");
  const signout = dialog.querySelector(".auth-signout");
  const providers = { google: !!cfg.providers?.google, apple: !!cfg.providers?.apple };
  google.disabled = !client || !providers.google;
  apple.disabled = !client || !providers.apple;
  function showStatus(text) { message.textContent = text; }
  function render(session) {
    const user = session?.user;
    guest.hidden = !!user;
    member.hidden = !user;
    entry.textContent = user ? "MY ACCOUNT" : "ACCOUNT";
    memberName.textContent = user
      ? "Выполнен вход: " + (user.email || "участник PARLADOR")
      : "";
    if (user) showStatus("Ты внутри PARLADOR.");
    else if (!client) showStatus("Вход готовится к запуску. Сайт открыт для всех.");
    else if (!providers.google && !providers.apple) showStatus("Вход через Google и Apple пока не активирован.");
    else showStatus("Вход добровольный. Сайт доступен и без аккаунта.");
  }
  entry.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else { dialog.setAttribute("open", ""); }
  });
  function close() { if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); }
  closeButton.addEventListener("click", close);
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
  const redirectTo = window.location.origin + window.location.pathname;
  async function login(provider) {
    if (!client || !providers[provider]) return;
    google.disabled = true;
    apple.disabled = true;
    showStatus("Перенаправляем для входа…");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider, options: { redirectTo }
      });
      if (error) throw error;
    } catch (err) {
      showStatus("Не удалось начать вход. Попробуй позже.");
      console.error("PARLADOR auth:", err);
      google.disabled = !providers.google;
      apple.disabled = !providers.apple;
    }
  }
  google.addEventListener("click", () => login("google"));
  apple.addEventListener("click", () => login("apple"));
  signout.addEventListener("click", async () => {
    if (!client) return;
    signout.disabled = true;
    const { error } = await client.auth.signOut();
    signout.disabled = false;
    if (error) showStatus("Не удалось выйти. Повтори попытку.");
    else render(null);
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
