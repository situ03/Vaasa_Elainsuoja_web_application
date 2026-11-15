// Paikallinen kehityspalvelin käytettäväksi ILMAN Dockeria.
// Tekee saman kuin nginx Docker-ympäristössä:
//   - tarjoilee frontendin tiedostot
//   - välittää /api/*-pyynnöt Server A:lle (/api/animals -> http://localhost:3001/animals)
// Käyttää vain Noden omia moduuleja, joten npm install -komentoa ei tarvita.
//
// Käynnistys: node dev-server.js   ->   http://localhost:8080

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const SERVER_A_URL = new URL(process.env.SERVER_A_URL || "http://localhost:3001");
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function proxyToServerA(req, res) {
  const upstream = http.request(
    {
      hostname: SERVER_A_URL.hostname,
      port: SERVER_A_URL.port,
      path: req.url.replace(/^\/api/, ""),
      method: req.method,
      headers: { ...req.headers, host: SERVER_A_URL.host },
    },
    (upRes) => {
      res.writeHead(upRes.statusCode, upRes.headers);
      upRes.pipe(res);
    }
  );
  upstream.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Server A ei vastaa" }));
  });
  req.pipe(upstream);
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);

  // Estetään pääsy frontend-kansion ulkopuolelle
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Sivua ei löytynyt");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    res.end(data);
  });
}

http
  .createServer((req, res) => {
    if (req.url.startsWith("/api/")) return proxyToServerA(req, res);
    serveStatic(req, res);
  })
  .listen(PORT, () => {
    console.log(`Frontend käynnissä: http://localhost:${PORT}`);
  });
