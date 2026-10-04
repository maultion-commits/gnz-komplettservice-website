/* ==========================================================================
   gallery.js – Filter + Lightbox (natives <dialog>)
   ========================================================================== */
(function () {
  'use strict';
  var list = document.querySelector('[data-gallery]');
  if (!list) return;

  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var items = qsa('[data-shot]', list);
  var chips = qsa('[data-filter]');
  var live = document.querySelector('[data-gallery-live]');
  var dlg = document.querySelector('[data-lightbox]');
  var current = [];       // sichtbare Buttons
  var pos = 0;
  var opener = null;

  /* ---------- Filter ---------- */
  chips.forEach(function (chip) {
    var key = chip.getAttribute('data-filter');
    var n = key === 'all' ? items.length : items.filter(function (li) { return li.getAttribute('data-cat') === key; }).length;
    var c = chip.querySelector('.count');
    if (c) c.textContent = n;
  });
  function apply(key) {
    var shown = 0;
    items.forEach(function (li) {
      var on = key === 'all' || li.getAttribute('data-cat') === key;
      li.hidden = !on;
      if (on) shown++;
    });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === key)); });
    if (live) live.textContent = shown + ' Bilder angezeigt';
    if (history.replaceState) history.replaceState(null, '', key === 'all' ? window.location.pathname + window.location.search : '#' + key);
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-filter')); }); });
  var start = (window.location.hash || '').replace('#', '');
  if (start && chips.some(function (c) { return c.getAttribute('data-filter') === start; })) apply(start);

  /* ---------- Lightbox ---------- */
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var img = dlg.querySelector('[data-lb-img]');
  var cap = dlg.querySelector('[data-lb-caption]');
  var credit = dlg.querySelector('[data-lb-credit]');
  var count = dlg.querySelector('[data-lb-count]');

  function visibleButtons() { return items.filter(function (li) { return !li.hidden; }).map(function (li) { return li.querySelector('button[data-photo]'); }); }
  function load(i) {
    pos = (i + current.length) % current.length;
    var b = current[pos];
    img.src = b.getAttribute('data-full');
    img.alt = b.getAttribute('data-caption') || '';
    cap.textContent = b.getAttribute('data-caption') || '';
    credit.textContent = b.getAttribute('data-credit') || '';
    credit.setAttribute('href', b.getAttribute('data-credit-url') || '#');
    count.textContent = (pos + 1) + ' / ' + current.length;
    // Nachbarn vorladen
    [pos + 1, pos - 1].forEach(function (n) {
      var nb = current[(n + current.length) % current.length];
      if (nb) { var pre = new Image(); pre.src = nb.getAttribute('data-full'); }
    });
  }
  function open(button) {
    current = visibleButtons();
    opener = button;
    load(current.indexOf(button));
    dlg.showModal();
  }
  function close() { dlg.close(); }
  list.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-photo]');
    if (b && list.contains(b)) open(b);
  });
  dlg.querySelector('[data-lb-close]').addEventListener('click', close);
  dlg.querySelector('[data-lb-prev]').addEventListener('click', function () { load(pos - 1); });
  dlg.querySelector('[data-lb-next]').addEventListener('click', function () { load(pos + 1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('lightbox__fig')) close(); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); load(pos + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); load(pos - 1); }
  });
  dlg.addEventListener('close', function () { img.removeAttribute('src'); if (opener) opener.focus(); });

  // Wischen auf Touch-Geräten
  var x0 = null;
  img.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
  img.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) load(pos + (dx < 0 ? 1 : -1));
  });
  img.addEventListener('pointercancel', function () { x0 = null; });
})();
