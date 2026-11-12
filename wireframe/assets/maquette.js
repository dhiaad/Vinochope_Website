/* Vinochope · maquette : le dessin reste à l'écran et voyage de section en section.
   Dans une section il se pose (le texte défile à côté) ; entre deux sections il traverse
   l'écran en arc, penche dans le virage et rapetisse un peu, comme une caméra qui suit l'objet.
   0 main + grappe → 1 bouteille remplie → 2 vrille → 3 le verre arrive → 4 on sert → 5 verre plein. */
(function () {
  var svg = document.getElementById("scene");
  var zones = [].slice.call(document.querySelectorAll("[data-zone]"));
  var $ = function (id) { return document.getElementById(id); };
  var vine = $("vine"), hand = $("hand"), stem = $("stem"), grapesG = $("grapes");
  var leaves = [].slice.call(document.querySelectorAll("#leaves .leaf"));
  var ribbon = $("ribbon"), bottle = $("bottle"), bLiq = $("bottle-liquid");
  var glass = $("glass"), gLiq = $("glass-liquid"), gSurf = $("glass-surface"), glint = $("glint"), stream = $("stream"), glow = $("glow-c");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var seg = function (v, a, b) { return ease((v - a) / (b - a)); };
  var qb = function (a, c, b, t) { var m = 1 - t; return m * m * a + 2 * m * t * c + t * t * b; };

  // Couleur de fond par section (palette validée)
  var BG = [[26,17,20], [61,21,24], [26,17,20], [38,26,30], [26,17,20], [61,21,24]];

  // Phrases mot à mot
  var wordEls = [].slice.call(document.querySelectorAll(".words"));
  wordEls.forEach(function (el) {
    (function split(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { var s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.appendChild(s); }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) split(n);
      });
    })(el);
    el._w = [].slice.call(el.querySelectorAll(".w"));
  });

  // Grappe
  var grapes = [];
  [4, 5, 4, 3, 2, 1].forEach(function (n, r) {
    for (var i = 0; i < n; i++) {
      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("class", "grape");
      grapesG.appendChild(c);
      grapes.push({ el: c, gx: 200 + (i - (n - 1) / 2) * 21, gy: 112 + r * 19, k: grapes.length });
    }
  });

  var cu = null, tPrev = 0;

  function frame(now) {
    var W = innerWidth, H = innerHeight, narrow = W < 900;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    // u : quelle section est au milieu de l'écran (0 → 5, continu)
    var C = zones.map(function (z) { var r = z.getBoundingClientRect(); return r.top + r.height / 2; });
    var mid = H / 2, u = 0;
    if (mid <= C[0]) u = 0; else if (mid >= C[5]) u = 5;
    else for (var i = 0; i < 5; i++) if (mid < C[i + 1]) { u = i + (mid - C[i]) / (C[i + 1] - C[i]); break; }
    var dt = Math.min(1000, now - (tPrev || now)); tPrev = now;
    cu = (cu === null || reduce) ? u : cu + (u - cu) * (1 - Math.exp(-dt / 140));
    var p = cu;

    // Où se pose le dessin dans chaque section (écran) : alterne droite / gauche
    var XS = narrow ? [0.8, 0.24, 0.78, 0.3, 0.7, 0.3] : [0.73, 0.27, 0.73, 0.25, 0.71, 0.27];
    var Y = narrow ? H * 0.6 : 68 + (H - 68) * 0.54;
    var k = narrow ? clamp(Math.min(W * 0.9 / 220, H * 0.62 / 370), 0.7, 1.4) : clamp(Math.min(W * 0.4 / 220, (H - 68) * 0.78 / 370), 0.8, 1.9);
    var S = XS.map(function (x) { return { x: x * W, y: Y }; });

    // Segment i (section i → i+1) : pause au début et à la fin, traversée au milieu
    var si = Math.min(4, Math.floor(p)), g = ease(clamp((p - si - 0.18) / 0.64, 0, 1));
    function G(i) { return p < i ? 0 : p >= i + 1 ? 1 : ease(clamp((p - i - 0.18) / 0.64, 0, 1)); }
    function travel(T, from, to) {
      var q = clamp(p, from, to), i = Math.min(Math.floor(q), to - 1), f = G(i);
      var fx = f + 0.3 * Math.sin(Math.PI * f) * f, arc = Math.sin(Math.PI * f);
      var dir = T[i + 1].x > T[i].x ? 1 : -1;
      return { x: lerp(T[i].x, T[i + 1].x, fx), y: lerp(T[i].y, T[i + 1].y, f) - arc * H * 0.07,
               bank: dir * 24 * arc, s: 1 - 0.2 * arc, i: i, f: f };
    }

    // Fond qui change de couleur
    var a = BG[si], b = BG[si + 1];
    document.body.style.backgroundColor = "rgb(" + a.map(function (v, j) { return Math.round(lerp(v, b[j], g)); }).join(",") + ")";

    // ---- 0 → 1 : la main lâche la grappe, les grains traversent l'écran jusqu'à la bouteille
    var g0 = G(0);
    var sway = Math.sin(now / 900) * 2.5 * (1 - g0);
    vine.setAttribute("transform", "translate(" + S[0].x + " " + S[0].y + ") scale(" + k + ") rotate(" + sway + " 200 -40) translate(-200 -150)");
    hand.setAttribute("transform", "translate(0 " + (-900 * seg(g0, 0.05, 0.5)) + ")");
    stem.setAttribute("opacity", 1 - seg(g0, 0.5, 0.8));

    var rise = seg(g0, 0, 0.55);
    var mouth0 = { x: S[1].x, y: S[1].y - 130 * k + (H * 0.8) * (1 - rise) };
    grapes.forEach(function (gr) {
      var hx = S[0].x + (gr.gx - 200) * k, hy = S[0].y + (gr.gy - 150) * k;
      var t = ease((g0 - 0.12 - gr.k * 0.016) / 0.55);
      var cx = (hx + mouth0.x) / 2 + ((gr.k % 3) - 1) * 50 * k, cy = Math.min(hy, mouth0.y) - 140 * k;
      var x = qb(hx, cx, mouth0.x, t) + Math.sin(t * Math.PI * 3 + gr.k) * 16 * k * Math.sin(t * Math.PI);
      var y = qb(hy, cy, mouth0.y, t);
      gr.el.setAttribute("cx", x); gr.el.setAttribute("cy", y);
      gr.el.setAttribute("r", 11 * k * (1 - 0.6 * t));
      gr.el.setAttribute("opacity", 1 - seg(t, 0.88, 1));
    });

    var hc = { x: S[0].x, y: S[0].y + 10 * k };
    ribbon.setAttribute("d", "M" + hc.x + " " + hc.y + " Q" + ((hc.x + mouth0.x) / 2) + " " + (Math.min(hc.y, mouth0.y) - 180 * k) + " " + mouth0.x + " " + mouth0.y);
    var L = ribbon.getTotalLength();
    var head = seg(g0, 0.2, 0.65), tail = seg(g0, 0.55, 0.95);
    ribbon.setAttribute("stroke-dasharray", Math.max(0, (head - tail) * L) + " " + (L * 2));
    ribbon.setAttribute("stroke-dashoffset", -tail * L);
    ribbon.setAttribute("opacity", head > tail + 0.01 ? 1 : 0);

    leaves.forEach(function (lf, j) {
      var d = j ? 1 : -1, t = seg(g0, 0.05 + j * 0.08, 1);
      var x = S[0].x + d * 34 * k + t * (-W * 0.25 + d * 60), y = S[0].y - 70 * k + t * H * 0.7 + Math.sin(t * 8 + j) * 20 * k;
      lf.setAttribute("transform", "translate(" + x + " " + y + ") rotate(" + (d * 20 + t * 300 * d) + ") scale(" + (k * (j ? -1 : 1)) + " " + k + ")");
      lf.setAttribute("opacity", 1 - seg(t, 0.7, 1));
    });

    // ---- La bouteille
    var off = { x: -62 * k, y: -62 * k };
    var T = [S[0], S[1], S[2], { x: S[3].x + off.x, y: S[3].y + off.y }];
    var bx, by, rot = 0, bs = 1;
    if (p < 1) { bx = S[1].x; by = S[1].y + H * 0.8 * (1 - rise); bottle.setAttribute("opacity", rise); }
    else if (p < 3) {
      var tb = travel(T, 1, 3);
      bx = tb.x; by = tb.y; bs = tb.s;
      rot = tb.i === 1 ? 360 * tb.f + tb.bank : tb.bank * 1.3;   // vrille, puis virage
      bottle.setAttribute("opacity", 1);
    }

    // ---- Le verre arrive (section 3) puis le duo descend jusqu'à la fin
    var Pt = p < 3 ? { x: S[3].x, y: S[3].y, bank: 0, s: 1 } : travel(S, 3, 5);
    var gIn = G(2) * (p >= 2 ? 1 : 0);
    gIn = seg(gIn, 0.35, 1);
    var gx = Pt.x + 60 * k * Pt.s, gy = Pt.y + 30 * k * Pt.s;
    glass.setAttribute("opacity", gIn);
    glass.setAttribute("transform", "translate(" + gx + " " + (gy + H * 0.6 * (1 - gIn)) + ") rotate(" + (p < 3 ? -20 * (1 - gIn) : Pt.bank) + ") scale(" + (k * Pt.s) + ")");

    var tilt = seg(G(3), 0.55, 0.95) * (1 - seg(G(4), 0.88, 1));
    if (p >= 3) { bx = Pt.x + off.x * Pt.s; by = Pt.y + off.y * Pt.s; bs = Pt.s; rot = 112 * tilt + Pt.bank; bottle.setAttribute("opacity", 1); }
    bottle.setAttribute("transform", "translate(" + bx + " " + by + ") rotate(" + rot + ") scale(" + (k * bs) + ")");

    var bFill = 0.85 * seg(g0, 0.5, 1) * (1 - seg(G(4), 0, 0.85) * (p >= 4 ? 1 : 0) - 0.15 * seg(G(3), 0.9, 1));
    bFill = Math.max(0, bFill);
    bLiq.setAttribute("y", 130 - 260 * bFill); bLiq.setAttribute("height", 260 * bFill);

    var gFill = p < 3 ? 0 : 0.12 * seg(G(3), 0.92, 1) + 0.88 * (p >= 4 ? seg(G(4), 0, 0.85) : 0);
    var lvl = 52 * gFill;
    gLiq.setAttribute("y", 76 - lvl); gLiq.setAttribute("height", lvl + 4);
    gSurf.setAttribute("y1", 76 - lvl); gSurf.setAttribute("y2", 76 - lvl);
    var half = 38 * Math.min(1, 0.45 + lvl / 60);
    gSurf.setAttribute("x1", -half); gSurf.setAttribute("x2", half);
    gSurf.setAttribute("opacity", gFill > 0.02 ? 1 : 0);
    glint.setAttribute("opacity", seg(p, 4.9, 5));

    if (tilt > 0.92 && gFill < 0.999) {
      var rr = rot * Math.PI / 180, kk = k * bs;
      var mx = bx + Math.sin(rr) * 130 * kk, my = by - Math.cos(rr) * 130 * kk, sy = gy + (76 - lvl) * k * Pt.s;
      stream.setAttribute("d", "M" + mx + " " + my + " Q" + (mx + 6 * k) + " " + ((my + sy) / 2) + " " + gx + " " + sy);
      stream.setAttribute("opacity", 1);
    } else stream.setAttribute("opacity", 0);

    // Halo chaud derrière l'objet principal
    var fx = p < 0.5 ? S[0].x : p < 3 ? bx : Pt.x, fy = p < 0.5 ? S[0].y : p < 3 ? by : Pt.y;
    glow.setAttribute("cx", fx); glow.setAttribute("cy", fy); glow.setAttribute("r", 300 * k);

    // Le texte laisse la place au dessin
    var parts = [];
    if (g0 < 0.5) parts.push(hand);
    if (g0 < 0.2) parts.push(grapesG);
    if (rise > 0.1 || p >= 1) parts.push(bottle);
    if (gIn > 0.2) parts.push(glass);
    var boxes = [];
    parts.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < H) boxes.push({ l: r.left, r: r.right, t: Math.max(0, r.top), b: r.bottom });
    });
    dodge(boxes, dt, W);

    // Mot à mot
    wordEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var v = reduce ? 1 : clamp((H * 0.88 - r.top) / (H * 0.45), 0, 1);
      var n = el._w.length, lit = Math.round(v * n);
      el._w.forEach(function (w, j) { w.classList.toggle("on", j < lit); });
    });
  }

  // Chaque bloc de texte touché par le dessin se resserre (les lignes se recomposent)
  // ou glisse sur le côté, puis revient en douceur quand le dessin est passé.
  var flow = [].slice.call(document.querySelectorAll(".txt > *"));
  // Le bloc garde son alignement à gauche ; on réduit sa largeur (les lignes se recomposent)
  // et, si le dessin est à gauche, on le décale vers la droite. Il prend le côté où il y a le plus de place.
  function dodge(boxes, dt, W) {
    var PAD = W < 900 ? 14 : 36, a = 1 - Math.exp(-(dt || 16) / 130);
    flow.forEach(function (e) {
      var s = e._s || (e._s = { ml: 0, mw: null });
      var pr = e.parentNode.getBoundingClientRect(), cw = e.parentNode.clientWidth, bl = pr.left, br = bl + cw;
      var r = e.getBoundingClientRect(), box = null;
      if (!reduce) boxes.forEach(function (b) {
        if (r.bottom > b.t - PAD && r.top < b.b + PAD && b.r > bl - PAD && b.l < br + PAD)
          box = box ? { l: Math.min(box.l, b.l), r: Math.max(box.r, b.r) } : { l: b.l, r: b.r };
      });
      var tml = 0, tmw = cw;
      if (box) {
        var roomL = box.l - PAD - bl, roomR = br - (box.r + PAD);
        if (roomL >= roomR) tmw = Math.max(roomL, cw * 0.4);                       // texte à gauche du dessin
        else { tml = Math.min(box.r + PAD - bl, cw * 0.6); tmw = cw - tml; }        // texte à droite du dessin
      }
      if (s.mw === null) s.mw = cw;
      s.ml += (tml - s.ml) * a; s.mw += (tmw - s.mw) * a;
      if (Math.abs(s.ml) < 0.3) s.ml = 0;
      e.style.marginLeft = s.ml ? s.ml + "px" : "";
      e.style.maxWidth = s.mw < cw - 0.5 ? s.mw + "px" : "";
    });
  }

  function loop(t) { frame(t); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
