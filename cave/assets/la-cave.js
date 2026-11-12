/* Vinochope · page La cave et la carte : la vitrine des grandes bouteilles et l'impression du QR code */
(function () {
  var VC = window.VC, e_ = VC.echapper;

  /* Impression du chevalet : la feuille de style d'impression ne garde que le QR code */
  var imp = document.querySelector("[data-imprimer]");
  if (imp) imp.addEventListener("click", function () {
    document.body.classList.add("imprime-qr");
    window.print();
    setTimeout(function () { document.body.classList.remove("imprime-qr"); }, 500);
  });

  var vitrine = document.querySelector("[data-vitrine]"), zoneF = document.querySelector("[data-filtres]");
  var vins = [], typeActif = "";
  function rendre() {
    var l = vins.filter(function (v) { return !typeActif || v.type === typeActif; });
    vitrine.innerHTML = l.map(function (v) {
      return '<article class="bouteille montee">' +
        '<div class="bouteille-img"><img src="' + e_(v.photo) + '" alt="" loading="lazy">' +
        (v.distinction ? '<span class="cachet">' + e_(v.distinction) + "</span>" : "") + "</div>" +
        '<p class="bouteille-domaine">' + e_(v.domaine) + "</p>" +
        "<h3>" + e_(v.cuvee) + "</h3>" +
        '<p class="bouteille-type">' + e_(v.appellation) + "</p>" +
        '<p class="bouteille-desc">' + e_(v.description) + "</p>" +
        '<div class="bouteille-pied"><span class="bouteille-prix">' + e_(VC.prix(v.prix)) + '</span><a href="tel:+33468899143">Mettre de côté<br>04 68 89 91 43</a></div>' +
        "</article>";
    }).join("");
    VC.apparitions(vitrine);
  }
  VC.donnees("vins").then(function (l) {
    vins = l.slice().sort(function (a, b) { return b.prix - a.prix; });
    var types = [];
    vins.forEach(function (v) { if (types.indexOf(v.type) < 0) types.push(v.type); });
    types.sort().forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "filtre"; b.setAttribute("aria-pressed", "false"); b.setAttribute("data-type", t); b.textContent = t;
      zoneF.appendChild(b);
    });
    zoneF.addEventListener("click", function (ev) {
      var b = ev.target.closest(".filtre"); if (!b) return;
      typeActif = b.getAttribute("data-type");
      zoneF.querySelectorAll(".filtre").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      rendre();
    });
    rendre();
  }).catch(function () {
    vitrine.innerHTML = "<p>La sélection n'a pas pu être chargée. Passez nous voir ou appelez le 04 68 89 91 43.</p>";
  });
})();
