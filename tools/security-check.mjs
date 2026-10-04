#!/usr/bin/env node
/**
 * Sicherheits-Check für die statische Website (keine Abhängigkeiten).
 *   node tools/security-check.mjs
 *
 * Prüft, dass die Regeln der Content-Security-Policy (siehe _headers) eingehalten werden und dass nichts
 * Unerwünschtes eingebaut wurde: Inline-Skripte/-Handler, Drittanbieter-Ressourcen, riskante JavaScript-Aufrufe,
 * Netzwerkzugriffe, Cookies, fehlende Schutz-Header. Endet mit Exit-Code 1, wenn etwas verletzt ist
 * (build-dist.mjs ruft den Check automatisch auf).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');
const read = (f) => readFileSync(f, 'utf8');

const problems = [];
const notes = [];
const fail = (file, msg) => problems.push(`${rel(file)}: ${msg}`);

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const scan = (file, text, re, msg) => {
  for (const m of text.matchAll(re)) fail(file, `${msg} (Zeile ${lineOf(text, m.index)}: ${m[0].slice(0, 70).replace(/\s+/g, ' ')})`);
};

/* ---------- HTML: Seiten und Partials ---------- */
const htmlFiles = [
  ...readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_')).map((f) => join(ROOT, f)),
  ...(existsSync(join(ROOT, 'partials')) ? readdirSync(join(ROOT, 'partials')).filter((f) => f.endsWith('.html')).map((f) => join(ROOT, 'partials', f)) : []),
];
for (const f of htmlFiles) {
  const t = read(f);
  scan(f, t, /<[a-z][^>]*\s(on[a-z]+)\s*=/gi, 'Inline-Event-Handler (von der CSP blockiert)');
  scan(f, t, /(?:href|src|action|formaction)\s*=\s*["']\s*javascript:/gi, 'javascript:-URL');
  scan(f, t, /<style[\s>]/gi, '<style>-Element (CSP: style-src \'self\')');
  scan(f, t, /<iframe[\s>]|<object[\s>]|<embed[\s>]/gi, 'iframe/object/embed nicht erlaubt');
  // ausführbare Inline-Skripte (JSON-LD ist ein Datenblock und erlaubt)
  for (const m of t.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1], body = m[2];
    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    const hasSrc = /\bsrc\s*=/.test(attrs);
    if (!hasSrc && body.trim() && !/^application\/(ld\+)?json$/i.test(type)) fail(f, `Inline-Skript (Zeile ${lineOf(t, m.index)}) – in eine Datei unter assets/js auslagern`);
    const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    if (/^(https?:)?\/\//i.test(src)) fail(f, `Skript von fremder Quelle: ${src}`);
  }
  // Ressourcen von Dritten (Links <a href> auf externe Seiten sind ok, sie laden nichts nach)
  scan(f, t, /<(?:img|source|video|audio|track|form)\b[^>]*\s(?:src|srcset|action|poster)\s*=\s*["']\s*(?:https?:)?\/\/[^"']+/gi, 'Ressource/Formular von fremder Quelle');
  scan(f, t, /<link\b(?=[^>]*rel\s*=\s*["'][^"']*(?:stylesheet|icon|manifest|preload|modulepreload)[^"']*["'])[^>]*href\s*=\s*["']\s*(?:https?:)?\/\/[^"']+/gi, 'Stylesheet/Icon von fremder Quelle');
  scan(f, t, /<link\b[^>]*rel\s*=\s*["'](?:preconnect|dns-prefetch|prefetch|preload|prerender)["'][^>]*href\s*=\s*["']\s*(?:https?:)?\/\//gi, 'Verbindungsaufbau zu Dritten (Datenschutz)');
  for (const m of t.matchAll(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/gi)) {
    if (!/rel\s*=\s*["'][^"']*noopener/i.test(m[0])) fail(f, `target="_blank" ohne rel="noopener" (Zeile ${lineOf(t, m.index)})`);
  }
  for (const m of t.matchAll(/<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi)) fail(f, `Meta-Refresh (Zeile ${lineOf(t, m.index)})`);
}

/* ---------- JavaScript ---------- */
const jsDir = join(ROOT, 'assets', 'js');
let innerHtmlCount = 0;
for (const name of readdirSync(jsDir).filter((n) => n.endsWith('.js'))) {
  const f = join(jsDir, name), t = read(f);
  scan(f, t, /\beval\s*\(/g, 'eval()');
  scan(f, t, /new\s+Function\s*\(/g, 'new Function()');
  scan(f, t, /document\.write(?:ln)?\s*\(/g, 'document.write()');
  scan(f, t, /\bset(?:Timeout|Interval)\s*\(\s*["'`]/g, 'setTimeout/setInterval mit Zeichenkette');
  scan(f, t, /javascript:/gi, 'javascript:-URL');
  scan(f, t, /\bdocument\.cookie\b/g, 'Cookies (die Website verspricht, keine zu setzen)');
  scan(f, t, /\b(?:fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)\b/g, 'Netzwerkzugriff – die Website arbeitet rein lokal; bitte prüfen und CSP (connect-src) anpassen');
  scan(f, t, /\.insertAdjacentHTML\s*\(/g, 'insertAdjacentHTML');
  for (const m of t.matchAll(/createElement\(\s*["']script["']\s*\)/g)) {
    if (!/ld\+json/.test(t.slice(m.index, m.index + 160))) fail(f, `dynamisch erzeugtes Skript (Zeile ${lineOf(t, m.index)}) – nur JSON-LD-Datenblöcke sind erlaubt`);
  }
  scan(f, t, /(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^\s"'`)]*\.(?:js|css|woff2?|png|jpe?g|svg)\b/gi, 'Ressource von fremder Quelle im Skript');
  innerHtmlCount += (t.match(/\.innerHTML\s*=/g) || []).length;
}
notes.push(`${innerHtmlCount}× innerHTML-Zuweisung in den Skripten – nur mit festen Texten oder escapten Werten verwenden (Eingaben/URL-Parameter stets per textContent/value setzen).`);

/* ---------- CSS ---------- */
const cssDir = join(ROOT, 'assets', 'css');
for (const name of readdirSync(cssDir).filter((n) => n.endsWith('.css'))) {
  const f = join(cssDir, name), t = read(f);
  scan(f, t, /@import\b/g, '@import');
  scan(f, t, /url\(\s*["']?\s*(?:https?:)?\/\//gi, 'CSS-Ressource von fremder Quelle');
}

/* ---------- _headers ---------- */
const headersFile = join(ROOT, '_headers');
if (!existsSync(headersFile)) fail(headersFile, 'Datei fehlt');
else {
  const lines = read(headersFile).split('\n');
  const block = [];
  let inAll = false;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (/^\S/.test(line) && !line.startsWith('#')) { inAll = line.trim() === '/*'; continue; }
    if (inAll && /^\s+\S/.test(line)) block.push(line.trim());
  }
  const get = (n) => { const l = block.find((x) => x.toLowerCase().startsWith(n.toLowerCase() + ':')); return l ? l.slice(n.length + 1).trim() : null; };
  const must = {
    'X-Content-Type-Options': (v) => /nosniff/i.test(v),
    'X-Frame-Options': (v) => /^(deny|sameorigin)$/i.test(v),
    'Referrer-Policy': (v) => !!v,
    'Permissions-Policy': (v) => /camera=\(\)/.test(v) && /microphone=\(\)/.test(v) && /geolocation=\(\)/.test(v),
    'Cross-Origin-Opener-Policy': (v) => /same-origin/.test(v),
  };
  for (const [n, ok] of Object.entries(must)) { const v = get(n); if (v === null) fail(headersFile, `Header ${n} fehlt`); else if (!ok(v)) fail(headersFile, `Header ${n} hat einen unerwarteten Wert: ${v}`); }
  const csp = get('Content-Security-Policy');
  if (csp === null) fail(headersFile, 'Content-Security-Policy fehlt');
  else {
    const dir = {};
    for (const part of csp.split(';')) { const [k, ...v] = part.trim().split(/\s+/); if (k) dir[k.toLowerCase()] = v; }
    const need = (k, val) => { if (!(dir[k] || []).includes(val)) fail(headersFile, `CSP: ${k} muss ${val} enthalten`); };
    need('default-src', "'self'"); need('object-src', "'none'"); need('base-uri', "'self'"); need('frame-ancestors', "'none'"); need('form-action', "'self'");
    for (const k of ['default-src', 'script-src', 'connect-src', 'img-src', 'font-src', 'style-src']) {
      for (const v of dir[k] || []) {
        if (v === '*' || /^https?:/i.test(v) || /^\/\//.test(v)) fail(headersFile, `CSP: ${k} erlaubt fremde Quelle (${v})`);
      }
    }
    for (const v of dir['script-src'] || []) if (/unsafe-(inline|eval)|unsafe-hashes/.test(v)) fail(headersFile, `CSP: script-src enthält ${v}`);
    for (const v of dir['style-src'] || []) if (/unsafe-(inline|eval)/.test(v)) fail(headersFile, `CSP: style-src enthält ${v} (nur style-src-attr darf Inline-Style-Attribute erlauben)`);
  }
}

/* ---------- Veröffentlichungsordner dist/ ---------- */
const dist = join(ROOT, 'dist');
if (existsSync(dist)) {
  const bad = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (/\.(map|env|pem|key|p12|bak|orig|log)$/i.test(n) || /^\.(env|git|netlify)/i.test(n) || /^(package(-lock)?\.json|README\.md)$/i.test(n)) bad.push(rel(p));
    }
  };
  walk(dist);
  if (readdirSync(dist).some((n) => /^(tools|partials|node_modules|\.git|\.netlify)$/.test(n))) bad.push('Entwicklungsordner in dist/');
  for (const b of bad) fail(dist, `unerwartete Datei: ${b}`);
}

/* ---------- Ergebnis ---------- */
console.log(`Sicherheits-Check: ${htmlFiles.length} HTML-Dateien, Skripte, Stile und _headers geprüft.`);
for (const n of notes) console.log('  Hinweis: ' + n);
if (problems.length) {
  console.error(`\n✖ ${problems.length} Problem(e):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('✔ Keine Verstöße gegen die Sicherheitsregeln gefunden.');
