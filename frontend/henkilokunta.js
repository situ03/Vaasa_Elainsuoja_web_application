// Henkilökunnan näkymä: adoptiohakemusten hyväksyntä ja hylkäys

const pendingList = document.getElementById("pending-list");
const doneList = document.getElementById("done-list");
const pendingCount = document.getElementById("pending-count");
const statusEl = document.getElementById("staff-status");

const DECISION_LABEL = { approved: "Hyväksytty", rejected: "Hylätty", pending: "Odottaa" };

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
}

function animalThumb(a) {
  return animalMedia(
    { image_url: a.animal_image, name: a.animal_name },
    "placeholder placeholder-thumb"
  );
}

function renderPending(a) {
  return `
    <article class="application" data-id="${encodeURIComponent(a.id)}">
      <div class="application-photo">${animalThumb(a)}</div>
      <div class="application-body">
        <h3>${escapeHtml(a.animal_name)} <span class="muted">(${typeLabel(a.animal_type)})</span></h3>
        <dl class="applicant">
          <div><dt>Hakija</dt><dd>${escapeHtml(a.applicant_name)}</dd></div>
          <div><dt>Sähköposti</dt><dd><a href="mailto:${escapeHtml(a.email)}">${escapeHtml(a.email)}</a></dd></div>
          <div><dt>Puhelin</dt><dd>${escapeHtml(a.phone || "Ei annettu")}</dd></div>
          <div><dt>Jätetty</dt><dd>${formatDate(a.created_at)}</dd></div>
        </dl>
        <blockquote class="applicant-message">${escapeHtml(a.message)}</blockquote>
        <div class="application-actions">
          <button type="button" class="btn btn-dark" data-decision="approve">Hyväksy adoptio</button>
          <button type="button" class="btn btn-light" data-decision="reject">Hylkää hakemus</button>
        </div>
      </div>
    </article>`;
}

function renderDone(rows) {
  if (!rows.length) return '<p class="muted">Käsiteltyjä hakemuksia ei vielä ole.</p>';
  const body = rows
    .map(
      (a) => `
      <tr>
        <td>${escapeHtml(a.animal_name)}</td>
        <td>${escapeHtml(a.applicant_name)}</td>
        <td><span class="decision decision-${a.status}">${DECISION_LABEL[a.status] || ""}</span></td>
        <td>${formatDate(a.decided_at)}</td>
      </tr>`
    )
    .join("");
  return `
    <table class="done-table">
      <thead><tr><th>Eläin</th><th>Hakija</th><th>Päätös</th><th>Käsitelty</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

async function loadAdoptions() {
  try {
    const res = await fetch("/api/adoptions");
    if (!res.ok) throw new Error("Haku epäonnistui");
    const rows = await res.json();

    const pending = rows.filter((a) => a.status === "pending");
    const done = rows.filter((a) => a.status !== "pending");

    pendingCount.textContent = pending.length;
    pendingList.innerHTML = pending.length
      ? pending.map(renderPending).join("")
      : '<p class="muted">Ei odottavia hakemuksia. Uudet hakemukset näkyvät täällä heti.</p>';
    doneList.innerHTML = renderDone(done);
  } catch (err) {
    console.error(err);
    pendingList.innerHTML =
      '<p class="error">Hakemuksia ei saatu haettua. Tarkista, että Server A ja Server B ovat käynnissä.</p>';
  }
}

// Hyväksy- ja Hylkää-napit
pendingList.addEventListener("click", async (e) => {
  const button = e.target.closest("button[data-decision]");
  if (!button) return;

  const card = button.closest(".application");
  const id = card.dataset.id;
  const buttons = card.querySelectorAll("button");
  buttons.forEach((b) => (b.disabled = true));
  button.classList.add("loading");

  try {
    const res = await fetch(`/api/adoptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: button.dataset.decision }),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      statusEl.className = "staff-status is-error";
      statusEl.textContent = result.error || "Hakemuksen käsittely epäonnistui.";
    } else {
      statusEl.className = "staff-status is-ok";
      statusEl.textContent = result.message;
    }
  } catch (err) {
    console.error(err);
    statusEl.className = "staff-status is-error";
    statusEl.textContent = "Yhteys palvelimeen epäonnistui. Yritä hetken kuluttua uudelleen.";
  }

  await loadAdoptions();
});

loadAdoptions();