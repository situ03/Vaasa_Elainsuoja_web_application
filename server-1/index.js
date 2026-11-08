const express = require("express");
const {Pool} = require("pg");

const app = express();
app.use(express.json());

//yhteys tietokantaan
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://admin:adminadmin@localhost:5433/elainsuoja",
});


//get kaikki eläimet
app.get("/animals", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM animals ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Tietokantavirhe" });
  }
});


//get yksi eläin id:n perusteella
app.get("/animals/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM animals WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Eläintä ei löytynyt" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Tietokantavirhe" });
  }
});

const SERVER_B_URL = process.env.SERVER_B_URL || "http://localhost:3002";

app.post("/animals/:id/adopt", async (req, res) => {
  try {
    const response = await fetch(`${SERVER_B_URL}/adoptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animal_id: Number(req.params.id),
        ...req.body,
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Adoptiopalvelu ei vastaa, yritä hetken kuluttua uudelleen" });
  }
});



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server A käynnissä portissa ${PORT}`);
});