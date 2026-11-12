/* Vinochope · « La descente » */
(function () {
  var root = document.documentElement;
  root.classList.remove("no-js"); root.classList.add("js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hover = window.matchMedia && matchMedia("(hover: hover)").matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function table(T, x, col) {          // interpolation linéaire dans une table triée sur la 1re colonne
    if (x <= T[0][0]) return T[0][col];
    for (var i = 0; i < T.length - 1; i++) if (x <= T[i + 1][0]) {
      var t = (x - T[i][0]) / ((T[i + 1][0] - T[i][0]) || 1);
      return lerp(T[i][col], T[i + 1][col], t);
    }
    return T[T.length - 1][col];
  }

  /* ---------- Défilement doux ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href"), el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var y = id === "#rue" ? 0 : el.getBoundingClientRect().top + scrollY;
      if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
      if (el.tabIndex < 0) el.setAttribute("tabindex", "-1");
      setTimeout(function () { el.focus({ preventScroll: true }); }, reduce ? 0 : 900);
    });
  });

  /* ---------- Éléments ---------- */
  var W, H;
  var rue = document.querySelector(".rue"), porte = document.querySelector(".porte-voute");
  var film = document.querySelector(".film"), voute = document.querySelector(".voute-film");
  var canvas = document.querySelector(".film-toile"), ctx = canvas.getContext("2d");
  var grappe = document.querySelector(".film-grappe");
  var etapes = [].slice.call(document.querySelectorAll(".etape"));
  var tete = document.querySelector(".tete"), jauge = document.querySelector(".jauge");
  var lectP = jauge.querySelector("[data-prof]"), lectT = jauge.querySelector("[data-temp]"), bille = jauge.querySelector(".jauge-bille"), rail = jauge.querySelector(".jauge-rail");
  var secs = [].slice.call(document.querySelectorAll("main > section"));
  var navLinks = [].slice.call(document.querySelectorAll(".nav a"));
  var bar = document.querySelector(".bar"), bougie = document.querySelector(".bougie");
  var dpr = Math.min(devicePixelRatio || 1, 2);

  /* ---------- Images de la vidéo (du tourbillon au verre plein) ---------- */
  var N = 291, FIRST = 24;            // avant l'image 24, la main tient la grappe : jamais montrée
  var size = (innerWidth >= 800 && dpr * innerHeight > 900) ? "lg" : "sm";
  var imgs = [], loaded = new Uint8Array(N);
  // Progression dans la section → image : la grappe, le tourbillon, la bouteille entière (tenue), le service, le verre plein
  var KEYS = [[0, FIRST], [.1, FIRST], [.36, 112], [.48, 143], [.62, 143], [.93, 290], [1, 290]];
  // Cadrage : [image, centre x du sujet, centre y du sujet, hauteur de l'image × hauteur de la voûte, position y à l'écran]
  var CROP = [
    [24,  .47, .67, 1.62, .55],       // tourbillon : on serre et on descend, la main reste hors cadre
    [118, .47, .67, 1.62, .55],
    [136, .53, .50, 1.02, .52],       // la bouteille, entière
    [150, .56, .50, .98, .52],
    [178, .61, .56, .70, .58],        // le verre entre : on recule pour tout montrer
    [290, .61, .56, .70, .58]
  ];
  var order = [24, 74, 112, 143, 200, 250, 290], seen = {};
  order.forEach(function (i) { seen[i] = 1; });
  [16, 8, 4, 2, 1].forEach(function (s) { for (var i = FIRST; i < N; i += s) if (!seen[i]) { seen[i] = 1; order.push(i); } });
  var cur = 0, active = 0, dirty = true;
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
    for (var d = 0; d < N; d++) { if (f - d >= FIRST && loaded[f - d]) return f - d; if (f + d < N && loaded[f + d]) return f + d; }
    return -1;
  }
  if (document.readyState === "complete") setTimeout(next, 300); else addEventListener("load", function () { setTimeout(next, 300); });

  function frameAt(q) {
    for (var i = 0; i < KEYS.length - 1; i++) if (q <= KEYS[i + 1][0]) {
      var t = (q - KEYS[i][0]) / ((KEYS[i + 1][0] - KEYS[i][0]) || 1);
      return lerp(KEYS[i][1], KEYS[i + 1][1], smooth(t));
    }
    return KEYS[KEYS.length - 1][1];
  }

  var cw = 0, ch = 0;
  function measure() {
    W = root.clientWidth; H = innerHeight;
    var r = voute.getBoundingClientRect();
    var nw = Math.round(r.width * dpr), nh = Math.round(r.height * dpr);
    if (nw && (nw !== cw || nh !== ch)) { cw = canvas.width = nw; ch = canvas.height = nh; dirty = true; }
  }

  // Fond de la vidéo (prune sombre), pour prolonger l'image quand on recule
  var HAUT = "rgb(40,26,30)", BAS = "rgb(24,13,17)";
  function drawFrame(f) {
    var a = nearest(Math.floor(f)), b = nearest(Math.ceil(f));
    if (a < 0 || !cw) return false;
    var z = table(CROP, f, 3), sx = table(CROP, f, 1), sy = table(CROP, f, 2), ty = table(CROP, f, 4);
    var fh = ch * z, fw = fh * 16 / 9;
    var x0 = cw / 2 - sx * fw, y0 = ch * ty - sy * fh;
    x0 = clamp(x0, Math.min(0, cw - fw), Math.max(0, cw - fw));
    if (fh >= ch) y0 = clamp(y0, ch - fh, 0);
    var bg = ctx.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, HAUT); bg.addColorStop(1, BAS);
    ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(imgs[a], x0, y0, fw, fh);
    var fr = f - Math.floor(f);
    if (b !== a && fr > 0.02) { ctx.globalAlpha = fr; ctx.drawImage(imgs[b], x0, y0, fw, fh); ctx.globalAlpha = 1; }
    if (fh < ch) {               // fondu des bords haut et bas de l'image dans le fond
      var e = fh * .14, g1 = ctx.createLinearGradient(0, y0, 0, y0 + e);
      g1.addColorStop(0, "rgb(36,22,26)"); g1.addColorStop(1, "rgba(36,22,26,0)");
      ctx.fillStyle = g1; ctx.fillRect(0, y0 - 1, cw, e + 1);
      var y1 = y0 + fh, g2 = ctx.createLinearGradient(0, y1 - e, 0, y1);
      g2.addColorStop(0, "rgba(26,14,18,0)"); g2.addColorStop(1, "rgb(26,14,18)");
      ctx.fillStyle = g2; ctx.fillRect(0, y1 - e, cw, e + 1);
    }
    return true;
  }

  /* ---------- Profondeur ---------- */
  var MAXP = 11;
  function fmt(n) { return (n < 0.05 ? "0,0" : "−" + n.toFixed(1).replace(".", ",")) + " m"; }

  /* ---------- Boucle ---------- */
  var lastF = -1, lastY = -1, prevY = 0;
  function frame() {
    var y = scrollY;
    if (y !== lastY || dirty) {
      lastY = y;
      // Niveau 0 : la porte s'ouvre et nous avale
      var rr = rue.getBoundingClientRect();
      var p = clamp(-rr.top / Math.max(1, rr.height - H), 0, 1);
      var pe = Math.pow(clamp(p / .88, 0, 1), 2.6);     // la porte grandit lentement, puis nous avale
      var pw = porte.offsetWidth || 1;
      var smax = Math.max(W / pw, H / (pw * 1.4)) * 1.9;
      rue.style.setProperty("--p", p.toFixed(4));
      porte.style.setProperty("--s", (1 + pe * (smax - 1)).toFixed(4));

      // Niveau −2 : la vidéo dans la voûte
      var fr = film.getBoundingClientRect();
      var q = clamp(-fr.top / Math.max(1, fr.height - H), 0, 1);
      var gq = clamp((q - .06) / .14, 0, 1);
      grappe.style.setProperty("--g", (1 - smooth(gq)).toFixed(3));
      grappe.style.setProperty("--gs", (1 + gq * .35).toFixed(3));
      grappe.style.setProperty("--gb", (gq * 10).toFixed(1) + "px");
      var step = q < .38 ? 0 : q < .64 ? 1 : 2;
      etapes.forEach(function (el, i) { el.classList.toggle("on", i === step); });
      if (fr.bottom > -50 && fr.top < H + 50) {
        var f = frameAt(q);
        if (Math.abs(f - lastF) > .01 || dirty) { if (drawFrame(f)) { lastF = f; dirty = false; } }
      }

      // Jauge : profondeur et température au milieu de l'écran
      var mid = H / 2, depth = 0, ton = "clair", tonTete = "clair", curSec = null;
      for (var i = 0; i < secs.length; i++) {
        var r = secs[i].getBoundingClientRect(), d0 = +secs[i].getAttribute("data-prof");
        var d1 = i < secs.length - 1 ? +secs[i + 1].getAttribute("data-prof") : d0;
        if (r.top <= mid && r.bottom > mid) {
          depth = lerp(d0, d1, clamp((mid - r.top) / r.height, 0, 1));
          if (i === 0) depth = p * 1.6;
        }
        if (r.top <= mid && r.bottom > mid) ton = toneOf(secs[i], p);
        if (r.top <= 34 && r.bottom > 34) { tonTete = toneOf(secs[i], p); curSec = secs[i]; }
      }
      if (scrollY + H >= document.documentElement.scrollHeight - 4) { depth = 0; ton = "sombre"; }
      lectP.textContent = fmt(depth);
      lectT.textContent = (18 - depth * 6 / MAXP).toFixed(1).replace(".", ",").replace(",0", "") + " °C";
      if (rail.offsetHeight) bille.style.setProperty("--y", (depth / MAXP * (rail.offsetHeight - 11)).toFixed(1) + "px");
      jauge.setAttribute("data-ton", W < 900 ? "clair" : ton);
      tete.setAttribute("data-ton", tonTete);
      // L'en-tête se range quand on descend, revient quand on remonte, sur le fond de la section
      var bas = y > prevY + 2, haut = y < prevY - 2;
      if (y < 80) tete.classList.remove("range");
      else if (bas) tete.classList.add("range");
      else if (haut) tete.classList.remove("range");
      prevY = y;
      tete.style.backgroundColor = (y > 80 && curSec && !(curSec === rue && p < .99)) ? getComputedStyle(curSec).backgroundColor : "";
      navLinks.forEach(function (a) {
        var on = curSec && a.getAttribute("href") === "#" + curSec.id;
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });

      // Niveau −3 : sur écran tactile, la bougie suit le milieu de l'écran
      if (!hover && bougie) {
        var br = bar.getBoundingClientRect();
        bougie.style.setProperty("--by", (mid - br.top).toFixed(0) + "px");
      }
    } else if (dirty) {
      var f2 = frameAt(clamp(-film.getBoundingClientRect().top / Math.max(1, film.offsetHeight - H), 0, 1));
      if (drawFrame(f2)) { lastF = f2; dirty = false; }
    }
    requestAnimationFrame(frame);
  }
  function toneOf(sec, p) {
    if (sec.classList.contains("rue")) return p > .55 ? "sombre" : "clair";
    return (sec.classList.contains("scene") || sec.classList.contains("venir")) ? "clair" : "sombre";
  }
  measure();
  addEventListener("resize", function () { measure(); lastY = -1; });
  requestAnimationFrame(frame);

  /* ---------- La bougie suit la souris ---------- */
  if (hover && bar && !reduce) {
    bar.addEventListener("pointermove", function (e) {
      var r = bar.getBoundingClientRect();
      bougie.style.setProperty("--bx", (e.clientX - r.left).toFixed(0) + "px");
      bougie.style.setProperty("--by", (e.clientY - r.top).toFixed(0) + "px");
    });
  }

  /* ---------- Apparitions ---------- */
  var reveals = document.querySelectorAll(".montee");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("vu"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .1 });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("vu"); });

  /* ---------- Ouvert / fermé (heure de Perpignan) ---------- */
  var HOURS = { 0: [], 1: [[900, 1260]], 2: [[600, 750], [870, 1260]], 3: [[600, 750], [870, 1260]], 4: [[600, 750], [870, 1260]], 5: [[600, 750], [870, 1260]], 6: [[600, 750], [870, 1260]] };
  var DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  function hm(m) { var h = Math.floor(m / 60), mi = m % 60; return h + " h" + (mi ? " " + (mi < 10 ? "0" : "") + mi : ""); }
  function parisNow() {
    try {
      var o = {};
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
        .formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
      return { d: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday), m: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) { var n = new Date(); return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() }; }
  }
  function status() {
    var n = parisNow(), today = HOURS[n.d];
    for (var i = 0; i < today.length; i++) if (n.m >= today[i][0] && n.m < today[i][1]) return { open: true, text: "Ouvert jusqu'à " + hm(today[i][1]) };
    for (i = 0; i < today.length; i++) if (n.m < today[i][0]) return { open: false, text: "Fermé, ouvre à " + hm(today[i][0]) };
    for (var k = 1; k <= 7; k++) {
      var d = (n.d + k) % 7;
      if (HOURS[d].length) return { open: false, text: "Fermé, ouvre " + (k === 1 ? "demain" : DAYS[d]) + " à " + hm(HOURS[d][0][0]) };
    }
    return { open: false, text: "Fermé" };
  }
  var st = status(), now = parisNow();
  document.querySelectorAll("[data-statut]").forEach(function (el) { el.textContent = st.text; el.classList.toggle("ouvert", st.open); });
  document.querySelectorAll(".horaires tr[data-jours]").forEach(function (tr) {
    if (tr.getAttribute("data-jours").split(",").indexOf(String(now.d)) > -1) { tr.classList.add("aujourdhui"); tr.setAttribute("aria-current", "date"); }
  });
  document.querySelectorAll("[data-annee]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Le seuil : 18 ans et plus (Loi Évin) ---------- */
  var seuil = document.getElementById("seuil");
  if (seuil && store.get("vc-majeur") !== "1") {
    seuil.hidden = false;
    if (lenis) lenis.stop();
    root.style.overflow = "hidden";
    var oui = seuil.querySelector("[data-oui]"), non = seuil.querySelector("[data-non]");
    setTimeout(function () { oui.focus(); }, 60);
    oui.addEventListener("click", function () {
      store.set("vc-majeur", "1"); seuil.hidden = true; root.style.overflow = "";
      if (lenis) lenis.start();
      var h1 = document.getElementById("t-rue"); h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true });
    });
    non.addEventListener("click", function () {
      seuil.querySelector(".seuil-non").hidden = false;
      seuil.querySelector(".seuil-btns").hidden = true;
      seuil.querySelector(".seuil-non").setAttribute("tabindex", "-1");
      seuil.querySelector(".seuil-non").focus();
    });
    seuil.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = [].slice.call(seuil.querySelectorAll("button")).filter(function (x) { return x.offsetParent; });
      if (!f.length) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }
})();
