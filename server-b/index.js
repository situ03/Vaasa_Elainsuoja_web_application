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

// POST adoptiohakemus
app.post("/adoptions", async (req, res) => {
  const { animal_id, applicant_name, email, phone, message } = req.body || {};

  // Pakolliset kentät: eläin, nimi, sähköposti ja kertomus itsestä (message)
  const isFilled = (v) => typeof v === "string" && v.trim() !== "";
  if (!animal_id || !isFilled(applicant_name) || !isFilled(email) || !isFilled(message)) {
    return res.status(400).json({
      error: "Eläimen id, nimi, sähköposti ja kertomus itsestäsi ovat pakollisia",
    });
  }
  if (!Number.isInteger(animal_id) || animal_id < 1) {
    return res.status(400).json({ error: "Virheellinen eläimen id" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const update = await client.query(
      "UPDATE animals SET status = 'reserved' WHERE id = $1 AND status = 'available' RETURNING *",
      [animal_id]
    );

    if (update.rows.length === 0) {
      await client.query("ROLLBACK");
      const exists = await client.query("SELECT status FROM animals WHERE id = $1", [
        animal_id,
      ]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: "Voi harmi :( Eläintä ei löytynyt" });
      }
      const status = exists.rows[0].status;
      return res.status(409).json({
        error:
          status === "reserved"
            ? "Ihanaa että haluat adoptoida, mutta eläimellä on jo hakemus käsittelyssä"
            : "Ihanaa että haluat adoptoida, mutta etsimäsi eläin on jo adoptoitu",
        status,
      });
    }

    const adoption = await client.query(
      `INSERT INTO adoptions (animal_id, applicant_name, email, phone, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [animal_id, applicant_name.trim(), email.trim(), phone || null, message.trim()]
    );

    await client.query("COMMIT");
    res.status(201).json({
      message: "Kiitos, adoptiohakemus vastaanotettu",
      adoption: adoption.rows[0],
      animal: update.rows[0],
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(500).json({ error: "Tietokantavirhe" });
  } finally {
    if (client) client.release();
  }
});

// GET kaikki hakemukset henkilökunnan näkymää varten
app.get("/adoptions", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, an.name AS animal_name, an.type AS animal_type,
              an.image_url AS animal_image, an.status AS animal_status
       FROM adoptions a
       JOIN animals an ON an.id = a.animal_id
       ORDER BY (a.status = 'pending') DESC, a.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Tietokantavirhe" });
  }
});

// PATCH hakemuksen käsittely: { "decision": "approve" } tai { "decision": "reject" }
app.patch("/adoptions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { decision } = req.body || {};

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Virheellinen hakemuksen id" });
  }
  if (decision !== "approve" && decision !== "reject") {
    return res.status(400).json({ error: "Päätöksen pitää olla approve tai reject" });
  }

  const adoptionStatus = decision === "approve" ? "approved" : "rejected";
  const animalStatus = decision === "approve" ? "adopted" : "available";

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Vain odottavan hakemuksen voi käsitellä, joten samaa hakemusta ei käsitellä kahdesti
    const adoption = await client.query(
      `UPDATE adoptions SET status = $1, decided_at = NOW()
       WHERE id = $2 AND status = 'pending' RETURNING *`,
      [adoptionStatus, id]
    );

    if (adoption.rows.length === 0) {
      await client.query("ROLLBACK");
      const exists = await client.query("SELECT status FROM adoptions WHERE id = $1", [id]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: "Hakemusta ei löytynyt" });
      }
      return res.status(409).json({ error: "Hakemus on jo käsitelty", status: exists.rows[0].status });
    }

    const animal = await client.query(
      "UPDATE animals SET status = $1 WHERE id = $2 RETURNING *",
      [animalStatus, adoption.rows[0].animal_id]
    );

    await client.query("COMMIT");
    res.json({
      message:
        decision === "approve"
          ? `${animal.rows[0].name} on nyt adoptoitu`
          : `Hakemus hylätty, ${animal.rows[0].name} on taas vapaana`,
      adoption: adoption.rows[0],
      animal: animal.rows[0],
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(500).json({ error: "Tietokantavirhe" });
  } finally {
    if (client) client.release();
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server B käynnissä portissa ${PORT}`);
});
