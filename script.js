(() => {
  "use strict";

  const start = Date.parse("2026-12-19T22:00:00+03:00");
  const end = Date.parse("2026-12-20T06:00:00+03:00");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.getElementById("menu-panel");
  const menuLinks = [...menu.querySelectorAll("a")];
  let shade;

  function closeMenu(returnFocus = false) {
    menu.hidden = true;
    menu.inert = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Открыть меню");
    document.body.classList.remove("menu-open");
    shade?.remove();
    shade = undefined;
    if (returnFocus) menuButton.focus({ preventScroll: true });
  }

  function openMenu() {
    menu.hidden = false;
    menu.inert = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Закрыть меню");
    document.body.classList.add("menu-open");
    shade = document.createElement("div");
    shade.className = "menu-shade";
    shade.setAttribute("aria-hidden", "true");
    shade.addEventListener("click", () => closeMenu(true));
    document.querySelector(".hero-shell").appendChild(shade);
    menuLinks[0].focus();
  }

  menuButton.addEventListener("click", () =>
    menu.hidden ? openMenu() : closeMenu(true),
  );
  menuLinks.forEach((link) =>
    link.addEventListener("click", () => {
      closeMenu();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        target.addEventListener(
          "blur",
          () => target.removeAttribute("tabindex"),
          { once: true },
        );
      }
    }),
  );

  document.addEventListener("keydown", (event) => {
    if (menu.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    }
    if (event.key === "Tab") {
      const last = menuLinks[menuLinks.length - 1];
      if (event.shiftKey && document.activeElement === menuButton) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        menuButton.focus();
      }
    }
  });
  window.addEventListener("resize", () => {
    if (!menu.hidden) closeMenu(true);
  });

  const countdown = document.querySelector(".countdown");
  const label = document.getElementById("countdown-label");
  const fields = ["days", "hours", "minutes", "seconds"].map((id) =>
    document.getElementById(id),
  );
  function updateCountdown() {
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((start - now) / 1000));
    const values = [
      Math.floor(seconds / 86400),
      Math.floor((seconds % 86400) / 3600),
      Math.floor((seconds % 3600) / 60),
      seconds % 60,
    ];
    values.forEach((value, index) => {
      fields[index].textContent = String(value).padStart(2, "0");
    });
    if (now >= end) {
      label.textContent = "SESSION COMPLETE / MOSCOW TIME";
      countdown.setAttribute("aria-label", "Мероприятие завершилось");
    } else if (now >= start) {
      label.textContent = "THE NIGHT IS ON / MOSCOW TIME";
      countdown.setAttribute("aria-label", "Мероприятие началось");
    } else {
      label.textContent = "COUNTDOWN / MOSCOW TIME";
      countdown.setAttribute(
        "aria-label",
        `До начала: ${values[0]} дн., ${values[1]} ч., ${values[2]} мин., ${values[3]} сек.`,
      );
    }
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateCountdown();
  });

  const artists = document.getElementById("artist-list");
  const previous = document.getElementById("artists-prev");
  const next = document.getElementById("artists-next");
  const position = document.getElementById("artists-position");
  const cards = [...artists.querySelectorAll(".artist-card")];
  function updateArtistControls() {
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap =
      Number.parseFloat(window.getComputedStyle(artists).columnGap) || 0;
    const step = cardWidth + gap;
    if (step <= 0) return;
    const first = Math.max(
      1,
      Math.min(cards.length, Math.round(artists.scrollLeft / step) + 1),
    );
    const visible = Math.max(1, Math.round((artists.clientWidth + gap) / step));
    previous.disabled = artists.scrollLeft <= 2;
    next.disabled =
      artists.scrollLeft + artists.clientWidth >= artists.scrollWidth - 2;
    position.textContent = `${String(first).padStart(2, "0")} — ${String(Math.min(cards.length, first + visible - 1)).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
  }
  function moveArtists(direction) {
    artists.scrollBy({
      left: direction * artists.clientWidth,
      behavior: motion.matches ? "instant" : "smooth",
    });
  }
  previous.addEventListener("click", () => moveArtists(-1));
  next.addEventListener("click", () => moveArtists(1));
  artists.addEventListener("scroll", updateArtistControls, { passive: true });
  artists.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveArtists(event.key === "ArrowRight" ? 1 : -1);
    }
  });
  window.addEventListener("resize", updateArtistControls);
  updateArtistControls();

  // Only confirmed external destinations enable actions. No payment runs here.
  const config = window.PARLADOR_CONFIG || {};
  function externalUrl(value, telegram = false) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) return null;
      if (telegram && !["t.me", "telegram.me"].includes(url.hostname)) return null;
      if (telegram && url.pathname === "/") return null;
      return url.href;
    } catch { return null; }
  }
  function activateLink(linkId, disabledId, url) {
    if (!url) return;
    const link = document.getElementById(linkId);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.hidden = false;
    document.getElementById(disabledId).hidden = true;
  }
  window.PARLADOR_TICKETING.mount(config.tickets || {});
  const telegramUrl = externalUrl(config.community?.telegramUrl, true);
  activateLink("telegram-join", "telegram-unavailable", telegramUrl);
  if (telegramUrl) document.getElementById("telegram-message").textContent =
    "Анонсы и новости PARLADOR — в нашем Telegram. Канал откроется в новой вкладке.";

  if ("IntersectionObserver" in window && !motion.matches) {
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".ticket-panel, .community-copy").forEach((element) => {
      element.classList.add("phase-reveal");
      reveal.observe(element);
    });
    motion.addEventListener("change", () => {
      if (motion.matches) {
        document.querySelectorAll(".phase-reveal").forEach((element) => element.classList.add("is-visible"));
        reveal.disconnect();
      }
    });
  }

  if ("IntersectionObserver" in window) {
    const links = [...document.querySelectorAll(".desktop-nav a")];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          let id = entry.target.id;
          links.forEach((link) => {
            const active = link.hash === `#${id}`;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-15% 0px -55% 0px" },
    );
    ["home", "lineup", "manifesto", "tickets", "community"].forEach((id) =>
      observer.observe(document.getElementById(id)),
    );
  }
})();


