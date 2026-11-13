/* Vinochope · accueil
   Un seul écran tenu pendant l'ouverture : la page ne monte pas.
   1. La fenêtre voûtée est un objet en relief (embrasure en quatre anneaux) qui suit la souris.
   2. Au défilement, on avance dedans : vraie perspective, le cadre passe plus vite que la grappe.
   3. Une fois dedans, la bouteille apparaît en plein écran et le vin est servi (images de la vidéo),
      pendant que les chapitres passent de chaque côté. */
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
  var porte = ouv.querySelector(".porte"), grappe = ouv.querySelector(".porte-grappe");
  var canvas = ouv.querySelector(".ouv-film"), ctx = canvas.getContext("2d");
  var chap = [].slice.call(ouv.querySelectorAll(".chapitre-film")).map(function (el) {
    return { el: el, de: +el.getAttribute("data-de"), a: +el.getAttribute("data-a") };
  });
  var bar = document.querySelector(".bar"), bougie = document.querySelector(".bougie");
  var P = 1400;                       // perspective de la scène (identique au CSS)

  /* ---------- Images de la vidéo : de la bouteille entière au verre plein ---------- */
  var DEB = 136, FIN = 290, N = FIN + 1;
  var dpr = Math.min(devicePixelRatio || 1, 1.75);
  var size = (innerWidth >= 800 && innerHeight * dpr > 900) ? "lg" : "sm";
  var imgs = [], loaded = new Uint8Array(N), cur = 0, active = 0, dirty = true;
  var order = [DEB, 150, 176, 210, 240, 268, FIN], seen = {};
  order.forEach(function (i) { seen[i] = 1; });
  [16, 8, 4, 2, 1].forEach(function (s) { for (var i = DEB; i <= FIN; i += s) if (!seen[i]) { seen[i] = 1; order.push(i); } });
  function pad(i) { return ("00" + i).slice(-3); }
  function next() {
    while (active < 6 && cur < order.length) (function (i) {
      active++;
      var im = new Image(); im.decoding = "async";
      im.onload = function () { imgs[i] = im; loaded[i] = 1; active--; dirty = true; next(); };
      im.onerror = function () { active--; next(); };
      im.src = "media/" + size + "/f" + pad(i) + ".webp";
    })(order[cur++]);
  }
  function nearest(f) {
    f = Math.round(f);
    for (var d = 0; d < N; d++) { if (f - d >= DEB && loaded[f - d]) return f - d; if (f + d <= FIN && loaded[f + d]) return f + d; }
    return -1;
  }
  if (document.readyState === "complete") setTimeout(next, 200); else addEventListener("load", function () { setTimeout(next, 200); });

  // Avancée dans la vidéo selon la part du film parcourue : la bouteille se tient, puis on sert, puis le verre plein
  var CLES = [[0, DEB], [.12, 140], [.34, 150], [.62, 240], [.86, FIN], [1, FIN]];
  // Cadrage : [image, centre x du sujet, part de largeur montrée, hauteur (× écran), centre vertical (× écran)]
  var CADRE = [[DEB, .53, .40, .86, .52], [150, .55, .46, .86, .53], [176, .59, .78, .92, .55], [FIN, .60, .78, .92, .55]];

  /* ---------- Mesures ---------- */
  var W, H, narrow, zMax = 0, cible = { x: 0, y: 0 };
  function mesurer() {
    W = root.clientWidth; H = innerHeight; narrow = W < 800;
    var cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; dirty = true; }
    // position de la fenêtre au repos (on retire un instant ses transformations)
    var t = porte.style.transform; porte.style.transform = "none";
    var r = porte.getBoundingClientRect(), c = colle.getBoundingClientRect();
    porte.style.transform = t;
    var vw = r.width - 14, vh = r.height - 7, droite = Math.max(40, vh - vw / 2);   // partie droite sous l'arc
    // le point que l'on vise : le milieu de la partie droite de la voûte
    cible.x = W / 2 - (r.left - c.left + r.width / 2);
    cible.y = H / 2 - (r.top - c.top + vw / 2 + 7 + droite / 2);
    var S = Math.max(W / vw, H / droite) * 1.25;
    zMax = Math.min(P - 40, P - P / S + 80);
  }

  /* ---------- Dessin d'une image de la vidéo, ramenée au rouge du site et fondue sur les bords ---------- */
  function place(f) {
    var cx = table(CADRE, f, 1), vf = table(CADRE, f, 2), zh = table(CADRE, f, 3), yc = table(CADRE, f, 4);
    var maxWin = narrow ? W * 1.05 : W * .46;
    if (narrow) { zh *= .7; yc = .4; vf = Math.min(.86, vf * 1.1); }
    var fh = Math.min(H * zh, (maxWin / vf) * (720 / 1280)), fw = fh * 1280 / 720;
    return { fh: fh, fw: fw, x0: W / 2 - cx * fw, y0: H * yc - fh / 2, ww: fw * vf };
  }
  function dessiner(f) {
    var a = nearest(Math.floor(f)), b = nearest(Math.ceil(f));
    if (a < 0) return false;
    var g = place(f), k = dpr, cw = canvas.width, ch = canvas.height;
    var x = g.x0 * k, y = g.y0 * k, w = g.fw * k, h = g.fh * k;
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgs[a], x, y, w, h);
    var t = f - Math.floor(f);
    if (b >= 0 && b !== a && t > .02) { ctx.globalAlpha = t; ctx.drawImage(imgs[b], x, y, w, h); ctx.globalAlpha = 1; }
    // la vidéo d'origine est prune : on garde ses lumières et on la passe dans le rouge du site
    var rx = Math.max(0, x), ry = Math.max(0, y), rw = Math.min(cw, x + w) - rx, rh = Math.min(ch, y + h) - ry;
    ctx.globalCompositeOperation = "color"; ctx.fillStyle = "rgb(140,8,8)"; ctx.fillRect(rx, ry, rw, rh);
    ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(98,94,94)"; ctx.fillRect(rx, ry, rw, rh);
    // halo ovale : le sujet se fond dans le rouge de la page, sans bord visible
    ctx.globalCompositeOperation = "destination-in";
    var cxs = W / 2 * k, cys = (g.y0 + g.fh * .5) * k, rX = g.ww / 2 * k * (narrow ? 1.3 : 1.15), rY = g.fh * .6 * k;
    ctx.save(); ctx.translate(cxs, cys); ctx.scale(1, rY / rX);
    var rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rX);
    rg.addColorStop(0, "#000"); rg.addColorStop(.62, "#000"); rg.addColorStop(.84, "rgba(0,0,0,.5)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.fillRect(-cw * 2, -ch * 2 * rX / rY, cw * 4, ch * 4 * rX / rY);
    ctx.restore();
    var v = ctx.createLinearGradient(0, y, 0, y + h);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(.06, "#000"); v.addColorStop(.94, "#000"); v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = "source-over";
    return true;
  }

  /* ---------- La souris incline la fenêtre ; sans souris, elle respire à peine ---------- */
  var sx = 0, sy = 0, tx = 0, ty = 0, gx = 0, gy = 0;
  if (hover && !reduce) addEventListener("pointermove", function (e) { sx = e.clientX / W - .5; sy = e.clientY / H - .5; }, { passive: true });

  /* ---------- Boucle ---------- */
  var vals = new Map();
  function pose(el, nom, v) {
    var m = vals.get(el); if (!m) { m = {}; vals.set(el, m); }
    if (m[nom] !== v) { m[nom] = v; el.style.setProperty(nom, v); }
  }
  var lastF = -1, ton = "";
  function boucle(now) {
    var r = ouv.getBoundingClientRect();
    var p = clamp(-r.top / Math.max(1, r.height - H), 0, 1);

    // inclinaison : souris (ou léger balancement), qui s'efface quand on avance
    var libre = 1 - smooth(p / .12);
    var ax = reduce ? 0 : hover ? sx : Math.sin(now / 2600) * .18, ay = reduce ? 0 : hover ? sy : Math.cos(now / 3100) * .12;
    tx += (ax - tx) * .07; ty += (ay - ty) * .07;
    pose(porte, "--ry", (tx * 16 * libre).toFixed(2) + "deg");
    pose(porte, "--rx", (-ty * 12 * libre).toFixed(2) + "deg");
    gx += (tx * -22 * libre - gx) * .1; gy += (ty * -16 * libre - gy) * .1;     // la grappe, plus loin, bouge en sens inverse
    pose(grappe, "--gx", gx.toFixed(1) + "px"); pose(grappe, "--gy", gy.toFixed(1) + "px");

    // avancée dans la fenêtre
    var c = douce(p / .22), e = douce(p / .3);
    pose(porte, "--dx", (cible.x * c).toFixed(1) + "px");
    pose(porte, "--dy", (cible.y * c).toFixed(1) + "px");
    pose(porte, "--z", (zMax * Math.pow(e, 1.6)).toFixed(1) + "px");
    pose(colle, "--t", (1 - smooth(p / .07)).toFixed(3));
    pose(colle, "--tv", p > .08 ? "hidden" : "visible");
    var go = 1 - smooth((p - .19) / .08);
    pose(grappe, "--go", go.toFixed(3));
    pose(grappe, "--gs", (1 + e * .25).toFixed(3));
    pose(grappe, "--gb", ((1 - go) * 8).toFixed(1) + "px");
    var n = smooth((p - .24) / .05);
    pose(colle, "--n", n.toFixed(3));
    pose(porte, "visibility", n >= 1 ? "hidden" : "visible");
    pose(colle, "--f", smooth((p - .27) / .07).toFixed(3));

    // le film
    var q = clamp((p - .27) / .73, 0, 1), f = table(CLES, q, 1);
    if (p > .2 && (dirty || Math.abs(f - lastF) > .01)) { if (dessiner(f)) { lastF = f; dirty = false; } }

    // les chapitres passent comme une page qui défile, pendant que la bouteille reste au centre
    chap.forEach(function (x) {
      var u = (p - x.de) / (x.a - x.de);
      var o = u <= 0 || u >= 1 ? 0 : smooth(u / .22) * (1 - smooth((u - .78) / .22));
      pose(x.el, "--o", o.toFixed(3));
      pose(x.el, "--y", ((.5 - clamp(u, 0, 1)) * H * (narrow ? .12 : .32)).toFixed(1) + "px");
    });

    // en-tête : clair au début, sombre une fois dans la fenêtre
    var t2 = p > .2 ? "sombre" : "clair";
    if (t2 !== ton) { ton = t2; ouv.setAttribute("data-ton", ton); ouv.style.backgroundColor = ton === "sombre" ? "var(--lie)" : ""; }
    VC.majTete();

    if (!hover && bougie) bougie.style.setProperty("--by", (H / 2 - bar.getBoundingClientRect().top).toFixed(0) + "px");
    requestAnimationFrame(boucle);
  }
  mesurer();
  addEventListener("resize", function () { mesurer(); dirty = true; });
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
