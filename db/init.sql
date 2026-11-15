-- Ajetaan automaattisesti, kun Postgres-kontti käynnistyy ensimmäisen kerran

CREATE TABLE animals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kissa', 'koira')),
  age INT CHECK (age >= 0),
  breed TEXT,
  description TEXT,
  image_url TEXT,

  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'adopted'))
);

CREATE TABLE adoptions (
  id SERIAL PRIMARY KEY,
  animal_id INT NOT NULL REFERENCES animals(id),
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL, 
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  decided_at TIMESTAMP 
);


CREATE UNIQUE INDEX one_active_adoption_per_animal
  ON adoptions (animal_id)
  WHERE status IN ('pending', 'approved');

INSERT INTO animals (name, type, age, breed, description, image_url) VALUES
('Miuku', 'kissa', 3, 'Maatiainen', 'Miuku on rauhallinen tyttö kissa, tulee toimeen lasten kanssa. Hän on siis kunnon sohvaperuna. Miukulla on ollut pieniä silmien terveysongelmia sillä hän on asunut kadulla pienestä asti, joten ne vaativat pientä hoitoa.', '/miuku.jpg'),
('Rekku', 'koira', 5, 'Labradorinnoutaja', 'Energinen ja ystävällinen nuori poika, rakastaa lenkkeilyä. Olisi mielellään useamman koiran taloudessa sillä hän tulee hyvin toimeen muiden koirien kanssa.', '/rekku.jpg'),
('Nööpi', 'kissa', 1, 'Norjalainen metsäkissa', 'Leikkisä nuori naaras kissa, sopii aktiiviseen kotiin.', '/noopi.jpg'),
('Haukku', 'koira', 8, 'Sekarotuinen', 'Uros seniorikoira, joka etsii rauhallista kotia. Hän voi sinun kanssa katsella elokuvia ja sarjoja päivät pitkät sohvalla.', '/haukku.jpg'),
('Pörrö', 'kissa', 6, 'Persialainen', 'Pörrö on ujo tyttö aluksi, mutta lämpenee nopeasti. Pörrö ei kuitenkaan pidä muista lemmikeistä tai eläimistä, joten hänen tulisi olla ainoa lemmikki kotitaloudessa.', '/porro.jpg'),
('Tessu', 'koira', 2, 'Bordercollie', 'Tessu on älykäs nuori uros ja hän oppii nopeasti, eli tarvitsee tekemistä. Tessu siis sopii aktiiviselle perheelle ja kotiin jossa olisi oma piha missä juosta.', '/tessu.jpg');