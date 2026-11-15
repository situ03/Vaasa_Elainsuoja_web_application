// Etusivu: eläinlista korttimuodossa

let allAnimals = [];

function renderCard(a) {
  const available = a.status === "available";

  return `
    <article class="card card-${a.type === "kissa" ? "kissa" : "koira"} ${available ? "" : "is-unavailable"}">
      <div class="card-media">
        ${animalMedia(a)}
        ${statusBadge(a.status)}
      </div>
      <div class="card-body">
        <h3>${escapeHtml(a.name)}</h3>
        <p>${typeLabel(a.type)}, ${ageLabel(a.age)}</p>
        <p class="breed">${escapeHtml(a.breed || "")}</p>
        <a href="animal.html?id=${encodeURIComponent(a.id)}" class="btn ${available ? "btn-dark" : "btn-light"}">
Katso lisää</a>
      </div>
    </article>`;
}

function renderSkeletons(count = 6) {
  const card = `
    <div class="card skeleton" aria-hidden="true">
      <div class="sk sk-media"></div>
      <div class="card-body">
        <div class="sk sk-title"></div>
        <div class="sk sk-line"></div>
        <div class="sk sk-btn"></div>
      </div>
    </div>`;
  document.getElementById("animal-list").innerHTML = card.repeat(count);
}

function renderList(type) {
  const list = document.getElementById("animal-list");
  const shown = type === "kaikki" ? allAnimals : allAnimals.filter((a) => a.type === type);

  list.innerHTML = shown.length
    ? shown.map(renderCard).join("")
    : '<p class="muted">Juuri nyt ei ole tämän lajin eläimiä. Katso kaikki eläimet.</p>';

  const free = allAnimals.filter((a) => a.status === "available").length;
  document.getElementById("animal-count").textContent =
    free === 1 ? "1 karvakaveri etsii kotia juuri nyt." : `${free} karvakaveria etsii kotia juuri nyt.`;
}

function setupFilters() {
  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
      renderList(button.dataset.type);
    });
  });
}

async function loadAnimals() {
  renderSkeletons();
  try {
    const res = await fetch("/api/animals");
    if (!res.ok) throw new Error("Haku epäonnistui");
    allAnimals = await res.json();
    renderList("kaikki");
    setupFilters();
  } catch (err) {
    console.error(err);
    document.getElementById("animal-list").innerHTML =
      '<p class="error">Eläimiä ei saatu haettua. Päivitä sivu hetken kuluttua.</p>';
  }
}

loadAnimals();
