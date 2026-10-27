// Construit le catalogue des salons et des événements (ligues, tournois)
// publiés sur Bowl4U, le répertoire des résultats EZ Lexer.
//
//   node catalogue.mjs              tous les pays
//   node catalogue.mjs CA FR        seulement ces pays (code à 2 lettres)
//
// Bowl4U est une application Blazor : la liste n'existe que dans un vrai
// navigateur. On pilote donc Chrome (ou Edge) déjà installé sur l'ordinateur.
// Le résultat est écrit dans catalogue.js, lu par index.html.

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ICI = import.meta.dirname;
const PAYS = process.argv.slice(2).map(p => p.toUpperCase());

const NAVIGATEURS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
];
const navigateur = NAVIGATEURS.find(p => fs.existsSync(p));
if (!navigateur) { console.error('Chrome ou Edge introuvable.'); process.exit(1); }

const MOIS = { jan: 1, janv: 1, feb: 2, fev: 2, 'fév': 2, fevr: 2, 'févr': 2, mar: 3, mars: 3, apr: 4, avr: 4, may: 5, mai: 5,
  jun: 6, juin: 6, jul: 7, juil: 7, aug: 8, 'aoû': 8, aou: 8, 'août': 8, aout: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12, 'déc': 12 };

// « Sep 1, 2026 → Apr 27, 2027 », « Sep 11 → Nov 4, 2026 », « Oct 18, 2025 »
function dates(s) {
  const morceaux = s.split('→').map(x => x.trim());
  const lire = t => {
    const m = /([A-Za-zéû.]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/.exec(t);
    if (!m) return null;
    const mois = MOIS[m[1].replace('.', '').toLowerCase()];
    return mois ? { a: m[3] ? +m[3] : null, m: mois, j: +m[2] } : null;
  };
  const d = lire(morceaux[0]), f = morceaux[1] ? lire(morceaux[1]) : d;
  if (!d || !f) return [null, null];
  if (!f.a) return [null, null];
  if (!d.a) d.a = d.m > f.m ? f.a - 1 : f.a;
  const iso = x => `${x.a}-${String(x.m).padStart(2, '0')}-${String(x.j).padStart(2, '0')}`;
  return [iso(d), iso(f)];
}

const pause = ms => new Promise(r => setTimeout(r, ms));

const nav = await puppeteer.launch({ executablePath: navigateur, headless: true });
try {
  const page = await nav.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  // Interface en anglais : dates plus simples à lire.
  await page.goto('https://bowl4u.com/Culture/Set?culture=en&returnUrl=%2Fresults', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('a.b4u-rrow-results', { timeout: 60000 });

  // Refuser les témoins s'ils sont proposés.
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /reject all|tout refuser/i.test(b.textContent))?.click());

  // 50 résultats par page.
  await page.evaluate(() => [...document.querySelectorAll('button,a')].find(e => e.textContent.trim() === '50')?.click());
  await pause(2500);

  const total = await page.evaluate(() => +(/([\d,  .]+)\s+results? found|([\d  .]+)\s+résultats/i.exec(document.body.innerText)?.slice(1).find(Boolean) || '0').replace(/\D/g, ''));
  console.log(`${total} événements sur Bowl4U`);

  // Un salon Bowl4U peut publier dans plusieurs dossiers Lexer : on regroupe par nom affiché.
  const salons = new Map();   // « pays|nom|ville » → { nom, ville, pays }
  const evenements = new Map(); // « dossier/événement » → données
  let precedent = '';
  for (let n = 1; ; n++) {
    // Attendre que la page affichée ait changé.
    for (let t = 0; t < 60; t++) {
      const premier = await page.evaluate(() => document.querySelector('a.b4u-rrow-results')?.href || '');
      if (premier && premier !== precedent) { precedent = premier; break; }
      await pause(500);
    }
    const lignes = await page.evaluate(() => [...document.querySelectorAll('.b4u-rrow')].map(r => ({
      pays: r.querySelector('.flag-icon')?.getAttribute('aria-label') || '',
      salon: r.querySelector('.b4u-rrow-venue')?.textContent.trim() || '',
      ville: (r.querySelector('.b4u-rrow-city')?.textContent || '').replace('·', '').trim(),
      nom: r.querySelector('.b4u-rrow-name')?.textContent.trim() || '',
      dates: r.querySelector('.b4u-rrow-metaitem:not(.b4u-rrow-next)')?.textContent.trim() || '',
      type: r.querySelector('.b4u-rrow-tag.is-type')?.textContent.trim() || '',
      lien: r.querySelector('a.b4u-rrow-results')?.href || '',
    })));
    for (const l of lignes) {
      const m = /lexerbowling\.com\/([^/]+)\/([^/?#]+)/.exec(l.lien);
      if (!m) continue;
      if (PAYS.length && !PAYS.includes(l.pays)) continue;
      const [, dossier, slug] = m;
      const salon = `${l.pays}|${l.salon}|${l.ville}`;
      if (!salons.has(salon)) salons.set(salon, { nom: l.salon, ville: l.ville, pays: l.pays });
      const [debut, fin] = dates(l.dates);
      evenements.set(`${dossier}/${slug}`, { salon, dossier, slug, nom: l.nom, debut, fin, type: /^(league|ligue)/i.test(l.type) ? 'L' : 'T' });
    }
    process.stdout.write(`\r  page ${n} — ${evenements.size} événements retenus`);
    const suivant = await page.$('button.b4u-page-arrow[aria-label="Next"]:not([disabled]), button.b4u-page-arrow[aria-label="Suivant"]:not([disabled])');
    if (!suivant || lignes.length === 0) break;
    const desactive = await page.evaluate(b => b.disabled || b.classList.contains('is-disabled') || b.getAttribute('aria-disabled') === 'true', suivant);
    if (desactive) break;
    await suivant.click();
    if (total && n * 50 >= total) break;
  }
  console.log();

  const cles = [...salons.keys()].sort((a, b) => salons.get(a).nom.localeCompare(salons.get(b).nom, 'fr') || a.localeCompare(b));
  const index = new Map(cles.map((k, i) => [k, i]));
  const listeSalons = cles.map(k => salons.get(k));
  // Événement : [n° du salon, dossier Lexer, adresse, nom, début, fin, L (ligue) ou T (tournoi)]
  const listeEv = [...evenements.values()]
    .sort((a, b) => index.get(a.salon) - index.get(b.salon) || (a.debut || '').localeCompare(b.debut || ''))
    .map(e => [index.get(e.salon), e.dossier, e.slug, e.nom, e.debut, e.fin, e.type]);
  const catalogue = { maj: new Date().toISOString().slice(0, 10), salons: listeSalons, evenements: listeEv };
  fs.writeFileSync(path.join(ICI, 'catalogue.js'), `// Généré par catalogue.mjs — ne pas modifier à la main.\nwindow.CATALOGUE = ${JSON.stringify(catalogue)};\n`);
  console.log(`catalogue.js : ${listeSalons.length} salons, ${listeEv.length} événements.`);
} finally {
  await nav.close();
}
