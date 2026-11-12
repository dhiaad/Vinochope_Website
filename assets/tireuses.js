/* Vinochope · page Tireuses : fûts et options (gérables), calculateur, demande de devis */
(function () {
  var VC = window.VC, e_ = VC.echapper;
  var futs = [], options = [], styleActif = "";
  function euros(n) { return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",").replace(",00", "") + " €"; }
  function demi(f) { return euros(f.prix / (f.volume / 0.25)); }

  /* ---------- Les fûts ---------- */
  var zone = document.querySelector("[data-futs]"), zoneF = document.querySelector("[data-filtres]");
  function rendreFuts() {
    var l = futs.filter(function (f) { return !styleActif || f.style === styleActif; });
    zone.innerHTML = l.map(function (f) {
      return '<article class="fut montee' + (f.dispo === false ? " indispo" : "") + '">' +
        '<img src="' + e_(f.photo) + '" alt="" loading="lazy">' +
        '<div class="fut-corps"><p class="fut-brasserie">' + e_(f.brasserie) + "</p>" +
        "<h3>" + e_(f.nom) + "</h3>" +
        '<div class="fut-tags"><span>' + e_(f.style) + "</span><span>" + String(f.degre).replace(".", ",") + " %</span><span>" + e_(f.volume) + " L</span>" + (f.dispo === false ? "<span>Bientôt de retour</span>" : "") + "</div>" +
        "<p>" + e_(f.description) + "</p>" +
        '<div class="fut-prix"><strong>' + e_(euros(+f.prix)) + "</strong><span>soit " + e_(demi(f)) + " le demi</span></div></div></article>";
    }).join("") || "<p>Aucun fût dans ce style pour le moment.</p>";
    VC.apparitions(zone);
  }

  /* ---------- Calculateur ---------- */
  var inv = document.getElementById("invites"), sortie = document.querySelector("[data-invites-sortie]"), choix = document.querySelector("[data-fut-choix]");
  function r(n) { return document.querySelector('[data-r="' + n + '"]'); }
  function calcul() {
    sortie.textContent = inv.value;
    var f = futs.filter(function (x) { return x.id === choix.value; })[0];
    if (!f) return;
    var d = document.querySelector('input[name="duree"]:checked');
    var demis = Math.ceil(+inv.value * +(d ? d.value : 3));
    var n = Math.max(1, Math.ceil(demis * 0.25 / f.volume));
    r("demis").textContent = demis;
    r("futs").textContent = n + " × " + f.volume + " L";
    r("total").textContent = euros(n * f.prix);
    r("demi").textContent = "Soit " + demi(f) + " le demi, avec « " + f.nom + " »";
  }
  [inv, choix].forEach(function (el) { el.addEventListener("input", calcul); });
  document.querySelectorAll('input[name="duree"]').forEach(function (el) { el.addEventListener("change", calcul); });
  document.querySelector("[data-vers-devis]").addEventListener("click", function () {
    var p = document.getElementById("d-pers"); if (p && !p.value) p.value = inv.value;
    var c = document.querySelector('[data-cases-futs] input[value="' + CSS.escape(nomDe(choix.value)) + '"]'); if (c) c.checked = true;
  });
  function nomDe(id) { var f = futs.filter(function (x) { return x.id === id; })[0]; return f ? f.nom : ""; }

  /* ---------- Devis par e-mail ---------- */
  var form = document.querySelector("[data-devis]");
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var premier = null;
    [["d-nom", "Indiquez votre nom."], ["d-tel", "Indiquez un numéro pour vous rappeler."], ["d-date", "Indiquez la date de votre événement."]].forEach(function (x) {
      var el = document.getElementById(x[0]), err = document.getElementById("err-" + x[0]), vide = !el.value.trim();
      el.setAttribute("aria-invalid", vide ? "true" : "false"); el.setAttribute("aria-describedby", "err-" + x[0]);
      err.textContent = vide ? x[1] : "";
      if (vide && !premier) premier = el;
    });
    var mail = document.getElementById("d-mail"), errM = document.getElementById("err-d-mail");
    var mauvais = mail.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value);
    errM.textContent = mauvais ? "L'adresse semble incomplète (exemple : prenom@exemple.fr)." : "";
    mail.setAttribute("aria-invalid", mauvais ? "true" : "false");
    if (mauvais && !premier) premier = mail;
    if (premier) { premier.focus(); return; }
    var d = new FormData(form);
    var coches = function (sel) { return [].slice.call(form.querySelectorAll(sel + " input:checked")).map(function (i) { return i.value; }).join(", ") || "aucun"; };
    var corps = [
      "Bonjour,", "", "Je souhaite un devis pour la location d'une tireuse.", "",
      "Nom : " + d.get("nom"), "Téléphone : " + d.get("tel"), "E-mail : " + (d.get("email") || "-"),
      "Date : " + d.get("date"), "Lieu : " + (d.get("lieu") || "-"), "Nombre de personnes : " + (d.get("personnes") || "-"),
      "Livraison : " + d.get("livraison"), "Fûts : " + coches("[data-cases-futs]"), "Options : " + coches("[data-cases-options]"),
      "", d.get("message") || ""
    ].join("\n");
    location.href = "mailto:contact@vinochope.com?subject=" + encodeURIComponent("Devis tireuse · " + d.get("date")) + "&body=" + encodeURIComponent(corps);
    var ok = document.querySelector("[data-envoye]"); ok.hidden = false; ok.focus();
  });

  /* ---------- Chargement ---------- */
  Promise.all([VC.donnees("futs"), VC.donnees("options")]).then(function (res) {
    futs = res[0]; options = res[1];
    var styles = [];
    futs.forEach(function (f) { if (styles.indexOf(f.style) < 0) styles.push(f.style); });
    styles.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "filtre"; b.setAttribute("aria-pressed", "false"); b.setAttribute("data-style", s); b.textContent = s;
      zoneF.appendChild(b);
    });
    zoneF.addEventListener("click", function (ev) {
      var b = ev.target.closest(".filtre"); if (!b) return;
      styleActif = b.getAttribute("data-style");
      zoneF.querySelectorAll(".filtre").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      rendreFuts();
    });
    rendreFuts();
    var dispo = futs.filter(function (f) { return f.dispo !== false; });
    choix.innerHTML = dispo.map(function (f) { return '<option value="' + e_(f.id) + '">' + e_(f.nom + " · " + f.volume + " L · " + euros(+f.prix)) + "</option>"; }).join("");
    calcul();
    document.querySelector("[data-options]").innerHTML = options.map(function (o) {
      return "<li><h3>" + e_(o.nom) + "</h3><p>" + e_(o.description) + "</p><strong>" + e_(o.prix) + "</strong></li>";
    }).join("");
    document.querySelector("[data-cases-futs]").innerHTML = dispo.map(function (f) { return '<label><input type="checkbox" value="' + e_(f.nom) + '"> ' + e_(f.nom) + "</label>"; }).join("");
    document.querySelector("[data-cases-options]").innerHTML = options.filter(function (o) { return o.id !== "tireuse"; }).map(function (o) { return '<label><input type="checkbox" value="' + e_(o.nom) + '"> ' + e_(o.nom) + "</label>"; }).join("");
  }).catch(function () {
    zone.innerHTML = "<p>La liste des fûts n'a pas pu être chargée. Appelez-nous au 04 68 89 91 43.</p>";
  });
})();
