// PARLADOR member-only shared visual helpers.
// Profile fields are taken only from RLS-protected member_profiles.
window.PARLADOR_COMMUNITY_UI = (() => {
  "use strict";
  const imageUrls = new Set();
  const badgeSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 1.5 14.7 3l3.08-.12 1.42 2.75 2.7 1.5-.16 3.08L23 12l-1.26 2.79.16 3.08-2.7 1.5-1.42 2.75L14.7 22 12 23.5 9.3 22l-3.08.12-1.42-2.75-2.7-1.5.16-3.08L1 12l1.26-2.79-.16-3.08 2.7-1.5 1.42-2.75L9.3 3z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m7.5 12.2 3 3 6-6"/></svg>';
  function verifiedBadge() {
    const badge = document.createElement("span");
    badge.className = "community-verified";
    badge.setAttribute("role","img");
    badge.setAttribute("aria-label","PARLADOR VERIFIED");
    badge.title = "PARLADOR VERIFIED";
    badge.innerHTML = badgeSvg;
    return badge;
  }
  function memberId(number) {
    return Number.isSafeInteger(Number(number)) && Number(number) > 0
      ? "P-" + String(number).padStart(6,"0") : "PARLADOR MEMBER";
  }
  function photoPath(p) {
    const path = p?.avatar_path;
    return typeof path === "string" && path.startsWith(p.user_id + "/") &&
      /^[-a-zA-Z0-9_/\.]+$/.test(path) ? path : null;
  }
  async function setAvatar(client, profile, holder, isCurrent) {
    const path = photoPath(profile);
    if (!path) return;
    try {
      const {data,error} = await client.storage.from("community-avatars").download(path);
      if (error || !data || !isCurrent()) return;
      const img = document.createElement("img");
      const url = URL.createObjectURL(data);
      imageUrls.add(url);
      img.src = url;
      img.alt = "";
      img.className = "community-avatar-img";
      holder.replaceChildren(img);
    } catch(error) {
      console.warn("PARLADOR member photo unavailable", error);
    }
  }
  async function verifiedUsers(client, ids) {
    if (!ids.length) return new Set();
    const {data,error} = await client.from("member_verifications")
      .select("user_id").in("user_id",ids);
    if (error) { console.warn("PARLADOR verification unavailable",error); return new Set(); }
    return new Set((data || []).map(row => row.user_id));
  }
  function link(kind,value) {
    if (typeof value !== "string" || !value.trim()) return null;
    let url, text;
    const handle = value.trim().replace(/^@/,"");
    if (kind === "instagram" || kind === "telegram") {
      if (!/^[A-Za-z0-9_\.]{2,50}$/.test(handle)) return null;
      if (kind === "telegram" && !/^[A-Za-z0-9_]{5,32}$/.test(handle)) return null;
      url = kind === "telegram" ? "https://t.me/" + handle : "https://www.instagram.com/" + handle + "/";
      text = (kind === "telegram" ? "TELEGRAM" : "INSTAGRAM") + " ↗";
    } else if (kind === "soundcloud") {
      try { const parsed = new URL(value); if (parsed.protocol !== "https:" || !["soundcloud.com","www.soundcloud.com"].includes(parsed.hostname) || parsed.username || parsed.password) return null; url = parsed.href; } catch {return null;}
      text = "SOUNDCLOUD ↗";
    } else return null;
    const el = document.createElement("a");
    el.className = "social-link";
    el.href = url;
    el.textContent = text;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    return el;
  }
  window.addEventListener("pagehide",() => {for(const url of imageUrls) URL.revokeObjectURL(url);imageUrls.clear();});
  return {verifiedBadge,memberId,setAvatar,verifiedUsers,link};
})();