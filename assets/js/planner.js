/* ==========================================================================
   planner.js – Betreuungsplan zusammenstellen (Hausmeisterservice)
   Leistungen ankreuzen, Rhythmus wählen → fertiger Text für die Anfrage.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-planner]');
  if (!root) return;
  var rows = Array.prototype.slice.call(root.querySelectorAll('.planner__row'));
  var cta = root.querySelector('[data-planner-cta]');
  var out = root.querySelector('[data-planner-count]');
  var service = root.getAttribute('data-planner-service') || 'hausmeister';
  var title = root.getAttribute('data-planner-title') || 'Betreuungsplan';

  function update() {
    var picked = [];
    rows.forEach(function (row) {
      var cb = row.querySelector('input[type="checkbox"]');
      var sel = row.querySelector('select');
      sel.disabled = !cb.checked;
      if (cb.checked) picked.push(cb.getAttribute('data-label') + ' (' + sel.options[sel.selectedIndex].text + ')');
    });
    if (out) out.textContent = picked.length ? picked.length + ' Bausteine gewählt' : 'Noch nichts gewählt';
    var note = picked.length ? title + ': ' + picked.join('; ') + '.' : '';
    cta.setAttribute('href', 'kontakt.html?leistung=' + service + (note ? '&notiz=' + encodeURIComponent(note) : ''));
  }
  rows.forEach(function (row) {
    row.querySelector('input').addEventListener('change', update);
    row.querySelector('select').addEventListener('change', update);
  });
  update();
})();
