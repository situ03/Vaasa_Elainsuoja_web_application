# Vaasan Eläinsuoja – adoptiosovellus
Web-palvelujen toteutus kurssin projektityö.
Tekijänä: Sini-Tuuli Laakso
Aihe: Verkkosovellus, jossa voi selata adoptoitavia eläimiä ja jättää adoptiohakemuksen.

## Arkkitehtuuri

| Palvelu    | Kansio      | Portti | Tehtävä |
|------------|-------------|--------|---------|
| frontend   | `frontend/` | 8080   | Nginx tarjoilee sivut ja välittää `/api/*`-pyynnöt Server A:lle (ilman Dockeria `dev-server.js`) |
| server-a   | `server-a/` | 3001   | Eläintiedot ja API gateway |
| server-b   | `server-b/` | 3002   | Adoptiohakemusten tallennus |
| db         | `db/`       | 5433   | PostgreSQL, alustetaan `init.sql`:llä |

Adoptiohakemuksen kulku:

1. Frontend → `POST /api/animals/:id/adopt` → Server A
2. Server A → `POST /adoptions` → Server B (Docker-verkossa `http://server-b:3002`)
3. Server B tallentaa hakemuksen ja vaihtaa eläimen statuksen `reserved`-tilaan (varattu) samassa transaktiossa
4. Server B → vahvistus → Server A → frontend → kiitos-sivu

Eläimen tilat:

| Status | Näkyy sivulla | Merkitys |
|--------|---------------|----------|
| `available` | Vapaana | Eläimelle voi jättää hakemuksen |
| `reserved` | Varattu | Hakemus on jätetty ja odottaa käsittelyä |
| `adopted` | Adoptoitu | Henkilökunta on hyväksynyt adoption |

Henkilökunta käsittelee hakemukset sivulla **http://localhost:8080/henkilokunta.html** (linkki footerissa). Hyväksyntä merkitsee eläimen adoptoiduksi, ja hylkäys palauttaa sen vapaaksi, jolloin sille voi hakea uudelleen. Oikeassa käytössä sivu olisi kirjautumisen takana.

Samaa eläintä ei voi adoptoida kahdesti. Server B päivittää statuksen vain ehdolla `status = 'available'`, ja tietokannan indeksi sallii yhdelle eläimelle vain yhden voimassa olevan hakemuksen (odottava tai hyväksytty). Kun eläin on varattu tai adoptoitu, uusi hakemus palauttaa `409`.

## Erilliset palvelimet

Server A ja Server B ovat kaksi erillistä Node.js/Express-sovellusta. Niillä on omat kansiot (`server-a/`, `server-b/`), omat Dockerfilet ja omat kontit. Server A ei kirjoita adoptioita tietokantaan itse. Se välittää jokaisen hakemuksen HTTP POST -pyyntönä Server B:lle ja palauttaa Server B:n vastauksen frontendille. Jos Server B ei ole käynnissä, adoptio ei onnistu, ja Server A vastaa `502`. Eläinten selaaminen toimii silti.

## Asennus ja käynnistys Dockerilla (suositeltu)

Vaatimukset: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (sisältää Docker Composen) ja Git.

```bash
git clone <repon-osoite>
cd <repon-kansio>
docker compose up --build
```

(Vanhemmilla Docker-versioilla komento on `docker-compose up --build`.)

Avaa selaimessa: **http://localhost:8080**

Tietokanta luodaan ja täytetään esimerkkieläimillä automaattisesti ensimmäisellä käynnistyskerralla.

### Tietokannan nollaus

```bash
docker compose down -v
docker compose up --build
```

### Pysäytys

Paina terminaalissa `Ctrl + C` ja aja sitten `docker compose down`.

## Käynnistys ilman Dockeria

Vaatimukset:

- [Node.js](https://nodejs.org/) 18 tai uudempi (suositus 22)
- [PostgreSQL](https://www.postgresql.org/download/) asennettuna omalle koneelle
- Git

### 1. Lataa koodi

```bash
git clone <repon-osoite>
cd <repon-kansio>
```

### 2. Luo tietokanta

Ajetaan PostgreSQL:n pääkäyttäjänä (yleensä `postgres`). Komennot kysyvät salasanan, jonka annoit PostgreSQL:n asennuksessa.

```bash
psql -U postgres -h localhost -c "CREATE USER admin WITH PASSWORD 'adminadmin';"
psql -U postgres -h localhost -c "CREATE DATABASE elainsuoja OWNER admin;"
psql -U admin -h localhost -d elainsuoja -f db/init.sql
```

Viimeinen komento kysyy salasanaa: `adminadmin`. Se luo taulut ja lisää esimerkkieläimet.

> Windowsissa `psql` löytyy tyypillisesti kansiosta `C:\Program Files\PostgreSQL\<versio>\bin\`. Voit myös käyttää pgAdminia: luo käyttäjä ja tietokanta, avaa Query Tool ja aja `db/init.sql`:n sisältö.

### 3. Asenna palvelinten riippuvuudet

```bash
cd server-a
npm install
cd ../server-b
npm install
cd ..
```

### 4. Käynnistä palvelut

Avaa **kolme terminaalia** projektin juurikansioon ja aja yksi komento kuhunkin.

Paikallinen PostgreSQL kuuntelee yleensä porttia **5432**, joten tietokannan osoite annetaan ympäristömuuttujana `DATABASE_URL`.

**macOS / Linux:**

```bash
# Terminaali 1: Server B (adoptiot), portti 3002
cd server-b
DATABASE_URL=postgres://admin:adminadmin@localhost:5432/elainsuoja npm start

# Terminaali 2: Server A (eläimet + API gateway), portti 3001
cd server-a
DATABASE_URL=postgres://admin:adminadmin@localhost:5432/elainsuoja npm start

# Terminaali 3: frontend, portti 8080
cd frontend
node dev-server.js
```

**Windows (PowerShell):**

```powershell
# Terminaali 1: Server B (adoptiot), portti 3002
cd server-b
$env:DATABASE_URL="postgres://admin:adminadmin@localhost:5432/elainsuoja"; npm start

# Terminaali 2: Server A (eläimet + API gateway), portti 3001
cd server-a
$env:DATABASE_URL="postgres://admin:adminadmin@localhost:5432/elainsuoja"; npm start

# Terminaali 3: frontend, portti 8080
cd frontend
node dev-server.js
```

Avaa selaimessa: **http://localhost:8080**

`frontend/dev-server.js` tekee paikallisesti saman kuin nginx Dockerissa: se tarjoilee sivut ja välittää `/api/*`-pyynnöt Server A:lle. Se käyttää vain Noden omia moduuleja, joten sille ei tarvitse ajaa `npm install` -komentoa.

Server A löytää Server B:n oletuksena osoitteesta `http://localhost:3002`. Osoitetta voi muuttaa ympäristömuuttujalla `SERVER_B_URL`.

### Vianetsintä

| Ongelma | Ratkaisu |
|---------|----------|
| Etusivulla lukee "Eläinten lataaminen epäonnistui" | Tarkista, että Server A on käynnissä (terminaali 2) ja tietokantaosoite on oikein |
| Adoptio antaa virheen "Adoptiopalvelu ei vastaa" | Server B ei ole käynnissä (terminaali 1) |
| `password authentication failed` | Tarkista käyttäjätunnus ja salasana `DATABASE_URL`:ssä |
| `ECONNREFUSED ...:5432` | PostgreSQL ei ole käynnissä, tai se kuuntelee eri porttia |
| `relation "animals" does not exist` | `db/init.sql` jäi ajamatta (vaihe 2) |
| Portti on jo käytössä | Docker-versio on ehkä vielä käynnissä: aja `docker compose down` |

## REST API

### Server A (http://localhost:3001)
(Eli jos haluat esimerkiksi nähdä kaikki eläimet voit hakea tiedot tällä osoitteella: http://localhost:3001/animals )

| Metodi | Polku | Kuvaus |
|--------|-------|--------|
| GET  | `/animals` | Kaikki eläimet |
| GET  | `/animals/:id` | Yksi eläin (400 virheellinen id, 404 ei löydy) |
| POST | `/animals/:id/adopt` | Adoptiohakemus, välitetään Server B:lle |
| GET  | `/adoptions` | Kaikki hakemukset henkilökunnan sivulle, välitetään Server B:lle |
| PATCH | `/adoptions/:id` | Hakemuksen hyväksyntä tai hylkäys, välitetään Server B:lle |

### Server B (http://localhost:3002)

| Metodi | Polku | Kuvaus |
|--------|-------|--------|
| POST | `/adoptions` | Tallentaa hakemuksen ja varaa eläimen |
| GET  | `/adoptions` | Listaa hakemukset eläimen tietoineen, odottavat ensin |
| PATCH | `/adoptions/:id` | `{"decision":"approve"}` merkitsee eläimen adoptoiduksi, `{"decision":"reject"}` palauttaa sen vapaaksi |

Hakemuksen runko (JSON):

```json
{ "applicant_name": "Matti Meikäläinen", "email": "matti@example.com", "phone": "0401234567", "message": "Asun omakotitalossa..." }
```

Pakolliset kentät: `applicant_name`, `email` ja `message` (kertomus itsestä ja kodista). `phone` on vapaaehtoinen.

Vastaukset: `201` onnistui (eläin varataan), `400` pakollinen kenttä puuttuu (nimi, sähköposti tai kertomus itsestä), `404` eläintä ei ole, `409` eläin on jo varattu tai adoptoitu, `502` Server B ei vastaa.

## Tietokanta

- `animals`: id, name, type (kissa/koira), age, breed, description, image_url, status (available/reserved/adopted)
- `adoptions`: id, animal_id (→ animals.id), applicant_name, email, phone, message (pakollinen), status (pending/approved/rejected), created_at, decided_at
- Indeksi `one_active_adoption_per_animal`: yhdellä eläimellä enintään yksi odottava tai hyväksytty hakemus

## Fontit

Sivusto käyttää fontteja [Shantell Sans](https://fonts.google.com/specimen/Shantell+Sans) (otsikot) ja [Figtree](https://fonts.google.com/specimen/Figtree) (leipäteksti). Ne ovat mukana kansiossa `frontend/fonts/`, joten sivu toimii myös ilman nettiyhteyttä. Molemmat fontit on julkaistu SIL Open Font License 1.1 -lisenssillä.
