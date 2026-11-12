// Histoire d'un verre, plein écran et synchronisée au scroll.
// Une caméra (zoom, cadrage, rotation) suit l'action ; les textes entrent et sortent en mouvement ;
// des mots géants et des cercles en fond donnent la profondeur.
(function () {
  var story = document.querySelector(".story");
  if (!story) return;
  var stage = story.querySelector(".stage");
  var svg = story.querySelector(".stage-svg");
  var NS = "http://www.w3.org/2000/svg";

  // ---------- Outils ----------
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function phase(p, a, b) { return ease((p - a) / (b - a)); }
  function $(id) { return svg.querySelector("#" + id); }

  // ---------- Caméra : images clés (zoom, point visé, rotation) ----------
  var CAM = [
    [0.00, 1.00, 200, 250, 0],
    [0.10, 1.75, 200, 120, -4],
    [0.22, 1.35, 200, 220, 3],
    [0.34, 1.55, 200, 350, 0],
    [0.46, 1.00, 220, 390, -2],
    [0.58, 1.25, 285, 350, 5],
    [0.75, 1.50, 330, 410, 0],
    [0.88, 1.20, 300, 420, -2],
    [1.00, 1.00, 195, 270, 0]
  ];
  function camera(p) {
    for (var i = 0; i < CAM.length - 1; i++) {
      var a = CAM[i], b = CAM[i + 1];
      if (p <= b[0]) {
        var t = ease((p - a[0]) / (b[0] - a[0]));
        return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t), lerp(a[4], b[4], t)];
      }
    }
    var l = CAM[CAM.length - 1];
    return [l[1], l[2], l[3], l[4]];
  }

  // ---------- Grappe ----------
  var grapesG = $("grapes");
  var ROWS = [4, 5, 4, 3, 2, 1], R = 11, GAP = 21, TOP = 108, CX = 200;
  var grapes = [];
  ROWS.forEach(function (n, row) {
    for (var i = 0; i < n; i++) {
      var x = CX + (i - (n - 1) / 2) * GAP, y = TOP + row * 18;
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("r", R); c.setAttribute("class", "grape");
      c.setAttribute("cx", x); c.setAttribute("cy", y);
      grapesG.append(c);
      grapes.push({ el: c, x0: x, y0: y, a0: Math.atan2(y - 160, x - CX) });
    }
  });
  grapes.sort(function (a, b) { return b.y0 - a.y0; });

  // ---------- Cercles de fond (profondeur) ----------
  var far = $("far");
  var seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (var k = 0; k < 18; k++) {
    var b = document.createElementNS(NS, "circle");
    b.setAttribute("class", "bokeh");
    b.setAttribute("cx", -600 + rnd() * 1600);
    b.setAttribute("cy", -150 + rnd() * 900);
    b.setAttribute("r", 10 + rnd() * 70);
    far.append(b);
  }

  // ---------- Gouttes pendant le service ----------
  var dropsG = $("drops"), drops = [];
  for (var d = 0; d < 5; d++) {
    var dc = document.createElementNS(NS, "circle");
    dc.setAttribute("class", "drop"); dc.setAttribute("r", 2.2);
    dropsG.append(dc); drops.push(dc);
  }

  var cam = $("camera"), hand = $("hand"), stem = $("stem"), swirl = $("swirl");
  var bottle = $("bottle"), bottleLiquid = $("bottle-liquid");
  var glass = $("glass"), glassLiquid = $("glass-liquid"), stream = $("stream"), glint = $("glint");
  var leaves = svg.querySelectorAll("[data-leaf]");
  var words = story.querySelectorAll(".bg-words div");
  var intro = story.querySelector("[data-intro]");
  var chaps = Array.prototype.slice.call(story.querySelectorAll(".chap"));
  var lbTop = story.querySelector(".letterbox.top"), lbBot = story.querySelector(".letterbox.bottom");
  var bar = story.querySelector(".story-bar");
  var skip = story.querySelector(".skip");
  var caption = story.querySelector("[data-story-caption]");
  var navBox = story.querySelector(".chapters-nav");

  var MOUTH = 130, GLASS_X = 280, GLASS_Y = 382;
  var STEPS = [[0, "La grappe"], [0.12, "Le raisin devient vin"], [0.3, "La bouteille est pleine"], [0.42, "Le verre arrive"],
               [0.55, "La bouteille s'incline"], [0.66, "Le service"], [0.9, "Le verre est servi"]];

  // ---------- Navigation par chapitres ----------
  var navBtns = chaps.map(function (c) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = c.dataset.label;
    btn.addEventListener("click", function () {
      var s = +c.dataset.start, e = Math.min(1, +c.dataset.end);
      var target = s + (e - s) * 0.45;
      var headerH = (document.querySelector(".site-header") || { offsetHeight: 0 }).offsetHeight;
      window.scrollTo({ top: story.offsetTop - headerH + target * total(), behavior: "smooth" });
    });
    navBox.append(btn);
    return btn;
  });

  function total() { return story.offsetHeight - stage.offsetHeight; }

  function render(p) {
    var vw = window.innerWidth;

    // --- caméra ---
    var c = camera(p);
    cam.setAttribute("transform", "translate(200 300) rotate(" + c[3].toFixed(2) + ") scale(" + c[0].toFixed(3) + ") translate(" + (-c[1]).toFixed(1) + " " + (-c[2]).toFixed(1) + ")");
    far.setAttribute("transform", "translate(" + (-p * 320).toFixed(1) + " " + (-p * 140).toFixed(1) + ") rotate(" + (p * 8).toFixed(2) + " 200 300)");

    // --- bouteille ---
    var rise = phase(p, 0.06, 0.20), tilt = phase(p, 0.52, 0.66), back = phase(p, 0.90, 0.97);
    var pivX = lerp(lerp(200, 153, tilt), 110, back);
    var pivY = lerp(lerp(420 + 800 * (1 - easeOut(rise)), 301, tilt), 430, back);
    var ang = lerp(110 * tilt, 0, back);
    bottle.setAttribute("transform", "translate(" + pivX.toFixed(1) + " " + pivY.toFixed(1) + ") rotate(" + ang.toFixed(2) + ")");
    var fillIn = phase(p, 0.16, 0.34), pourOut = phase(p, 0.66, 0.90);
    var level = lerp(lerp(130, -40, fillIn), 70, pourOut);
    bottleLiquid.setAttribute("y", level.toFixed(1));
    bottleLiquid.setAttribute("height", (140 - level).toFixed(1));

    // --- grains en tourbillon jusqu'au goulot ---
    var mouthY = pivY - MOUTH;
    grapes.forEach(function (g, i) {
      var t = clamp((p - 0.10 - i * 0.007) / 0.15, 0, 1);
      if (t >= 1) { g.el.setAttribute("opacity", 0); return; }
      var k = ease(t), a = g.a0 + k * Math.PI * 3.2, rad = lerp(46, 0, k);
      var sx = CX + rad * Math.cos(a), sy = lerp(160, mouthY, k) + rad * 0.35 * Math.sin(a);
      var mix = ease(t / 0.25);
      g.el.setAttribute("cx", lerp(g.x0, sx, mix).toFixed(1));
      g.el.setAttribute("cy", lerp(g.y0, sy, mix).toFixed(1));
      g.el.setAttribute("r", (R * (1 - k * 0.75)).toFixed(2));
      g.el.setAttribute("opacity", 1);
    });
    var sw = phase(p, 0.11, 0.18) * (1 - phase(p, 0.28, 0.34));
    if (sw > 0.01) {
      var dd = "";
      for (var s = 0; s <= 60; s++) {
        var u = s / 60, aa = u * Math.PI * 5 + p * 30, rr = lerp(52, 4, u);
        dd += (s ? "L" : "M") + (CX + rr * Math.cos(aa)).toFixed(1) + " " + (lerp(150, mouthY, u) + rr * 0.35 * Math.sin(aa)).toFixed(1);
      }
      swirl.setAttribute("d", dd);
    }
    swirl.setAttribute("opacity", sw.toFixed(2));

    // --- feuilles emportées vers la gauche ---
    leaves.forEach(function (lf, i) {
      var k = phase(p, 0.11 + i * 0.02, 0.30 + i * 0.02);
      var bx = i ? 206 : 196, by = i ? 86 : 80, flip = i ? -1 : 1;
      var tx = bx - k * (380 + i * 120), ty = by - k * 90 + Math.sin(k * 6 + i) * 18 * k;
      lf.setAttribute("transform", "translate(" + tx.toFixed(1) + " " + ty.toFixed(1) + ") rotate(" + (-70 * k * (i ? -1 : 1) + (i ? 25 : -10)).toFixed(1) + ") scale(" + flip + " 1)");
      lf.setAttribute("opacity", (1 - k).toFixed(2));
    });

    // --- main : léger balancement, lâche, sort par le haut ---
    var leave = phase(p, 0.26, 0.40);
    hand.setAttribute("transform", "translate(0 " + (-420 * leave).toFixed(1) + ") rotate(" + (Math.sin(p * 60) * 1.5 * (1 - leave)).toFixed(2) + " 200 66)");
    stem.setAttribute("opacity", (1 - phase(p, 0.22, 0.30)).toFixed(2));

    // --- verre ---
    var gRise = easeOut((p - 0.40) / 0.15);
    glass.setAttribute("transform", "translate(" + GLASS_X + " " + (GLASS_Y + 700 * (1 - gRise)).toFixed(1) + ")");
    var surf = 76 - pourOut * 52;
    glassLiquid.setAttribute("y", surf.toFixed(1));
    glassLiquid.setAttribute("height", (80 - surf).toFixed(1));
    glint.setAttribute("opacity", phase(p, 0.92, 0.97).toFixed(2));

    // --- filet de vin et gouttes ---
    var on = p > 0.65 && p < 0.91;
    var ty2 = GLASS_Y + surf;
    if (on) {
      var r3 = ang * Math.PI / 180, mx = pivX + MOUTH * Math.sin(r3), my = pivY - MOUTH * Math.cos(r3);
      stream.setAttribute("d", "M" + mx.toFixed(1) + " " + my.toFixed(1) + " Q" + (mx + 8).toFixed(1) + " " + ((my + ty2) / 2).toFixed(1) + " " + GLASS_X + " " + ty2.toFixed(1));
      stream.setAttribute("stroke-width", (5 * Math.min(phase(p, 0.65, 0.68), 1 - phase(p, 0.87, 0.91))).toFixed(2));
    }
    stream.setAttribute("opacity", on ? 1 : 0);
    drops.forEach(function (dr, i) {
      var j = Math.abs(Math.sin(p * 420 + i * 1.7));
      dr.setAttribute("cx", (GLASS_X + (i - 2) * 7).toFixed(1));
      dr.setAttribute("cy", (ty2 - 4 - j * 14).toFixed(1));
      dr.setAttribute("opacity", on && p > 0.68 ? (1 - j * 0.6).toFixed(2) : 0);
    });

    // --- mots géants qui glissent ---
    words.forEach(function (w) {
      var sp = +w.dataset.speed;
      w.style.transform = "translate3d(" + ((-0.25 + (sp < 0 ? -1 : 0.4) * 0.1 + sp * p * -0.9) * vw).toFixed(1) + "px,0,0)";
    });

    // --- titre d'ouverture : grossit et s'efface ---
    var io = phase(p, 0.0, 0.07);
    intro.style.opacity = (1 - io).toFixed(3);
    intro.style.transform = "scale(" + (1 + io * 0.6).toFixed(3) + ")";
    intro.style.visibility = io >= 1 ? "hidden" : "visible";

    // --- chapitres : entrée en glissant et tournant, sortie de l'autre côté ---
    chaps.forEach(function (ch, idx) {
      var s0 = +ch.dataset.start, e0 = +ch.dataset.end, dir = +ch.dataset.from;
      var u2 = (p - s0) / (e0 - s0);
      var enter = easeOut(u2 / 0.28), exit = ease((u2 - 0.8) / 0.2);
      var op = enter * (1 - exit);
      ch.style.opacity = op.toFixed(3);
      ch.style.visibility = op > 0.01 ? "visible" : "hidden";
      ch.style.setProperty("--x", (((1 - enter) * dir * 0.5 - exit * dir * 0.35) * vw).toFixed(1) + "px");
      ch.style.setProperty("--r", ((1 - enter) * dir * 8 + exit * -dir * 5).toFixed(2) + "deg");
      ch.style.setProperty("--y", ((1 - enter) * 40 - exit * 30).toFixed(1) + "px");
      ch.style.setProperty("--b", (exit * 6).toFixed(2) + "px");
      Array.prototype.forEach.call(ch.children, function (kid, i) {
        var ci = easeOut((u2 - 0.03 - i * 0.05) / 0.25);
        kid.style.transform = "translate3d(" + ((1 - ci) * dir * 90).toFixed(1) + "px,0,0)";
        kid.style.opacity = ci.toFixed(3);
      });
      navBtns[idx].classList.toggle("on", u2 >= 0 && u2 < 1);
    });

    // --- bandes de cinéma pendant le service ---
    var lb = phase(p, 0.63, 0.69) * (1 - phase(p, 0.86, 0.91));
    lbTop.style.height = lbBot.style.height = (lb * 7).toFixed(2) + "vh";

    bar.style.width = (p * 100).toFixed(2) + "%";
    if (skip) skip.style.visibility = p < 0.84 ? "visible" : "hidden";
    var label = STEPS[0][1];
    STEPS.forEach(function (st) { if (p >= st[0]) label = st[1]; });
    caption.textContent = label + " · " + Math.round(p * 100) + " %";
  }

  // ---------- Boucle ----------
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    story.classList.add("static");
    render(1);
    chaps.forEach(function (ch) { Array.prototype.forEach.call(ch.children, function (k) { k.style.transform = "none"; k.style.opacity = 1; }); });
    return;
  }
  var ticking = false;
  function update() {
    ticking = false;
    // la scène se fige sous l'en-tête : la progression part de là
    var headerH = (document.querySelector(".site-header") || { offsetHeight: 0 }).offsetHeight;
    var t = total();
    if (!(t > 0)) return; // page pas encore mise en page (redimensionnement en cours)
    render(clamp((headerH - story.getBoundingClientRect().top) / t, 0, 1));
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
