/* ==========================================================================
   main.js – Navigation, Datenbindung, Öffnungsstatus, Einblend-Effekte
   Läuft auf jeder Seite. Seitenspezifische Werkzeuge liegen in eigenen Dateien.
   ========================================================================== */
(function () {
  'use strict';

  var GNZ = (window.GNZ = window.GNZ || {});
  var cfg = GNZ.config || { contact: {}, address: {}, hours: {}, company: {} };

  /* ---------- kleine Helfer (auch für die Werkzeuge) ---------- */
  var qs = function (sel, root) { return (root || document).querySelector(sel); };
  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var get = function (obj, path) {
    return path.split('.').reduce(function (o, k) { return o && o[k] != null ? o[k] : undefined; }, obj);
  };
  var eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  GNZ.util = {
    qs: qs,
    qsa: qsa,
    get: get,
    euro: function (n) { return eur.format(n); },
    params: function () { return new URLSearchParams(window.location.search); },
    debounce: function (fn, ms) {
      var t;
      return function () {
        var a = arguments, self = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, a); }, ms);
      };
    },
    reducedMotion: function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  };

  /* ---------- Öffnungszeiten ---------- */
  var DAYS = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];
  var DAY_LABEL = { mo: 'Mo', di: 'Di', mi: 'Mi', do: 'Do', fr: 'Fr', sa: 'Sa', so: 'So' };
  var toMin = function (hhmm) { var p = hhmm.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); };

  function formatHours() {
    var h = cfg.hours || {};
    var groups = [];
    DAYS.forEach(function (d) {
      if (!h[d]) return;
      var key = h[d][0] + '–' + h[d][1];
      var last = groups[groups.length - 1];
      if (last && last.key === key && DAYS.indexOf(last.to) === DAYS.indexOf(d) - 1) last.to = d;
      else groups.push({ key: key, from: d, to: d });
    });
    var text = groups.map(function (g) {
      var days = g.from === g.to ? DAY_LABEL[g.from] : DAY_LABEL[g.from] + '–' + DAY_LABEL[g.to];
      return days + ' ' + g.key + ' Uhr';
    }).join(', ');
    if (cfg.hoursNote) text += (text ? ' · ' : '') + cfg.hoursNote;
    return text;
  }

  function nowInZone() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: cfg.timezone || 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var pick = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
    var map = { Mon: 'mo', Tue: 'di', Wed: 'mi', Thu: 'do', Fri: 'fr', Sat: 'sa', Sun: 'so' };
    return { day: map[pick('weekday')], min: (parseInt(pick('hour'), 10) % 24) * 60 + parseInt(pick('minute'), 10) };
  }

  function openStatus() {
    var h = cfg.hours || {};
    var n = nowInZone();
    var today = h[n.day];
    if (today && n.min >= toMin(today[0]) && n.min < toMin(today[1])) {
      return { state: 'open', text: 'Jetzt erreichbar · bis ' + today[1] + ' Uhr' };
    }
    var idx = DAYS.indexOf(n.day);
    for (var step = 0; step < 7; step++) {
      var d = DAYS[(idx + step) % 7];
      var slot = h[d];
      if (!slot) continue;
      if (step === 0 && n.min >= toMin(slot[0])) continue; // heute schon vorbei
      var when = step === 0 ? 'heute' : step === 1 ? 'morgen' : DAY_LABEL[d];
      return { state: 'closed', text: 'Aktuell geschlossen · wieder ' + when + ' ab ' + slot[0] + ' Uhr' };
    }
    return { state: 'closed', text: 'Erreichbarkeit nach Vereinbarung' };
  }

  GNZ.openStatus = openStatus;
  GNZ.formatHours = formatHours;

  /* ---------- Datenbindung (data-bind / data-href / data-show-if) ---------- */
  function bind() {
    cfg.hoursText = formatHours();

    qsa('[data-bind]').forEach(function (el) {
      var v = get(cfg, el.getAttribute('data-bind'));
      if (v != null && v !== '') el.textContent = v;
    });

    qsa('[data-href]').forEach(function (a) {
      var kind = a.getAttribute('data-href');
      var c = cfg.contact || {};
      if (kind === 'tel' && c.phone) a.setAttribute('href', 'tel:' + c.phone);
      else if (kind === 'mail' && c.email) a.setAttribute('href', 'mailto:' + c.email);
      else if (kind === 'wa' && c.whatsapp) a.setAttribute('href', 'https://wa.me/' + c.whatsapp);
    });

    qsa('[data-show-if]').forEach(function (el) {
      if (get(cfg, el.getAttribute('data-show-if'))) el.hidden = false;
    });

    var st = openStatus();
    qsa('[data-open-status]').forEach(function (el) {
      el.setAttribute('data-state', st.state);
      var t = qs('[data-open-text]', el);
      if (t) t.textContent = st.text;
    });

    qsa('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Kopfzeile: Schatten, Mega-Menü, mobile Navigation ---------- */
  function initHeader() {
    var header = qs('[data-header]');
    var onScroll = function () {
      if (header) header.classList.toggle('is-stuck', window.scrollY > 6);
      var bar = qs('[data-mobilebar]');
      if (bar) bar.classList.toggle('is-visible', window.scrollY > 380);
      var fab = qs('[data-fab]');
      if (fab) fab.classList.toggle('is-visible', window.scrollY > 700);
      var prog = qs('[data-progress]');
      if (prog) {
        var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
        prog.style.setProperty('--p', (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var toggles = qsa('[data-mega-toggle]');
    function closeMega() {
      toggles.forEach(function (btn) {
        btn.setAttribute('aria-expanded', 'false');
        var m = document.getElementById(btn.getAttribute('aria-controls'));
        if (m) m.hidden = true;
      });
    }
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var m = document.getElementById(btn.getAttribute('aria-controls'));
        var wasOpen = btn.getAttribute('aria-expanded') === 'true';
        closeMega();
        if (!wasOpen && m) {
          btn.setAttribute('aria-expanded', 'true'); m.hidden = false;
          var br = btn.getBoundingClientRect(), mr = m.getBoundingClientRect();
          m.style.setProperty('--caret', (br.left - mr.left + br.width / 2) + 'px');
        }
        e.stopPropagation();
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.nav__item')) closeMega(); });

    var burger = qs('[data-burger]');
    function setNav(open) {
      document.documentElement.toggleAttribute('data-nav-open', open);
      if (burger) {
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      }
    }
    if (burger) burger.addEventListener('click', function () { setNav(!document.documentElement.hasAttribute('data-nav-open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeMega();
        if (document.documentElement.hasAttribute('data-nav-open')) { setNav(false); if (burger) burger.focus(); }
      }
    });
    qsa('.nav a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    window.addEventListener('resize', GNZ.util.debounce(function () { if (window.innerWidth >= 1020) setNav(false); }, 150));

    // aktuelle Seite markieren
    var file = (window.location.pathname.split('/').pop() || 'index.html') || 'index.html';
    qsa('.nav a[href], .mega a[href]').forEach(function (a) {
      var raw = a.getAttribute('href');
      if (raw.indexOf('#') > -1) return;           // Anker-Links nicht als "aktuelle Seite" markieren
      var href = raw.split('?')[0];
      if (href && href === file) {
        a.setAttribute('aria-current', 'page');
        if (a.closest('.mega')) { var b = qs('[data-service-nav]'); if (b) b.setAttribute('aria-current', 'true'); }
      }
    });
  }

  /* ---------- Entwurfs-Hinweis ---------- */
  function initDraft() {
    qsa('[data-draft-only]').forEach(function (el) { el.hidden = !cfg.draft; });
    var chip = qs('[data-draft-chip]');
    if (!chip) return;
    if (cfg.draft) chip.hidden = false;
    var x = qs('[data-draft-close]', chip);
    if (x) x.addEventListener('click', function () { chip.hidden = true; });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  function initReveal() {
    var els = qsa('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Begrüßung nach Tageszeit ---------- */
  function initGreeting() {
    var els = qsa('[data-greeting-text]');
    if (!els.length) return;
    var hour = Math.floor(nowInZone().min / 60);
    var hello = hour >= 5 && hour < 11 ? 'Guten Morgen' : hour >= 11 && hour < 17 ? 'Guten Tag' : hour >= 17 && hour < 22 ? 'Guten Abend' : 'Hallo';
    var text = hello + '! Schön, dass Sie hier sind – wir helfen Ihnen gern.';
    els.forEach(function (el) { el.textContent = text; });
  }

  /* ---------- Strukturierte Daten (nur wenn die Betriebsdaten echt sind) ---------- */
  function initSchema() {
    if (cfg.draft || !qs('body.page-home')) return;
    var c = cfg.contact || {}, a = cfg.address || {};
    var data = {
      '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness',
      name: (cfg.company && cfg.company.name) || 'GNZ Immobilien-Komplettservice',
      telephone: c.phone, email: c.email, url: window.location.origin + '/',
      address: { '@type': 'PostalAddress', streetAddress: a.street, postalCode: a.zip, addressLocality: a.city, addressCountry: 'DE' },
      openingHoursSpecification: Object.keys(cfg.hours || {}).filter(function (d) { return cfg.hours[d]; }).map(function (d) {
        var map = { mo: 'Monday', di: 'Tuesday', mi: 'Wednesday', do: 'Thursday', fr: 'Friday', sa: 'Saturday', so: 'Sunday' };
        return { '@type': 'OpeningHoursSpecification', dayOfWeek: map[d], opens: cfg.hours[d][0], closes: cfg.hours[d][1] };
      })
    };
    var tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.textContent = JSON.stringify(data);
    document.head.appendChild(tag);
  }

  bind();
  initGreeting();
  initSchema();
  initHeader();
  initDraft();
  initReveal();
})();
