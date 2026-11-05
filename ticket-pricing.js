/* Static announcement only; the ticket platform owns checkout and final pricing. */
(() => {
  "use strict";
  function stateAt(stages, now) {
    const index = stages.findIndex((stage) => now >= Date.parse(stage.start) && now < Date.parse(stage.end));
    if (index >= 0) return { kind: "active", index, current: stages[index], next: stages[index + 1] || null };
    return { kind: now < Date.parse(stages[0].start) ? "before" : "after", index: -1,
      current: null, next: now < Date.parse(stages[0].start) ? stages[0] : null };
  }
  function platformUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function mount(config) {
    const stages = config.stages || [];
    if (!stages.length) return; // Static COMING SOON and disabled purchase remain safe.
    const get = (id) => document.getElementById(id);
    const dateFormat = new Intl.DateTimeFormat("ru-RU", { timeZone: config.timeZone, day: "numeric", month: "long" });
    const date = (value) => dateFormat.format(new Date(value));
    // Display dates are compact; stage boundaries still use the configured instants.
    const period = (stage) => {
      if (stage.kind === "door") return date(stage.start);
      const start = dateFormat.formatToParts(new Date(stage.start));
      const end = dateFormat.formatToParts(new Date(Date.parse(stage.end) - 1));
      const part = (parts, type) => parts.find((item) => item.type === type).value;
      return part(start, "month") === part(end, "month")
        ? `${part(start, "day")}–${part(end, "day")} ${part(start, "month")}`
        : `${date(stage.start)} – ${date(Date.parse(stage.end) - 1)}`;
    };
    const money = (stage) => `${new Intl.NumberFormat("ru-RU").format(stage.price)} ₽`;
    const url = platformUrl(config.platformUrl);
    const buy = get("ticket-buy");
    if (url) { buy.href = url; buy.target = "_blank"; buy.rel = "noopener noreferrer"; }

    // Test override is accepted only on loopback, never on GitHub Pages.
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    const query = new URLSearchParams(window.location.search).get("ticketPreview");
    const previewTime = loopback && query && /(?:Z|[+-]\d{2}:\d{2})$/.test(query) ? Date.parse(query) : NaN;
    const preview = Number.isFinite(previewTime);
    const loadedAt = performance.now();
    const now = () => preview ? previewTime + performance.now() - loadedAt : Date.now();
    get("ticket-preview").hidden = !preview;
    const rows = stages.map((stage) => {
      const row = document.createElement("li");
      const number = document.createElement("span"); number.className = "eyebrow"; number.textContent = stage.label;
      if (stage.kind === "door") row.classList.add("is-door");
      const price = document.createElement("strong"); price.textContent = money(stage);
      const dates = document.createElement("span"); dates.textContent = period(stage);
      const status = document.createElement("span"); status.className = "stage-state";
      row.append(number, price, dates, status);
      get("price-stages").appendChild(row);
      return { row, status };
    });
    let lastKey;
    function render() {
      const time = now();
      const state = stateAt(stages, time);
      const key = `${state.kind}:${state.index}`;
      if (key === lastKey) return;
      lastKey = key;
      const active = state.kind === "active";
      const door = active && state.current.kind === "door";
      get("ticket-status").textContent = door ? state.current.label : active ? `АНОНСИРОВАННАЯ ЦЕНА / ${state.current.label}` : state.kind === "before" ? "COMING SOON" : "SALES STATUS TO BE ANNOUNCED";
      get("event-ticket-status").textContent = door ? state.current.label : active ? "PRICE ANNOUNCED" : state.kind === "before" ? "COMING SOON" : "TO BE ANNOUNCED";
      get("ticket-price").hidden = !active;
      get("ticket-price").textContent = active ? money(state.current) : "";
      get("ticket-period").textContent = active ? period(state.current) : state.kind === "before" ? `Первая неделя — с ${date(stages[0].start)}.` : "Ценовая сетка завершена. Статус дальнейших продаж будет объявлен отдельно.";
      get("ticket-next").textContent = state.next ? `Следующая цена: ${money(state.next)} / ${state.next.label} — ${period(state.next)}` : active ? "Следующий ценовой этап не объявлен." : "Новые цены пока не объявлены.";
      // An announced stage alone never means checkout is available.
      const canBuy = active && !door && Boolean(url) && !preview;
      buy.hidden = !canBuy;
      get("ticket-unavailable").hidden = canBuy;
      get("ticket-unavailable").textContent = door ? "НА ВХОДЕ" : "BUY TICKET ↗";
      get("ticket-message").textContent = door ? "Покупка непосредственно на входе возможна только при наличии свободных мест. Стоимость носит информационный характер; фактическая доступность зависит от вместимости площадки и решения организаторов. Онлайн-покупка билетов на входе недоступна." : preview ? "Тестовый просмотр. Покупка отключена." : !url ? "Цены анонсированы. Билетная платформа пока не подключена; покупка недоступна." : active ? "Проверить стоимость и наличие билетов можно на билетной платформе. Ссылка откроется в новой вкладке." : "Покупка на сайте недоступна. Ожидайте подтверждения статуса продаж.";
      rows.forEach(({ row, status }, index) => {
        const current = active && index === state.index;
        const past = time >= Date.parse(stages[index].end);
        row.classList.toggle("is-current", current);
        row.classList.toggle("is-past", past);
        if (current) row.setAttribute("aria-current", "step"); else row.removeAttribute("aria-current");
        status.textContent = current ? "ТЕКУЩИЙ ЭТАП" : past ? "ЭТАП ЗАВЕРШЁН" : "ВПЕРЕДИ";
      });
    }
    render();
    window.setInterval(render, 1000);
    document.addEventListener("visibilitychange", render);
    window.addEventListener("pageshow", render);
    window.addEventListener("focus", render);
    return render;
  }
  window.PARLADOR_TICKETING = Object.freeze({ stateAt, mount });
})();

