#!/usr/bin/env node
/**
 * Baut den Deploy-Ordner dist/ (nur das, was live gehört: Seiten, Assets, robots, sitemap, _headers, _redirects).
 * Vorher läuft tools/security-check.mjs; bei Verstößen wird nicht gebaut.
 * Tools, Partials, README und Entwicklungsdateien bleiben draußen.
 *   node tools/build-dist.mjs
 */
import { cpSync, rmSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');

// Sicherheitsregeln (CSP, Inline-Code, Drittanbieter …) vor dem Bauen prüfen – bei Verstoß kein Build
const sec = spawnSync(process.execPath, [join(ROOT, 'tools', 'security-check.mjs')], { stdio: 'inherit' });
if (sec.status !== 0) { console.error('\nBuild abgebrochen: bitte zuerst die Sicherheitsprobleme beheben.'); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const f of readdirSync(ROOT)) {
  if (f.endsWith('.html') && !f.startsWith('_')) cpSync(join(ROOT, f), join(OUT, f));
}
for (const f of ['robots.txt', 'sitemap.xml', '_headers', '_redirects']) if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
console.log('dist/ erzeugt:', readdirSync(OUT).join(', '));
