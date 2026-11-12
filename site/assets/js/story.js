/* Vinochope · l'histoire de l'accueil, pilotée par le défilement
   Les 3 vidéos (291 images) avancent avec la page, dans un grand panneau net, collé au bord
   de l'écran. Ordinateur : le panneau occupe une moitié, le texte l'autre ; entre deux
   chapitres le panneau glisse de l'autre côté et le texte suivant arrive dans la moitié libre.
   Mobile : le panneau reste en haut, pleine largeur, le texte défile dessous. Jamais l'un
   sur l'autre, jamais d'estompage.
   Chapitres : 0 la grappe · 1 la cave · 2 la programmation · 3 le bar · 4 les tireuses · 5 servi */
(function () {
  var stage = document.querySelector(".stage");
  var chapters = [].slice.call(document.querySelectorAll(".chapter"));
  if (!stage || chapters.length < 6) return;

  var canvas = stage.querySelector("canvas"), ctx = canvas.getContext("2d", { alpha: true });
  var poster = stage.querySelector(".poster");
  var loaderBar = stage.querySelector(".loader i"), loader = stage.querySelector(".loader");
  var dots = [].slice.call(document.querySelectorAll(".progress a"));
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  var N = 291;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

  /* ---------- Quelle image pour quel moment ---------- */
  // la grappe tenue · le vin tourbillonne dans la bouteille · la bouteille debout ·
  // au-dessus du verre vide · le service commence · le verre est plein
  var KEYS = [[0, 0], [1, 100], [2, 146], [3, 192], [4, 240], [5, 290]];
  function frameAt(u) {
    for (var i = 0; i < KEYS.length - 1; i++)
      if (u <= KEYS[i + 1][0]) return lerp(KEYS[i][1], KEYS[i + 1][1], (u - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]));
    return KEYS[KEYS.length - 1][1];
  }
  // Cadrage : [image, centre x, centre y, zoom]. Zoom proche de 1 pour garder toute la netteté.
  var FOCUS = [[0, .5, .42, 1.06], [14, .5, .46, 1.04], [40, .5, .5, 1], [130, .5, .5, 1],
               [146, .55, .5, 1], [166, .55, .5, 1], [192, .5, .5, 1], [290, .48, .5, 1]];
  function focusAt(f) {
    for (var i = 0; i < FOCUS.length - 1; i++) if (f <= FOCUS[i + 1][0]) {
      var a = FOCUS[i], b = FOCUS[i + 1], t = (f - a[0]) / (b[0] - a[0]);
      return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
    }
    var z = FOCUS[FOCUS.length - 1]; return [z[1], z[2], z[3]];
  }

  /* ---------- Géométrie du panneau ---------- */
  var head = 72, geo = {};
  function measure() {
    var W = root.clientWidth, H = innerHeight, narrow = W < 900;
    head = (document.querySelector(".top") || {}).offsetHeight || 72;
    geo.W = W; geo.H = H; geo.narrow = narrow;
    if (narrow) { geo.pw = W; geo.ph = Math.round(Math.min(H * 0.46, W * 1.05)); }
    else { geo.pw = Math.round(W * 0.56); geo.ph = H - head; }
    root.style.setProperty("--panel", geo.ph + "px");
    var dpr = Math.min(devicePixelRatio || 1, 2);
    geo.dpr = dpr;
    var cw = Math.round(geo.pw * dpr), ch = Math.round(geo.ph * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch;
      canvas.style.width = geo.pw + "px"; canvas.style.height = geo.ph + "px";
      dirty = true;
    }
    canvas.style.top = head + "px";
  }

  /* ---------- Chargement progressif des images ---------- */
  var dirty = true;
  measure();
  var size = geo.pw * geo.dpr > 1000 ? "lg" : "sm";
  var imgs = new Array(N), loaded = new Uint8Array(N), count = 0;
  var order = [0, 100, 146, 192, 240, 290], seen = {};
  order.forEach(function (i) { seen[i] = 1; });
  [48, 24, 12, 6, 3, 2, 1].forEach(function (step) { for (var i = 0; i < N; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); } });
  var cursor = 0, active = 0;
  function pad(i) { return ("00" + i).slice(-3); }
  function next() {
    while (active < 6 && cursor < order.length) {
      (function (i) {
        active++;
        var im = new Image();
        im.decoding = "async";
        im.onload = function () { imgs[i] = im; loaded[i] = 1; count++; active--; dirty = true; progress(); next(); };
        im.onerror = function () { active--; count++; progress(); next(); };
        im.src = "media/" + size + "/f" + pad(i) + ".webp";
      })(order[cursor++]);
    }
  }
  function progress() {
    if (loaderBar) loaderBar.style.width = Math.round(count / N * 100) + "%";
    if (count >= N && loader) loader.classList.add("done");
  }
  function nearest(f) {
    f = Math.round(f);
    for (var d = 0; d < N; d++) { if (f - d >= 0 && loaded[f - d]) return f - d; if (f + d < N && loaded[f + d]) return f + d; }
    return -1;
  }
  next();

  /* ---------- Couleur de fond par chapitre ---------- */
  var BG = [[26, 17, 20], [43, 18, 22], [26, 17, 20], [38, 26, 30], [26, 17, 20], [43, 18, 22]];
  var SIDE = [1, -1, 1, -1, 1, -1];          // 1 = la vidéo à droite, -1 = à gauche

  /* ---------- Où en est-on dans l'histoire ---------- */
  function chapterU() {
    // Le repère de lecture : le centre de la zone où se lit le texte
    // (sur mobile, il glisse du centre de l'écran vers la zone sous la vidéo pendant le premier écran,
    // pour que l'accueil commence bien sur la grappe)
    var mid = geo.H / 2;
    if (geo.narrow) mid += ((head + geo.ph + geo.H) / 2 - mid) * clamp(scrollY / geo.H, 0, 1);
    var C = chapters.map(function (c) { var r = c.getBoundingClientRect(); return r.top + r.height / 2; });
    if (mid <= C[0]) return 0;
    if (mid >= C[5]) return 5;
    for (var i = 0; i < 5; i++) if (mid < C[i + 1]) return i + (mid - C[i]) / (C[i + 1] - C[i]);
    return 5;
  }

  /* ---------- Dessin ---------- */
  var cu = null, tPrev = 0, last = {};
  function draw(fi, fc, fl, fr, ft, fb) {
    var im = imgs[fi], iw = im.naturalWidth, ih = im.naturalHeight;
    var cw = canvas.width, ch = canvas.height, asp = cw / ch;
    // Couvre le panneau sans déformer, puis zoom léger éventuel
    var sw, sh;
    if (iw / ih > asp) { sh = ih; sw = ih * asp; } else { sw = iw; sh = iw / asp; }
    sw /= fc[2]; sh /= fc[2];
    var sx = clamp(fc[0] * iw - sw / 2, 0, iw - sw), sy = clamp(fc[1] * ih - sh / 2, 0, ih - sh);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(im, sx, sy, sw, sh, 0, 0, cw, ch);
    // Bords fondus seulement là où le panneau touche la page (pas contre le bord de l'écran)
    ctx.globalCompositeOperation = "destination-in";
    var g = ctx.createLinearGradient(0, 0, cw, 0);
    g.addColorStop(0, "rgba(0,0,0," + (fl ? 0 : 1) + ")");
    g.addColorStop(Math.max(0.0001, fl), "#000");
    g.addColorStop(Math.min(0.9999, 1 - fr), "#000");
    g.addColorStop(1, "rgba(0,0,0," + (fr ? 0 : 1) + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    var v = ctx.createLinearGradient(0, 0, 0, ch);
    v.addColorStop(0, "rgba(0,0,0," + (ft ? 0 : 1) + ")");
    v.addColorStop(Math.max(0.0001, ft), "#000");
    v.addColorStop(Math.min(0.9999, 1 - fb), "#000");
    v.addColorStop(1, "rgba(0,0,0," + (fb ? 0 : 1) + ")");
    ctx.fillStyle = v; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    if (root.clientWidth !== geo.W || innerHeight !== geo.H) measure();
    var u = chapterU(), dt = Math.min(1000, now - (tPrev || now)); tPrev = now;
    cu = (cu === null || reduce) ? u : cu + (u - cu) * (1 - Math.exp(-dt / 110));
    var p = reduce ? Math.round(u) : cu;

    // Pause dans le chapitre, glissement net au passage d'un chapitre à l'autre
    var i = Math.min(4, Math.floor(p)), f = p - i, g = ease((f - 0.32) / 0.36);
    if (reduce) g = f < 0.5 ? 0 : 1;

    // Fond de page
    var A = BG[i], B = BG[i + 1];
    document.body.style.backgroundColor = "rgb(" + A.map(function (v, j) { return Math.round(lerp(v, B[j], g)); }).join(",") + ")";

    var x = 0, fl = 0, fr = 0, ft, fb;
    if (geo.narrow) { ft = 0; fb = 0.2; }
    else {
      var span = geo.W - geo.pw;
      var s = lerp(SIDE[i], SIDE[i + 1], g);              // -1 … 1
      var t = (s + 1) / 2;                                  // 0 = à gauche, 1 = à droite
      x = span * t;
      fl = 0.2 * t; fr = 0.2 * (1 - t); ft = 0.05; fb = 0.12;
    }
    var tf = "translate3d(" + x.toFixed(1) + "px,0,0)";
    if (tf !== last.tf) { canvas.style.transform = tf; last.tf = tf; }

    var fi = nearest(frameAt(p));
    if (fi >= 0) {
      var fc = focusAt(fi);
      var key = fi + "|" + fl.toFixed(3) + "|" + canvas.width + "x" + canvas.height;
      if (dirty || key !== last.key) {
        draw(fi, fc, fl, fr, ft, fb);
        last.key = key; dirty = false;
        if (poster && !poster.hidden) poster.hidden = true;
      }
    }

    var on = Math.round(p);
    dots.forEach(function (d, j) { d.classList.toggle("on", j === on); });
  }

  function loop(t) { frame(t); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
