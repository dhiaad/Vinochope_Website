// Wireframe Vinochope : en-tête, pied de page, vérification d'âge, cookies, calque de grille et séquence vidéo simulée.
(function () {
  var page = document.body.dataset.page || "";

  var NAV = [
    ["index.html", "Accueil", "accueil"],
    ["la-cave.html", "La cave", "cave"],
    ["le-bar.html", "Le bar et la carte", "bar"],
    ["programmation.html", "Programmation", "prog"],
    ["infos-pratiques.html", "Infos pratiques", "infos"]
  ];

  function store(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; }
  }

  // ----- En-tête -----
  var header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML =
    '<div class="wrap">' +
      '<a class="logo" href="index.html" aria-label="Vinochope, accueil">Vinochope</a>' +
      '<button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>' +
      '<nav class="nav" id="nav" aria-label="Navigation principale">' +
        NAV.map(function (n) {
          return '<a href="' + n[0] + '"' + (n[2] === page ? ' aria-current="page"' : "") + ">" + n[1] + "</a>";
        }).join("") +
        '<a class="btn" href="location-tireuses.html"' + (page === "tireuses" ? ' aria-current="page"' : "") + ">Louer une tireuse</a>" +
      "</nav>" +
    "</div>";
  document.body.prepend(header);
  var menuBtn = header.querySelector("#menu-btn");
  var nav = header.querySelector("#nav");
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.textContent = open ? "Fermer" : "Menu";
  });

  // ----- Pied de page -----
  var footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML =
    '<div class="wrap">' +
      '<div class="grid">' +
        '<div class="s4 stack-s"><span class="logo" style="width:fit-content">Vinochope</span>' +
          '<p class="small muted">Cave, bar et concerts.<br>[Adresse], 66000 Perpignan</p>' +
          '<p class="small num">[04 68 00 00 00]<br>[contact@vinochope.fr]</p></div>' +
        '<div class="s3"><h4>Horaires</h4><ul class="num small">' +
          "<li>Mar – Jeu · 17 h – 0 h</li><li>Ven – Sam · 17 h – 1 h</li><li>Dim – Lun · fermé</li></ul>" +
          '<p class="note" style="margin-top:8px">horaires à confirmer</p></div>' +
        '<div class="s3"><h4>Le site</h4><ul>' +
          NAV.map(function (n) { return '<li><a href="' + n[0] + '">' + n[1] + "</a></li>"; }).join("") +
          '<li><a href="location-tireuses.html">Location de tireuses</a></li></ul></div>' +
        '<div class="s2"><h4>Suivre</h4><ul><li><a href="#">Instagram</a></li><li><a href="#">Facebook</a></li></ul></div>' +
      "</div>" +
      '<div class="legal-band">' +
        '<span class="evin">L\'abus d\'alcool est dangereux pour la santé, à consommer avec modération.</span>' +
        '<span><a href="mentions-legales.html">Mentions légales</a> · <a href="mentions-legales.html#cookies">Cookies</a> · © Vinochope</span>' +
      "</div>" +
    "</div>";
  document.body.append(footer);

  // ----- Calque de grille + outils -----
  var overlay = document.createElement("div");
  overlay.className = "grid-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = '<div class="wrap"><div class="grid">' + new Array(13).join("<span></span>") + "</div></div>";
  document.body.append(overlay);

  var tools = document.createElement("div");
  tools.className = "wf-tools";
  tools.innerHTML =
    '<button id="tool-grid" aria-pressed="false" title="Touche G">Grille (G)</button>' +
    '<button id="tool-reset" title="Réafficher l\'âge et les cookies">Réinitialiser</button>';
  document.body.append(tools);
  var gridBtn = tools.querySelector("#tool-grid");
  function toggleGrid() {
    var on = document.body.classList.toggle("show-grid");
    gridBtn.setAttribute("aria-pressed", on);
  }
  gridBtn.addEventListener("click", toggleGrid);
  document.addEventListener("keydown", function (e) {
    if ((e.key === "g" || e.key === "G") && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) toggleGrid();
  });
  tools.querySelector("#tool-reset").addEventListener("click", function () {
    try { sessionStorage.clear(); } catch (e) {}
    location.reload();
  });

  // ----- Cookies -----
  function showCookie() {
    if (store("wf-cookie")) return;
    var c = document.createElement("div");
    c.className = "cookie";
    c.setAttribute("role", "region");
    c.setAttribute("aria-label", "Cookies");
    c.innerHTML =
      '<div class="wrap"><p>Ce site utilise uniquement des cookies de mesure d\'audience, avec votre accord. <a href="mentions-legales.html#cookies">En savoir plus</a></p>' +
      '<div class="actions"><button class="btn ghost" data-c="no">Refuser</button><button class="btn" data-c="yes">Accepter</button></div></div>';
    document.body.append(c);
    document.body.classList.add("has-cookie");
    c.addEventListener("click", function (e) {
      if (!e.target.dataset.c) return;
      store("wf-cookie", e.target.dataset.c);
      c.remove();
      document.body.classList.remove("has-cookie");
    });
  }

  // ----- Vérification d'âge -----
  if (!store("wf-age")) {
    var g = document.createElement("div");
    g.className = "age-gate";
    g.setAttribute("role", "dialog");
    g.setAttribute("aria-modal", "true");
    g.setAttribute("aria-labelledby", "age-title");
    g.innerHTML =
      '<div class="age-box"><span class="logo">Vinochope</span>' +
      '<h2 id="age-title">Avez-vous 18 ans ou plus ?</h2>' +
      '<p class="muted small">La vente d\'alcool est interdite aux mineurs. Ce site présente des boissons alcoolisées.</p>' +
      '<div class="actions"><button class="btn ghost" id="age-no">Non</button><button class="btn" id="age-yes">Oui, entrer</button></div>' +
      '<p class="age-refused" id="age-msg" hidden>Ce site est réservé aux personnes majeures.</p>' +
      '<p class="note">s\'affiche à la première visite</p></div>';
    document.body.append(g);
    document.documentElement.style.overflow = "hidden";
    g.querySelector("#age-yes").focus();
    g.querySelector("#age-yes").addEventListener("click", function () {
      store("wf-age", "1");
      g.remove();
      document.documentElement.style.overflow = "";
      showCookie();
    });
    g.querySelector("#age-no").addEventListener("click", function () {
      g.querySelector("#age-msg").hidden = false;
    });
  } else {
    showCookie();
  }

  // ----- Formulaires (maquette : rien n'est envoyé) -----
  document.querySelectorAll("form").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = f.querySelector(".form-ok");
      if (!ok) {
        ok = document.createElement("p");
        ok.className = "form-ok full";
        ok.setAttribute("role", "status");
        f.append(ok);
      }
      ok.textContent = "Maquette : le formulaire n'envoie rien pour l'instant.";
    });
  });

  // ----- Filtres (maquette) -----
  document.querySelectorAll(".filters").forEach(function (box) {
    box.addEventListener("click", function (e) {
      if (e.target.tagName !== "BUTTON") return;
      box.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      e.target.setAttribute("aria-pressed", "true");
    });
  });

  // ----- Séquence vidéo simulée (accueil) -----
  var seq = document.querySelector(".seq");
  if (seq) {
    var FRAMES = 240;
    var frameEl = seq.querySelector("[data-frame]");
    var pctEl = seq.querySelector("[data-pct]");
    var bar = seq.querySelector(".seq-progress");
    var beats = seq.querySelectorAll("[data-beat]");
    var steps = seq.querySelectorAll(".seq-steps i");
    var labelEl = seq.querySelector("[data-label]");
    var LABELS = ["Main et raisin → tourbillon", "La bouteille monte et avale le vin", "Le verre monte, le vin est servi"];
    var ticking = false;
    function update() {
      ticking = false;
      var r = seq.getBoundingClientRect();
      var total = seq.offsetHeight - window.innerHeight;
      var p = Math.min(1, Math.max(0, -r.top / total));
      var frame = Math.min(FRAMES, Math.floor(p * (FRAMES - 1)) + 1);
      var beat = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
      frameEl.textContent = String(frame).padStart(3, "0") + " / " + FRAMES;
      pctEl.textContent = Math.round(p * 100) + " %";
      labelEl.textContent = LABELS[beat];
      bar.style.width = p * 100 + "%";
      beats.forEach(function (b) { b.classList.toggle("on", Number(b.dataset.beat) === beat); });
      steps.forEach(function (s, i) { s.classList.toggle("on", i <= beat); });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }
})();
