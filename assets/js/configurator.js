/* ==========================================================================
   configurator.js – Fugen-Konfigurator
   Verband, Steinfarbe, Fugenmaterial und Fugenfarbe wählen; Vorschau zeichnet paving.js.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-cfg]');
  if (!root || !window.GNZ || !GNZ.Paving) return;
  var P = GNZ.Paving;

  var PATTERNS = { reihe: 'Reihenverband', laeufer: 'Läuferverband', fischgraet: 'Fischgrät' };
  var MATERIALS = {
    sand: {
      name: 'Fugensand', tag: 'Klassisch', short: 'Quarz- oder Brechsand, ungebunden eingekehrt.',
      water: 'wasserdurchlässig', use: 'Fußwege, Terrassen und wenig belastete Flächen',
      meters: { load: 1, weed: 1, jet: 1, cost: 1 }, color: 'sand',
      pros: ['Günstig und schnell eingebracht', 'Wasserdurchlässig', 'Leicht nachzufüllen'],
      cons: ['Wird ausgespült und ausgekehrt', 'Unkraut und Ameisen finden Halt', 'Nicht strahlfest']
    },
    polymer: {
      name: 'Polymersand', tag: 'Mittelweg', short: 'Sand mit Polymer-Bindemittel, das mit Wasser aushärtet.',
      water: 'überwiegend wasserdurchlässig (je nach Produkt)', use: 'Terrassen, Gehwege und leicht befahrene Flächen',
      meters: { load: 2, weed: 2, jet: 2, cost: 2 }, color: 'hellgrau',
      pros: ['Hemmt Unkraut und Auswaschung', 'Bleibt etwas flexibel', 'Deutlich besser als reiner Sand'],
      cons: ['Nicht für hohe Lasten', 'Schleier bei falscher Verarbeitung möglich', 'Je nach Beanspruchung gelegentlich nachbessern']
    },
    drain: {
      name: 'Drainfugenmörtel', tag: 'Beliebt', short: 'Zementgebundener, wasserdurchlässiger Fugenmörtel.',
      water: 'wasserdurchlässig', use: 'Einfahrten, Terrassen, Hofflächen und Gehwege',
      meters: { load: 3, weed: 3, jet: 3, cost: 3 }, color: 'hellgrau',
      pros: ['Stabil und trotzdem wasserdurchlässig', 'Gut gegen Auswaschung und Bewuchs', 'Auch für Pkw-Verkehr geeignet'],
      cons: ['Anspruchsvollere Verarbeitung', 'Starre Fuge kann bei Bewegung im Untergrund reißen', 'Aushärtezeit beachten']
    },
    epoxid: {
      name: 'Epoxid-Fugenmörtel', tag: 'Spezial', short: 'Zweikomponentiger Harzmörtel, extrem fest und strahlfest.',
      water: 'wasserdurchlässig oder -undurchlässig – je nach Produkt', use: 'Hohe Belastung, Kehrmaschinen, Hochdruckreinigung, Gewerbe',
      meters: { load: 4, weed: 4, jet: 4, cost: 4 }, color: 'steingrau',
      pros: ['Sehr belastbar und strahlfest', 'Starker Schutz gegen Unkraut', 'Kaum Verschmutzung der Fuge'],
      cons: ['Höchstes Preisniveau', 'Fläche muss trocken sein, wetterabhängig', 'Wasserundurchlässige Varianten brauchen funktionierende Entwässerung']
    }
  };
  var METER_LABELS = { load: 'Belastbarkeit', weed: 'Unkrautschutz', jet: 'Strahlfestigkeit', cost: 'Preisniveau' };

  var state = { pattern: 'fischgraet', stone: 'grau', material: 'drain', jointColor: 'hellgrau' };
  var q = new URLSearchParams(window.location.search);
  var own = function (obj, key) { return key !== null && Object.prototype.hasOwnProperty.call(obj, key); };  // nur eigene Schlüssel aus der Adresse zulassen
  if (own(PATTERNS, q.get('verband'))) state.pattern = q.get('verband');
  if (own(P.STONES, q.get('stein'))) state.stone = q.get('stein');
  if (own(MATERIALS, q.get('material'))) { state.material = q.get('material'); state.jointColor = MATERIALS[state.material].color; }
  if (own(P.JOINT_COLORS, q.get('fuge'))) state.jointColor = q.get('fuge');

  var canvas = root.querySelector('[data-cfg-canvas]');
  var summary = root.querySelector('[data-cfg-summary]');
  var info = root.querySelector('[data-cfg-info]');
  var cta = root.querySelector('[data-cfg-cta]');

  /* ---------- Bedienelemente aufbauen ---------- */
  function patternIcon(key) {
    var s = 7, out = '';
    if (key === 'fischgraet') {
      out += '<g transform="translate(17 12) rotate(45)">';
      for (var u = -6; u <= 6; u++) for (var v = -6; v <= 6; v++) {
        if ((((v - u) % 4) + 4) % 4) continue;
        out += '<rect x="' + u * s + '" y="' + v * s + '" width="' + (2 * s - 1.4) + '" height="' + (s - 1.4) + '" rx="1"/>';
        out += '<rect x="' + (u + 2) * s + '" y="' + (v - 1) * s + '" width="' + (s - 1.4) + '" height="' + (2 * s - 1.4) + '" rx="1"/>';
      }
      out += '</g>';
    } else {
      for (var r = 0; r < 3; r++) {
        var off = key === 'laeufer' && r % 2 ? -8 : 0;
        for (var c = -1; c < 3; c++) out += '<rect x="' + (1 + off + c * 16) + '" y="' + (1 + r * 8) + '" width="14" height="6" rx="1"/>';
      }
    }
    return '<svg class="pat" viewBox="0 0 34 24" aria-hidden="true">' + out + '</svg>';
  }

  function radio(group, name, value, checked, inner, extraClass) {
    var label = document.createElement('label');
    label.className = extraClass || 'choice';
    var input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.checked = checked;
    label.appendChild(input);
    var holder = document.createElement('span');
    holder.innerHTML = inner;
    while (holder.firstChild) label.appendChild(holder.firstChild);
    group.appendChild(label);
    input.addEventListener('change', function () { state[name] = value; if (name === 'material') { /* Fugenfarbe-Vorschlag */ state.jointColor = MATERIALS[value].color; syncRadios('jointColor'); } update(); });
    return input;
  }
  function syncRadios(name) {
    Array.prototype.forEach.call(root.querySelectorAll('input[name="' + name + '"]'), function (i) { i.checked = i.value === state[name]; });
  }

  var gPattern = root.querySelector('[data-cfg-pattern]');
  Object.keys(PATTERNS).forEach(function (k) {
    radio(gPattern, 'pattern', k, state.pattern === k, '<span class="choice__body">' + patternIcon(k) + '<span>' + PATTERNS[k] + '</span></span>');
  });

  var gStone = root.querySelector('[data-cfg-stone]');
  Object.keys(P.STONES).forEach(function (k) {
    radio(gStone, 'stone', k, state.stone === k, '<span class="swatch__dot"><i style="--sw:' + P.STONES[k].swatch + '"></i>' + P.STONES[k].label + '</span>', 'swatch');
  });

  var gMat = root.querySelector('[data-cfg-material]');
  Object.keys(MATERIALS).forEach(function (k) {
    var m = MATERIALS[k];
    radio(gMat, 'material', k, state.material === k,
      '<span class="choice__body"><span class="choice__text"><strong>' + m.name + '</strong><small>' + m.tag + ' · ' + m.short + '</small></span><span class="choice__tick"><svg class="i" aria-hidden="true"><use href="#i-check"/></svg></span></span>');
  });

  var gJoint = root.querySelector('[data-cfg-jointcolor]');
  Object.keys(P.JOINT_COLORS).forEach(function (k) {
    radio(gJoint, 'jointColor', k, state.jointColor === k, '<span class="swatch__dot"><i style="--sw:' + P.JOINT_COLORS[k].swatch + '"></i>' + P.JOINT_COLORS[k].label + '</span>', 'swatch');
  });

  /* ---------- Aktualisieren ---------- */
  var raf = 0;
  function draw() {
    raf = 0;
    P.render(canvas, { pattern: state.pattern, stone: state.stone, joint: state.material, jointColor: state.jointColor, seed: 5, unit: 24 }, 'clean');
  }
  function meterHtml(k, v) {
    return '<div class="meter"><dt>' + METER_LABELS[k] + '</dt><dd><span class="bar" data-v="' + v + '" role="img" aria-label="' + v + ' von 4"><i></i><i></i><i></i><i></i></span></dd></div>';
  }
  function li(items) { return items.map(function (t) { return '<li>' + t + '</li>'; }).join(''); }

  function update() {
    var m = MATERIALS[state.material];
    var text = PATTERNS[state.pattern] + ' · ' + P.STONES[state.stone].label + ' · ' + m.name + ' in ' + P.JOINT_COLORS[state.jointColor].label;
    summary.innerHTML = 'Ihre Kombination: <span></span>';
    summary.querySelector('span').textContent = text;
    info.innerHTML =
      '<h3>' + m.name + '</h3>' +
      '<p style="margin:0;color:rgba(245,242,235,.86)">' + m.short + '</p>' +
      '<p class="small" style="margin:0;color:rgba(245,242,235,.7)"><strong style="color:#fff">Wasserdurchlässigkeit:</strong> ' + m.water + '<br><strong style="color:#fff">Typisch für:</strong> ' + m.use + '</p>' +
      '<dl class="meters">' + Object.keys(m.meters).map(function (k) { return meterHtml(k, m.meters[k]); }).join('') + '</dl>' +
      '<div class="cols-i"><div><h4>Stärken</h4><ul>' + li(m.pros) + '</ul></div><div><h4>Beachten</h4><ul>' + li(m.cons) + '</ul></div></div>' +
      '<p class="small" style="margin:0;color:rgba(245,242,235,.6)">Orientierungswerte – je nach Produkt, Fugenbreite und Untergrund. Die Darstellung ist eine Illustration; Farbe und Optik weichen in der Realität ab.</p>';
    cta.setAttribute('href', 'kontakt.html?leistung=fugung&notiz=' + encodeURIComponent('Fugen-Konfigurator: ' + text + '.'));
    if (!raf) raf = requestAnimationFrame(draw);
  }

  canvas.setAttribute('aria-label', 'Vorschau der Pflasterfläche mit der gewählten Fuge');
  update();
  draw(); // sofort zeichnen (unabhängig von requestAnimationFrame)
})();
