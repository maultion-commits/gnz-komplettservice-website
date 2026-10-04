/* ==========================================================================
   minicalc.js – kompakter Richtwert-Rechner (Wandreinigung, Industrieboden)
   Die Oberfläche wird aus der Konfiguration GNZ.config.pricing[<schlüssel>] aufgebaut,
   z. B. <div data-minicalc="industrie" data-title="Industrieboden"></div>.
   ========================================================================== */
(function () {
  'use strict';
  var GNZ = window.GNZ || {};
  var all = (GNZ.config && GNZ.config.pricing) || {};

  Array.prototype.forEach.call(document.querySelectorAll('[data-minicalc]'), function (root) {
    var key = root.getAttribute('data-minicalc');
    var C = all[key];
    if (!C) return;
    var service = root.getAttribute('data-service') || 'beratung';
    var aid = 'mc-area-' + key;
    var title = root.getAttribute('data-title') || 'Leistung';
    var euro = function (n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); };
    var round10 = function (n) { return n < 100 ? Math.round(n) : Math.round(n / 10) * 10; };
    var perFmt = function (n) { return n < 10 ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : euro(Math.round(n)); };
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
    var check = '<span class="choice__tick"><svg class="i" aria-hidden="true"><use href="#i-check"/></svg></span>';

    var optsHtml = C.options.map(function (o, i) {
      return '<label class="choice"><input type="radio" name="mc-opt" value="' + o.id + '"' + (i === 0 ? ' checked' : '') + '><span class="choice__body"><span class="choice__text"><strong>' + esc(o.label) + '</strong><small>' + esc(o.hint) + '</small></span>' + check + '</span></label>';
    }).join('');
    var zustandHtml = Object.keys(C.zustand).map(function (k) {
      var lab = { leicht: ['Leicht', 'wenig Verschmutzung'], normal: ['Normal', 'übliche Verschmutzung'], stark: ['Stark', 'hartnäckig, lange nicht gereinigt'] }[k] || [k, ''];
      return '<label class="choice"><input type="radio" name="mc-zus" value="' + k + '"' + (k === 'normal' ? ' checked' : '') + '><span class="choice__body"><span class="choice__text"><strong>' + lab[0] + '</strong><small>' + lab[1] + '</small></span>' + check + '</span></label>';
    }).join('');
    var zugangHtml = C.zugang ? '<fieldset class="fs" data-mc-access hidden><legend>Wie gut ist die Wand erreichbar?</legend><div class="choice-grid">' +
      Object.keys(C.zugang).map(function (k, i) {
        return '<label class="choice"><input type="radio" name="mc-acc" value="' + k + '"' + (i === 0 ? ' checked' : '') + '><span class="choice__body"><span class="choice__text"><strong>' + esc(C.zugang[k].label) + '</strong></span>' + check + '</span></label>';
      }).join('') + '</div></fieldset>' : '';

    root.className = (root.className ? root.className + ' ' : '') + 'calc';
    root.innerHTML =
      '<form class="calc__form slab form" novalidate>' +
        '<fieldset class="fs"><legend>Wie groß ist die Fläche?<small>Eine ungefähre Angabe genügt – gemessen wird bei der Besichtigung.</small></legend>' +
          '<div class="calc__area"><input class="range" type="range" data-mc-range min="' + C.min + '" max="' + C.max + '" step="' + C.step + '" value="' + C.start + '" aria-label="Fläche in Quadratmetern, Schieberegler">' +
          '<div class="num"><label class="visually-hidden" for="' + aid + '">Fläche in Quadratmetern</label><input class="input" id="' + aid + '" type="number" inputmode="decimal" min="1" max="100000" step="1" value="' + C.start + '"> <span aria-hidden="true">m²</span></div></div></fieldset>' +
        '<fieldset class="fs"><legend>Welche Leistung?</legend><div class="choice-grid choice-grid--2">' + optsHtml + '</div></fieldset>' +
        zugangHtml +
        '<fieldset class="fs"><legend>Wie stark ist die Verschmutzung?</legend><div class="choice-grid">' + zustandHtml + '</div></fieldset>' +
      '</form>' +
      '<aside class="calc__result slab slab--dark" aria-label="Ergebnis">' +
        '<p class="eyebrow">Ihr Richtwert</p>' +
        '<div aria-live="polite" aria-atomic="true"><p class="calc__total" data-mc-total>–</p><p class="calc__per" data-mc-per></p></div>' +
        '<ul class="calc__lines" data-mc-lines></ul>' +
        '<p class="small muted">' + esc((all.vatNote || 'inkl. gesetzlicher MwSt.')) + ' · unverbindlicher Richtwert, kein Angebot. Der tatsächliche Preis hängt von Zustand, Zugang und Besonderheiten ab.</p>' +
        '<a class="btn btn--primary btn--block" data-mc-cta href="kontakt.html" style="margin-top:1.2rem;">Festpreis-Angebot anfragen <svg class="i" aria-hidden="true"><use href="#i-arrow-right"/></svg></a>' +
        '<button class="btn btn--ghost-light btn--block btn--sm" type="button" data-print style="margin-top:.7rem;"><svg class="i" aria-hidden="true"><use href="#i-copy"/></svg>Richtwert drucken / als PDF speichern</button>' +
      '</aside>';

    var q = function (s) { return root.querySelector(s); };
    var area = q('#' + aid), range = q('[data-mc-range]');
    var access = q('[data-mc-access]');

    function render() {
      var A = parseFloat(String(area.value).replace(',', '.'));
      A = isFinite(A) && A > 0 ? Math.min(A, 100000) : 0;
      var oid = q('input[name="mc-opt"]:checked').value;
      var opt = C.options.filter(function (o) { return o.id === oid; })[0];
      var zus = q('input[name="mc-zus"]:checked').value;
      var fz = C.zustand[zus] || 1;
      var fa = 1, accLabel = '';
      if (access) {
        access.hidden = !opt.access;
        if (opt.access) { var k = q('input[name="mc-acc"]:checked').value; fa = C.zugang[k].f; accLabel = C.zugang[k].label; }
      }
      var mn = (range.max - range.min) ? (Math.max(+range.min, Math.min(+range.max, +range.value)) - range.min) / (range.max - range.min) * 100 : 0;
      range.style.setProperty('--fill', mn + '%');

      var lines = q('[data-mc-lines]'); lines.innerHTML = '';
      var total = q('[data-mc-total]'), per = q('[data-mc-per]'), cta = q('[data-mc-cta]');
      if (!A) { total.textContent = '–'; per.textContent = 'Bitte eine Fläche eingeben.'; cta.setAttribute('href', 'kontakt.html'); return; }

      var lo = A * opt.range[0] * fz * fa, hi = A * opt.range[1] * fz * fa, minApplied = false;
      if (lo < C.minimumOrder) { lo = C.minimumOrder; hi = Math.max(hi, C.minimumOrder); minApplied = true; }
      lo = round10(lo); hi = round10(hi);
      total.textContent = lo === hi ? euro(lo) : euro(lo) + ' – ' + euro(hi);
      var pl = lo / A, ph = hi / A, same = perFmt(pl) === perFmt(ph);
      per.textContent = 'für ' + (Math.round(A * 10) / 10).toLocaleString('de-DE') + ' m² · ca. ' + (same ? perFmt(pl) : perFmt(pl) + ' bis ' + perFmt(ph)) + ' pro m²';
      var add = function (a, b) { var li = document.createElement('li'); var x = document.createElement('span'), y = document.createElement('span'); x.textContent = a; y.textContent = b; li.appendChild(x); li.appendChild(y); lines.appendChild(li); };
      add(opt.label, euro(round10(A * opt.range[0])) + ' – ' + euro(round10(A * opt.range[1])));
      if (fz !== 1) add('Verschmutzung: ' + zus, (fz > 1 ? '+' : '–') + Math.round(Math.abs(fz - 1) * 100) + ' %');
      if (fa !== 1) add(accLabel, '+' + Math.round((fa - 1) * 100) + ' %');
      if (minApplied) add('Mindestauftragswert', euro(C.minimumOrder));

      var note = 'Richtwert aus dem Rechner (' + title + '): ' + total.textContent + ' (' + Math.round(A) + ' m²; ' + opt.label + '; Verschmutzung: ' + zus + (accLabel ? '; ' + accLabel : '') + ').';
      cta.setAttribute('href', 'kontakt.html?leistung=' + encodeURIComponent(service) + '&flaeche=' + Math.round(A) + '&notiz=' + encodeURIComponent(note));
    }

    range.addEventListener('input', function () { area.value = range.value; render(); });
    area.addEventListener('input', function () { var v = parseFloat(String(area.value).replace(',', '.')); if (isFinite(v)) range.value = Math.max(+range.min, Math.min(+range.max, v)); render(); });
    root.addEventListener('change', render);
    var pb = q('[data-print]'); if (pb) pb.addEventListener('click', function () { window.print(); });
    render();
  });
})();
