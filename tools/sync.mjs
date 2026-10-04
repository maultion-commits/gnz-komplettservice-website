#!/usr/bin/env node
/**
 * GNZ Immobilien-Komplettservice – Sync-Skript (keine Abhängigkeiten, nur Node ≥ 18)
 *
 *   node tools/sync.mjs            Partials einsetzen, Bild-URLs erzeugen, Bildnachweise bauen
 *   node tools/sync.mjs --links    zusätzlich alle internen Links/Anker prüfen
 *
 * 1) Partials:  <!-- partial:NAME --> … <!-- /partial:NAME -->  wird durch partials/NAME.html ersetzt
 *               (Sonderfall "credits": wird aus tools/photos.json für die tatsächlich genutzten Fotos erzeugt)
 * 2) Bilder:    Tags mit data-photo="alias" bekommen src/srcset (img) bzw. data-full/data-credit* (andere Tags)
 *               gemäß tools/photos.json (mode: "remote" | "local").
 *
 * Die HTML-Seiten bleiben normale, direkt editierbare Dateien – das Skript ändert nur diese markierten Stellen.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'tools', 'photos.json'), 'utf8'));
const MODE = manifest.mode === 'local' ? 'local' : 'remote';
const photos = manifest.photos;
const DEFAULT_WIDTHS = [640, 1000, 1400];
const FULL_WIDTH = 1800;

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const partial = (name) => readFileSync(join(ROOT, 'partials', `${name}.html`), 'utf8').replace(/\s+$/, '');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const remote = (p, w) => `https://images.unsplash.com/photo-${p.id}?auto=format&fit=max&w=${w}&q=72`;
const LOCAL_WIDTHS = (manifest.localWidths || [480, 960, 1600]).slice().sort((a, b) => a - b);
const localFile = (alias, w) => `assets/img/photos/${alias}-${w}.jpg`;
const nearestLocal = (w) => LOCAL_WIDTHS.find((x) => x >= w) || LOCAL_WIDTHS[LOCAL_WIDTHS.length - 1];
const photoPage = (p) => `https://unsplash.com/photos/${p.page}`;

function imgAttrs(alias, widths) {
  const p = photos[alias];
  const ws = widths.length ? widths : DEFAULT_WIDTHS;
  if (MODE === 'local') {
    const mapped = [...new Set(ws.map(nearestLocal))];
    const mid = nearestLocal(ws[Math.min(1, ws.length - 1)]);
    const srcset = mapped.map((w) => `${localFile(alias, w)} ${w}w`).join(', ');
    return `src="${localFile(alias, mid)}" srcset="${srcset}"`;
  }
  const mid = ws[Math.min(1, ws.length - 1)];
  const srcset = ws.map((w) => `${remote(p, w)} ${w}w`).join(', ');
  return `src="${remote(p, mid)}" srcset="${srcset}"`;
}
function metaAttrs(alias) {
  const p = photos[alias];
  const full = MODE === 'local' ? localFile(alias, LOCAL_WIDTHS[LOCAL_WIDTHS.length - 1]) : remote(p, FULL_WIDTH);
  return `data-full="${full}" data-credit="${esc(p.by)}" data-credit-url="${photoPage(p)}"`;
}

// ---- Credits (nur tatsächlich verwendete Fotos) ---------------------------------------------
const used = new Set();
for (const f of pages) {
  const html = readFileSync(join(ROOT, f), 'utf8');
  for (const m of html.matchAll(/data-photo="([^"]+)"/g)) used.add(m[1]);
}
function creditsHtml() {
  const rows = [...used].filter((a) => photos[a]).sort((a, b) => photos[a].by.localeCompare(photos[b].by, 'de'));
  const items = rows.map((a) => {
    const p = photos[a];
    return `<li><a href="${photoPage(p)}" rel="noopener" target="_blank">${esc(p.title)}</a> – Foto: ${esc(p.by)} auf <a href="https://unsplash.com/" rel="noopener" target="_blank">Unsplash</a></li>`;
  });
  return `<ul class="credits">\n${items.map((i) => '  ' + i).join('\n')}\n</ul>`;
}

// ---- Datenschutz-Absatz zur Bild-Auslieferung (abhängig vom Bildmodus) ------------------------
function imagehostHtml() {
  if (MODE === 'local') {
    return '<h2>5. Bilder</h2>\n<p>Alle Fotos werden von unserem eigenen Server ausgeliefert; es werden keine Bilddateien von Drittanbietern nachgeladen.</p>';
  }
  return '<h2>5. Externe Bilddateien (Unsplash)</h2>\n' +
    '<p>Die auf dieser Website gezeigten Fotos werden derzeit direkt von Servern von Unsplash (images.unsplash.com) geladen. Beim Aufruf einer Seite mit Fotos wird dabei Ihre IP-Adresse an den Betreiber übertragen, damit die Bilder ausgeliefert werden können. Die Weitergabe von Referrer-Informationen ist unterbunden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Interesse an einer ansprechenden Darstellung). ' +
    '<span class="ph" data-draft-only hidden>[Hinweis: Dieser Abschnitt entfällt automatisch, sobald die Bilder lokal gespeichert sind – siehe README, „Bilder lokal speichern“.]</span></p>';
}

// ---- Tag-Umschreiber ------------------------------------------------------------------------
function rewriteTags(html, file) {
  return html.replace(/<(img|a|button|figure|li|div|span)\b[^>]*?\sdata-photo="([^"]+)"[^>]*>/g, (tag, name, alias) => {
    if (!photos[alias]) { problems.push(`${file}: unbekanntes Foto "${alias}"`); return tag; }
    let t = tag;
    if (name === 'img') {
      const wm = t.match(/\sdata-w="([^"]*)"/);
      const widths = wm ? wm[1].split(',').map((n) => parseInt(n, 10)).filter(Boolean) : [];
      t = t.replace(/\ssrc="[^"]*"/g, '').replace(/\ssrcset="[^"]*"/g, '');
      return t.replace(/(\sdata-photo="[^"]+")/, `$1 ${imgAttrs(alias, widths)}`);
    }
    t = t.replace(/\sdata-full="[^"]*"/g, '').replace(/\sdata-credit="[^"]*"/g, '').replace(/\sdata-credit-url="[^"]*"/g, '');
    return t.replace(/(\sdata-photo="[^"]+")/, `$1 ${metaAttrs(alias)}`);
  });
}

// ---- Veröffentlichungs-Einstellungen --------------------------------------------------------
const siteCfgPath = join(ROOT, 'tools', 'site.json');
const SITE_URL = ((existsSync(siteCfgPath) ? JSON.parse(readFileSync(siteCfgPath, 'utf8')).url : '') || '').replace(/\/+$/, '');
const DRAFT = /draft:\s*true/.test(readFileSync(join(ROOT, 'assets', 'js', 'config.js'), 'utf8'));
const NO_INDEX_PAGES = new Set(['404.html', 'impressum.html', 'datenschutz.html']);

function ogImage(alias) {
  return MODE === 'local' ? `${SITE_URL}/${localFile(alias, LOCAL_WIDTHS[LOCAL_WIDTHS.length - 1])}` : remote(photos[alias], 1200);
}
function seoBlock(file, html) {
  const rest = html.replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->\n?/, '');
  const lines = [];
  if (DRAFT && !/<meta name="robots"/.test(rest)) lines.push('<meta name="robots" content="noindex, nofollow">');
  if (SITE_URL && !NO_INDEX_PAGES.has(file)) {
    const url = SITE_URL + '/' + (file === 'index.html' ? '' : file);
    lines.push(`<link rel="canonical" href="${url}">`, `<meta property="og:url" content="${url}">`,
      '<meta property="og:site_name" content="GNZ Immobilien-Komplettservice">', '<meta name="twitter:card" content="summary_large_image">');
    const m = rest.match(/<div class="(?:page-hero__media|hero__media)">\s*<img[^>]*data-photo="([^"]+)"/);
    const alias = m && photos[m[1]] ? m[1] : 'dampf';
    lines.push(`<meta property="og:image" content="${ogImage(alias)}">`);
  }
  return lines.length ? `<!-- seo:start -->\n${lines.join('\n')}\n<!-- seo:end -->\n` : '';
}

// ---- Hauptlauf -------------------------------------------------------------------------------
const problems = [];
let changed = 0;
for (const file of pages) {
  const path = join(ROOT, file);
  const before = readFileSync(path, 'utf8');
  let html = before;

  html = html.replace(/<!-- partial:([\w-]+) -->[\s\S]*?<!-- \/partial:\1 -->/g, (m, name) => {
    if (name === 'credits') return `<!-- partial:credits -->\n${creditsHtml()}\n<!-- /partial:credits -->`;
    if (name === 'imagehost') return `<!-- partial:imagehost -->\n${imagehostHtml()}\n<!-- /partial:imagehost -->`;
    if (!existsSync(join(ROOT, 'partials', `${name}.html`))) { problems.push(`${file}: Partial "${name}" fehlt`); return m; }
    let body = partial(name);
    if (name === 'head' && MODE === 'local') body = body.split('\n').filter((l) => !/rel="preconnect"/.test(l)).join('\n');
    return `<!-- partial:${name} -->\n${body}\n<!-- /partial:${name} -->`;
  });
  html = rewriteTags(html, file);
  const block = seoBlock(file, html);
  if (/<!-- seo:start -->/.test(html)) html = html.replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->\n?/, block);
  else if (block) html = html.replace('</head>', block + '</head>');

  if (html !== before) { writeFileSync(path, html); changed++; console.log(`✔ aktualisiert: ${file}`); }
}
// ---- sitemap.xml & robots.txt ----------------------------------------------------------------
if (SITE_URL && !DRAFT) {
  const urls = pages.filter((f) => !NO_INDEX_PAGES.has(f)).map((f) => `  <url><loc>${SITE_URL}/${f === 'index.html' ? '' : f}</loc></url>`);
  writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
} else {
  writeFileSync(join(ROOT, 'robots.txt'), `# Entwurf: alle Seiten tragen noindex. Nach dem Livegang (config.js: draft:false) und Eintrag der URL in\n# tools/site.json erzeugt "node tools/sync.mjs" hier die Sitemap-Zeile und eine sitemap.xml.\nUser-agent: *\nAllow: /\n`);
}

console.log(`\n${pages.length} Seiten geprüft, ${changed} aktualisiert. Bildmodus: ${MODE}. Genutzte Fotos: ${used.size}. Entwurf: ${DRAFT ? 'ja (noindex)' : 'nein'}. URL: ${SITE_URL || '–'}`);

// ---- Linkprüfung (optional) -----------------------------------------------------------------
if (process.argv.includes('--links')) {
  const idsOf = new Map();
  const idsFor = (f) => {
    if (!idsOf.has(f)) idsOf.set(f, new Set([...readFileSync(join(ROOT, f), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    return idsOf.get(f);
  };
  let broken = 0;
  for (const file of pages) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const url = m[1];
      if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(url)) continue;
      const [pathAndQuery, hash] = url.split('#');
      const pathPart = pathAndQuery.split('?')[0];
      const target = pathPart === '' ? file : pathPart;
      if (!existsSync(join(ROOT, target))) { console.log(`✘ ${file}: Datei fehlt → ${url}`); broken++; continue; }
      if (hash && target.endsWith('.html') && !idsFor(target).has(hash)) { console.log(`✘ ${file}: Anker fehlt → ${url}`); broken++; }
    }
  }
  console.log(broken ? `\n${broken} defekte(r) Link(s).` : '\nAlle internen Links und Anker sind in Ordnung.');
  if (broken) process.exitCode = 1;
}

if (problems.length) { console.log('\nProbleme:\n - ' + problems.join('\n - ')); process.exitCode = 1; }
