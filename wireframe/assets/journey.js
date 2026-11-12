/* Accueil « voyage » : la page défile normalement, et le dessin descend AVEC elle.
   Chaque objet est placé dans une zone de la page (les cadres pointillés data-anchor) :
   0 grappe · 1 bouteille qui se remplit · 2 bouteille qui tourne · 3 le verre arrive
   4 le service commence · 5 le verre est plein.
   Entre deux zones, l'objet traverse la page en diagonale (gauche ↔ droite). */
(function () {
  var main = document.querySelector("main.journey");
  if (!main) return;
  var svg = main.querySelector(".journey-layer");
  var cells = [].slice.call(main.querySelectorAll("[data-anchor]"));
  var $ = function (id) { return document.getElementById(id); };
  var vine = $("vine"), hand = $("hand"), stem = $("stem"), grapesG = $("grapes");
  var leaves = [].slice.call(document.querySelectorAll("#leaves .leaf"));
  var ribbon = $("ribbon"), bottle = $("bottle"), bLiq = $("bottle-liquid");
  var glass = $("glass"), gLiq = $("glass-liquid"), glint = $("glint"), stream = $("stream");
  var caption = document.querySelector("[data-caption]");
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var seg = function (u, a, b) { return ease((u - a) / (b - a)); };
  var qb = function (a, c, b, t) { var m = 1 - t; return m * m * a + 2 * m * t * c + t * t * b; };

  // Grappe : rangées 4,5,4,3,2,1 (même dessin que la version précédente)
  var grapes = [];
  [4, 5, 4, 3, 2, 1].forEach(function (n, r) {
    for (var i = 0; i < n; i++) {
      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("class", "grape");
      grapesG.appendChild(c);
      grapes.push({ el: c, gx: 200 + (i - (n - 1) / 2) * 21, gy: 112 + r * 19, k: grapes.length });
    }
  });

  var CAPS = ["La grappe", "Le vin coule dans la bouteille", "La bouteille voyage", "Le verre arrive", "Le service", "Votre verre est servi"];
  var cu = null, lastCap = -1;

  // Sur écran étroit les zones sont pleine largeur : on décale quand même le dessin à gauche / à droite
  var NARROW_X = [0.66, 0.34, 0.68, 0.46, 0.64, 0.46];
  function anchors() {
    var mr = main.getBoundingClientRect(), W = main.clientWidth;
    return cells.map(function (c, i) {
      var r = c.getBoundingClientRect();
      var x = W < 900 ? W * NARROW_X[i] : r.left - mr.left + r.width / 2;
      return { x: x, y: r.top - mr.top + r.height / 2, w: r.width, h: r.height };
    });
  }
  // Traversée entre deux zones : un grand arc qui dépasse un peu la cible puis revient,
  // et l'objet penche dans le sens où il part (comme un virage)
  function along(A, u, from, to) {
    u = clamp(u, from, to);
    var i = Math.min(Math.floor(u), to - 1), f = u - i;
    var fx = ease(f) + 0.35 * Math.sin(Math.PI * f) * f;
    var dir = A[i + 1].x > A[i].x ? 1 : -1;
    return { x: lerp(A[i].x, A[i + 1].x, fx), y: lerp(A[i].y, A[i + 1].y, ease(f)), f: f, i: i, bank: dir * 22 * Math.sin(Math.PI * f) };
  }

  function frame() {
    var A = anchors();
    if (A.length < 6) return;
    var W = main.clientWidth, H = main.offsetHeight;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    // u = où se trouve le milieu de l'écran par rapport aux zones (0 → 5)
    var mr = main.getBoundingClientRect();
    var vc = innerHeight * 0.5 - mr.top, u = 0;
    if (vc <= A[0].y) u = 0;
    else if (vc >= A[5].y) u = 5;
    else for (var i = 0; i < 5; i++) if (vc < A[i + 1].y) { u = i + (vc - A[i].y) / (A[i + 1].y - A[i].y); break; }
    var now = performance.now(), dt = Math.min(1000, now - (frame.t || now)); frame.t = now;
    cu = (cu === null || reduce) ? u : cu + (u - cu) * (1 - Math.exp(-dt / 160));
    var p = cu;

    var k = clamp(Math.min(A[0].w / 220, A[0].h / 370), 0.7, 1.9);

    // La main ne dépasse pas au-dessus du cadre de la grappe sur petit écran (sinon elle couvre le titre)
    var cr = $("clip-hero-rect"), top = W < 900 ? A[0].y - A[0].h / 2 : -2000;
    cr.setAttribute("y", top); cr.setAttribute("width", W); cr.setAttribute("height", H - top);

    // ---- 0 → 1 : la main lâche la grappe, les grains coulent jusqu'à la bouteille
    var sway = Math.sin(p * 9) * 3 * (1 - seg(p, 0.3, 0.7));
    vine.setAttribute("transform", "translate(" + A[0].x + " " + A[0].y + ") scale(" + k + ") rotate(" + sway + " 200 0) translate(-200 -150)");
    hand.setAttribute("transform", "translate(0 " + (-700 * seg(p, 0.15, 0.55)) + ")");
    stem.setAttribute("opacity", 1 - seg(p, 0.55, 0.85));

    var B1 = { x: A[1].x, y: A[1].y };
    var mouth0 = { x: B1.x, y: B1.y - 130 * k + 260 * k * (1 - seg(p, 0.15, 0.55)) };
    grapes.forEach(function (g) {
      var hx = A[0].x + (g.gx - 200) * k, hy = A[0].y + (g.gy - 150) * k;
      var t = ease((p - 0.25 - g.k * 0.018) / 0.5);
      var cx = (hx + mouth0.x) / 2 - 180 * k + ((g.k % 3) - 1) * 40 * k, cy = (hy + mouth0.y) / 2;
      var x = qb(hx, cx, mouth0.x, t) + Math.sin(t * Math.PI * 2 + g.k) * 14 * k * Math.sin(t * Math.PI);
      var y = qb(hy, cy, mouth0.y, t);
      g.el.setAttribute("cx", x); g.el.setAttribute("cy", y);
      g.el.setAttribute("r", 11 * k * (1 - 0.65 * t));
      g.el.setAttribute("opacity", 1 - seg(t, 0.85, 1));
    });

    var hc = { x: A[0].x, y: A[0].y + 20 * k };
    ribbon.setAttribute("d", "M" + hc.x + " " + hc.y + " Q" + ((hc.x + mouth0.x) / 2 - 220 * k) + " " + ((hc.y + mouth0.y) / 2) + " " + mouth0.x + " " + mouth0.y);
    var L = ribbon.getTotalLength ? ribbon.getTotalLength() : 1000;
    var head = seg(p, 0.25, 0.7), tail = seg(p, 0.6, 0.95);
    ribbon.setAttribute("stroke-dasharray", Math.max(0, (head - tail) * L) + " " + (L * 2));
    ribbon.setAttribute("stroke-dashoffset", -tail * L);
    ribbon.setAttribute("opacity", head > tail ? 1 : 0);

    leaves.forEach(function (lf, j) {
      var d = j ? 1 : -1, t = seg(p, 0.1 + j * 0.08, 0.95);
      var x = A[0].x + d * 34 * k + lerp(0, -260 * k + d * 60 * k, t), y = A[0].y - 70 * k + lerp(0, (A[1].y - A[0].y) * 0.55, t) + Math.sin(t * 9 + j) * 18 * k;
      lf.setAttribute("transform", "translate(" + x + " " + y + ") rotate(" + (d * 20 + t * 260 * d) + ") scale(" + (k * (j ? -1 : 1)) + " " + k + ")");
      lf.setAttribute("opacity", 1 - seg(t, 0.75, 1));
    });

    // ---- La bouteille : apparaît en zone 1, traverse 2 en tournant, arrive au-dessus du verre en 3
    var off = { x: -62 * k, y: -60 * k };              // place de la bouteille par rapport au verre
    var T = [null, A[1], A[2], { x: A[3].x + off.x, y: A[3].y + off.y }];
    var bx, by, rot = 0, bs = 1;
    if (p < 1) {
      var rise = seg(p, 0.15, 0.55);
      bx = A[1].x; by = A[1].y + 260 * k * (1 - rise);
      bottle.setAttribute("opacity", rise);
    } else if (p < 3) {
      var a = along(T, p, 1, 3);
      bx = a.x; by = a.y;
      if (a.i === 1) { rot = 360 * ease(a.f) + a.bank; bs = 1 + 0.25 * Math.sin(Math.PI * a.f); }   // vrille en traversant
      else { rot = a.bank * 1.4; bs = 1 - 0.1 * Math.sin(Math.PI * a.f); }                          // glisse en virage
      bottle.setAttribute("opacity", 1);
    }

    // ---- Le verre arrive en zone 3, puis le duo bouteille + verre descend jusqu'à la zone 5
    var P = p < 3 ? A[3] : along(A, p, 3, 5);
    var gx = P.x + 60 * k, gy = P.y + 30 * k;
    var gIn = seg(p, 2.3, 2.95);
    var gRot = p < 3 ? -18 * (1 - gIn) : P.bank;
    glass.setAttribute("opacity", gIn);
    glass.setAttribute("transform", "translate(" + gx + " " + (gy + 320 * k * (1 - gIn)) + ") rotate(" + gRot + ") scale(" + k + ")");

    var tilt = seg(p, 3.35, 3.8) * (1 - seg(p, 4.82, 4.97));
    if (p >= 3) {
      bx = P.x + off.x; by = P.y + off.y; rot = 112 * tilt + (P.bank || 0);
      bottle.setAttribute("opacity", 1);
    }
    bottle.setAttribute("transform", "translate(" + bx + " " + by + ") rotate(" + rot + ") scale(" + (k * bs) + ")");

    var bFill = 0.85 * seg(p, 0.55, 1.2) * (1 - seg(p, 3.75, 4.8));
    bLiq.setAttribute("y", 130 - 260 * bFill); bLiq.setAttribute("height", 260 * bFill);

    var gFill = seg(p, 3.8, 4.8);
    var lvl = 52 * gFill;
    gLiq.setAttribute("y", 76 - lvl); gLiq.setAttribute("height", lvl + 4);
    glint.setAttribute("opacity", seg(p, 4.85, 5));

    // Le filet de vin : du goulot à la surface du verre
    var pouring = tilt > 0.92 && gFill < 1;
    if (pouring) {
      var rr = rot * Math.PI / 180;
      var mx = bx + Math.sin(rr) * 130 * k, my = by - Math.cos(rr) * 130 * k;
      var sy = gy + (76 - lvl) * k;
      stream.setAttribute("d", "M" + mx + " " + my + " Q" + (mx + 8 * k) + " " + ((my + sy) / 2) + " " + gx + " " + sy);
      stream.setAttribute("opacity", 1);
    } else stream.setAttribute("opacity", 0);

    // Légende en bas à gauche
    var ci = clamp(Math.round(p), 0, 5);
    if (ci !== lastCap && caption) { caption.textContent = CAPS[ci]; lastCap = ci; }

    // Les blocs de texte glissent depuis leur côté quand ils entrent à l'écran
    if (!reduce) reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var v = ease((innerHeight - r.top) / (innerHeight * 0.4));
      var d = +el.getAttribute("data-dir") || 1;
      el.style.transform = "translateX(" + (d * 70 * (1 - v)) + "px) rotate(" + (d * 2 * (1 - v)) + "deg)";
      el.style.opacity = v;
    });
  }

  function loop() { frame(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
