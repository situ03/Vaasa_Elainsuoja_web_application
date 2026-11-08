CREATE TABLE animals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kissa', 'koira')),
  age INT,
  breed TEXT,
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'available'
);

CREATE TABLE adoptions (
  id SERIAL PRIMARY KEY,
  animal_id INT NOT NULL UNIQUE REFERENCES animals(id),
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO animals (name, type, age, breed, description, image_url) VALUES
('Miuku', 'kissa', 3, 'Maatiainen', 'Rauhallinen sylikissa, tulee toimeen lasten kanssa.', NULL),
('Rekku', 'koira', 5, 'Labradorinnoutaja', 'Energinen ja ystävällinen, rakastaa lenkkeilyä.', NULL),
('Nööpi', 'kissa', 1, 'Norjalainen metsäkissa', 'Leikkisä nuori kissa, sopii aktiiviseen kotiin.', NULL),
('Haukku', 'koira', 8, 'Sekarotuinen', 'Seniorikoira, joka etsii rauhallista kotia.', NULL),
('Pörrö', 'kissa', 6, 'Persialainen', 'Ujo aluksi, mutta lämpenee nopeasti.', NULL),
('Tessu', 'koira', 2, 'Bordercollie', 'Älykäs ja oppii nopeasti, tarvitsee tekemistä.', NULL);




