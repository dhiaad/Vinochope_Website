/* Vinochope · accueil
   Un seul écran tenu pendant l'ouverture : la page ne monte pas.
   1. Le logo en grand sur le comptoir : verre de bière, bouteille, verre de vin. Il suit la souris.
   2. Au défilement on sert : la bière monte avec sa mousse, le vin remplit le verre.
   3. Les verres s'écartent ; la bouteille vient se poser exactement sur celle du film.
   4. Elle s'ouvre comme une fenêtre : le film est derrière, dans ses vraies couleurs, et le vin est servi. */
(function () {
  var VC = window.VC, reduce = VC.reduce;
  var root = document.documentElement;
  var hover = window.matchMedia && matchMedia("(hover: hover)").matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function douce(t) { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function table(T, x, col) {
    if (x <= T[0][0]) return T[0][col];
    for (var i = 0; i < T.length - 1; i++) if (x <= T[i + 1][0])
      return lerp(T[i][col], T[i + 1][col], smooth((x - T[i][0]) / ((T[i + 1][0] - T[i][0]) || 1)));
    return T[T.length - 1][col];
  }

  var ouv = document.querySelector(".ouverture"), colle = ouv.querySelector(".ouv-colle");
  var comptoir = ouv.querySelector(".comptoir"), ligne = ouv.querySelector(".comptoir-ligne");
  var biere = ouv.querySelector(".o-biere"), bouteille = ouv.querySelector(".o-bouteille"), vin = ouv.querySelector(".o-vin");
  var ecran = ouv.querySelector(".ouv-ecran"), canvas = ouv.querySelector(".ouv-film"), ctx = canvas.getContext("2d", { alpha: false });
  var chapitres = ouv.querySelector(".chapitres");
  var chap = [].slice.call(ouv.querySelectorAll(".chapitre-film")).map(function (el) {
    return { el: el, de: +el.getAttribute("data-de"), a: +el.getAttribute("data-a") };
  });
  var bar = document.querySelector(".bar"), bougie = document.querySelector(".bougie");
  var terroir = document.querySelector(".terroir"), terroirImg = terroir && terroir.querySelector("img");

  /* ---------- Images du film : de la bouteille debout au verre plein ---------- */
  var DEB = 136, FIN = 290, N = FIN + 1;
  var dpr = Math.min(devicePixelRatio || 1, 2);
  var size = (Math.max(innerWidth, innerHeight) * dpr > 1300) ? "lg" : "sm";
  var imgs = [], loaded = new Uint8Array(N), cur = 0, active = 0, dirty = true;
  var order = [DEB, 150, 176, 210, 240, 268, FIN], seen = {};
  order.forEach(function (i) { seen[i] = 1; });
  [16, 8, 4, 2, 1].forEach(function (s) { for (var i = DEB; i <= FIN; i += s) if (!seen[i]) { seen[i] = 1; order.push(i); } });
  function pad(i) { return ("00" + i).slice(-3); }
  function next() {
    while (active < 6 && cur < order.length) (function (i) {
      active++;
      var im = new Image(); im.decoding = "async";
      var fini = function () { imgs[i] = im; loaded[i] = 1; active--; dirty = true; next(); };
      im.onload = function () { im.decode ? im.decode().then(fini, fini) : fini(); };   // décodée d'avance : pas d'à-coup au dessin
      im.onerror = function () { active--; next(); };
      im.src = "media/" + size + "/f" + pad(i) + ".webp";
    })(order[cur++]);
  }
  function nearest(f) {
    for (var d = 0; d < N; d++) { if (f - d >= DEB && loaded[f - d]) return f - d; if (f + d <= FIN && loaded[f + d]) return f + d; }
    return -1;
  }
  setTimeout(next, 120);

  // Avancée dans le film : la bouteille se tient, on la prend, on sert, le verre est plein
  var CLES = [[0, DEB], [.1, 140], [.3, 150], [.62, 240], [.88, FIN], [1, FIN]];
  // Point suivi horizontalement : la bouteille au début, puis le verre et le goulot
  var VISEE = [[DEB, .516, .516], [150, .53, .5], [200, .5, .43], [FIN, .5, .42]];   // colonne 2 : écran étroit, on garde le verre
  // La bouteille du film (image 136) : centre x, haut, largeur du corps, en part de l'image
  var BX = .516, BTOP = .282, BLARG = .089;

  /* ---------- Mesures ---------- */
  var W, H, narrow, repos = null, cible = null, M = 1, LY = 0, LS = 1;
  function cadrage(f) {   // l'image du film couvre l'écran ; on garde le sujet dans le champ
    var s = Math.max(W / 1280, H / 720), fw = 1280 * s, fh = 720 * s;
    var x0 = clamp(W / 2 - table(VISEE, f, narrow ? 2 : 1) * fw, W - fw, 0);
    return { s: s, fw: fw, fh: fh, x0: x0, y0: (H - fh) / 2 };
  }
  function mesurer() {
    W = root.clientWidth; H = innerHeight; narrow = W < 800;
    var cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    dirty = true;
    // la bouteille au repos (sans transformation)
    // sur téléphone, une fois le texte parti, le comptoir monte au milieu et grandit
    LY = narrow ? -H * .2 : 0; LS = narrow ? 1.3 : 1;
    var t1 = bouteille.style.transform, t2 = comptoir.style.transform;
    bouteille.style.transform = "none"; comptoir.style.transform = "translateY(" + LY + "px) scale(" + LS + ")";
    var rb = bouteille.getBoundingClientRect(), rc = colle.getBoundingClientRect();   // relatif à l'écran tenu, où que soit la page
    repos = { left: rb.left - rc.left, top: rb.top - rc.top, width: rb.width, s: LS };
    bouteille.style.transform = t1; comptoir.style.transform = t2;
    // la bouteille du film, à l'écran : même largeur de corps, même haut
    var g = cadrage(DEB), k = BLARG * g.fw / 44;                     // pixels par unité du dessin
    cible = { k: k, x: g.x0 + BX * g.fw - 22 * k, y: g.y0 + BTOP * g.fh, w: 44 * k, h: 173 * k };
    // point d'ancrage de l'ouverture : le milieu du corps de la bouteille ; taille finale qui couvre l'écran
    var ax = cible.x + 22 * k, ay = cible.y + 113 * k;
    cible.ax = ax; cible.ay = ay;
    M = Math.max(Math.max(ax, W - ax) / (22 * k), ay / (30 * k), (H - ay) / (58 * k)) * 1.08;
  }

  /* ---------- Dessin d'une image, dans ses couleurs d'origine ---------- */
  var dessinee = -1;
  function dessiner(f) {
    var a = nearest(f);
    if (a < 0) return false;
    if (a === dessinee && !dirty) return true;
    var g = cadrage(f), k = dpr;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#52232B"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgs[a], g.x0 * k, g.y0 * k, g.fw * k, g.fh * k);
    dessinee = a; dirty = false;
    return true;
  }

  /* ---------- La souris incline le comptoir ; sans souris, il respire à peine ---------- */
  var sx = 0, sy = 0, tx = 0, ty = 0;
  if (hover && !reduce) addEventListener("pointermove", function (e) { sx = e.clientX / W - .5; sy = e.clientY / H - .5; }, { passive: true });

  /* ---------- Boucle ---------- */
  var vals = new Map();
  function pose(el, nom, v) {
    var m = vals.get(el); if (!m) { m = {}; vals.set(el, m); }
    if (m[nom] !== v) { m[nom] = v; if (nom === "transform" || nom === "opacity") el.style[nom] = v; else el.style.setProperty(nom, v); }
  }
  var fs = DEB, ton = "", pLisse = 0;
  function boucle(now) {
    var r = ouv.getBoundingClientRect();
    var pv = clamp(-r.top / Math.max(1, r.height - H), 0, 1);
    pLisse += (pv - pLisse) * (reduce ? 1 : .32);                       // défilement lissé : les gestes brusques ne cassent rien
    if (Math.abs(pv - pLisse) < .0004) pLisse = pv;
    var p = pLisse;

    // inclinaison : souris (ou léger balancement), qui s'efface dès qu'on sert
    var libre = 1 - smooth(p / .1);
    var ax = reduce ? 0 : hover ? sx : Math.sin(now / 2600) * .2, ay = reduce ? 0 : hover ? sy : Math.cos(now / 3100) * .12;
    tx += (ax - tx) * .06; ty += (ay - ty) * .06;
    var l = smooth(p / .08);
    pose(comptoir, "transform", "translateY(" + (LY * l).toFixed(1) + "px) scale(" + (1 + (LS - 1) * l).toFixed(4) + ") rotateX(" + (-ty * 10 * libre).toFixed(2) + "deg) rotateY(" + (tx * 18 * libre).toFixed(2) + "deg)");

    // 1. le texte s'efface, on sert
    var tt = 1 - smooth(p / .07);
    pose(colle, "--t", tt.toFixed(3));
    pose(colle, "--tv", tt <= 0 ? "hidden" : "visible");
    var b = smooth((p - .01) / .1), v = smooth((p - .03) / .1), m = smooth((p - .08) / .04);
    pose(comptoir, "--b", b.toFixed(3)); pose(comptoir, "--v", v.toFixed(3)); pose(comptoir, "--m", m.toFixed(3));

    // 2. les verres s'écartent en tournant, le comptoir s'efface
    var q = douce((p - .13) / .09);
    var zv = 50 * libre;
    pose(biere, "transform", "translate3d(" + (-q * W * .55).toFixed(1) + "px," + (q * 40).toFixed(1) + "px," + zv.toFixed(1) + "px) rotateY(" + (-q * 50).toFixed(1) + "deg) rotate(" + (-q * 8).toFixed(1) + "deg)");
    pose(vin, "transform", "translate3d(" + (q * W * .55).toFixed(1) + "px," + (q * 40).toFixed(1) + "px," + zv.toFixed(1) + "px) rotateY(" + (q * 50).toFixed(1) + "deg) rotate(" + (q * 8).toFixed(1) + "deg)");
    pose(biere, "opacity", (1 - smooth((p - .15) / .06)).toFixed(3));
    pose(vin, "opacity", (1 - smooth((p - .15) / .06)).toFixed(3));
    pose(ligne, "--cl", (1 - smooth((p - .12) / .07)).toFixed(3));

    // 3. la bouteille vient se poser sur celle du film
    var c = douce((p - .13) / .11);
    var sc = lerp(1, cible.w / repos.width, c);
    var dx = lerp(0, (cible.x - repos.left) / repos.s, c), dy = lerp(0, (cible.y - repos.top) / repos.s, c);
    pose(bouteille, "transform", "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0) scale(" + sc.toFixed(4) + ")");
    pose(bouteille, "opacity", (1 - smooth((p - .245) / .03)).toFixed(3));

    // 4. la fenêtre en forme de bouteille s'ouvre sur le film
    var on = p > .235;
    pose(ecran, "--fv", on ? "visible" : "hidden");
    var o = douce((p - .255) / .11), mm = Math.pow(M, o);        // zoom exponentiel : vitesse régulière à l'œil
    var mw = cible.w * mm, mh = cible.h * mm;
    pose(ecran, "--ms", mw.toFixed(1) + "px " + mh.toFixed(1) + "px");
    pose(ecran, "--mp", (cible.ax - 22 * cible.k * mm).toFixed(1) + "px " + (cible.ay - 113 * cible.k * mm).toFixed(1) + "px");
    var plein = o >= 1;
    if (plein !== ecran.classList.contains("ouverte")) ecran.classList.toggle("ouverte", plein);

    // le film : l'image suit le défilement, sans à-coup
    var f = table(CLES, clamp((p - .36) / .64, 0, 1), 1);
    fs += (f - fs) * (reduce ? 1 : .35);
    if (on) dessiner(Math.round(fs));

    // les chapitres passent pendant que la bouteille reste au centre
    var cg = 0;
    chap.forEach(function (x) {
      var u = (p - x.de) / (x.a - x.de);
      var op = u <= 0 || u >= 1 ? 0 : smooth(u / .22) * (1 - smooth((u - .78) / .22));
      cg = Math.max(cg, op);
      pose(x.el, "--o", op.toFixed(3));
      pose(x.el, "--y", ((.5 - clamp(u, 0, 1)) * H * (narrow ? .1 : .3)).toFixed(1) + "px");
    });
    pose(chapitres, "--cg", cg.toFixed(3));
    pose(colle, "--fin", smooth((p - .9) / .1).toFixed(3));

    // en-tête : clair au début, sombre une fois le film ouvert
    var t2 = p > .3 ? "sombre" : "clair";
    if (t2 !== ton) { ton = t2; ouv.setAttribute("data-ton", ton); }
    VC.majTete();

    // les vignes glissent un peu moins vite que la page
    if (terroirImg && !reduce) {
      var rt = terroir.getBoundingClientRect();
      if (rt.bottom > 0 && rt.top < H) pose(terroirImg, "--py", ((rt.top + rt.height / 2 - H / 2) * -.12).toFixed(1) + "px");
    }

    if (!hover && bougie) bougie.style.setProperty("--by", (H / 2 - bar.getBoundingClientRect().top).toFixed(0) + "px");
    requestAnimationFrame(boucle);
  }
  // l'ouverture se lit depuis le début : on ne reprend pas au milieu après un rechargement
  if ("scrollRestoration" in history && !location.hash) history.scrollRestoration = "manual";
  mesurer();
  addEventListener("resize", mesurer);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(mesurer);
  requestAnimationFrame(boucle);

  /* ---------- La bougie du bar suit la souris ---------- */
  if (hover && bar && !reduce) {
    bar.addEventListener("pointermove", function (e) {
      var r = bar.getBoundingClientRect();
      bougie.style.setProperty("--bx", (e.clientX - r.left).toFixed(0) + "px");
      bougie.style.setProperty("--by", (e.clientY - r.top).toFixed(0) + "px");
    });
  }
})();
