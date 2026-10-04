#!/usr/bin/env node
/**
 * Baut den Deploy-Ordner dist/ (nur das, was live gehört: Seiten, Assets, robots, sitemap, _headers).
 * Tools, Partials, README und Entwicklungsdateien bleiben draußen.
 *   node tools/build-dist.mjs
 */
import { cpSync, rmSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const f of readdirSync(ROOT)) {
  if (f.endsWith('.html') && !f.startsWith('_')) cpSync(join(ROOT, f), join(OUT, f));
}
for (const f of ['robots.txt', 'sitemap.xml', '_headers']) if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
console.log('dist/ erzeugt:', readdirSync(OUT).join(', '));
