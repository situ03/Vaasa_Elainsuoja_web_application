-- Ajetaan automaattisesti, kun Postgres-kontti käynnistyy ensimmäisen kerran

CREATE TABLE animals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kissa', 'koira')),
  age INT CHECK (age >= 0),
  breed TEXT,
  description TEXT,
  image_url TEXT,
  -- available = vapaana, reserved = hakemus jätetty (varattu), adopted = adoptio valmis
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'adopted'))
);

CREATE TABLE adoptions (
  id SERIAL PRIMARY KEY,
  animal_id INT NOT NULL REFERENCES animals(id),
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,  -- hakijan kertomus itsestään ja kodistaan (pakollinen)
  -- pending = odottaa käsittelyä, approved = hyväksytty, rejected = hylätty
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  decided_at TIMESTAMP  -- milloin henkilökunta käsitteli hakemuksen
);

-- Yhdellä eläimellä voi olla vain yksi voimassa oleva hakemus (odottava tai hyväksytty).
-- Hylätyt hakemukset jäävät historiaan, ja eläimelle voi hakea uudelleen.
CREATE UNIQUE INDEX one_active_adoption_per_animal
  ON adoptions (animal_id)
  WHERE status IN ('pending', 'approved');

-- Kuvat ovat frontend-kansiossa. Jos kuvatiedostoa ei löydy, sivu näyttää placeholder-kuvan.
INSERT INTO animals (name, type, age, breed, description, image_url) VALUES
('Miuku', 'kissa', 3, 'Maatiainen', 'Rauhallinen sylikissa, tulee toimeen lasten kanssa.', '/miuku.jpg'),
('Rekku', 'koira', 5, 'Labradorinnoutaja', 'Energinen ja ystävällinen, rakastaa lenkkeilyä.', '/rekku.jpg'),
('Nööpi', 'kissa', 1, 'Norjalainen metsäkissa', 'Leikkisä nuori kissa, sopii aktiiviseen kotiin.', '/noopi.jpg'),
('Haukku', 'koira', 8, 'Sekarotuinen', 'Seniorikoira, joka etsii rauhallista kotia.', '/haukku.jpg'),
('Pörrö', 'kissa', 6, 'Persialainen', 'Ujo aluksi, mutta lämpenee nopeasti.', '/porro.jpg'),
('Tessu', 'koira', 2, 'Bordercollie', 'Älykäs ja oppii nopeasti, tarvitsee tekemistä.', '/tessu.jpg');