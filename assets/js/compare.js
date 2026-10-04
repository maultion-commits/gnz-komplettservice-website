/* ==========================================================================
   compare.js – Vorher/Nachher-Regler
   Funktioniert mit beliebigen Inhalten in den beiden Ebenen (img oder canvas).
   Stehen im Markup keine Bilder, wird eine Beispiel-Illustration aus paving.js gezeichnet.
   Eigene Fotos: <img> in [data-compare-before] und [data-compare-after] einsetzen.
   ========================================================================== */
(function () {
  'use strict';
  var GNZ = (window.GNZ = window.GNZ || {});

  function init(root) {
    var range = root.querySelector('.compare__range');
    var before = root.querySelector('[data-compare-before]');
    var after = root.querySelector('[data-compare-after]');
    if (before && after && !before.children.length && !after.children.length && GNZ.Paving) {
      var pair = GNZ.Paving.renderPair(1200, 900, { pattern: 'laeufer', stone: 'grau', joint: 'sand', jointColor: 'sand', seed: 23, unit: 36 });
      before.appendChild(pair.dirty);
      after.appendChild(pair.clean);
    }
    function set(v) { root.style.setProperty('--pos', v + '%'); }
    if (range) {
      range.addEventListener('input', function () { set(range.value); });
      set(range.value);
    }
    root.classList.add('is-ready');
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-compare]'), function (root) {
      if (!('IntersectionObserver' in window)) { init(root); return; }
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); init(root); }
      }, { rootMargin: '400px' });
      io.observe(root);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
