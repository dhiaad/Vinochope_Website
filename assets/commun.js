/* Vinochope · scripts communs à toutes les pages
   En-tête, menu, défilement doux, porte des 18 ans, horaires, apparitions, données gérables */
(function () {
  var root = document.documentElement;
  root.classList.remove("no-js"); root.classList.add("js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var VC = window.VC = { reduce: reduce, store: store, lenis: null };

  /* ---------- Défilement doux ---------- */
  if (window.Lenis && !reduce && !document.body.hasAttribute("data-sans-lenis")) {
    VC.lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    (function raf(t) { VC.lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
  }
  VC.allerA = function (el, offset) {
    var y = typeof el === "number" ? el : el.getBoundingClientRect().top + scrollY - (offset || 0);
    if (VC.lenis) VC.lenis.scrollTo(y, { duration: 1.4 }); else scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href"), el = id.length > 1 && document.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    fermerMenu();
    VC.allerA(el, id === "#rue" ? 0 : 70);
    history.replaceState(null, "", id);
    if (el.tabIndex < 0 && !/^(A|BUTTON|INPUT)$/.test(el.tagName)) el.setAttribute("tabindex", "-1");
    setTimeout(function () { el.focus({ preventScroll: true }); }, reduce ? 0 : 900);
  });
  // Arrivée sur une page avec une ancre : on laisse la mise en page se faire puis on y va
  if (location.hash.length > 1) addEventListener("load", function () {
    var el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(function () { VC.allerA(el, 70); }, 60);
  });

  /* ---------- En-tête : ton clair ou sombre selon la section dessous, se range à la descente ---------- */
  var tete = document.querySelector(".tete");
  var tonnes = [].slice.call(document.querySelectorAll("[data-ton]")).filter(function (s) { return s !== tete && !s.closest(".tete"); });
  var prevY = scrollY, tic = false;
  function majTete() {
    tic = false;
    if (!tete) return;
    var y = scrollY, sous = null;
    for (var i = 0; i < tonnes.length; i++) {
      var r = tonnes[i].getBoundingClientRect();
      if (r.top <= 34 && r.bottom > 34) sous = tonnes[i];
    }
    tete.setAttribute("data-ton", sous ? sous.getAttribute("data-ton") : "clair");
    if (y < 80 || menuOuvert) tete.classList.remove("range");
    else if (y > prevY + 2) tete.classList.add("range");
    else if (y < prevY - 2) tete.classList.remove("range");
    prevY = y;
    var fond = sous && sous.getAttribute("data-fond-tete") !== "non" ? getComputedStyle(sous).backgroundColor : "";
    tete.style.backgroundColor = (y > 80 && fond && fond !== "rgba(0, 0, 0, 0)") ? fond : "";
  }
  VC.majTete = majTete;
  addEventListener("scroll", function () { if (!tic) { tic = true; requestAnimationFrame(majTete); } }, { passive: true });
  addEventListener("resize", majTete);
  majTete();

  /* ---------- Menu plein écran ---------- */
  var menu = document.getElementById("menu"), menuBtn = document.querySelector(".menu-btn"), menuOuvert = false, avantMenu = null;
  function focusables() { return [].slice.call(menu.querySelectorAll("a, button")); }
  function ouvrirMenu() {
    if (!menu) return;
    menuOuvert = true; avantMenu = document.activeElement;
    menu.hidden = false; requestAnimationFrame(function () { menu.classList.add("ouvert"); });
    menuBtn.setAttribute("aria-expanded", "true"); menuBtn.textContent = "Fermer";
    root.classList.add("menu-ouvert"); if (VC.lenis) VC.lenis.stop();
    tete.classList.remove("range");
    setTimeout(function () { var f = focusables(); if (f[0]) f[0].focus(); }, 60);
  }
  function fermerMenu() {
    if (!menu || !menuOuvert) return;
    menuOuvert = false; menu.classList.remove("ouvert");
    setTimeout(function () { if (!menuOuvert) menu.hidden = true; }, reduce ? 0 : 400);
    menuBtn.setAttribute("aria-expanded", "false"); menuBtn.textContent = "Menu";
    root.classList.remove("menu-ouvert"); if (VC.lenis) VC.lenis.start();
    if (avantMenu) avantMenu.focus();
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener("click", function () { menuOuvert ? fermerMenu() : ouvrirMenu(); });
    document.addEventListener("keydown", function (e) {
      if (!menuOuvert) return;
      if (e.key === "Escape") fermerMenu();
      if (e.key === "Tab") {
        var f = [menuBtn].concat(focusables()), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Apparitions au défilement ---------- */
  var io = ("IntersectionObserver" in window && !reduce) ? new IntersectionObserver(function (en) {
    en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("vu"); io.unobserve(x.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .08 }) : null;
  VC.apparitions = function (scope) {
    (scope || document).querySelectorAll(".montee:not(.vu)").forEach(function (el) { if (io) io.observe(el); else el.classList.add("vu"); });
  };
  VC.apparitions();

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
  document.querySelectorAll("[data-statut]").forEach(function (el) { el.textContent = st.text; el.classList.add("statut"); el.classList.toggle("ouvert", st.open); });
  document.querySelectorAll("tr[data-jours]").forEach(function (tr) {
    if (tr.getAttribute("data-jours").split(",").indexOf(String(now.d)) > -1) { tr.classList.add("aujourdhui"); tr.setAttribute("aria-current", "date"); }
  });
  document.querySelectorAll("[data-annee]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Données gérables depuis l'espace gérant ----------
     Le site lit d'abord data/<nom>.json ; si le gérant a modifié la liste sur cet appareil, c'est sa version qui s'affiche. */
  VC.cleGerant = function (nom) { return "vc-gerant-" + nom; };
  VC.donnees = function (nom) {
    var local = store.get(VC.cleGerant(nom));
    if (local) { try { return Promise.resolve(JSON.parse(local)); } catch (e) {} }
    return fetch("data/" + nom + ".json", { cache: "no-cache" }).then(function (r) { return r.json(); });
  };
  VC.echapper = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  VC.prix = function (n) {
    n = +n; if (!n) return "Gratuit";
    return (n % 1 ? n.toFixed(2).replace(".", ",") : String(n)) + " €";
  };

  /* ---------- La porte : 18 ans et plus (Loi Évin) ---------- */
  var seuil = document.getElementById("seuil");
  if (seuil && store.get("vc-majeur") !== "1") {
    seuil.hidden = false;
    if (VC.lenis) VC.lenis.stop();
    root.style.overflow = "hidden";
    var oui = seuil.querySelector("[data-oui]"), non = seuil.querySelector("[data-non]");
    setTimeout(function () { oui.focus(); }, 60);
    oui.addEventListener("click", function () {
      store.set("vc-majeur", "1"); seuil.hidden = true; root.style.overflow = "";
      if (VC.lenis) VC.lenis.start();
      var h1 = document.querySelector("h1"); if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
    });
    non.addEventListener("click", function () {
      var msg = seuil.querySelector(".seuil-non");
      msg.hidden = false; seuil.querySelector(".seuil-btns").hidden = true;
      msg.setAttribute("tabindex", "-1"); msg.focus();
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
