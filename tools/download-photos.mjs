#!/usr/bin/env node
/**
 * Bilder lokal speichern (DSGVO-freundlich, offline-fähig, unabhängig von Unsplash)
 *
 *   node tools/download-photos.mjs            lädt jedes Foto in 3 Größen nach assets/img/photos/<alias>-<breite>.jpg
 *                                              und schaltet tools/photos.json auf "local"
 *   node tools/download-photos.mjs --quality=70   kleinere Dateien
 *   node tools/download-photos.mjs --no-switch    nur herunterladen, Modus nicht ändern
 *
 * Quelle: images.unsplash.com (Unsplash-Lizenz). Danach lädt die Website keine Bilder mehr von Dritten;
 * der Datenschutz-Absatz "Externe Bilddateien" verschwindet automatisch (tools/sync.mjs).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const QUALITY = parseInt(args.quality, 10) || 72;

const manifestPath = join(ROOT, 'tools', 'photos.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const WIDTHS = manifest.localWidths || [480, 960, 1600];
const outDir = join(ROOT, 'assets', 'img', 'photos');
mkdirSync(outDir, { recursive: true });

const jobs = [];
for (const [alias, p] of Object.entries(manifest.photos)) for (const w of WIDTHS) jobs.push({ alias, p, w });
let done = 0, failed = 0, bytes = 0;

async function fetchOne({ alias, p, w }) {
  const file = join(outDir, `${alias}-${w}.jpg`);
  if (existsSync(file) && statSync(file).size > 5_000 && !args.force) { done++; bytes += statSync(file).size; return; }
  const url = `https://images.unsplash.com/photo-${p.id}?auto=format&fit=max&fm=jpg&w=${w}&q=${QUALITY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) throw new Error('kein Bild: ' + type);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5_000) throw new Error('Datei auffällig klein');
    writeFileSync(file, buf);
    bytes += buf.length; done++;
  } catch (e) {
    failed++; console.log(`✘ ${alias}-${w}: ${e.message}`);
  }
}

const queue = [...jobs];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await fetchOne(queue.shift()); }));

console.log(`${done}/${jobs.length} Dateien vorhanden (${(bytes / 1048576).toFixed(1)} MB), ${failed} Fehler.`);
if (failed) { console.log('Modus bleibt unverändert. Bitte erneut ausführen.'); process.exit(1); }

if (!args['no-switch']) {
  manifest.mode = 'local';
  manifest.localWidths = WIDTHS;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('tools/photos.json → mode: "local". Synchronisiere die Seiten …');
  const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'sync.mjs')], { stdio: 'inherit' });
  process.exit(r.status ?? 0);
}
