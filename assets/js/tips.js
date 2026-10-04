/* ==========================================================================
   tips.js – Pflege-Tipp des Monats (+ Kalender-Erinnerung als .ics-Datei)
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-tip]');
  if (!root) return;
  var GNZ = window.GNZ || {};

  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var TIPS = [
    { icon: 'shield', title: 'Splitt statt Streusalz', text: 'Auftausalz greift Pflaster und Fugen an. Bei Glätte besser mit Splitt abstumpfen und die Reste im Frühjahr abkehren – das schont Steine, Fugen und Beete.', link: ['pflasterreinigung.html', 'Zur Pflasterreinigung'] },
    { icon: 'warn', title: 'Winterschäden früh erkennen', text: 'Frost drückt Wasser in Fugen und Steine. Notieren Sie jetzt lose Steine, Mulden und Risse – im Frühjahr ist die beste Zeit für Reparaturen.', link: ['zustandscheck.html', 'Zustandscheck starten'] },
    { icon: 'sparkle', title: 'Frühjahrsputz für Wege und Terrasse', text: 'Winterdreck, Splitt und Laubreste abkehren, bevor Algen Fuß fassen. Eine Hochdruckreinigung klappt am besten bei frostfreiem, trockenem Wetter.', link: ['pflasterreinigung.html', 'Zur Pflasterreinigung'] },
    { icon: 'bricks', title: 'Fugen jetzt auffüllen', text: 'Ausgespülte Fugen und erstes Unkraut lassen sich im April leicht beheben – bevor die Wachstumssaison richtig losgeht.', link: ['spezialfugung.html', 'Zur Spezialfugung'] },
    { icon: 'calendar', title: 'Beste Zeit für Reinigung und Neuverfugung', text: 'Trocken, frostfrei und lange Tage: Von Mai bis September gelingen Reinigung, Neuverfugung und Imprägnierung am zuverlässigsten. Termine am besten früh anfragen.', link: ['kontakt.html', 'Termin anfragen'] },
    { icon: 'house', title: 'Möbel und Töpfe regelmäßig verrücken', text: 'Unter Töpfen und Möbeln entstehen Flecken und Algen. Wer sie ab und zu verschiebt, hat auf der Terrasse deutlich weniger Verfärbungen.', link: ['zustandscheck.html', 'Zustand prüfen'] },
    { icon: 'drop', title: 'Frische Fugen brauchen Ruhe', text: 'Frische Fugen und Imprägnierungen härten bei Hitze am besten morgens und im Schatten aus. Planen Sie die Arbeiten möglichst frühmorgens und halten Sie die Fläche trocken.', link: ['spezialfugung.html', 'Fugenmaterial vergleichen'] },
    { icon: 'warn', title: 'Pfützen nach Starkregen ernst nehmen', text: 'Steht nach Gewittern Wasser auf der Fläche oder läuft es zum Haus, stimmt das Gefälle nicht. Das ist ein Fall für einen Pflaster- oder Landschaftsbaubetrieb – wir reinigen und schützen die Oberfläche, sobald die Fläche wieder passt.', link: ['zustandscheck.html', 'Zustand prüfen'] },
    { icon: 'leaf', title: 'Gehölze zurückschneiden', text: 'Überhängende Zweige werfen Laub und Harz aufs Pflaster. Schneiden Sie schonend zurück – die Brutzeit endet am 30. September, danach darf kräftiger gepflegt werden.', link: ['gartenservice.html', 'Zum Gartenservice'] },
    { icon: 'leaf', title: 'Laub regelmäßig entfernen', text: 'Nasses Laub hinterlässt Flecken, fördert Algen und macht Wege rutschig. Regelmäßig kehren – besonders auf Treppen, Zuwegen und Stellplätzen.', link: ['hausmeisterservice.html', 'Zum Hausmeisterservice'] },
    { icon: 'sparkle', title: 'Vor dem Frost noch einmal reinigen', text: 'Sauberes, trockenes Pflaster übersteht den Winter besser. Wichtig: Wasser darf nicht in offenen Fugen stehen bleiben – dort sprengt Frost die Steine.', link: ['pflasterreinigung.html', 'Zur Pflasterreinigung'] },
    { icon: 'shield', title: 'Schnee mit Gefühl räumen', text: 'Scharfe Metallschieber können Kanten und Fasen beschädigen. Besser Gummilippe oder Kunststoffschieber verwenden und bei Glätte mit Splitt streuen.', link: ['hausmeisterservice.html', 'Zum Hausmeisterservice'] }
  ];

  var now = new Date();
  try { now = new Date(new Date().toLocaleString('en-US', { timeZone: (GNZ.config && GNZ.config.timezone) || 'Europe/Berlin' })); } catch (e) { /* lokale Zeit */ }
  var current = now.getMonth(), index = current;

  var elMonth = root.querySelector('[data-tip-month]');
  var elTitle = root.querySelector('[data-tip-title]');
  var elText = root.querySelector('[data-tip-text]');
  var elIcon = root.querySelector('[data-tip-icon] use');
  var elLink = root.querySelector('[data-tip-link]');
  var elNow = root.querySelector('[data-tip-now]');
  var dots = root.querySelector('[data-tip-dots]');
  var live = root.querySelector('[data-tip-live]');
  var dotBtns = [];

  MONTHS.forEach(function (m, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tip__dot'; b.textContent = m.slice(0, 3);
    b.setAttribute('aria-label', 'Tipp für ' + m);
    b.addEventListener('click', function () { show(i); });
    dots.appendChild(b); dotBtns.push(b);
  });

  function show(i) {
    index = (i + 12) % 12;
    var t = TIPS[index];
    elMonth.textContent = MONTHS[index];
    elTitle.textContent = t.title;
    elText.textContent = t.text;
    elIcon.setAttribute('href', '#i-' + t.icon);
    elLink.setAttribute('href', t.link[0]);
    elLink.firstChild.textContent = t.link[1] + ' ';
    elNow.hidden = index !== current;
    dotBtns.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === index)); b.classList.toggle('is-now', n === current); });
    if (live) live.textContent = 'Tipp für ' + MONTHS[index] + ': ' + t.title;
  }
  root.querySelector('[data-tip-prev]').addEventListener('click', function () { show(index - 1); });
  root.querySelector('[data-tip-next]').addEventListener('click', function () { show(index + 1); });

  /* ---------- Kalender-Erinnerung (.ics, jährlich wiederkehrend) ---------- */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
  root.querySelector('[data-tip-ics]').addEventListener('click', function () {
    var t = TIPS[index];
    var year = now.getFullYear() + (index < current ? 1 : 0);
    var start = year + pad(index + 1) + '01';
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    var name = (GNZ.config && GNZ.config.company && GNZ.config.company.name) || 'GNZ Immobilien-Komplettservice';
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + name + '//Pflege-Erinnerung//DE', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:pflege-' + (index + 1) + '@gnz-komplettservice', 'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + start, 'RRULE:FREQ=YEARLY',
      'SUMMARY:' + esc('Pflege-Tipp: ' + t.title), 'DESCRIPTION:' + esc(t.text + '\n\n' + name),
      'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(t.title), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pflege-erinnerung-' + MONTHS[index].toLowerCase().replace('ä', 'ae') + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    if (live) live.textContent = 'Kalender-Datei für ' + MONTHS[index] + ' wurde heruntergeladen.';
  });

  show(current);
})();
