/* ==========================================================================
   simulator.js – "Wischen Sie den Schmutz weg"
   Verschmutztes Pflaster wird mit Maus/Finger freigespritzt. Alles prozedural (paving.js).
   ========================================================================== */
(function () {
  'use strict';
  var GNZ = (window.GNZ = window.GNZ || {});

  function init(root) {
    var canvas = root.querySelector('.sim__canvas');
    var W = canvas.width, H = canvas.height;
    var ctx = canvas.getContext('2d');
    var progressEl = root.querySelector('[data-sim-progress]');
    var doneEl = root.querySelector('[data-sim-done]');
    var autoBtn = root.querySelector('[data-sim-auto]');
    var resetBtn = root.querySelector('[data-sim-reset]');

    var pair = GNZ.Paving.renderPair(W, H, { pattern: 'fischgraet', stone: 'grau', joint: 'sand', jointColor: 'sand', seed: 11 });
    var mask = GNZ.Paving.makeCanvas(W, H), mctx = mask.getContext('2d');
    var layer = GNZ.Paving.makeCanvas(W, H), lctx = layer.getContext('2d');
    var probe = GNZ.Paving.makeCanvas(64, 40), pctx = probe.getContext('2d', { willReadFrequently: true });
    var brush = Math.round(W * 0.05);

    var last = null, pressing = false, finished = false, percent = 0, lastMeasure = 0;
    var wet = [], drops = [], raf = 0, autoRun = null, trailing = 0;

    /* ---------- Darstellung ---------- */
    function compose(now) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(pair.dirty, 0, 0);
      lctx.globalCompositeOperation = 'copy';
      lctx.drawImage(pair.clean, 0, 0);
      lctx.globalCompositeOperation = 'destination-in';
      lctx.drawImage(mask, 0, 0);
      ctx.drawImage(layer, 0, 0);

      var i, a, g;
      for (i = wet.length - 1; i >= 0; i--) {                 // nasser Glanz, trocknet nach 1,5 s
        var age = now - wet[i].t;
        if (age > 1500) { wet.splice(i, 1); continue; }
        a = 0.3 * (1 - age / 1500);
        g = ctx.createRadialGradient(wet[i].x, wet[i].y, 0, wet[i].x, wet[i].y, brush * 0.95);
        g.addColorStop(0, 'rgba(18,40,58,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(18,40,58,0)');
        ctx.fillStyle = g;
        ctx.fillRect(wet[i].x - brush, wet[i].y - brush, brush * 2, brush * 2);
      }
      for (i = drops.length - 1; i >= 0; i--) {               // Spritzer
        var d = drops[i], life = (now - d.t) / 650;
        if (life >= 1) { drops.splice(i, 1); continue; }
        var px = d.x + d.vx * life, py = d.y + d.vy * life + 40 * life * life;
        ctx.fillStyle = 'rgba(226,243,255,' + (0.8 * (1 - life)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, d.r * (1 - life * 0.4), 0, 6.2832); ctx.fill();
      }
    }

    function frame(now) {
      raf = 0;
      stepAuto(now);
      compose(now);
      if (wet.length || drops.length || autoRun) schedule();
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

    /* ---------- Fortschritt ---------- */
    function measure() {
      pctx.clearRect(0, 0, 64, 40);
      pctx.drawImage(mask, 0, 0, 64, 40);
      var data = pctx.getImageData(0, 0, 64, 40).data, n = 0;
      for (var i = 3; i < data.length; i += 4) if (data[i] > 110) n++;
      return n / (64 * 40);
    }
    function setPercent(p) {
      percent = p;
      if (progressEl) progressEl.textContent = 'Sauber: ' + p + ' %';
    }
    function updateProgress(force) {
      var t = performance.now();
      if (!force && t - lastMeasure < 140) return;
      lastMeasure = t;
      var p = Math.min(100, Math.round((measure() / 0.9) * 100));
      setPercent(p);
      if (p >= 100) finish();
    }
    function finish() {
      if (finished) return;
      finished = true;
      mctx.shadowBlur = 0;
      mctx.fillStyle = '#fff';
      mctx.fillRect(0, 0, W, H);
      setPercent(100);
      compose(performance.now());
      if (doneEl) doneEl.hidden = false;
      if (autoBtn) autoBtn.disabled = true;
      root.classList.add('is-touched');
      autoRun = null;
    }

    /* ---------- Reinigen ---------- */
    function wash(x, y, silent) {
      if (finished) return;
      mctx.lineCap = 'round'; mctx.lineJoin = 'round';
      mctx.strokeStyle = '#fff';
      mctx.shadowColor = '#fff';
      mctx.shadowBlur = brush * 0.45;
      mctx.lineWidth = brush * 1.5;
      mctx.beginPath();
      if (last) mctx.moveTo(last.x, last.y); else mctx.moveTo(x, y);
      mctx.lineTo(x + (last ? 0 : 0.01), y);
      mctx.stroke();
      last = { x: x, y: y };

      var now = performance.now();
      wet.push({ x: x, y: y, t: now });
      for (var i = 0; i < 3; i++) {
        var ang = Math.random() * 6.2832, sp = 40 + Math.random() * 130;
        drops.push({ x: x + (Math.random() - 0.5) * brush, y: y + (Math.random() - 0.5) * brush, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 1.4 + Math.random() * 2.2, t: now });
      }
      if (wet.length > 160) wet.splice(0, wet.length - 160);
      if (drops.length > 120) drops.splice(0, drops.length - 120);
      if (!silent) root.classList.add('is-touched');
      schedule();
      updateProgress(false);
      clearTimeout(trailing);                         // nach dem letzten Strich noch einmal exakt messen
      trailing = setTimeout(function () { updateProgress(true); }, 200);
    }

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
    }
    canvas.addEventListener('pointerdown', function (e) {
      pressing = true; last = null;
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignorieren */ } }
      var p = pos(e); wash(p.x, p.y);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (autoRun) return;
      if (e.pointerType !== 'mouse' && !pressing) return;
      var p = pos(e); wash(p.x, p.y);
    });
    function endPress() { pressing = false; last = null; updateProgress(true); }
    canvas.addEventListener('pointerup', endPress);
    canvas.addEventListener('pointercancel', endPress);
    canvas.addEventListener('pointerleave', function () { last = null; });

    /* ---------- Automatik & Zurücksetzen ---------- */
    function startAuto() {
      if (finished || autoRun) return;
      if (GNZ.util && GNZ.util.reducedMotion()) { finish(); return; }
      var pts = [], rows = Math.ceil(H / (brush * 1.1));
      for (var r = 0; r < rows; r++) {
        var y = Math.min(H - brush * 0.3, brush * 0.6 + r * brush * 1.1);
        var xa = brush * 0.2, xb = W - brush * 0.2;
        if (r % 2) pts.push([xb, y], [xa, y]); else pts.push([xa, y], [xb, y]);
      }
      var t = performance.now();
      autoRun = { pts: pts, seg: 0, prevT: t, pos: { x: pts[0][0], y: pts[0][1] } };
      last = null;
      if (autoBtn) autoBtn.disabled = true;
      root.classList.add('is-touched');
      schedule();
    }
    function stepAuto(now) {
      if (!autoRun) return;
      var dist = ((now - autoRun.prevT) / 1000) * 2600, guard = 0;
      autoRun.prevT = now;
      while (dist > 0 && autoRun.seg < autoRun.pts.length - 1 && guard++ < 60) {
        var a = autoRun.pos, b = autoRun.pts[autoRun.seg + 1];
        var dx = b[0] - a.x, dy = b[1] - a.y, len = Math.hypot(dx, dy);
        if (len <= dist) {
          dist -= len; autoRun.pos = { x: b[0], y: b[1] }; autoRun.seg++; wash(b[0], b[1], true);
        } else {
          var f = dist / len; autoRun.pos = { x: a.x + dx * f, y: a.y + dy * f }; wash(autoRun.pos.x, autoRun.pos.y, true); dist = 0;
        }
      }
      if (autoRun && autoRun.seg >= autoRun.pts.length - 1) { autoRun = null; finish(); }
    }
    function reset() {
      autoRun = null; finished = false; last = null; wet = []; drops = [];
      mctx.shadowBlur = 0;
      mctx.clearRect(0, 0, W, H);
      setPercent(0);
      if (doneEl) doneEl.hidden = true;
      if (autoBtn) autoBtn.disabled = false;
      root.classList.remove('is-touched');
      compose(performance.now());
    }
    if (autoBtn) autoBtn.addEventListener('click', startAuto);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    compose(performance.now());
    root.classList.add('is-ready');
    // Test-/Debug-Zugriff
    root.__sim = { wash: wash, finish: finish, reset: reset, percent: function () { return percent; }, measure: measure };
  }

  function boot() {
    var roots = document.querySelectorAll('[data-simulator]');
    Array.prototype.forEach.call(roots, function (root) {
      if (!('IntersectionObserver' in window)) { init(root); return; }
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); init(root); }
      }, { rootMargin: '400px' });
      io.observe(root);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
