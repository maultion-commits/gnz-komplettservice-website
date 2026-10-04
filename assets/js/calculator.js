/* ==========================================================================
   calculator.js – Richtwert-Preisrechner (Pflasterreinigung · Neuverfugung · Imprägnierung)
   Preise stehen zentral in assets/js/config.js → GNZ.config.pricing (Beispielwerte!).
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-calc]');
  if (!root) return;

  var GNZ = window.GNZ || {};
  var P = (GNZ.config && GNZ.config.pricing) || {
    vatNote: 'inkl. gesetzlicher MwSt.', minimumOrder: 190, reinigung: [3.5, 6.5],
    zustand: { leicht: 0.85, normal: 1, stark: 1.3 },
    verfugung: { sand: [4, 7], polymer: [7, 12], drain: [14, 22], epoxid: [22, 34] }, impraegnierung: [3.5, 6.5]
  };
  var euro = function (n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); };
  var round10 = function (n) { return Math.round(n / 10) * 10; };
  var qs = function (s) { return root.querySelector(s); };
  var qsa = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };

  var area = qs('#calc-area'), range = qs('#calc-range');
  var fugeFs = qs('[data-calc-fuge]');
  var totalEl = qs('[data-calc-total]'), perEl = qs('[data-calc-per]'), linesEl = qs('[data-calc-lines]');
  var notesEl = qs('[data-calc-notes]'), cta = qs('[data-calc-cta]'), vatEl = qs('[data-calc-vat]');

  var MAT = { sand: 'Fugensand', polymer: 'Polymersand', drain: 'Drainfugenmörtel', epoxid: 'Epoxid-Fugenmörtel' };
  var ZUS = { leicht: 'leicht', normal: 'normal', stark: 'stark' };

  function state() {
    var a = parseFloat(String(area.value).replace(',', '.'));
    var svc = qsa('input[name="svc"]:checked').map(function (i) { return i.value; });
    var mat = qs('input[name="mat"]:checked');
    var zus = qs('input[name="zus"]:checked');
    return { area: isFinite(a) && a > 0 ? Math.min(a, 5000) : 0, svc: svc, mat: mat ? mat.value : 'drain', zus: zus ? zus.value : 'normal' };
  }

  function compute(s) {
    var lines = [], min = 0, max = 0, add = function (label, lo, hi) { lines.push({ label: label, lo: lo, hi: hi }); min += lo; max += hi; };
    var A = s.area;
    if (s.svc.indexOf('reinigung') > -1) {
      var f = P.zustand[s.zus] || 1;
      add('Pflasterreinigung · ' + ZUS[s.zus] + ' verschmutzt', A * P.reinigung[0] * f, A * P.reinigung[1] * f);
    }
    if (s.svc.indexOf('verfugung') > -1) {
      var v = P.verfugung[s.mat];
      add('Neuverfugung · ' + MAT[s.mat], A * v[0], A * v[1]);
    }
    if (s.svc.indexOf('impraegnierung') > -1) add('Imprägnierung', A * P.impraegnierung[0], A * P.impraegnierung[1]);
    var minApplied = false;
    if (lines.length && min < P.minimumOrder) { min = P.minimumOrder; max = Math.max(max, P.minimumOrder); minApplied = true; }
    return { lines: lines, min: round10(min), max: round10(max), minApplied: minApplied };
  }

  function syncFill() {
    var mn = +range.min, mx = +range.max, v = Math.max(mn, Math.min(mx, +range.value));
    range.style.setProperty('--fill', ((v - mn) / (mx - mn)) * 100 + '%');
  }

  function render() {
    var s = state();
    fugeFs.hidden = s.svc.indexOf('verfugung') === -1;
    syncFill();
    linesEl.innerHTML = '';
    notesEl.innerHTML = '';
    if (!s.svc.length || !s.area) {
      totalEl.textContent = '–';
      perEl.textContent = !s.area ? 'Bitte eine Fläche eingeben.' : 'Bitte mindestens eine Leistung wählen.';
      cta.setAttribute('href', 'kontakt.html');
      return;
    }
    var r = compute(s);
    totalEl.textContent = r.min === r.max ? euro(r.min) : euro(r.min) + ' – ' + euro(r.max);
    var perMin = Math.round(r.min / s.area), perMax = Math.round(r.max / s.area);
    perEl.textContent = 'für ' + (Math.round(s.area * 10) / 10).toLocaleString('de-DE') + ' m² · ca. ' +
      (perMin === perMax ? euro(perMin) : euro(perMin) + ' bis ' + euro(perMax)) + ' pro m²';
    r.lines.forEach(function (l) {
      var li = document.createElement('li');
      var a = document.createElement('span'); a.textContent = l.label;
      var b = document.createElement('span'); b.textContent = euro(round10(l.lo)) + ' – ' + euro(round10(l.hi));
      li.appendChild(a); li.appendChild(b); linesEl.appendChild(li);
    });
    if (r.minApplied) {
      var li2 = document.createElement('li');
      li2.innerHTML = '<span>Mindestauftragswert</span><span></span>';
      li2.lastChild.textContent = euro(P.minimumOrder);
      linesEl.appendChild(li2);
    }

    var svcKeys = [];
    if (s.svc.indexOf('reinigung') > -1 || s.svc.indexOf('impraegnierung') > -1) svcKeys.push('pflaster');
    if (s.svc.indexOf('verfugung') > -1) svcKeys.push('fugung');
    var labels = s.svc.map(function (k) { return { reinigung: 'Reinigung', verfugung: 'Neuverfugung (' + MAT[s.mat] + ')', impraegnierung: 'Imprägnierung' }[k]; }).join(', ');
    var note = 'Richtwert aus dem Preisrechner: ' + totalEl.textContent + ' (' + Math.round(s.area) + ' m²; ' + labels +
      (s.svc.indexOf('reinigung') > -1 ? '; Verschmutzung: ' + ZUS[s.zus] : '') + ').';
    cta.setAttribute('href', 'kontakt.html?leistung=' + encodeURIComponent(svcKeys.join(',')) + '&flaeche=' + Math.round(s.area) + '&notiz=' + encodeURIComponent(note));
  }

  /* ---------- Eingaben koppeln ---------- */
  range.addEventListener('input', function () { area.value = range.value; render(); });
  area.addEventListener('input', function () {
    var v = parseFloat(String(area.value).replace(',', '.'));
    if (isFinite(v)) range.value = Math.max(+range.min, Math.min(+range.max, v));
    render();
  });
  qsa('input[name="svc"], input[name="mat"], input[name="zus"]').forEach(function (i) { i.addEventListener('change', render); });
  if (vatEl && P.vatNote) vatEl.textContent = P.vatNote;
  var printBtn = qs('[data-print]');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  /* ---------- Voreinstellungen aus der URL (z. B. vom Zustandscheck) ---------- */
  var q = new URLSearchParams(window.location.search);
  if (q.get('s')) {
    var wanted = q.get('s').split(',');
    qsa('input[name="svc"]').forEach(function (i) { i.checked = wanted.indexOf(i.value) > -1; });
  }
  if (q.get('m')) { var m = qs('input[name="mat"][value="' + q.get('m') + '"]'); if (m) m.checked = true; }
  if (q.get('z')) { var z = qs('input[name="zus"][value="' + q.get('z') + '"]'); if (z) z.checked = true; }
  if (q.get('a')) { var av = parseFloat(q.get('a')); if (isFinite(av) && av > 0) { area.value = av; range.value = Math.min(+range.max, av); } }

  render();
})();
