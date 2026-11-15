const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// Yhteys tietokantaan
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://admin:adminadmin@localhost:5433/elainsuoja",
});

// Server B:n osoite
const SERVER_B_URL = process.env.SERVER_B_URL || "http://localhost:3002";

// Tarkistaa, että id on positiivinen kokonaisluku
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET kaikki eläimet
app.get("/animals", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM animals ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Tietokantavirhe" });
  }
});

// GET yksi eläin id:n perusteella
app.get("/animals/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Virheellinen eläimen id" });
  }

  try {
    const result = await pool.query("SELECT * FROM animals WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Eläintä ei löytynyt" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Tietokantavirhe" });
  }
});

// POST adoptiohakemus
app.post("/animals/:id/adopt", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Virheellinen eläimen id" });
  }

  try {
    const response = await fetch(`${SERVER_B_URL}/adoptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...req.body,
        animal_id: id,
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res
      .status(502)
      .json({ error: "Adoptiopalvelu ei vastaa, yritä hetken kuluttua uudelleen" });
  }
});

// Henkilökunnan näkymä
async function forwardToServerB(res, path, options = {}) {
  try {
    const response = await fetch(`${SERVER_B_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res
      .status(502)
      .json({ error: "Adoptiopalvelu ei vastaa, yritä hetken kuluttua uudelleen" });
  }
}

// GET kaikki hakemukset
app.get("/adoptions", (req, res) => forwardToServerB(res, "/adoptions"));

app.patch("/adoptions/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Virheellinen hakemuksen id" });
  }
  forwardToServerB(res, `/adoptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ decision: req.body?.decision }),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server A käynnissä portissa ${PORT}`);
});
