/* ==========================================================================
   check.js – Zustandscheck (Pflaster · Wand · Industrieboden)
   Erste Frage wählt das Thema, danach folgt je Thema eine kurze Fragenfolge → Empfehlung
   → Übergabe an Anfrage, Rechner bzw. Planer. Nichts wird gespeichert oder gesendet.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-quiz]');
  if (!root) return;
  var GNZ = window.GNZ || {};

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
  var seq = [panels[0]], idx = 0, topic = '';

  var LABELS = {
    flaeche: { einfahrt: 'Einfahrt / Stellplatz', terrasse: 'Terrasse / Hof', gehweg: 'Gehweg / Zugang', gewerbe: 'Gewerbefläche' },
    anzeichen: { moos: 'Moos/Algen', unkraut: 'Unkraut in den Fugen', fugen: 'ausgespülte Fugen', flecken: 'Öl-/Rost-/Reifenflecken', schleier: 'Vergrauung/Kalkschleier', lose: 'lose oder abgesenkte Steine', wasser: 'Wasser steht', unsicher: 'unsicher' },
    prio: { optik: 'schöne Optik', pflege: 'wenig Pflegeaufwand', preis: 'günstige Lösung', haltbar: 'maximale Haltbarkeit' },
    material: { sand: 'Fugensand', polymer: 'Polymersand', drain: 'Drainfugenmörtel', epoxid: 'Epoxid-Fugenmörtel' },
    boden: { beton: 'Beton / Estrich', beschichtet: 'Epoxid-/PU-Beschichtung', fliesen: 'Fliesen / Platten', unsicher: 'Bodenart unbekannt' },
    problem: { staub: 'Staub, Späne, Grobschmutz', oel: 'Öl- und Fettflecken', film: 'Schmutzfilm / Reifenabrieb', rutschig: 'rutschiger Boden', vorbereitung: 'Vorbereitung für Beschichtung' }
  };

  /* ---------- Hilfen ---------- */
  var radioVal = function (name) { var e = form.querySelector('input[name="' + name + '"]:checked'); return e ? e.value : ''; };
  var checked = function (name) { return qsa('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; }); };

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
  function buildSeq() {
    topic = radioVal('topic');
    seq = [panels[0]].concat(panels.filter(function (p) { return p.getAttribute('data-flow') === topic; }));
  }
  function show(i) {
    idx = i;
    panels.forEach(function (p) { p.hidden = p !== seq[i]; });
    // Auf der Themenwahl steht die Länge der Folge noch nicht fest
    var total = i === 0 ? 3 : seq.length;
    stepLabel.textContent = i === 0 ? 'Frage 1' : 'Frage ' + (i + 1) + ' von ' + seq.length;
    fill.style.setProperty('--p', Math.round(((i + 1) / (i === 0 ? 4 : total)) * 100) + '%');
    progress.setAttribute('aria-valuemax', String(total));
    progress.setAttribute('aria-valuenow', String(i + 1));
    backBtn.hidden = i === 0;
    nextBtn.firstChild.textContent = i > 0 && i === seq.length - 1 ? 'Auswerten ' : 'Weiter ';
    errorEl.hidden = true;
  }
  function validate() {
    var p = seq[idx], need = (p.getAttribute('data-need') || '').split(':'), ok = true;
    if (need[0] === 'radio') ok = !!radioVal(need[1]);
    if (need[0] === 'any') ok = checked(need[1]).length > 0;
    if (!ok) { errorEl.textContent = p.getAttribute('data-msg') || 'Bitte treffen Sie eine Auswahl.'; errorEl.hidden = false; }
    else errorEl.hidden = true;
    return ok;
  }
  function focusPanel() { var l = seq[idx].querySelector('legend'); if (l) { l.setAttribute('tabindex', '-1'); l.focus({ preventScroll: true }); } }

  nextBtn.addEventListener('click', function () {
    if (!validate()) return;
    if (idx === 0) buildSeq();
    if (idx < seq.length - 1) { show(idx + 1); focusPanel(); } else { evaluate(); }
  });
  backBtn.addEventListener('click', function () { if (idx > 0) { show(idx - 1); focusPanel(); } });

  /* ---------- Thema: Pflaster ---------- */
  function jointFor(load, prio) {
    if (load === 'high') return { key: 'epoxid', why: 'Gewerbliche Beanspruchung durch Fahrzeuge, Kehrmaschinen und Hochdruckreinigung verlangt eine harzgebundene, strahlfeste Fuge.' };
    if (prio === 'haltbar') return load === 'mid'
      ? { key: 'epoxid', why: 'Wenn maximale Haltbarkeit zählt, ist Epoxid-Fugenmörtel die robusteste Lösung – auch bei Fahrzeugverkehr.' }
      : { key: 'drain', why: 'Für Terrassen und Wege ist Drainfugenmörtel dauerhaft, stabil und trotzdem wasserdurchlässig.' };
    if (load === 'mid') return { key: 'drain', why: 'Für Einfahrten ist Drainfugenmörtel ein bewährter Mittelweg: belastbar, wasserdurchlässig und gut gegen Auswaschung.' };
    if (prio === 'preis') return { key: 'polymer', why: 'Für leicht belastete Flächen bietet Polymersand ein gutes Preis-Leistungs-Verhältnis und hemmt Unkraut deutlich besser als reiner Sand.' };
    return { key: 'drain', why: 'Drainfugenmörtel liefert ein sauberes, pflegeleichtes Fugenbild und hält Unkraut und Auswaschung dauerhaft fern.' };
  }

  function evalPflaster() {
    var a = { flaeche: radioVal('flaeche'), anzeichen: checked('anzeichen'), prio: radioVal('prio') };
    var load = a.flaeche === 'gewerbe' ? 'high' : a.flaeche === 'einfahrt' ? 'mid' : 'low';
    var has = function (k) { return a.anzeichen.indexOf(k) > -1; };
    var needBase = has('lose') || has('wasser');          // Unterbau: nicht Teil unseres Angebots
    var needClean = has('moos') || has('unkraut') || has('flecken') || has('schleier');
    var needJoint = has('unkraut') || has('fugen');
    var unsure = has('unsicher');
    var wantsProtect = needClean && (a.prio === 'pflege' || a.prio === 'optik' || a.prio === 'haltbar' || has('flecken'));
    var items = [], services = [];
    if (needBase) {
      items.push({
        icon: 'warn', urgent: has('lose'),
        title: 'Das betrifft den Unterbau – nicht unser Bereich',
        text: 'Wackelnde oder abgesenkte Steine und Wasserprobleme haben ihre Ursache meist unter der Oberfläche. Das ist ein Fall für einen Pflaster- bzw. Landschaftsbaubetrieb. Wir reinigen, verfugen und schützen die Oberfläche – gern, sobald die Fläche wieder fest liegt.',
        badge: has('lose') ? 'Zeitnah prüfen lassen' : 'Hinweis'
      });
    }
    if (needClean) {
      items.push({ icon: 'spray', title: 'Heißwasser-Hochdruckreinigung', text: 'Entfernt Moos, Algen, Grünbelag sowie Öl- und Schmutzspuren – mit Flächenreiniger und passendem Druck, damit Belag und Fugen geschont werden.' });
      services.push('pflaster');
    }
    if (needJoint) {
      items.push({ icon: 'bricks', title: 'Fugen auskratzen & neu verfugen', text: 'Unkraut und leere Fugen sind der Anfang vom Ende: Neue Fugen stabilisieren das Pflaster und halten Bewuchs fern.' });
      services.push('fugung');
    }
    if (wantsProtect) {
      items.push({ icon: 'drop', title: 'Imprägnierung oder Versiegelung (optional)', text: 'Schützt die gereinigte Oberfläche vor schneller Neuverschmutzung: Eine Imprägnierung zieht in die Poren ein, eine Versiegelung bildet einen Schutzfilm und kann die Farbe vertiefen.', badge: 'Optional' });
      if (services.indexOf('aufbereitung') < 0) services.push('aufbereitung');
    }
    if (!needClean && !needJoint && !needBase) {
      items.push({ icon: 'clipboard', title: 'Kostenlose Besichtigung', text: 'Wir prüfen Belag, Fugen und Verschmutzung vor Ort und empfehlen die passende Maßnahme – ohne Verpflichtung.' });
      services.push('pflaster');
    }
    if (!services.length) services.push('pflaster');
    var title, lead;
    if (needBase && !needClean && !needJoint) { title = 'Das ist ein Fall für den Pflasterbau.'; lead = 'Lose oder abgesenkte Steine und Wasser, das nicht abläuft, haben meist eine Ursache unter der Oberfläche. Arbeiten am Unterbau gehören nicht zu unseren Leistungen – wir reinigen, verfugen und schützen die Oberfläche, gern nachdem ein Fachbetrieb die Fläche instand gesetzt hat.'; }
    else if (needBase) { title = 'Unterbau extern – Oberfläche bei uns.'; lead = 'Lose oder abgesenkte Steine und Wasserprobleme haben ihre Ursache meist unter der Oberfläche; Arbeiten am Unterbau gehören nicht zu unseren Leistungen. Die Oberfläche übernehmen wir gern – am besten, nachdem ein Fachbetrieb die Fläche instand gesetzt hat.'; }
    else if (needClean && needJoint) { title = 'Reinigung plus neue Fugen.'; lead = 'Ihre Fläche ist grundsätzlich in Ordnung, aber Bewuchs und Fugenzustand sprechen für ein Komplettpaket: erst reinigen, dann neu verfugen.'; }
    else if (needClean) { title = 'Eine gründliche Reinigung bringt das meiste.'; lead = 'Die Beobachtungen sprechen für eine reine Oberflächenverschmutzung. Nach der Reinigung prüfen wir, ob die Fugen aufgefüllt werden sollten.'; }
    else if (needJoint) { title = 'Frische Fugen sind der Schlüssel.'; lead = 'Ausgespülte oder bewachsene Fugen lassen Wasser und Unkraut eindringen. Neu verfugen stabilisiert das Pflaster.'; }
    else { title = 'Wir schauen es uns gern an.'; lead = unsure ? 'Kein Problem – nicht jede Ursache lässt sich per Foto oder Fragebogen erkennen. Bei einer kostenlosen Besichtigung beurteilen wir den Zustand vor Ort.' : 'Das klingt nach einer gepflegten Fläche. Eine kurze Besichtigung zeigt, ob Vorsorge sinnvoll ist.'; }

    var joint = null;
    if (needJoint) { joint = jointFor(load, a.prio); }
    var uniq = services.filter(function (s, i) { return services.indexOf(s) === i; });
    var names = items.map(function (it) { return it.title.replace(/ \(optional\)/, ''); }).join(', ');
    var note = 'Zustandscheck – Fläche: ' + LABELS.flaeche[a.flaeche] + '. Beobachtungen: ' +
      a.anzeichen.map(function (k) { return LABELS.anzeichen[k]; }).join(', ') + '. Empfehlung: ' + names +
      (joint ? ' (Fugenmaterial: ' + LABELS.material[joint.key] + ')' : '') + '. Wichtig: ' + LABELS.prio[a.prio] + '.';
    var svc = [];
    if (needClean) svc.push('reinigung');
    if (needJoint) svc.push('verfugung');
    if (wantsProtect) svc.push('impraegnierung');
    return {
      title: title, lead: lead, items: items, joint: joint, services: uniq, note: note,
      calcHref: 'rechner.html' + (svc.length ? '?s=' + svc.join(',') + (joint ? '&m=' + joint.key : '') : ''), calcLabel: 'Preis schätzen'
    };
  }

  /* ---------- Thema: Wand ---------- */
  function evalWand() {
    var sk = radioVal('untergrund'), dk = radioVal('wproblem');
    var W = GNZ.WallAdvice;
    var a = W ? W.advise(sk, dk) : { title: 'Probefeld und passendes Verfahren', text: 'Wir prüfen den Untergrund vor Ort und wählen das passende Verfahren.', warn: '', limit: '' };
    var items = [{ icon: 'wall', title: a.title, text: a.text }];
    if (a.warn) items.push({ icon: 'warn', title: 'Achtung', text: a.warn, badge: 'Wichtig' });
    if (a.limit) items.push({ icon: 'info', title: 'Grenzen & Nachsorge', text: a.limit });
    var sl = W ? W.SURFACE[sk].label : sk, dl = W ? W.DIRT[dk] : dk;
    return {
      title: 'So reinigen wir diese Wand.', lead: 'Für ' + sl + ' mit „' + dl + '“ empfehlen wir:', items: items, joint: null, services: ['wand'],
      note: 'Zustandscheck Wand – Untergrund: ' + sl + '; Verschmutzung: ' + dl + '. Empfohlenes Verfahren: ' + a.title + '.',
      calcHref: 'rechner.html#wand', calcLabel: 'Preis schätzen'
    };
  }

  /* ---------- Thema: Industrieboden ---------- */
  function evalIndustrie() {
    var b = radioVal('boden'), p = radioVal('problem'), items = [], warn = '', title, text;
    if (p === 'staub') {
      title = 'Kehren, Saugen und maschinelle Reinigung';
      text = 'Staub, Späne und Grobschmutz nehmen wir mit Kehr- und Industriesaugtechnik auf; Scheuersaugmaschinen reinigen und trocknen in einem Gang – regelmäßig nach Plan.';
    } else if (p === 'oel') {
      title = 'Entfetten: binden, lösen, absaugen';
      text = 'Öl und Fett werden gebunden bzw. gelöst und mit Heißwasser-Hochdruck samt Absaugung beseitigt. Das Reinigungswasser nehmen wir auf und entsorgen es ordnungsgemäß.';
      warn = b === 'beton' ? 'Beton ist saugfähig: Je früher behandelt, desto besser. Tief eingedrungene Flecken lassen sich oft nur aufhellen.' : b === 'beschichtet' ? 'Beschichtungen vertragen nicht jedes Lösemittel – Reiniger und Verfahren stimmen wir auf die Herstellerangaben ab.' : '';
    } else if (p === 'film') {
      title = 'Maschinelle Grundreinigung';
      text = 'Reiniger mit Einwirkzeit, maschinelles Schrubben und Absaugen lösen Schmutzfilme und Reifenabrieb. Danach genügt meist eine regelmäßige Unterhaltsreinigung.';
    } else if (p === 'rutschig') {
      title = 'Rückstände entfernen, Rutschhemmung prüfen';
      text = 'Oft machen Öl-, Fett- und Schmutzfilme den Boden glatt – eine Grundreinigung entfernt sie. Bleibt der Boden danach glatt, liegt es am Belag: Dann ist die Prüfung der Rutschhemmung und gegebenenfalls eine rutschhemmende Beschichtung durch einen Fachbetrieb sinnvoll.';
      warn = 'Rutschige Böden sind ein Unfallrisiko – bitte zeitnah handeln und den Bereich bis dahin absichern.';
    } else {
      title = 'Gründliche Reinigung als Vorbereitung';
      text = 'Reinigen und Entfetten sind die Basis jeder Beschichtung. Schleif- und Beschichtungsarbeiten führen Fachbetriebe aus – wir koordinieren den Ablauf gern mit.';
    }
    items.push({ icon: 'factory', title: title, text: text });
    if (warn) items.push({ icon: 'warn', title: 'Achtung', text: warn, badge: 'Wichtig' });
    var hint = {
      beton: 'Beton und Estrich sind saugfähig – Reiniger und Einwirkzeit wählen wir passend.',
      beschichtet: 'Bei beschichteten Böden verwenden wir Pads und Reiniger passend zur Beschichtung und beachten die Pflegehinweise des Herstellers.',
      fliesen: 'Bei Fliesen reinigen wir die Fugen mit – sie sind oft die Schwachstelle.',
      unsicher: 'Die Bodenart prüfen wir bei der Begehung und wählen Verfahren und Mittel entsprechend.'
    }[b];
    items.push({ icon: 'info', title: 'Zu Ihrem Boden', text: hint });
    return {
      title: 'So bekommen wir den Boden in den Griff.', lead: 'Für ' + LABELS.boden[b] + ' mit „' + LABELS.problem[p] + '“ empfehlen wir:', items: items, joint: null, services: ['industrie'],
      note: 'Zustandscheck Industrieboden – Boden: ' + LABELS.boden[b] + '; Thema: ' + LABELS.problem[p] + '. Empfehlung: ' + title + '.',
      calcHref: 'rechner.html#industrie', calcLabel: 'Preis schätzen'
    };
  }

  /* ---------- Ergebnis ---------- */
  function evaluate() {
    var r = topic === 'wand' ? evalWand() : topic === 'industrie' ? evalIndustrie() : evalPflaster();

    qs('[data-r-title]').textContent = r.title;
    qs('[data-r-lead]').textContent = r.lead;
    var list = qs('[data-r-list]');
    list.innerHTML = '';
    r.items.forEach(function (it) {
      var li = document.createElement('li');
      li.className = 'result-item' + (it.urgent ? ' result-item--urgent' : '');
      li.innerHTML = '<span class="icon-badge"><svg class="i" aria-hidden="true"><use href="#i-' + it.icon + '"/></svg></span><h3></h3><p></p>';
      var h3 = li.querySelector('h3');
      h3.textContent = it.title;
      if (it.badge) { var b = document.createElement('span'); b.className = 'badge' + (it.urgent ? '' : ' badge--dark'); b.textContent = it.badge; h3.appendChild(b); }
      li.querySelector('p').textContent = it.text;
      list.appendChild(li);
    });

    var jointBox = qs('[data-r-joint]');
    if (r.joint) {
      qs('[data-r-joint-name]').textContent = LABELS.material[r.joint.key];
      qs('[data-r-joint-why]').textContent = r.joint.why;
      qs('[data-r-joint-link]').setAttribute('href', 'spezialfugung.html?material=' + r.joint.key + '#konfigurator');
      jointBox.hidden = false;
    } else jointBox.hidden = true;

    qs('[data-r-cta]').setAttribute('href', 'kontakt.html?leistung=' + encodeURIComponent(r.services.join(',')) + '&notiz=' + encodeURIComponent(r.note));
    var calc = qs('[data-r-calc]');
    calc.setAttribute('href', r.calcHref);
    calc.textContent = r.calcLabel;

    form.hidden = true;
    root.querySelector('.quiz__top').hidden = true;
    result.hidden = false;
    result.focus();
    result.scrollIntoView({ behavior: GNZ.util && GNZ.util.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  qs('[data-quiz-restart]').addEventListener('click', function () {
    form.reset();
    result.hidden = true;
    form.hidden = false;
    root.querySelector('.quiz__top').hidden = false;
    topic = ''; seq = [panels[0]];
    show(0);
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Direkteinstieg per URL, z. B. zustandscheck.html?thema=wand
  var pre = new URLSearchParams(window.location.search).get('thema');
  if (pre) { var el = form.querySelector('input[name="topic"][value="' + pre + '"]'); if (el) el.checked = true; }

  show(0);
})();
