/* Vinochope · scripts communs à toutes les pages */
(function () {
  var doc = document.documentElement;
  doc.classList.remove("no-js"); doc.classList.add("js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- En-tête : devient opaque au défilement ---------- */
  var top = document.querySelector(".top");
  function onScroll() { if (top) top.classList.toggle("solid", window.scrollY > 40); }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- Menu plein écran ---------- */
  var drawer = document.getElementById("drawer"), burger = document.querySelector(".burger");
  var lastFocus = null;
  function focusables() { return [].slice.call(drawer.querySelectorAll("a, button")); }
  function openDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { lastFocus = document.activeElement; setTimeout(function () { var f = focusables(); if (f[0]) f[0].focus(); }, 50); }
    else if (lastFocus) lastFocus.focus();
  }
  if (burger && drawer) {
    burger.addEventListener("click", function () { openDrawer(true); });
    drawer.querySelector("[data-close]").addEventListener("click", function () { openDrawer(false); });
    drawer.addEventListener("keydown", function (e) {
      if (e.key === "Escape") openDrawer(false);
      if (e.key === "Tab") {
        var f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    drawer.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { openDrawer(false); }); });
  }

  /* ---------- Porte d'entrée +18 (Loi Évin) ---------- */
  var gate = document.getElementById("gate");
  if (gate && store.get("vc-majeur") !== "1") {
    gate.hidden = false;
    var yes = gate.querySelector("[data-yes]"), no = gate.querySelector("[data-no]");
    setTimeout(function () { yes.focus(); }, 60);
    yes.addEventListener("click", function () { store.set("vc-majeur", "1"); gate.hidden = true; });
    no.addEventListener("click", function () {
      gate.querySelector(".gate-msg").hidden = false;
      gate.querySelector(".gate-q").hidden = true;
    });
    gate.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = [].slice.call(gate.querySelectorAll("button:not([hidden]), a")).filter(function (x) { return x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ---------- Ouvert / fermé (heure de Perpignan) ---------- */
  // 0 = dimanche. Créneaux en minutes depuis minuit.
  var HOURS = { 0: [], 1: [[900, 1260]], 2: [[600, 750], [870, 1260]], 3: [[600, 750], [870, 1260]], 4: [[600, 750], [870, 1260]], 5: [[600, 750], [870, 1260]], 6: [[600, 750], [870, 1260]] };
  var DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  function hm(m) { var h = Math.floor(m / 60), mi = m % 60; return h + " h" + (mi ? " " + (mi < 10 ? "0" : "") + mi : ""); }
  function parisNow() {
    try {
      var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      return { d: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday), m: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) { var n = new Date(); return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() }; }
  }
  function status() {
    var n = parisNow(), today = HOURS[n.d];
    for (var i = 0; i < today.length; i++) if (n.m >= today[i][0] && n.m < today[i][1]) return { open: true, text: "Ouvert jusqu'à " + hm(today[i][1]) };
    for (i = 0; i < today.length; i++) if (n.m < today[i][0]) return { open: false, text: "Fermé · ouvre à " + hm(today[i][0]) };
    for (var k = 1; k <= 7; k++) {
      var d = (n.d + k) % 7;
      if (HOURS[d].length) return { open: false, text: "Fermé · ouvre " + (k === 1 ? "demain" : DAYS[d]) + " à " + hm(HOURS[d][0][0]) };
    }
    return { open: false, text: "Fermé" };
  }
  var st = status(), nowP = parisNow();
  document.querySelectorAll("[data-status]").forEach(function (el) { el.textContent = st.text; el.classList.add("status"); el.classList.toggle("open", st.open); });
  document.querySelectorAll(".hours tr[data-days]").forEach(function (tr) {
    if (tr.getAttribute("data-days").split(",").indexOf(String(nowP.d)) > -1) { tr.classList.add("today"); tr.setAttribute("aria-current", "date"); }
  });

  /* ---------- Formulaires : vérification accessible ---------- */
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      form.querySelectorAll("input, select, textarea").forEach(function (f) {
        if (!f.id) return;
        var err = form.querySelector('[data-err="' + f.id + '"]'), msg = "";
        if (f.required && f.type === "checkbox" && !f.checked) msg = "Merci de cocher cette case.";
        else if (f.required && !f.value.trim()) msg = "Ce champ est obligatoire.";
        else if (f.type === "email" && f.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value)) msg = "L'adresse e-mail semble incomplète (exemple : prenom@exemple.fr).";
        if (err) { err.textContent = msg; f.setAttribute("aria-describedby", err.id); }
        f.setAttribute("aria-invalid", msg ? "true" : "false");
        if (msg && !firstBad) firstBad = f;
      });
      if (firstBad) { firstBad.focus(); return; }
      var ok = form.querySelector(".ok");
      if (ok) { ok.classList.add("show"); ok.setAttribute("tabindex", "-1"); ok.focus(); }
      form.querySelectorAll("button[type=submit]").forEach(function (b) { b.disabled = true; });
    });
  });

  /* ---------- Apparitions au défilement ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("in"); });

  /* ---------- Phrases qui s'éclairent mot à mot ---------- */
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
  var ticking = false;
  function lightWords() {
    ticking = false;
    var H = innerHeight;
    wordEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var v = (reduce || el.closest(".hero")) ? 1 : Math.min(1, Math.max(0, (H * 0.95 - r.top) / (H * 0.3)));
      var lit = Math.round(v * el._w.length);
      for (var j = 0; j < el._w.length; j++) el._w[j].classList.toggle("on", j < lit);
    });
  }
  if (wordEls.length) {
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(lightWords); } }, { passive: true });
    addEventListener("resize", lightWords);
    lightWords();
  }

  /* ---------- Divers ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
