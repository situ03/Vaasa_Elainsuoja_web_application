// Eläimen yksityiskohtasivu + adoptiolomake

const detail = document.getElementById("animal-detail");
const animalId = new URLSearchParams(window.location.search).get("id");

function renderForm() {
  return `
    <form id="adopt-form" class="adopt-form" novalidate>
      <h2>Adoptiohakemus</h2>
      <div class="field">
        <label for="applicant_name">Nimi *</label>
        <input id="applicant_name" name="applicant_name" type="text" autocomplete="name" required>
      </div>
      <div class="field">
        <label for="email">Sähköposti *</label>
        <input id="email" name="email" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="phone">Puhelin</label>
        <input id="phone" name="phone" type="tel" autocomplete="tel">
      </div>
      <div class="field">
        <label for="message">Kerro itsestäsi ja kodistasi *</label>
        <span id="message-hint" class="field-hint">Esimerkiksi millainen koti ja arki sinulla on, onko muita lemmikkejä ja miksi juuri tämä eläin.</span>
        <textarea id="message" name="message" rows="5" required aria-describedby="message-hint"></textarea>
      </div>
      <p id="form-error" class="error" role="alert"></p>
      <button type="submit" class="btn btn-dark">Adoptoi minut</button>
    </form>`;
}

// Näytetään lomakkeen tilalla, jos eläin ei ole vapaana
function renderUnavailable(status) {
  const reserved = status === "reserved";
  return `
    <div class="adopted-note">
      <h2>${reserved ? "Tämä eläin on varattu" : "Tämä eläin on jo löytänyt kodin"}</h2>
      <p class="muted">${
        reserved
          ? "Eläimellä on jo adoptiohakemus käsittelyssä. Kurkkaa, kuka muu odottaa kotia."
          : "Kurkkaa, kuka muu odottaa kotia."
      }</p>
      <a href="index.html#elaimet" class="btn btn-dark">Katso muut eläimet</a>
    </div>`;
}

function renderAnimal(a) {
  const available = a.status === "available";
  document.title = `${a.name} – Vaasan Eläinsuoja`;

  detail.innerHTML = `
    <div class="detail-media">
      ${animalMedia(a, "placeholder placeholder-large")}
      ${statusBadge(a.status)}
    </div>
    <div class="detail-info">
      <h1>${escapeHtml(a.name)}</h1>
      <dl class="facts">
        <div><dt>Laji</dt><dd>${typeLabel(a.type)}</dd></div>
        <div><dt>Ikä</dt><dd>${ageLabel(a.age)}</dd></div>
        <div><dt>Rotu</dt><dd>${escapeHtml(a.breed || "Ei tiedossa")}</dd></div>
      </dl>
      <p class="description">${escapeHtml(a.description || "")}</p>
      ${available ? renderForm() : renderUnavailable(a.status)}
    </div>`;

  if (available) setupForm(a);
}

function showError(el, text) {
  // Tyhjennys ja uudelleenasetus käynnistää ravistusanimaation uudelleen
  el.textContent = "";
  void el.offsetWidth;
  el.textContent = text;
}

// Virheilmoitus puuttuvien kenttien mukaan
const FIELD_NAMES = { applicant_name: "nimi", email: "sähköposti", message: "kertomus itsestäsi" };
const SINGLE_MESSAGES = {
  applicant_name: "Kirjoita vielä nimesi.",
  email: "Kirjoita vielä sähköpostiosoitteesi.",
  message: "Kerro vielä vähän itsestäsi ja kodistasi.",
};

function missingMessage(missing) {
  if (missing.length === 1) return SINGLE_MESSAGES[missing[0]];
  const names = missing.map((k) => FIELD_NAMES[k]);
  const list = names.slice(0, -1).join(", ") + " ja " + names.at(-1);
  return `Täytä vielä: ${list}.`;
}

function setupForm(animal) {
  const form = document.getElementById("adopt-form");
  const errorEl = document.getElementById("form-error");
  const button = form.querySelector("button");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const data = Object.fromEntries(new FormData(form));
    Object.keys(data).forEach((k) => (data[k] = data[k].trim()));

    // Kerrotaan vain ne kentät, jotka oikeasti puuttuvat
    const missing = ["applicant_name", "email", "message"].filter((k) => !data[k]);
    if (missing.length) {
      showError(errorEl, missingMessage(missing));
      form[missing[0]].focus();
      return;
    }
    if (!form.email.checkValidity()) {
      showError(errorEl, "Tarkista sähköpostiosoite.");
      form.email.focus();
      return;
    }

    button.disabled = true;
    button.classList.add("loading");
    button.textContent = "Lähetetään…";

    try {
      const res = await fetch(`/api/animals/${encodeURIComponent(animal.id)}/adopt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json().catch(() => ({}));

      if (res.status === 201) {
        const params = new URLSearchParams({
          animal: animal.name,
          name: data.applicant_name,
          id: result.adoption?.id ?? "",
        });
        window.location.href = `kiitos.html?${params}`;
        return;
      }

      if (res.status === 409) {
        // Joku ehti jättää hakemuksen ensin
        form.outerHTML = renderUnavailable(result.status || "reserved");
        const badge = detail.querySelector(".detail-media .badge");
        if (badge) badge.outerHTML = statusBadge(result.status || "reserved");
        return;
      }

      showError(errorEl, result.error || "Hakemuksen lähetys epäonnistui.");
    } catch (err) {
      console.error(err);
      showError(errorEl, "Yhteys palvelimeen epäonnistui. Yritä hetken kuluttua uudelleen.");
    }

    button.disabled = false;
    button.classList.remove("loading");
    button.textContent = "Adoptoi minut";
  });
}

async function loadAnimal() {
  if (!animalId) {
    detail.innerHTML = '<p class="error">Eläintä ei valittu.</p>';
    return;
  }

  try {
    const res = await fetch(`/api/animals/${encodeURIComponent(animalId)}`);
    if (res.status === 404 || res.status === 400) {
      detail.innerHTML = '<p class="error">Eläintä ei löytynyt.</p>';
      return;
    }
    if (!res.ok) throw new Error("Haku epäonnistui");
    renderAnimal(await res.json());
  } catch (err) {
    console.error(err);
    detail.innerHTML =
      '<p class="error">Tietojen lataaminen epäonnistui. Yritä hetken kuluttua uudelleen.</p>';
  }
}

loadAnimal();