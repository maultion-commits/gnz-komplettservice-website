/* ==========================================================================
   callback.js – Rückruf-Dialog (auf jeder Seite)
   Nichts wird automatisch gesendet: Es entsteht ein Text für E-Mail, WhatsApp oder die Zwischenablage.
   ========================================================================== */
(function () {
  'use strict';
  var dlg = document.querySelector('[data-callback]');
  if (!dlg || typeof dlg.showModal !== 'function') {
    // Ohne <dialog>-Unterstützung: Auslöser führen zur Kontaktseite
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-callback]'), function (b) {
      b.addEventListener('click', function () { window.location.href = 'kontakt.html'; });
    });
    return;
  }
  var GNZ = window.GNZ || {};
  var cfg = GNZ.config || { contact: {} };
  var q = function (s) { return dlg.querySelector(s); };
  var tel = q('#cb-tel'), name = q('#cb-name'), when = q('#cb-when'), topic = q('#cb-topic');
  var mail = q('[data-cb-mail]'), wa = q('[data-cb-wa]'), copy = q('[data-cb-copy]'), note = q('[data-cb-note]');
  var opener = null, message = '';

  function valid() { return tel.value.replace(/\D/g, '').length >= 6; }
  function build() {
    var lines = ['Guten Tag,', '', 'bitte rufen Sie mich zurück.', '', 'Telefon: ' + tel.value.trim()];
    if (name.value.trim()) lines.push('Name: ' + name.value.trim());
    lines.push('Wunschzeit: ' + when.value);
    if (topic.value) lines.push('Thema: ' + topic.value);
    lines.push('', 'Vielen Dank!');
    message = lines.join('\n');
  }
  function setState(ok) {
    [mail, wa, copy].forEach(function (el) { el.setAttribute('aria-disabled', ok ? 'false' : 'true'); });
    if (ok) {
      build();
      mail.setAttribute('href', 'mailto:' + (cfg.contact.email || '') + '?subject=' + encodeURIComponent('Rückruf-Wunsch über die Website') + '&body=' + encodeURIComponent(message.replace(/\n/g, '\r\n')));
      if (cfg.contact.whatsapp) { wa.hidden = false; wa.setAttribute('href', 'https://wa.me/' + cfg.contact.whatsapp + '?text=' + encodeURIComponent(message)); }
      note.textContent = 'Bereit – wählen Sie, wie Sie die Nachricht senden möchten.';
    } else {
      mail.setAttribute('href', '#'); wa.setAttribute('href', '#');
      note.textContent = 'Bitte geben Sie Ihre Telefonnummer an – dann werden die Schaltflächen aktiv.';
    }
  }
  function refresh() { setState(valid()); }
  [tel, name, when, topic].forEach(function (el) { el.addEventListener('input', refresh); el.addEventListener('change', refresh); });
  [mail, wa].forEach(function (el) { el.addEventListener('click', function (e) { if (el.getAttribute('aria-disabled') === 'true') { e.preventDefault(); tel.focus(); } }); });
  copy.addEventListener('click', function () {
    if (copy.getAttribute('aria-disabled') === 'true') { tel.focus(); return; }
    var done = function () { var l = copy.querySelector('span'), o = l.textContent; l.textContent = 'Kopiert ✓'; note.textContent = 'Text kopiert.'; setTimeout(function () { l.textContent = o; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(message).then(done, function () {});
  });

  function open(btn) { opener = btn || null; refresh(); dlg.showModal(); setTimeout(function () { tel.focus(); }, 30); }
  function close() { dlg.close(); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-open-callback]'), function (b) { b.addEventListener('click', function () { open(b); }); });
  q('[data-callback-close]').addEventListener('click', close);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener('close', function () { if (opener) opener.focus(); });
  if (window.location.hash === '#rueckruf') open(null);
  refresh();
})();
