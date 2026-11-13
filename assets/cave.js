/* Vinochope · accueil
   1. Une grande photo plein écran : une bouteille de rouge et son verre, devant la prairie. Elle défile comme une page.
   2. Plus bas, le film, à part : il reste à l'écran pendant qu'on fait défiler, de la bouteille debout au verre servi. */
(function () {
  var VC = window.VC, reduce = VC.reduce;
  var root = document.documentElement;
  var hover = window.matchMedia && matchMedia("(hover: hover)").matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function table(T, x, col) {
    if (x <= T[0][0]) return T[0][col];
    for (var i = 0; i < T.length - 1; i++) if (x <= T[i + 1][0])
      return lerp(T[i][col], T[i + 1][col], smooth((x - T[i][0]) / ((T[i + 1][0] - T[i][0]) || 1)));
    return T[T.length - 1][col];
  }

  /* ---------- La photo d'accueil : elle apparaît en fondu, rien de plus ---------- */
  var photo = document.querySelector(".acc-photo"), pimg = photo && photo.querySelector("img");
  function prete() { photo.classList.add("prete"); }
  if (pimg) { if (pimg.complete) prete(); else { pimg.addEventListener("load", prete); pimg.addEventListener("error", prete); } }

  /* ---------- Le film ---------- */
  var ouv = document.querySelector(".ouverture"), colle = ouv.querySelector(".ouv-colle");
  var canvas = ouv.querySelector(".ouv-film"), ctx = canvas.getContext("2d", { alpha: false });
  var chapitres = ouv.querySelector(".chapitres");
  var chap = [].slice.call(ouv.querySelectorAll(".chapitre-film")).map(function (el) {
    return { el: el, de: +el.getAttribute("data-de"), a: +el.getAttribute("data-a") };
  });
  var bar = document.querySelector(".bar"), bougie = document.querySelector(".bougie");
  var terroir = document.querySelector(".terroir"), terroirImg = terroir && terroir.querySelector("img");
  var cliches = [].slice.call(document.querySelectorAll(".cliche img"));

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
      im.onload = function () { im.decode ? im.decode().then(fini, fini) : fini(); };
      im.onerror = function () { active--; next(); };
      im.src = "media/" + size + "/f" + pad(i) + ".webp";
    })(order[cur++]);
  }
  function nearest(f) {
    for (var d = 0; d < N; d++) { if (f - d >= DEB && loaded[f - d]) return f - d; if (f + d <= FIN && loaded[f + d]) return f + d; }
    return -1;
  }
  setTimeout(next, 300);

  var CLES = [[0, DEB], [.06, 140], [.24, 150], [.58, 240], [.88, FIN], [1, FIN]];
  var VISEE = [[DEB, .516, .516], [150, .53, .5], [200, .5, .43], [FIN, .5, .42]];

  /* ---------- Mesures ---------- */
  var W, H, narrow;
  function cadrage(f) {
    var s = Math.max(W / 1280, H / 720), fw = 1280 * s, fh = 720 * s;
    var x0 = clamp(W / 2 - table(VISEE, f, narrow ? 2 : 1) * fw, W - fw, 0);
    return { fw: fw, fh: fh, x0: x0, y0: (H - fh) / 2 };
  }
  function mesurer() {
    W = root.clientWidth; H = innerHeight; narrow = W < 800;
    var cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    dirty = true;
  }

  /* ---------- Dessin d'une image du film, plein écran ---------- */
  var dessinee = -1, fDessin = -1;
  function dessiner(f) {
    var a = nearest(f);
    if (a < 0) return false;
    if (a === dessinee && !dirty && f === fDessin) return true;
    var g = cadrage(f), k = dpr;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#52232B"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgs[a], g.x0 * k, g.y0 * k, g.fw * k, g.fh * k);
    dessinee = a; fDessin = f; dirty = false;
    return true;
  }

  /* ---------- Boucle ---------- */
  var vals = new Map();
  function pose(el, nom, v) {
    var m = vals.get(el); if (!m) { m = {}; vals.set(el, m); }
    if (m[nom] !== v) { m[nom] = v; if (nom === "transform" || nom === "opacity" || nom === "visibility") el.style[nom] = v; else el.style.setProperty(nom, v); }
  }
  var fs = DEB, pLisse = 0;
  function boucle() {
    var r = ouv.getBoundingClientRect();
    var visible = r.top < H && r.bottom > 0;
    var pv = clamp(-r.top / Math.max(1, r.height - H), 0, 1);
    pLisse += (pv - pLisse) * (reduce ? 1 : .32);
    if (Math.abs(pv - pLisse) < .0004) pLisse = pv;
    var p = pLisse;

    if (visible) {
      var f = table(CLES, p, 1);
      fs += (f - fs) * (reduce ? 1 : .35);
      dessiner(Math.round(fs));

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
    }
    VC.majTete();

    // les vignes glissent un peu moins vite que la page
    if (terroirImg && !reduce) {
      var rt = terroir.getBoundingClientRect();
      if (rt.bottom > 0 && rt.top < H) pose(terroirImg, "--py", ((rt.top + rt.height / 2 - H / 2) * -.12).toFixed(1) + "px");
    }
    // les photos des sections aussi, dans leur cadre
    if (!reduce) for (var ci = 0; ci < cliches.length; ci++) {
      var rc = cliches[ci].parentNode.getBoundingClientRect();
      if (rc.bottom > 0 && rc.top < H) pose(cliches[ci], "--py", ((rc.top + rc.height / 2 - H / 2) / H * -rc.height * .07).toFixed(1) + "px");
    }

    if (!hover && bougie) bougie.style.setProperty("--by", (H / 2 - bar.getBoundingClientRect().top).toFixed(0) + "px");
    requestAnimationFrame(boucle);
  }
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
