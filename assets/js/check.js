/* ==========================================================================
   check.js – Pflaster-Check
   Drei Fragen → Empfehlung (Reinigung / Neuverfugung / Sanierung) → Übergabe an Anfrage & Rechner
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-quiz]');
  if (!root) return;

  var qs = function (s, r) { return (r || root).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var form = qs('[data-quiz-form]');
  var panels = qsa('.quiz__q', form);
  var stepLabel = qs('[data-quiz-step]');
  var progress = qs('.progress');
  var fill = progress.firstElementChild;
  var backBtn = qs('[data-quiz-back]');
  var nextBtn = qs('[data-quiz-next]');
  var errorEl = qs('[data-quiz-error]');
  var result = qs('[data-quiz-result]');
  var idx = 0;

  var LABELS = {
    flaeche: { einfahrt: 'Einfahrt / Stellplatz', terrasse: 'Terrasse / Hof', gehweg: 'Gehweg / Zugang', gewerbe: 'Gewerbefläche' },
    anzeichen: { moos: 'Moos/Algen', unkraut: 'Unkraut in den Fugen', fugen: 'ausgespülte Fugen', flecken: 'Öl-/Rost-/Reifenflecken', schleier: 'Vergrauung/Kalkschleier', lose: 'lose oder abgesenkte Steine', wasser: 'Wasser steht', unsicher: 'unsicher' },
    prio: { optik: 'schöne Optik', pflege: 'wenig Pflegeaufwand', preis: 'günstige Lösung', haltbar: 'maximale Haltbarkeit' },
    material: { sand: 'Fugensand', polymer: 'Polymersand', drain: 'Drainfugenmörtel', epoxid: 'Epoxid-Fugenmörtel' }
  };

  /* ---------- Auswahl lesen ---------- */
  function answers() {
    var f = form.querySelector('input[name="flaeche"]:checked');
    var p = form.querySelector('input[name="prio"]:checked');
    return {
      flaeche: f ? f.value : '',
      anzeichen: qsa('input[name="anzeichen"]:checked', form).map(function (i) { return i.value; }),
      prio: p ? p.value : ''
    };
  }

  // "unsicher" schließt die anderen Anzeichen aus – und umgekehrt
  qsa('input[name="anzeichen"]', form).forEach(function (cb) {
    cb.addEventListener('change', function () {
      if (!cb.checked) return;
      qsa('input[name="anzeichen"]', form).forEach(function (o) {
        if (o !== cb && ((cb.value === 'unsicher') || (o.value === 'unsicher'))) o.checked = false;
      });
    });
  });

  /* ---------- Navigation ---------- */
  function show(i) {
    idx = i;
    panels.forEach(function (p, n) { p.hidden = n !== i; });
    var total = panels.length;
    stepLabel.textContent = 'Frage ' + (i + 1) + ' von ' + total;
    fill.style.setProperty('--p', Math.round(((i + 1) / total) * 100) + '%');
    progress.setAttribute('aria-valuenow', String(i + 1));
    backBtn.hidden = i === 0;
    nextBtn.firstChild.textContent = i === total - 1 ? 'Auswerten ' : 'Weiter ';
    errorEl.hidden = true;
  }

  function validate() {
    var a = answers(), msg = '';
    if (idx === 0 && !a.flaeche) msg = 'Bitte wählen Sie aus, um welche Fläche es geht.';
    if (idx === 1 && !a.anzeichen.length) msg = 'Bitte wählen Sie mindestens eine Beobachtung – oder „Ich bin unsicher“.';
    if (idx === 2 && !a.prio) msg = 'Bitte wählen Sie, was Ihnen am wichtigsten ist.';
    if (msg) { errorEl.textContent = msg; errorEl.hidden = false; return false; }
    errorEl.hidden = true;
    return true;
  }

  nextBtn.addEventListener('click', function () {
    if (!validate()) return;
    if (idx < panels.length - 1) { show(idx + 1); focusPanel(); } else { evaluate(); }
  });
  backBtn.addEventListener('click', function () { if (idx > 0) { show(idx - 1); focusPanel(); } });
  function focusPanel() { var l = panels[idx].querySelector('legend'); if (l) { l.setAttribute('tabindex', '-1'); l.focus({ preventScroll: true }); } }

  /* ---------- Auswertung ---------- */
  function jointFor(load, prio) {
    if (load === 'high') return { key: 'epoxid', why: 'Gewerbliche Beanspruchung durch Fahrzeuge, Kehrmaschinen und Hochdruckreinigung verlangt eine harzgebundene, strahlfeste Fuge.' };
    if (prio === 'haltbar') return load === 'mid'
      ? { key: 'epoxid', why: 'Wenn maximale Haltbarkeit zählt, ist Epoxid-Fugenmörtel die robusteste Lösung – auch bei Fahrzeugverkehr.' }
      : { key: 'drain', why: 'Für Terrassen und Wege ist Drainfugenmörtel dauerhaft, stabil und trotzdem wasserdurchlässig.' };
    if (load === 'mid') return { key: 'drain', why: 'Für Einfahrten ist Drainfugenmörtel ein bewährter Mittelweg: belastbar, wasserdurchlässig und gut gegen Auswaschung.' };
    if (prio === 'preis') return { key: 'polymer', why: 'Für leicht belastete Flächen bietet Polymersand ein gutes Preis-Leistungs-Verhältnis und hemmt Unkraut deutlich besser als reiner Sand.' };
    return { key: 'drain', why: 'Drainfugenmörtel liefert ein sauberes, pflegeleichtes Fugenbild und hält Unkraut und Auswaschung dauerhaft fern.' };
  }

  function evaluate() {
    var a = answers();
    var load = a.flaeche === 'gewerbe' ? 'high' : a.flaeche === 'einfahrt' ? 'mid' : 'low';
    var has = function (k) { return a.anzeichen.indexOf(k) > -1; };
    var needSan = has('lose') || has('wasser');
    var needClean = has('moos') || has('unkraut') || has('flecken') || has('schleier');
    var needJoint = has('unkraut') || has('fugen');
    var unsure = has('unsicher');

    var items = [], services = [];
    if (needSan) {
      items.push({
        icon: 'hammer', urgent: has('lose'),
        title: 'Unterbau prüfen & Pflaster neu verlegen',
        text: 'Betroffene Bereiche werden aufgenommen, Tragschicht und Gefälle korrigiert, die Steine neu verlegt und verfugt.' + (has('wasser') ? ' Steht Wasser oder läuft es zum Haus, prüfen wir zusätzlich das Gefälle.' : ''),
        badge: has('lose') ? 'Zeitnah prüfen' : ''
      });
      services.push('sanierung');
    }
    if (needClean) {
      items.push({ icon: 'spray', title: 'Heißwasser-Hochdruckreinigung', text: 'Entfernt Moos, Algen, Grünbelag sowie Öl- und Schmutzspuren – mit Flächenreiniger und passendem Druck, damit Belag und Fugen geschont werden.' });
      services.push('pflaster');
    }
    if (needJoint) {
      items.push({ icon: 'bricks', title: 'Fugen auskratzen & neu verfugen', text: 'Unkraut und leere Fugen sind der Anfang vom Ende: Neue Fugen stabilisieren das Pflaster und halten Bewuchs fern.' });
      services.push('fugung');
    }
    if (needClean && (a.prio === 'pflege' || a.prio === 'optik' || has('flecken'))) {
      items.push({ icon: 'drop', title: 'Imprägnierung (optional)', text: 'Schützt vor schneller Neuverschmutzung durch Algen, Öl und Schmutz und erleichtert die spätere Pflege.', badge: 'Optional' });
    }
    if (!items.length) {
      items.push({ icon: 'clipboard', title: 'Kostenlose Besichtigung', text: 'Wir prüfen Belag, Fugen und Unterbau vor Ort und empfehlen die passende Maßnahme – ohne Verpflichtung.' });
      services.push('pflaster');
    }

    var title, lead;
    if (needSan) { title = 'Hier lohnt ein Blick auf den Unterbau.'; lead = 'Wackelnde oder abgesenkte Steine und Wasserprobleme haben meist eine Ursache unter der Oberfläche. Reinigen allein reicht dann nicht – am besten sehen wir uns die Fläche an.'; }
    else if (needClean && needJoint) { title = 'Reinigung plus neue Fugen.'; lead = 'Ihre Fläche ist grundsätzlich in Ordnung, aber Bewuchs und Fugenzustand sprechen für ein Komplettpaket: erst reinigen, dann neu verfugen.'; }
    else if (needClean) { title = 'Eine gründliche Reinigung bringt das meiste.'; lead = 'Die Beobachtungen sprechen für eine reine Oberflächenverschmutzung. Nach der Reinigung prüfen wir, ob die Fugen aufgefüllt werden sollten.'; }
    else if (needJoint) { title = 'Frische Fugen sind der Schlüssel.'; lead = 'Ausgespülte oder bewachsene Fugen lassen Wasser und Unkraut eindringen. Neu verfugen stabilisiert das Pflaster.'; }
    else { title = 'Wir schauen es uns gern an.'; lead = unsure ? 'Kein Problem – nicht jede Ursache lässt sich per Foto oder Fragebogen erkennen. Bei einer kostenlosen Besichtigung beurteilen wir den Zustand vor Ort.' : 'Das klingt nach einer gepflegten Fläche. Eine kurze Besichtigung zeigt, ob Vorsorge sinnvoll ist.'; }

    qs('[data-r-title]').textContent = title;
    qs('[data-r-lead]').textContent = lead;

    var list = qs('[data-r-list]');
    list.innerHTML = '';
    items.forEach(function (it) {
      var li = document.createElement('li');
      li.className = 'result-item' + (it.urgent ? ' result-item--urgent' : '');
      li.innerHTML = '<span class="icon-badge"><svg class="i" aria-hidden="true"><use href="#i-' + it.icon + '"/></svg></span>' +
        '<h3></h3><p></p>';
      var h3 = li.querySelector('h3');
      h3.textContent = it.title;
      if (it.badge) { var b = document.createElement('span'); b.className = 'badge' + (it.urgent ? '' : ' badge--dark'); b.textContent = it.badge; h3.appendChild(b); }
      li.querySelector('p').textContent = it.text;
      list.appendChild(li);
    });

    // Fugenempfehlung
    var jointBox = qs('[data-r-joint]');
    var material = null;
    if (needJoint || needSan) {
      var j = jointFor(load, a.prio);
      material = j.key;
      qs('[data-r-joint-name]').textContent = LABELS.material[j.key];
      qs('[data-r-joint-why]').textContent = j.why;
      qs('[data-r-joint-link]').setAttribute('href', 'spezialfugung.html?material=' + j.key + '#konfigurator');
      jointBox.hidden = false;
    } else {
      jointBox.hidden = true;
    }

    // Übergaben
    var uniq = services.filter(function (s, i) { return services.indexOf(s) === i; });
    var names = items.map(function (it) { return it.title.replace(/ \(optional\)/, ''); }).join(', ');
    var note = 'Pflaster-Check – Fläche: ' + LABELS.flaeche[a.flaeche] + '. Beobachtungen: ' +
      a.anzeichen.map(function (k) { return LABELS.anzeichen[k]; }).join(', ') + '. Empfehlung: ' + names +
      (material ? ' (Fugenmaterial: ' + LABELS.material[material] + ')' : '') + '. Wichtig: ' + LABELS.prio[a.prio] + '.';
    qs('[data-r-cta]').setAttribute('href', 'kontakt.html?leistung=' + encodeURIComponent(uniq.join(',')) + '&notiz=' + encodeURIComponent(note));

    var svc = [];
    if (needClean) svc.push('reinigung');
    if (needJoint || needSan) svc.push('verfugung');
    if (needClean && (a.prio === 'pflege' || a.prio === 'optik' || has('flecken'))) svc.push('impraegnierung');
    var calcHref = 'rechner.html' + (svc.length ? '?s=' + svc.join(',') + (material ? '&m=' + material : '') : '');
    qs('[data-r-calc]').setAttribute('href', calcHref);

    // Ergebnis anzeigen
    form.hidden = true;
    root.querySelector('.quiz__top').hidden = true;
    result.hidden = false;
    result.focus();
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.GNZ) { window.GNZ.lastCheck = { items: items, material: material, services: uniq }; }
  }

  qs('[data-quiz-restart]').addEventListener('click', function () {
    form.reset();
    result.hidden = true;
    form.hidden = false;
    root.querySelector('.quiz__top').hidden = false;
    show(0);
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  show(0);
})();
