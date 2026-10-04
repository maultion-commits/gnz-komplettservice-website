/* ==========================================================================
   wizard.js – Anfrage-Assistent (4 Schritte + Zusammenfassung)
   Es wird nichts an einen Server gesendet: Am Ende entsteht ein vorbereiteter Text für
   E-Mail (mailto:), WhatsApp (wa.me) oder die Zwischenablage.
   ========================================================================== */
(function () {
  'use strict';
  var form = document.querySelector('[data-wizard]');
  if (!form) return;

  var GNZ = window.GNZ || {};
  var cfg = GNZ.config || { contact: {} };
  var qs = function (s, r) { return (r || form).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || form).querySelectorAll(s)); };

  var panels = qsa('.wizard__panel');
  var stepper = qsa('[data-stepper] li');
  var backBtn = qs('[data-w-back]');
  var nextBtn = qs('[data-w-next]');
  var navEl = qs('.wizard__nav');
  var idx = 0;
  var last = panels.length - 1;

  var SERVICES = {
    pflaster: 'Pflasterreinigung', fugung: 'Spezialfugung', sanierung: 'Sanierung',
    raeumung: 'Räumung / Entrümpelung', abriss: 'Abriss / Rückbau', transport: 'Transport / Entsorgung',
    garten: 'Gartenservice', hausmeister: 'Hausmeisterservice', beratung: 'Beratung / Sonstiges'
  };
  var TYPES = { eigentum: 'Einfamilienhaus / Eigentum', verwaltung: 'Mehrfamilienhaus / Hausverwaltung / WEG', gewerbe: 'Gewerbe / Industrie', sonstiges: 'Sonstiges' };
  var WHEN = { asap: 'So schnell wie möglich', month: 'In den nächsten 4 Wochen', flexible: 'Flexibel / nach Absprache' };
  var CHANNEL = { phone: 'Rückruf', mail: 'E-Mail', wa: 'WhatsApp' };

  /* ---------- Voreinstellungen aus der URL ---------- */
  var q = new URLSearchParams(window.location.search);
  if (q.get('leistung')) {
    var want = q.get('leistung').split(',');
    qsa('input[name="leistung"]').forEach(function (i) { i.checked = want.indexOf(i.value) > -1; });
  }
  if (q.get('flaeche')) { var n = parseInt(q.get('flaeche'), 10); if (n > 0) qs('#w-umfang').value = n + ' m²'; }
  if (q.get('notiz')) qs('#w-details').value = q.get('notiz').slice(0, 900);

  /* ---------- Schritte ---------- */
  function show(i) {
    idx = i;
    panels.forEach(function (p, n) { p.hidden = n !== i; });
    stepper.forEach(function (li, n) {
      li.classList.toggle('is-active', n === i);
      li.classList.toggle('is-done', n < i);
      if (n === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    backBtn.hidden = i === 0;
    nextBtn.hidden = i === last;
    nextBtn.firstChild.textContent = i === last - 1 ? 'Zusammenfassung ' : 'Weiter ';
    if (i === last) buildSummary();
  }
  function focusPanel() {
    var p = panels[idx];
    p.setAttribute('tabindex', '-1');
    p.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: GNZ.util && GNZ.util.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- Validierung ---------- */
  function setError(field, msg) {
    var wrap = field.closest('[data-field]') || field.parentNode;
    var err = wrap.querySelector('.error');
    if (msg) {
      if (!err) { err = document.createElement('p'); err.className = 'error'; err.id = (field.id || field.name) + '-err'; err.setAttribute('role', 'alert'); wrap.appendChild(err); }
      err.textContent = msg;
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', err.id);
    } else {
      if (err) err.remove();
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  }
  function groupError(panel, msg) {
    var el = qs('[data-group-error]', panel);
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function validate(i) {
    var p = panels[i], ok = true, firstBad = null;
    var bad = function (el) { ok = false; if (!firstBad) firstBad = el; };

    if (i === 0) {
      if (!qsa('input[name="leistung"]:checked', p).length) { groupError(p, 'Bitte wählen Sie mindestens eine Leistung.'); bad(qs('input[name="leistung"]', p)); } else groupError(p, '');
    }
    if (i === 1) {
      if (!qs('input[name="objekt"]:checked', p)) { groupError(p, 'Bitte wählen Sie die Objektart.'); bad(qs('input[name="objekt"]', p)); } else groupError(p, '');
      var plz = qs('#w-plz');
      if (!/^\d{5}$/.test(plz.value.trim())) { setError(plz, 'Bitte geben Sie eine fünfstellige Postleitzahl an.'); bad(plz); } else setError(plz, '');
    }
    if (i === 3) {
      var name = qs('#w-name'), tel = qs('#w-tel'), mail = qs('#w-mail'), dsgvo = qs('#w-dsgvo');
      if (name.value.trim().length < 2) { setError(name, 'Bitte nennen Sie uns Ihren Namen.'); bad(name); } else setError(name, '');
      var telOk = tel.value.replace(/\D/g, '').length >= 6, mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim());
      if (!tel.value.trim() && !mail.value.trim()) { setError(tel, 'Bitte geben Sie Telefon oder E-Mail an, damit wir Sie erreichen.'); bad(tel); }
      else {
        if (tel.value.trim() && !telOk) { setError(tel, 'Die Telefonnummer scheint unvollständig.'); bad(tel); } else setError(tel, '');
        if (mail.value.trim() && !mailOk) { setError(mail, 'Bitte prüfen Sie die E-Mail-Adresse.'); bad(mail); } else setError(mail, '');
      }
      var wrap = dsgvo.closest('[data-field]');
      if (!dsgvo.checked) { groupError(wrap, 'Bitte bestätigen Sie den Hinweis zum Datenschutz.'); bad(dsgvo); } else groupError(wrap, '');
    }
    if (firstBad) firstBad.focus();
    return ok;
  }

  nextBtn.addEventListener('click', function () { if (validate(idx)) { show(idx + 1); focusPanel(); } });
  backBtn.addEventListener('click', function () { if (idx > 0) { show(idx - 1); focusPanel(); } });
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio' && idx < last) { e.preventDefault(); nextBtn.click(); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  qsa('input, textarea, select').forEach(function (el) {
    el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) setError(el, ''); });
  });

  /* ---------- Zusammenfassung & Versand ---------- */
  var message = '', subject = '';
  function val(sel) { return qs(sel).value.trim(); }

  function buildMessage() {
    var services = qsa('input[name="leistung"]:checked').map(function (i) { return SERVICES[i.value]; });
    var type = qs('input[name="objekt"]:checked');
    var channel = qs('input[name="kanal"]:checked');
    var when = qs('#w-wann').value;
    var lines = [];
    lines.push('Guten Tag,', '', 'ich interessiere mich für folgende Leistung(en): ' + services.join(', ') + '.', '');
    lines.push('Objekt: ' + (type ? TYPES[type.value] : '–'));
    lines.push('PLZ / Ort: ' + val('#w-plz') + (val('#w-ort') ? ' ' + val('#w-ort') : ''));
    if (val('#w-umfang')) lines.push('Umfang / Fläche: ' + val('#w-umfang'));
    lines.push('Gewünschter Zeitraum: ' + WHEN[when]);
    if (val('#w-details')) lines.push('', 'Details:', val('#w-details'));
    lines.push('', 'Kontakt: ' + val('#w-name'));
    if (val('#w-tel')) lines.push('Telefon: ' + val('#w-tel'));
    if (val('#w-mail')) lines.push('E-Mail: ' + val('#w-mail'));
    lines.push('Bevorzugt: ' + (channel ? CHANNEL[channel.value] : 'egal'));
    lines.push('', 'Ich bitte um einen Termin für eine kostenlose Besichtigung bzw. um ein Angebot.', '', 'Viele Grüße', val('#w-name'));
    subject = 'Anfrage über die Website: ' + services.join(', ');
    message = lines.join('\n');
  }

  function buildSummary() {
    buildMessage();
    var dl = qs('[data-summary]');
    var services = qsa('input[name="leistung"]:checked').map(function (i) { return SERVICES[i.value]; }).join(', ');
    var type = qs('input[name="objekt"]:checked');
    var rows = [
      ['Leistung', services],
      ['Objekt', (type ? TYPES[type.value] : '–') + ' · ' + val('#w-plz') + (val('#w-ort') ? ' ' + val('#w-ort') : '')],
      ['Umfang & Zeitraum', (val('#w-umfang') ? val('#w-umfang') + ' · ' : '') + WHEN[qs('#w-wann').value]],
      ['Kontakt', val('#w-name') + (val('#w-tel') ? ' · ' + val('#w-tel') : '') + (val('#w-mail') ? ' · ' + val('#w-mail') : '')]
    ];
    if (val('#w-details')) rows.push(['Details', val('#w-details')]);
    dl.innerHTML = '';
    rows.forEach(function (r) {
      var d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = r[0]; dd.textContent = r[1]; d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
    });
    qs('[data-w-text]').value = message;

    var to = cfg.contact.email || '';
    qs('[data-send-mail]').setAttribute('href', 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message.replace(/\n/g, '\r\n')));
    var wa = qs('[data-send-wa]');
    if (cfg.contact.whatsapp) { wa.hidden = false; wa.setAttribute('href', 'https://wa.me/' + cfg.contact.whatsapp + '?text=' + encodeURIComponent(message)); } else { wa.hidden = true; }
  }

  var copyBtn = qs('[data-send-copy]');
  var copyLive = qs('[data-copy-live]');
  copyBtn.addEventListener('click', function () {
    var ta = qs('[data-w-text]');
    var done = function () {
      copyLive.textContent = 'Text in die Zwischenablage kopiert.';
      var label = copyBtn.querySelector('span');
      var old = label.textContent;
      label.textContent = 'Kopiert ✓';
      setTimeout(function () { label.textContent = old; copyLive.textContent = ''; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); document.execCommand('copy'); done(); });
    else { ta.select(); try { document.execCommand('copy'); done(); } catch (e) { copyLive.textContent = 'Bitte den Text markieren und manuell kopieren.'; } }
  });

  qs('[data-w-restart]').addEventListener('click', function () {
    form.reset();
    show(0);
    focusPanel();
  });

  show(0);
  // Test-/Debug-Zugriff
  form.__wizard = { show: show, validate: validate, message: function () { buildMessage(); return { subject: subject, message: message }; } };
})();
