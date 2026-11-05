(() => {
  'use strict';

  const eventStart = new Date('2026-12-19T22:00:00+03:00').getTime();
  const eventEnd = new Date('2026-12-20T06:00:00+03:00').getTime();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.navigation');
  const mobile = window.matchMedia('(max-width: 760px)');

  header.classList.add('menu-enhanced');
  function setMenu(open, returnFocus = false) {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    navigation.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) navigation.querySelector('a').focus();
    if (returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false, mobile.matches)));
  mobile.addEventListener('change', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (menuButton.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
    if (event.key === 'Tab') {
      const links = [...navigation.querySelectorAll('a')];
      const first = menuButton;
      const last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  const fields = ['days', 'hours', 'minutes', 'seconds'].map(id => document.getElementById(id));
  const countdownLabel = document.getElementById('countdown-label');
  const countdown = document.getElementById('countdown');
  function updateCountdown() {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((eventStart - now) / 1000));
    const values = [Math.floor(remaining / 86400), Math.floor(remaining % 86400 / 3600), Math.floor(remaining % 3600 / 60), remaining % 60];
    fields.forEach((field, index) => { field.textContent = String(values[index]).padStart(2, '0'); });
    countdown.setAttribute('aria-label', `До начала: ${values[0]} дн., ${values[1]} ч., ${values[2]} мин., ${values[3]} сек.`);
    if (now >= eventEnd) {
      countdownLabel.textContent = 'ЭТА НОЧЬ ОСТАНЕТСЯ С НАМИ';
      countdown.setAttribute('aria-label', 'Мероприятие завершилось');
    } else if (now >= eventStart) {
      countdownLabel.textContent = 'НОЧЬ УЖЕ НАЧАЛАСЬ';
      countdown.setAttribute('aria-label', 'Мероприятие началось');
    }
  }
  updateCountdown();
  const timer = window.setInterval(updateCountdown, 1000);
  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });

  const dialog = document.getElementById('ticket-dialog');
  const ticketButton = document.getElementById('ticket-button');
  ticketButton.addEventListener('click', () => {
    dialog.showModal();
    document.body.classList.add('modal-open');
  });
  document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
  document.getElementById('dialog-confirm').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    ticketButton.focus({ preventScroll: true });
  });

  document.getElementById('calendar-button').addEventListener('click', () => {
    const calendar = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PARLADOR//EVENT 2026//RU', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:parlador-20261219-fabula@parlador.local', 'DTSTAMP:20261105T000000Z',
      'DTSTART:20261219T190000Z', 'DTEND:20261220T030000Z', 'SUMMARY:PARLADOR — Fabula',
      'LOCATION:Fabula\\, Москва',
      'DESCRIPTION:PARLADOR. 19 декабря 2026\\, 22:00–06:00 МСК. DJ KALASHNIKOV / DANJAMIN / M.E.G / FRDM / ACID BOSS / Девиантный Диалект.',
      'END:VEVENT', 'END:VCALENDAR', ''
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', calendar], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'PARLADOR-19-12-2026.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    document.getElementById('calendar-status').textContent = 'Файл события для календаря подготовлен.';
  });

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('is-pending');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('is-pending');
      observer.observe(element);
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) {
        observer.disconnect();
        document.querySelectorAll('.is-pending').forEach(element => element.classList.remove('is-pending'));
      }
    });
  }
})();
