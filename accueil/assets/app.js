/* Vinochope · page d'accueil
   La grappe (photo détourée) au départ ; elle glisse, rapetisse et se fond dans le tourbillon de vin,
   puis la vidéo continue : bouteille entière → service dans le verre.
   L'objet reste au centre, la page défile autour (défilement doux), le fond change de teinte. */
(function () {
  var root = document.documentElement;
  root.classList.remove("no-js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function table(T, f, col) {               // interpolation dans une table [[image, v1, v2…]]
    if (f <= T[0][0]) return T[0][col];
    for (var i = 0; i < T.length - 1; i++) if (f <= T[i + 1][0])
      return lerp(T[i][col], T[i + 1][col], smooth((f - T[i][0]) / (T[i + 1][0] - T[i][0])));
    return T[T.length - 1][col];
  }

  /* ---------- Défilement doux ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
  }
  function goTo(y) { if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" }); }

  /* ---------- Sections ---------- */
  var secs = [].slice.call(document.querySelectorAll("main > section"));   // 0 grappe … 6 venir
  var NAMES = secs.map(function (s) { return s.getAttribute("data-nom"); });

  /* ---------- Images de la vidéo ---------- */
  var N = 291, FIRST = 24;                       // avant l'image 24 la main tient la grappe : on ne la montre jamais
  var canvas = document.querySelector(".film"), ctx = canvas.getContext("2d");
  var grappe = document.querySelector(".grappe");
  var dpr = Math.min(devicePixelRatio || 1, 2);
  var size = innerHeight * dpr > 900 ? "lg" : "sm";
  var imgs = [], loaded = new Uint8Array(N);
  // Image affichée au centre de chaque section : tourbillon · bouteille entière · au-dessus du verre · service · verre plein
  // [section, image, demi-largeur du palier où l'image reste fixe pendant qu'on lit]
  var KEYS = [[0, FIRST, 0], [1, 74, 0], [2, 143, .32], [3, 196, .32], [4, 240, .3], [5, 268, .3], [6, 290, .5]];
  var order = KEYS.map(function (k) { return k[1]; }), seen = {};
  order.forEach(function (i) { seen[i] = 1; });
  [32, 16, 8, 4, 2, 1].forEach(function (s) { for (var i = FIRST; i < N; i += s) if (!seen[i]) { seen[i] = 1; order.push(i); } });
  var cur = 0, active = 0, dirty = true;
  function pad(i) { return ("00" + i).slice(-3); }
  function next() {
    while (active < 6 && cur < order.length) (function (i) {
      active++;
      var im = new Image(); im.decoding = "async";
      im.onload = function () { imgs[i] = im; loaded[i] = 1; active--; dirty = true; next(); };
      im.onerror = function () { active--; next(); };
      im.src = "media/" + size + "/f" + pad(i) + ".webp?v=3";
    })(order[cur++]);
  }
  function nearest(f) {
    f = Math.round(f);
    for (var d = 0; d < N; d++) { if (f - d >= FIRST && loaded[f - d]) return f - d; if (f + d < N && loaded[f + d]) return f + d; }
    return -1;
  }
  var started = false;
  function start() { if (!started) { started = true; next(); } }
  if (grappe.complete) start(); else { grappe.addEventListener("load", start); setTimeout(start, 1000); }

  function frameAt(u) {
    // l'image reste fixe autour du centre de chaque chapitre (le temps de lire), puis avance jusqu'au suivant
    for (var i = 0; i < KEYS.length - 1; i++) if (u <= KEYS[i + 1][0]) {
      var a = KEYS[i][0] + KEYS[i][2], b = KEYS[i + 1][0] - KEYS[i + 1][2];
      if (u <= a) return KEYS[i][1];
      if (u >= b) return KEYS[i + 1][1];
      var t = (u - a) / (b - a);
      return lerp(KEYS[i][1], KEYS[i + 1][1], KEYS[i][2] || KEYS[i + 1][2] ? smooth(t) : t);
    }
    return KEYS[KEYS.length - 1][1];
  }

  /* ---------- Cadrage par moment de la vidéo ----------
     [image, centre x du sujet, part de largeur montrée, hauteur max (× écran), centre vertical (× écran), haut masqué] */
  var FRAME = [
    [24,  .50, .40, 1.00, .50, .27],     // tourbillon (la main, en haut, reste masquée)
    [124, .50, .40, 1.00, .50, .27],
    [138, .53, .40, .84, .52, 0],        // la bouteille se redresse, entière
    [150, .55, .46, .84, .53, 0],
    [176, .59, .78, .90, .55, 0],        // le verre entre : on recule pour tout montrer
    [290, .60, .78, .90, .55, 0]
  ];

  /* ---------- Fond : teintes de la palette par section ---------- */
  var NUIT = [36, 23, 19], BRIQUE = [110, 51, 38], CUITE = [163, 82, 47];
  var BG = [NUIT, BRIQUE, NUIT, BRIQUE, NUIT, BRIQUE, NUIT];
  var fond = document.querySelector(".fond");

  /* ---------- Géométrie ---------- */
  var W, H, narrow;
  function measure() {
    W = root.clientWidth; H = innerHeight; narrow = W < 800;
    var cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; dirty = true; }
  }
  measure();
  addEventListener("resize", measure);

  // Où est l'image et quelle taille fait-elle à l'écran, pour une image donnée (en pixels CSS)
  function place(f) {
    var cx = table(FRAME, f, 1), vf = table(FRAME, f, 2), zh = table(FRAME, f, 3), yc = table(FRAME, f, 4);
    var maxWin = narrow ? W * 1.02 : W * 0.40;
    if (narrow) { zh *= 0.62; yc = 0.46; vf = Math.min(.86, vf * 1.1); }
    var fh = Math.min(H * zh, (maxWin / vf) * (720 / 1280)), fw = fh * 1280 / 720;
    return { fh: fh, fw: fw, x0: W / 2 - cx * fw, y0: H * yc - fh / 2, ww: fw * vf, cut: table(FRAME, f, 5) };
  }

  /* ---------- Où en est-on ---------- */
  function progressU() {
    var mid = H / 2, C = secs.map(function (s) { var r = s.getBoundingClientRect(); return r.top + r.height / 2; });
    if (mid <= C[0]) return 0;
    for (var i = 0; i < C.length - 1; i++) if (mid < C[i + 1]) return i + (mid - C[i]) / (C[i + 1] - C[i]);
    return C.length - 1;
  }
  function etats() {
    var c = 0;
    secs.forEach(function (s, i) {
      var r = s.getBoundingClientRect(), e;
      if (i === 0) e = r.bottom > H * 0.45 ? "dedans" : "apres";
      else {
        var p = (-r.top) / Math.max(1, r.height - H);
        e = p < -0.12 ? "avant" : p > 0.9 ? "apres" : "dedans";
        if (s.classList.contains("fin") && p > 0.9) e = "dedans";
        if (s.classList.contains("manifeste")) lightWords(clamp((p + 0.05) / 0.62, 0, 1));
      }
      if (s.getAttribute("data-etat") !== e) s.setAttribute("data-etat", e);
      if (r.top <= H * 0.5) c = i;
    });
    return c;
  }

  /* ---------- Mots du manifeste ---------- */
  var phrase = document.querySelector("[data-mots]"), mots = [];
  if (phrase) {
    var txt = phrase.textContent.trim().split(/\s+/);
    phrase.setAttribute("aria-label", phrase.textContent.trim());
    phrase.textContent = "";
    txt.forEach(function (w, i) {
      var s = document.createElement("span"); s.className = "m"; s.textContent = w; s.setAttribute("aria-hidden", "true");
      phrase.appendChild(s); if (i < txt.length - 1) phrase.appendChild(document.createTextNode(" "));
      mots.push(s);
    });
  }
  function lightWords(v) {
    var lit = reduce ? mots.length : Math.round(v * mots.length);
    for (var j = 0; j < mots.length; j++) mots[j].classList.toggle("on", j < lit);
  }

  /* ---------- Dessin : deux images voisines fondues, puis bords adoucis ---------- */
  function draw(f, alpha) {
    var a = nearest(Math.floor(f)), b = nearest(Math.ceil(f));
    if (a < 0) return false;
    var g = place(f), k = dpr;
    var cw = canvas.width, ch = canvas.height;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 1;
    ctx.drawImage(imgs[a], g.x0 * k, g.y0 * k, g.fw * k, g.fh * k);
    var t = f - Math.floor(f);
    if (b >= 0 && b !== a && t > 0.02) { ctx.globalAlpha = t; ctx.drawImage(imgs[b], g.x0 * k, g.y0 * k, g.fw * k, g.fh * k); ctx.globalAlpha = 1; }
    // halo ovale autour du sujet : il se fond dans le fond de page, sans bord visible
    ctx.globalCompositeOperation = "destination-in";
    var cxs = W / 2 * k, cys = (g.y0 + g.fh * (g.cut ? 0.62 : 0.5)) * k;
    var rx = g.ww / 2 * k * (narrow ? 1.3 : 1.12), ry = g.fh * (g.cut ? 0.46 : 0.62) * k;
    ctx.save(); ctx.translate(cxs, cys); ctx.scale(1, ry / rx);
    var rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    rg.addColorStop(0, "rgba(0,0,0," + alpha + ")"); rg.addColorStop(.6, "rgba(0,0,0," + alpha + ")");
    rg.addColorStop(.82, "rgba(0,0,0," + (alpha * .55).toFixed(3) + ")"); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.fillRect(-cw, -ch * rx / ry, cw * 2, ch * 2 * rx / ry);
    ctx.restore();
    // haut (main masquée) et bords de l'image
    var yTop = (g.y0 + g.cut * g.fh) * k, yBot = (g.y0 + g.fh) * k, span = Math.max(1, yBot - yTop);
    var ft = (g.cut ? 0.12 : 0.03) * g.fh * k;
    var v = ctx.createLinearGradient(0, yTop, 0, yBot);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(clamp(ft / span, .01, .4), "#000");
    v.addColorStop(.965, "#000"); v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, cw, ch);
    var hz = ctx.createLinearGradient(g.x0 * k, 0, (g.x0 + g.fw) * k, 0);
    hz.addColorStop(0, "rgba(0,0,0,0)"); hz.addColorStop(.04, "#000"); hz.addColorStop(.96, "#000"); hz.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hz; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = "source-over";
    return true;
  }

  /* ---------- Boucle ---------- */
  var cu = null, tPrev = 0, last = "", lastCur = -1;
  var pNom = document.querySelector(".pastille-nom");
  function frame(now) {
    var u = progressU(), dt = Math.min(100, now - (tPrev || now)); tPrev = now;
    cu = (cu === null || reduce || lenis) ? u : cu + (u - cu) * (1 - Math.exp(-dt / 70));
    var p = cu;

    // Fond : la teinte du haut change par section, le bas reste brun nuit (comme la vidéo)
    var i = Math.min(BG.length - 2, Math.floor(p)), fr = p - i, A = BG[i], B = BG[i + 1], kk = smooth((fr - .2) / .6);
    var top = A.map(function (c, j) { return Math.round(lerp(c, B[j], kk)); });
    if (fond) fond.style.setProperty("--haut", "rgb(" + top.join(",") + ")");

    // La grappe glisse jusqu'au goulot, rapetisse et se fond dans le tourbillon
    var f = frameAt(p);
    var gs = place(FIRST + 6);
    var gx = smooth(p / 0.62);
    var gh = grappe.offsetHeight || 1;
    var tx = W / 2, ty = gs.y0 + 0.6 * gs.fh, th = 0.3 * gs.fh;     // là où naît le tourbillon
    var x = lerp(W / 2, tx, gx), y = lerp(H * (narrow ? 0.5 : 0.53), ty, gx), sc = lerp(1, th / gh, gx);
    grappe.style.transform = "translate(" + (x).toFixed(1) + "px," + (y).toFixed(1) + "px) translate(-50%,-50%) scale(" + sc.toFixed(4) + ")";
    var go = 1 - smooth((p - 0.22) / 0.38);
    grappe.style.opacity = go.toFixed(3);
    grappe.style.filter = go < 1 ? "blur(" + ((1 - go) * 6).toFixed(1) + "px) saturate(" + (1 + (1 - go) * .4).toFixed(2) + ")" : "";
    grappe.style.visibility = go <= 0.001 ? "hidden" : "visible";
    var vAlpha = smooth((p - 0.18) / 0.4);

    var key = f.toFixed(2) + "|" + vAlpha.toFixed(2) + "|" + canvas.width + "x" + canvas.height;
    if (dirty || key !== last) { if (draw(f, vAlpha)) { last = key; dirty = false; } }

    var c = etats();
    if (c !== lastCur) { lastCur = c; if (pNom) pNom.textContent = NAMES[c]; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- Navigation ---------- */
  function cible(t) { return t.getBoundingClientRect().top + scrollY + (t.classList.contains("pin") ? (t.offsetHeight - H) * 0.4 : 0); }
  var pb = document.querySelector(".pastille-btn"), pm = document.getElementById("chapitres");
  function menu(open) { pm.hidden = !open; pb.setAttribute("aria-expanded", open ? "true" : "false"); }
  pb.addEventListener("click", function () { menu(pm.hidden); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pm.hidden) { menu(false); pb.focus(); } });
  document.addEventListener("click", function (e) { if (!e.target.closest(".pastille")) menu(false); });
  document.querySelectorAll('.pastille-menu a, .tete a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var t = document.querySelector(a.getAttribute("href")); if (!t) return;
      e.preventDefault(); menu(false); goTo(cible(t));
    });
  });

  /* ---------- Ouvert / fermé, heure de Perpignan ---------- */
  var HOURS = { 0: [], 1: [[900, 1260]], 2: [[600, 750], [870, 1260]], 3: [[600, 750], [870, 1260]], 4: [[600, 750], [870, 1260]], 5: [[600, 750], [870, 1260]], 6: [[600, 750], [870, 1260]] };
  var DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  function hm(m) { var h = Math.floor(m / 60), mi = m % 60; return h + " h" + (mi ? " " + (mi < 10 ? "0" : "") + mi : ""); }
  try {
    var parts = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date()).forEach(function (x) { parts[x.type] = x.value; });
    var d = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday), m = (+parts.hour % 24) * 60 + (+parts.minute), txt2 = null;
    HOURS[d].forEach(function (r) { if (!txt2 && m >= r[0] && m < r[1]) txt2 = "Ouvert jusqu'à " + hm(r[1]); });
    HOURS[d].forEach(function (r) { if (!txt2 && m < r[0]) txt2 = "Fermé, ouvre à " + hm(r[0]); });
    for (var q = 1; !txt2 && q <= 7; q++) { var dd = (d + q) % 7; if (HOURS[dd].length) txt2 = "Fermé, ouvre " + (q === 1 ? "demain" : DAYS[dd]) + " à " + hm(HOURS[dd][0][0]); }
    var el = document.querySelector("[data-statut]"); if (el && txt2) el.textContent = txt2;
  } catch (e) {}
  document.querySelectorAll("[data-annee]").forEach(function (e) { e.textContent = new Date().getFullYear(); });

  /* ---------- Porte +18 ---------- */
  var porte = document.getElementById("porte");
  if (porte && store.get("vc-majeur") !== "1") {
    porte.hidden = false; document.body.style.overflow = "hidden"; if (lenis) lenis.stop();
    var oui = porte.querySelector("[data-oui]"), non = porte.querySelector("[data-non]");
    setTimeout(function () { oui.focus(); }, 60);
    oui.addEventListener("click", function () { store.set("vc-majeur", "1"); porte.hidden = true; document.body.style.overflow = ""; if (lenis) lenis.start(); });
    non.addEventListener("click", function () { porte.querySelector(".porte-non").hidden = false; porte.querySelector(".porte-btns").hidden = true; });
    porte.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var b = [].slice.call(porte.querySelectorAll("button")).filter(function (x) { return x.offsetParent; });
      if (b.length < 2) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === b[0]) { e.preventDefault(); b[b.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === b[b.length - 1]) { e.preventDefault(); b[0].focus(); }
    });
  }
})();
