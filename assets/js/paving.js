/* ==========================================================================
   paving.js – prozedurales Pflaster (Canvas)
   Zeichnet Pflasterflächen in "sauber" und "verschmutzt". Kein Bild-Download nötig,
   deterministisch (gleicher Seed = gleiches Bild). Genutzt von Reinigungs-Simulator,
   Vorher/Nachher-Regler und Fugen-Konfigurator.
   ========================================================================== */
(function () {
  'use strict';
  var GNZ = (window.GNZ = window.GNZ || {});

  /* ---------- Hilfsfunktionen ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function gauss(r) { return (r() + r() + r() - 1.5) / 1.5; }
  function rgb(c, k) {
    k = k || 0;
    return 'rgb(' + clamp(Math.round(c[0] + k), 0, 255) + ',' + clamp(Math.round(c[1] + k), 0, 255) + ',' + clamp(Math.round(c[2] + k), 0, 255) + ')';
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function roundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- Paletten ---------- */
  var STONES = {
    anthrazit: { label: 'Anthrazit', swatch: '#454c52', base: [[68, 74, 80], [60, 66, 72], [76, 80, 85]], jit: 9 },
    grau:      { label: 'Grau',      swatch: '#8d9296', base: [[144, 148, 150], [152, 154, 152], [134, 139, 143]], jit: 12 },
    sand:      { label: 'Sand',      swatch: '#c9b793', base: [[206, 188, 154], [198, 178, 144], [212, 196, 166]], jit: 11 },
    klinker:   { label: 'Klinkerrot', swatch: '#9b5442', base: [[162, 88, 70], [152, 80, 64], [172, 98, 78]], jit: 12 },
    bunt:      { label: 'Gemischt',  swatch: 'linear-gradient(135deg,#6a6f73 0 33%,#b49a7a 33% 66%,#8a5a4c 66%)', base: [[98, 102, 106], [152, 154, 152], [180, 152, 122], [134, 94, 84], [122, 128, 132]], jit: 8 }
  };
  var JOINT_COLORS = {
    sand:      { label: 'Sand',      swatch: '#ccbd9f', c: [204, 189, 160] },
    hellgrau:  { label: 'Hellgrau',  swatch: '#b2b2ac', c: [178, 178, 172] },
    steingrau: { label: 'Steingrau', swatch: '#808384', c: [128, 131, 132] },
    basalt:    { label: 'Basalt',    swatch: '#3a3f43', c: [58, 63, 67] }
  };
  var JOINT_MATERIALS = {
    sand:    { grain: 0.95, sheen: 0 },
    polymer: { grain: 0.62, sheen: 0.04 },
    drain:   { grain: 0.46, sheen: 0 },
    epoxid:  { grain: 0.16, sheen: 0.2 }
  };
  var ALGAE = [[72, 104, 46], [54, 86, 40], [38, 62, 32], [96, 118, 62]];
  var WEED = [[84, 140, 52], [104, 160, 66], [62, 112, 44], [120, 168, 70]];

  /* ---------- Fugen ---------- */
  function jointTile(o) {
    var size = 160, c = makeCanvas(size, size), x = c.getContext('2d');
    var col = JOINT_COLORS[o.jointColor] || JOINT_COLORS.sand;
    var mat = JOINT_MATERIALS[o.joint] || JOINT_MATERIALS.sand;
    x.fillStyle = rgb(col.c, 0);
    x.fillRect(0, 0, size, size);
    var rnd = mulberry32(o.seed + 11);
    var n = Math.round(size * size * 0.32 * mat.grain);
    for (var i = 0; i < n; i++) {
      var d = (rnd() - 0.5) * (46 * mat.grain + 10);
      x.fillStyle = rgba(d > 0 ? [255, 255, 255] : [0, 0, 0], Math.min(0.55, Math.abs(d) / 60));
      x.fillRect((rnd() * size) | 0, (rnd() * size) | 0, rnd() < 0.25 ? 2 : 1, 1);
    }
    return c;
  }

  function drawJoints(ctx, W, H, o, state) {
    ctx.fillStyle = ctx.createPattern(jointTile(o), 'repeat');
    ctx.fillRect(0, 0, W, H);
    var mat = JOINT_MATERIALS[o.joint] || JOINT_MATERIALS.sand;
    if (mat.sheen) {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, rgba([255, 255, 255], mat.sheen));
      g.addColorStop(0.5, rgba([255, 255, 255], 0));
      g.addColorStop(1, rgba([0, 0, 0], mat.sheen));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (state === 'dirty') {
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(138,140,120)'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /* ---------- Geometrie der Verbände ---------- */
  function buildGeometry(o, W, H) {
    var unit = o.unit, jw = o.jointWidth;
    var pal = STONES[o.stone] || STONES.grau;
    var rnd = mulberry32(o.seed);
    var list = [], rot = 0;
    var B = unit, L = unit * 2, s = unit + jw;

    if (o.pattern === 'reihe' || o.pattern === 'laeufer') {
      var cw = L + jw, rh = B + jw;
      var rows = Math.ceil(H / rh) + 2, cols = Math.ceil(W / cw) + 3;
      for (var r = -1; r < rows; r++) {
        var off = (o.pattern === 'laeufer' && (r & 1)) ? -cw / 2 : 0;
        for (var c = -1; c < cols; c++) list.push({ x: c * cw + off, y: r * rh, w: L, h: B });
      }
    } else {
      // Fischgrät 90°, im Raster um 45° gedreht (klassische V-Optik)
      rot = Math.PI / 4;
      var D = Math.hypot(W, H) / 2, n = Math.ceil(D / s) + 3;
      var cos = Math.cos(rot), sin = Math.sin(rot), m = L * 1.5;
      var visible = function (x, y, w, h) {
        var cx = x + w / 2, cy = y + h / 2;
        var X = W / 2 + cx * cos - cy * sin, Y = H / 2 + cx * sin + cy * cos;
        return X > -m && X < W + m && Y > -m && Y < H + m;
      };
      for (var u = -n; u <= n; u++) {
        for (var v = -n; v <= n; v++) {
          if ((((v - u) % 4) + 4) % 4) continue;
          var a = { x: u * s, y: v * s, w: 2 * s - jw, h: s - jw };
          var b = { x: (u + 2) * s, y: (v - 1) * s, w: s - jw, h: 2 * s - jw };
          if (visible(a.x, a.y, a.w, a.h)) list.push(a);
          if (visible(b.x, b.y, b.w, b.h)) list.push(b);
        }
      }
    }
    list.forEach(function (st) {
      st.base = pal.base[(rnd() * pal.base.length) | 0];
      st.tint = (rnd() * 2 - 1) * pal.jit;
      st.seed = (rnd() * 1e9) | 0;
    });
    return { stones: list, rot: rot };
  }

  function drawStones(ctx, W, H, geo, o) {
    ctx.save();
    if (geo.rot) { ctx.translate(W / 2, H / 2); ctx.rotate(geo.rot); }
    var rad = Math.max(2, o.unit * 0.12);
    geo.stones.forEach(function (st) {
      var x = st.x, y = st.y, w = st.w, h = st.h;
      ctx.beginPath();
      roundedRect(ctx, x, y, w, h, rad);
      ctx.fillStyle = rgb(st.base, st.tint);
      ctx.fill();
      var g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, 'rgba(255,255,255,.13)');
      g.addColorStop(0.55, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(0,0,0,.16)');
      ctx.fillStyle = g;
      ctx.fill();
      var r = mulberry32(st.seed), cnt = Math.round((w * h) / 60);
      for (var i = 0; i < cnt; i++) {
        var px = x + rad + r() * (w - 2 * rad), py = y + rad + r() * (h - 2 * rad);
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,' + (0.05 + r() * 0.12).toFixed(3) + ')' : 'rgba(0,0,0,' + (0.05 + r() * 0.14).toFixed(3) + ')';
        ctx.fillRect(px, py, r() < 0.3 ? 2 : 1, 1);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.17)';
      ctx.beginPath();
      ctx.moveTo(x + rad, y + 0.5); ctx.lineTo(x + w - rad, y + 0.5);
      ctx.moveTo(x + 0.5, y + rad); ctx.lineTo(x + 0.5, y + h - rad);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.24)';
      ctx.beginPath();
      ctx.moveTo(x + rad, y + h - 0.5); ctx.lineTo(x + w - rad, y + h - 0.5);
      ctx.moveTo(x + w - 0.5, y + rad); ctx.lineTo(x + w - 0.5, y + h - rad);
      ctx.stroke();
    });
    ctx.restore();
  }

  /* ---------- Schmutz: Patina, Algen, Öl, Moos und Unkraut in den Fugen ---------- */
  function edgePoint(st, side, t, jw) {
    var o = jw / 2;
    if (side === 0) return { x: st.x + t * st.w, y: st.y - o };
    if (side === 1) return { x: st.x + st.w + o, y: st.y + t * st.h };
    if (side === 2) return { x: st.x + t * st.w, y: st.y + st.h + o };
    return { x: st.x - o, y: st.y + t * st.h };
  }

  function drawDirt(ctx, W, H, geo, o) {
    var k = W / 1280;
    var rnd = mulberry32(o.seed ^ 0x51ed270b);
    var i, x, y, r, col, g, a;

    // 1) gleichmäßige Patina
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(214,216,198)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 2) Algen- und Grünbelag-Cluster
    var clusters = [];
    for (i = 0; i < 10; i++) clusters.push({ x: rnd() * W, y: rnd() * H, s: (110 + rnd() * 240) * k });
    for (i = 0; i < 380; i++) {
      var c = clusters[(rnd() * clusters.length) | 0];
      var ang = rnd() * 6.2832, dist = Math.abs(gauss(rnd)) * c.s;
      x = c.x + Math.cos(ang) * dist; y = c.y + Math.sin(ang) * dist;
      r = (16 + rnd() * 62) * k;
      col = ALGAE[(rnd() * ALGAE.length) | 0];
      a = 0.12 + rnd() * 0.3;
      g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 3) dunkle Schmutzschleier
    for (i = 0; i < 90; i++) {
      x = rnd() * W; y = rnd() * H; r = (24 + rnd() * 80) * k;
      g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(28,30,24,' + (0.08 + rnd() * 0.16).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(28,30,24,0)');
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rnd() * 3.14); ctx.scale(1, 0.35 + rnd() * 0.5); ctx.translate(-x, -y);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }

    // 4) Ölflecken
    for (var s = 0; s < 2; s++) {
      var ox = W * (0.2 + rnd() * 0.6), oy = H * (0.2 + rnd() * 0.6);
      for (i = 0; i < 16; i++) {
        x = ox + gauss(rnd) * 34 * k; y = oy + gauss(rnd) * 22 * k; r = (14 + rnd() * 30) * k;
        g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(26,20,14,.30)');
        g.addColorStop(0.7, 'rgba(40,32,24,.16)');
        g.addColorStop(1, 'rgba(40,32,24,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }

    // 5) Moos und Unkraut direkt in den Fugen
    ctx.save();
    if (geo.rot) { ctx.translate(W / 2, H / 2); ctx.rotate(geo.rot); }
    var jw = o.jointWidth, n = geo.stones.length;
    for (i = 0; i < 260; i++) {
      var st = geo.stones[(rnd() * n) | 0];
      var p = edgePoint(st, (rnd() * 4) | 0, rnd(), jw);
      col = ALGAE[(rnd() * ALGAE.length) | 0];
      for (var m = 0; m < 5; m++) {
        ctx.fillStyle = rgba(col, 0.35 + rnd() * 0.4);
        ctx.beginPath();
        ctx.arc(p.x + gauss(rnd) * 3 * k, p.y + gauss(rnd) * 3 * k, (1.2 + rnd() * 2.6) * k, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.lineCap = 'round';
    for (i = 0; i < 46; i++) {
      var st2 = geo.stones[(rnd() * n) | 0];
      var pe = edgePoint(st2, (rnd() * 4) | 0, rnd(), jw);
      var blades = 5 + ((rnd() * 5) | 0);
      for (var b = 0; b < blades; b++) {
        var ba = rnd() * 6.2832, len = (9 + rnd() * 20) * k;
        var cx = pe.x + Math.cos(ba) * len * 0.5 + gauss(rnd) * 4 * k;
        var cy = pe.y + Math.sin(ba) * len * 0.5 + gauss(rnd) * 4 * k;
        ctx.strokeStyle = rgba(WEED[(rnd() * WEED.length) | 0], 0.9);
        ctx.lineWidth = (1 + rnd() * 1.3) * k + 0.3;
        ctx.beginPath();
        ctx.moveTo(pe.x, pe.y);
        ctx.quadraticCurveTo(cx, cy, pe.x + Math.cos(ba) * len, pe.y + Math.sin(ba) * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- Zusammenbau ---------- */
  function paint(ctx, W, H, geo, o, state) {
    ctx.clearRect(0, 0, W, H);
    drawJoints(ctx, W, H, o, state);
    drawStones(ctx, W, H, geo, o);
    if (state === 'dirty') {
      drawDirt(ctx, W, H, geo, o);
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255,255,255,.09)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function defaults(opts, W) {
    opts = opts || {};
    var unit = opts.unit || Math.max(10, Math.round(W / 40));
    return {
      pattern: opts.pattern || 'fischgraet',
      stone: opts.stone || 'grau',
      joint: opts.joint || 'sand',
      jointColor: opts.jointColor || 'sand',
      unit: unit,
      jointWidth: opts.jointWidth || Math.max(2, Math.round(unit * 0.16)),
      seed: opts.seed || 7
    };
  }

  GNZ.Paving = {
    STONES: STONES,
    JOINT_COLORS: JOINT_COLORS,
    JOINT_MATERIALS: JOINT_MATERIALS,
    makeCanvas: makeCanvas,
    /** Zeichnet direkt auf ein vorhandenes Canvas. state: 'clean' | 'dirty' */
    render: function (canvas, opts, state) {
      var o = defaults(opts, canvas.width);
      var geo = buildGeometry(o, canvas.width, canvas.height);
      paint(canvas.getContext('2d'), canvas.width, canvas.height, geo, o, state || 'clean');
      return o;
    },
    /** Liefert zwei deckungsgleiche Canvas: { clean, dirty } */
    renderPair: function (W, H, opts) {
      var o = defaults(opts, W);
      var geo = buildGeometry(o, W, H);
      var clean = makeCanvas(W, H), dirty = makeCanvas(W, H);
      paint(clean.getContext('2d'), W, H, geo, o, 'clean');
      paint(dirty.getContext('2d'), W, H, geo, o, 'dirty');
      return { clean: clean, dirty: dirty };
    }
  };
})();
