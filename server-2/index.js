const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://admin:adminadmin@localhost:5433/elainsuoja",
});


app.post("/adoptions", async (req, res) => {
  const { animal_id, applicant_name, email, phone, message } = req.body;

  if (!animal_id || !applicant_name || !email) {
    return res
      .status(400)
      .json({ error: "Eläimen id, nimi ja sähköposti ovat pakollisia" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");


     const update = await client.query(
      "UPDATE animals SET status = 'adopted' WHERE id = $1 AND status = 'available' RETURNING *",
      [animal_id]
    );

    if (update.rows.length === 0) {
      await client.query("ROLLBACK");
      const exists = await pool.query("SELECT id FROM animals WHERE id = $1", [
        animal_id,
      ]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: "Voi harmi :( Eläintä ei löytynyt" });
      }
      return res.status(409).json({ error: "Ihanaa että haluat adoptoida, mutta etsimäsi eläin on jo adoptoitu" });
    }

    const adoption = await client.query(
      `INSERT INTO adoptions (animal_id, applicant_name, email, phone, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [animal_id, applicant_name, email, phone, message]
    );

    await client.query("COMMIT");
    res.status(201).json({
      message: "Kiitos, adoptiohakemus vastaanotettu",
      adoption: adoption.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Tietokantavirhe" });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server B käynnissä portissa ${PORT}`);
});