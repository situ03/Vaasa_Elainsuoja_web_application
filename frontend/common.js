// Yhteiset apufunktiot kaikille sivuille

const PAW_ICON = `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>`;

const PLACEHOLDER_HTML = `${PAW_ICON}<span>Kuvaa ei vielä saatavilla</span>`;

// Estää HTML:n syöttämisen tietokannan tekstien kautta (XSS)
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function typeLabel(type) {
  return type === "kissa" ? "Kissa" : "Koira";
}

// 1 vuosi, 2 vuotta
function ageLabel(age) {
  const n = Number(age);
  if (!Number.isFinite(n)) return "";
  return n === 1 ? "1 vuosi" : `${n} vuotta`;
}

// Eläimen tila: available = vapaana, reserved = varattu (hakemus jätetty), adopted = adoptoitu
const STATUS = {
  available: { label: "Vapaana", badge: "badge-available" },
  reserved: { label: "Varattu", badge: "badge-reserved" },
  adopted: { label: "Adoptoitu", badge: "badge-adopted" },
};

function statusInfo(status) {
  return STATUS[status] || STATUS.available;
}

function statusBadge(status) {
  const s = statusInfo(status);
  return `<span class="badge ${s.badge}">${s.label}</span>`;
}

// Kuva tai placeholder, jos kuvaa ei ole
function animalMedia(a, placeholderClass = "placeholder") {
  return a.image_url
    ? `<img src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.name)}" loading="lazy" data-placeholder="${placeholderClass}">`
    : `<div class="${placeholderClass}">${PLACEHOLDER_HTML}</div>`;
}

// Jos kuvatiedostoa ei löydy, vaihdetaan tilalle placeholder
document.addEventListener(
  "error",
  (e) => {
    const img = e.target;
    if (img.tagName !== "IMG" || !img.dataset.placeholder) return;
    const div = document.createElement("div");
    div.className = img.dataset.placeholder;
    div.innerHTML = PLACEHOLDER_HTML;
    img.replaceWith(div);
  },
  true
);

// ---------- Headerin alareuna vierittäessä + takaisin ylös -nappi ----------
function setupScrollEffects() {
  const header = document.querySelector(".site-header");

  const toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.type = "button";
  toTop.setAttribute("aria-label", "Takaisin sivun alkuun");
  toTop.textContent = "↑";
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(toTop);

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 8);
    toTop.classList.toggle("show", y > 600);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

setupScrollEffects();
