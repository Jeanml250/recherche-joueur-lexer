// Régénère les captures d'écran de la page et le guide PDF à partir de guide.html.
//   node guide/generer-guide.mjs
// Les captures font une vraie recherche sur Lexer : il faut Internet.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const ICI = import.meta.dirname;
// Servie par serveur.mjs : depuis un fichier local, Chrome refuse de lire les pages Lexer.
const PAGE = 'http://localhost:8791/';
const serveur = spawn(process.execPath, [path.join(ICI, '..', 'serveur.mjs'), '8791'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const NAVIGATEUR = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));

const nav = await puppeteer.launch({ executablePath: NAVIGATEUR, headless: true });
try {
  const page = await nav.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 2 });
  await page.goto(PAGE, { waitUntil: 'networkidle0' });

  // Prépare le formulaire : saison 2025-2026, Canada, trois salons de Québec.
  const preparer = (nom, salons) => page.evaluate((nom, salons) => {
    const coche = (sel, f) => [...document.querySelectorAll(sel + ' .choix input')].forEach(i => {
      const v = f(i); if (i.checked !== v) { i.checked = v; i.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    coche('#m-saisons', i => i.value === '2025');
    coche('#m-salons', i => new RegExp(salons).test(i.parentElement.innerText));
    document.getElementById('nom').value = nom;
    document.querySelectorAll('.liste').forEach(l => { l.hidden = true; });
  }, nom, salons);
  const fermer = () => page.evaluate(() => document.querySelectorAll('.liste').forEach(l => { l.hidden = true; }));
  const ouvrir = id => page.evaluate(id => { document.querySelector(`#${id} .liste`).hidden = false; }, id);
  const chercher = async () => {
    await page.evaluate(() => document.getElementById('chercher').click());
    await page.waitForFunction(() => !document.getElementById('chercher').disabled && /lus/.test(document.getElementById('etat').textContent), { timeout: 120000 })
      .catch(async e => { throw new Error('Recherche : ' + await page.$eval('#etat', x => x.textContent)); });
  };
  const capture = async (nom, sel, marge = 0) => {
    const el = await page.$(sel);
    const b = await el.boundingBox();
    await page.screenshot({ path: path.join(ICI, nom + '.png'), clip: { x: b.x - marge, y: b.y - marge, width: b.width + 2 * marge, height: b.height + 2 * marge } });
  };

  await preparer('Richard Lapointe', 'Montmorency|Le Temple|Frontenac');
  await capture('formulaire', '.panneau', 8);

  await page.evaluate(() => { const f = document.querySelector('#m-salons .liste input[type="text"]'); f.value = 'quillorama'; f.dispatchEvent(new Event('input')); });
  await ouvrir('m-salons');
  await page.setViewport({ width: 1000, height: 1100, deviceScaleFactor: 2 });
  const b = await (await page.$('#m-salons')).boundingBox();
  const l = await (await page.$('#m-salons .liste')).boundingBox();
  await page.screenshot({ path: path.join(ICI, 'salons.png'), clip: { x: b.x - 8, y: b.y - 30, width: b.width + 16, height: l.y + l.height - b.y + 38 } });
  await page.evaluate(() => { const f = document.querySelector('#m-salons .liste input[type="text"]'); f.value = ''; f.dispatchEvent(new Event('input')); });
  await fermer();

  await chercher();
  await page.evaluate(() => [...document.querySelectorAll('#m-variantes .choix input')].slice(1, 3)
    .forEach(x => { x.checked = true; x.dispatchEvent(new Event('change', { bubbles: true })); }));
  await ouvrir('m-variantes');
  const v = await (await page.$('#m-variantes')).boundingBox();
  const vl = await (await page.$('#m-variantes .liste')).boundingBox();
  await page.screenshot({ path: path.join(ICI, 'variantes.png'), clip: { x: v.x - 8, y: v.y - 30, width: v.width + 16, height: vl.y + vl.height - v.y + 38 } });
  await fermer();

  await page.evaluate(() => { document.querySelectorAll('.fiche tbody tr').forEach((tr, i) => { if (i > 7 && tr.closest('.defile') === document.querySelector('.fiche .defile')) tr.hidden = true; }); });
  await capture('fiche', '.fiche', 0);
  await page.evaluate(() => document.querySelectorAll('.fiche tbody tr').forEach(tr => { tr.hidden = false; }));
  await capture('resume', '.resume', 10);

  // Vue téléphone
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.goto(PAGE, { waitUntil: 'networkidle0' });
  await preparer('Guy Pelletier', 'Montmorency');
  await page.screenshot({ path: path.join(ICI, 'telephone-form.png') });
  await chercher();
  await page.evaluate(() => document.querySelector('.fiche').scrollIntoView());
  await page.screenshot({ path: path.join(ICI, 'telephone-fiche.png') });

  // PDF
  const guide = await nav.newPage();
  await guide.goto(pathToFileURL(path.join(ICI, 'guide.html')).href, { waitUntil: 'networkidle0' });
  const sortie = path.join(ICI, '..', 'Guide-utilisateur-Recherche-Joueur-Lexer.pdf');
  await guide.pdf({ path: sortie, format: 'Letter', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8pt;color:#777;width:100%;text-align:center;font-family:Helvetica,Arial">Recherche d\'un quilleur — <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  console.log('Guide : ' + sortie);
} finally {
  await nav.close();
  serveur.kill();
}
