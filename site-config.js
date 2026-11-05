// Public settings only. Never place credentials or subscriber data here.
window.PARLADOR_CONFIG = Object.freeze({
  tickets: {
    platformUrl: null, // Confirmed HTTPS ticket-platform URL enables BUY TICKET.
    categories: [], // Confirmed entries: { name, priceLabel }. No invented prices.
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
