// Petit serveur web : rend la page de recherche accessible depuis ce poste
// et depuis les téléphones et tablettes branchés sur le même réseau Wi-Fi.
//
//   node serveur.mjs            port 8790
//   node serveur.mjs 9000       autre port

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ICI = import.meta.dirname;
const PORT = +process.argv[2] || 8790;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const PERMIS = new Set(['index.html', 'catalogue.js']);

http.createServer((req, rep) => {
  const nom = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'index.html';
  if (!PERMIS.has(nom)) { rep.writeHead(404).end('Introuvable'); return; }
  fs.readFile(path.join(ICI, nom), (err, data) => {
    if (err) { rep.writeHead(404).end('Introuvable'); return; }
    rep.writeHead(200, { 'Content-Type': TYPES[path.extname(nom)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Recherche de quilleur prête.\n\n  Sur cet ordinateur :  http://localhost:${PORT}`);
  for (const liste of Object.values(os.networkInterfaces()))
    for (const a of liste) if (a.family === 'IPv4' && !a.internal)
      console.log(`  Téléphone / tablette (même Wi-Fi) :  http://${a.address}:${PORT}`);
  console.log('\nLaisser cette fenêtre ouverte pendant l\'utilisation. Ctrl+C pour arrêter.');
});
