// Public settings only. Never place credentials or subscriber data here.
window.PARLADOR_CONFIG = Object.freeze({
  tickets: {
    platformUrl: null, // Confirmed HTTPS ticket-platform URL enables BUY TICKET.
    timeZone: "Europe/Moscow",
    currency: "RUB",
    // Inclusive start, exclusive end. Changes start at Moscow midnight; the door stage ends with the event.
    stages: [
      { start: "2026-11-21T00:00:00+03:00", end: "2026-11-28T00:00:00+03:00", price: 1700 },
      { start: "2026-11-28T00:00:00+03:00", end: "2026-12-05T00:00:00+03:00", price: 1900 },
      { start: "2026-12-05T00:00:00+03:00", end: "2026-12-12T00:00:00+03:00", price: 2300 },
      { start: "2026-12-12T00:00:00+03:00", end: "2026-12-19T00:00:00+03:00", price: 2500 },
      { start: "2026-12-19T00:00:00+03:00", end: "2026-12-20T06:00:00+03:00", price: 2700, kind: "door", label: "AT THE DOOR" },
    ],
  },
  community: {
    telegramUrl: null, // Confirmed https://t.me/... or https://telegram.me/... URL.
  },
  // Reserved for a future subscription integration with consent and a real provider.
  // No form, requests or subscriber storage are created until that feature is built.
  newsletter: { enabled: false, provider: null },
  // Future profiles are keyed by each card's data-artist-id; no empty profile UI.
  artistProfiles: {},
});

