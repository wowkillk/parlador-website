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
          <div class="member-avatar-wrap">
            <div class="member-avatar" aria-hidden="true"><img class="member-avatar-image" alt="" hidden><span class="member-initial">P</span></div>
            <label class="member-avatar-upload" for="member-avatar-file">ЗАГРУЗИТЬ ФОТО</label>
            <input class="member-avatar-input" type="file" id="member-avatar-file" accept="image/jpeg,image/png,image/webp">
          </div>
          <div class="member-identity-copy">
            <p class="member-name">PARLADOR MEMBER</p>
            <p class="member-nickname" hidden></p>
            <p class="member-email"></p>
          </div>
        </div>
        <button type="button" class="member-edit-toggle" aria-expanded="false">РЕДАКТИРОВАТЬ ПРОФИЛЬ</button>
        <form class="member-edit-form" hidden>
          <label for="member-display-name">ИМЯ В ПРОФИЛЕ</label>
          <input id="member-display-name" name="display-name" type="text" maxlength="60" autocomplete="nickname" required>
          <label for="member-nickname">НИКНЕЙМ</label>
          <input id="member-nickname" name="nickname" type="text" maxlength="32" placeholder="например, DJKALASHNIKOV" pattern="[A-Za-z0-9_\\-]{2,32}" title="2–32 символа: латинские буквы, цифры, _ или -">
          <p class="member-edit-help">Никнейм необязателен. Можно использовать латиницу, цифры, _ и -.</p>
          <div class="member-edit-actions">
            <button class="member-edit-save" type="submit">СОХРАНИТЬ</button>
            <button class="member-edit-cancel" type="button">ОТМЕНА</button>
          </div>
        </form>
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
  const nicknameLabel = dialog.querySelector(".member-nickname");
  const editToggle = dialog.querySelector(".member-edit-toggle");
  const editForm = dialog.querySelector(".member-edit-form");
  const editName = dialog.querySelector("#member-display-name");
  const editNickname = dialog.querySelector("#member-nickname");
  const editSave = dialog.querySelector(".member-edit-save");
  const editCancel = dialog.querySelector(".member-edit-cancel");
  const memberProvider = dialog.querySelector(".member-provider");
  const memberSince = dialog.querySelector(".member-since");
  const memberInitial = dialog.querySelector(".member-initial");
  const memberAvatar = dialog.querySelector(".member-avatar-image");
  const avatarInput = dialog.querySelector(".member-avatar-input");
  const avatarUpload = dialog.querySelector(".member-avatar-upload");
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
    if (!user) {
      editForm.hidden = true;
      editToggle.setAttribute("aria-expanded", "false");
      editToggle.textContent = "РЕДАКТИРОВАТЬ ПРОФИЛЬ";
    }
    member.dataset.userId = user?.id || "";
    member.dataset.avatarPath = user?.user_metadata?.parlador_avatar_path || "";
    entry.textContent = user ? "MY ACCOUNT" : "ACCOUNT";
    authHeading.hidden = Boolean(user);
    if (user) {
      const meta = user.user_metadata || {};
      const name = [meta.parlador_display_name, meta.full_name, meta.name, meta.user_name, meta.username, user.email?.split("@")[0]]
        .find(value => typeof value === "string" && value.trim()) || "PARLADOR MEMBER";
      memberName.textContent = name.slice(0, 80);
      const nickname = typeof meta.parlador_nickname === "string" ? meta.parlador_nickname : "";
      nicknameLabel.textContent = nickname ? "@" + nickname : "";
      nicknameLabel.hidden = !nickname;
      if (editForm.hidden) {
        editName.value = name.slice(0, 60);
        editNickname.value = nickname;
      }
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
      // OAuth avatars are fallback; uploaded member avatars are private files in Storage.
      const avatarPath = typeof meta.parlador_avatar_path === "string" ? meta.parlador_avatar_path : "";
      const expectedUser = user.id;
      const expectedPath = avatarPath;
      memberAvatar.hidden = !safeAvatar;
      memberInitial.hidden = Boolean(safeAvatar);
      if (safeAvatar) memberAvatar.src = safeAvatar;
      else memberAvatar.removeAttribute("src");
      if (avatarPath && avatarPath.startsWith(user.id + "/") && client) {
        client.storage.from("member-avatars").createSignedUrl(avatarPath, 3600)
          .then(({ data, error }) => {
            if (error || !data?.signedUrl || member.dataset.userId !== expectedUser ||
                member.dataset.avatarPath !== expectedPath) return;
            memberAvatar.src = data.signedUrl;
            memberAvatar.hidden = false;
            memberInitial.hidden = true;
          }).catch(err => console.error("PARLADOR avatar read:", err));
      }
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
  function closeEditor() {
    editForm.hidden = true;
    editToggle.setAttribute("aria-expanded", "false");
    editToggle.textContent = "РЕДАКТИРОВАТЬ ПРОФИЛЬ";
  }
  editToggle.addEventListener("click", () => {
    if (!member.dataset.userId) return;
    if (!editForm.hidden) { closeEditor(); return; }
    editForm.hidden = false;
    editToggle.setAttribute("aria-expanded", "true");
    editToggle.textContent = "СКРЫТЬ РЕДАКТОР";
    editName.focus();
  });
  editCancel.addEventListener("click", () => {
    closeEditor();
    if (client) client.auth.getSession().then(({ data }) => render(data.session)).catch(() => {});
  });
  editForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!client || !editForm.reportValidity()) return;
    const displayName = editName.value.trim().replace(/\\s+/g, " ");
    const nickname = editNickname.value.trim();
    if (displayName.length < 2 || displayName.length > 60 ||
        (nickname && !/^[A-Za-z0-9_-]{2,32}$/.test(nickname))) {
      showStatus("Имя: 2–60 символов. Никнейм: 2–32 символа латиницей, цифры, _ или -.");
      return;
    }
    editSave.disabled = true;
    showStatus("Сохраняем изменения…");
    try {
      const { error } = await client.auth.updateUser({
        data: { parlador_display_name: displayName, parlador_nickname: nickname }
      });
      if (error) throw error;
      closeEditor();
      const { data } = await client.auth.getSession();
      render(data.session);
      showStatus("Профиль PARLADOR обновлён.");
    } catch (err) {
      console.error("PARLADOR profile update:", err);
      showStatus("Не удалось сохранить профиль. Попробуй ещё раз.");
    } finally { editSave.disabled = false; }
  });
  avatarInput.addEventListener("change", async () => {
    const file = avatarInput.files?.[0];
    if (!file || !client) return;
    const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const ext = extensions[file.type];
    if (!ext || file.size > 5 * 1024 * 1024 || file.size === 0) {
      showStatus("Выбери JPG, PNG или WEBP до 5 МБ.");
      avatarInput.value = "";
      return;
    }
    avatarInput.disabled = true;
    avatarUpload.textContent = "ЗАГРУЖАЕМ…";
    showStatus("Загружаем аватар…");
    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) throw authError || Error("Not signed in");
      const user = authData.user;
      const path = user.id + "/" + crypto.randomUUID() + "." + ext;
      const { error: uploadError } = await client.storage.from("member-avatars").upload(path, file, {
        contentType: file.type, upsert: false, cacheControl: "3600"
      });
      if (uploadError) throw uploadError;
      const { data: updated, error: updateError } = await client.auth.updateUser({
        data: { parlador_avatar_path: path }
      });
      if (updateError) {
        await client.storage.from("member-avatars").remove([path]).catch(() => {});
        throw updateError;
      }
      const { data: signed, error: signedError } = await client.storage
        .from("member-avatars").createSignedUrl(path, 3600);
      if (!signedError && signed?.signedUrl) {
        member.dataset.userId = user.id;
        member.dataset.avatarPath = path;
        memberAvatar.src = signed.signedUrl;
        memberAvatar.hidden = false;
        memberInitial.hidden = true;
      }
      showStatus("Аватар сохранён в профиле PARLADOR.");
    } catch (error) {
      console.error("PARLADOR avatar upload:", error);
      showStatus("Не удалось загрузить фото. Проверь настройки Storage и попробуй снова.");
    } finally {
      avatarInput.value = "";
      avatarInput.disabled = false;
      avatarUpload.textContent = "ЗАГРУЗИТЬ ФОТО";
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
