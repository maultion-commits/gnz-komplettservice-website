/* ==========================================================================
   tabs.js – zugängliche Tabs (ARIA, Pfeiltasten) für [data-tabs]
   ========================================================================== */
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('[data-tabs]'), function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });

    var urlMode = root.hasAttribute('data-tabs-url');
    var keyOf = function (tab) { return tab.getAttribute('data-tab-key') || ''; };
    function fromUrl() {
      var k = (window.location.hash || '').slice(1) || new URLSearchParams(window.location.search).get('k') || '';
      for (var n = 0; n < tabs.length; n++) if (k && keyOf(tabs[n]) === k) return n;
      return -1;
    }

    function select(i, focus, user) {
      tabs.forEach(function (t, n) {
        var on = n === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (panels[n]) {
          panels[n].hidden = !on;
          // Inhalte, die beim Laden verborgen waren, sofort einblenden
          if (on) Array.prototype.forEach.call(panels[n].querySelectorAll('.reveal'), function (e) { e.classList.add('is-in'); });
        }
      });
      if (focus) tabs[i].focus();
      if (urlMode && user && keyOf(tabs[i])) { try { window.history.replaceState(null, '', '#' + keyOf(tabs[i])); } catch (e) { /* ignorieren */ } }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false, true); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true, true); }
      });
    });
    // Startreiter: laufende Jahreszeit, falls vorhanden
    var start = 0;
    var def = root.getAttribute('data-tabs-default');
    if (def === 'season') {
      var m = new Date().getMonth(); // 0 = Jan
      start = m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3;
    }
    var fromAddress = urlMode ? fromUrl() : -1;
    if (fromAddress > -1) start = fromAddress;
    select(Math.min(start, tabs.length - 1), false);
    if (fromAddress > -1) window.requestAnimationFrame(function () { root.scrollIntoView({ block: 'start' }); });
    if (urlMode) window.addEventListener('hashchange', function () { var n = fromUrl(); if (n > -1) select(n, false); });
  });
})();
