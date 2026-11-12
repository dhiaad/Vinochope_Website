/* Vinochope · page Événements
   Lit data/evenements.json (ou la version du gérant), met un événement à la une, construit l'agenda et les fiches. */
(function () {
  var VC = window.VC, e_ = VC.echapper;
  var ADRESSE = "Vinochope, 26 rue Mathieu de Dombasle, 66000 Perpignan";
  var TEL = "04 68 89 91 43", TEL_URL = "tel:+33468899143";

  function quand(e, champ) {           // "2026-11-21" + "20:30" → Date locale
    var d = (e.date || "").split("-"), h = (e[champ || "heure"] || "00:00").split(":");
    return new Date(+d[0], +d[1] - 1, +d[2], +h[0] || 0, +h[1] || 0);
  }
  function fin(e) {
    var f = quand(e, e.fin ? "fin" : "heure");
    if (e.fin && f < quand(e)) f.setDate(f.getDate() + 1);  // fin après minuit
    if (!e.fin) f.setHours(f.getHours() + 3);
    return f;
  }
  function h(s) { if (!s) return ""; var p = s.split(":"); return +p[0] + " h" + (p[1] && p[1] !== "00" ? " " + p[1] : ""); }
  var fJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  var fJourCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  var fMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  var fMoisCourt = new Intl.DateTimeFormat("fr-FR", { month: "short" });
  function maj(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function jourLong(e) { return maj(fJour.format(quand(e))); }
  function compte(e) {
    var auj = new Date(); auj.setHours(0, 0, 0, 0);
    var j = Math.round((new Date(quand(e).setHours(0, 0, 0, 0)) - auj) / 864e5);
    return j <= 0 ? "Ce soir" : j === 1 ? "Demain" : "Dans " + j + " jours";
  }
  function prixCourt(e) { return +e.prix ? VC.prix(e.prix) : "Entrée libre"; }
  function prixDetail(e) {
    if (!+e.prix) return "Entrée libre";
    return VC.prix(e.prix) + (+e.prevente ? " sur place, " + VC.prix(e.prevente) + " en prévente" : "");
  }
  function paragraphes(t) { return String(t || "").split(/\n\s*\n/).map(function (p) { return "<p>" + e_(p).replace(/\n/g, "<br>") + "</p>"; }).join(""); }

  /* ---------- Calendrier (.ics) ---------- */
  function ics(e) {
    function st(d) { function z(n) { return (n < 10 ? "0" : "") + n; } return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "T" + z(d.getHours()) + z(d.getMinutes()) + "00"; }
    function esc(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
    var url = location.href.split("#")[0] + "#evt-" + e.id;
    var txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vinochope//Programmation//FR", "BEGIN:VEVENT",
      "UID:" + e.id + "@vinochope.fr", "DTSTAMP:" + st(new Date()),
      "DTSTART;TZID=Europe/Paris:" + st(quand(e)), "DTEND;TZID=Europe/Paris:" + st(fin(e)),
      "SUMMARY:" + esc(e.titre + " · Vinochope"), "LOCATION:" + esc(ADRESSE),
      "DESCRIPTION:" + esc((e.accroche || "") + "\n" + prixDetail(e) + "\n" + url), "URL:" + url,
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar;charset=utf-8" }));
    a.download = "vinochope-" + e.id + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function partager(e, bouton) {
    var url = location.href.split("#")[0] + "#evt-" + e.id;
    var data = { title: e.titre + " · Vinochope", text: jourLong(e) + ", " + h(e.heure) + ". " + (e.accroche || ""), url: url };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
      var t = bouton.textContent; bouton.textContent = "Lien copié"; setTimeout(function () { bouton.textContent = t; }, 2200);
    }).catch(function () { prompt("Copiez le lien de l'événement :", url); });
  }
  function boutonsActions(e) {
    var html = "";
    if (e.complet) html += '<span class="badge cire">Complet</span>';
    else if (e.billetterie) html += '<a class="etiquette" href="' + e_(e.billetterie) + '" rel="noopener" target="_blank">Réserver ma place</a>';
    else if (+e.prix || +e.places) html += '<a class="etiquette" href="' + TEL_URL + '">Réserver au ' + TEL + '</a>';
    html += '<button type="button" class="lien" data-ics>Ajouter à mon agenda</button>';
    html += '<button type="button" class="lien" data-partage>Partager</button>';
    return html;
  }
  function brancherActions(zone, e) {
    var b1 = zone.querySelector("[data-ics]"), b2 = zone.querySelector("[data-partage]");
    if (b1) b1.addEventListener("click", function () { ics(e); });
    if (b2) b2.addEventListener("click", function () { partager(e, b2); });
  }

  /* ---------- Fiche ---------- */
  var fiche = document.getElementById("fiche"), dernierFocus = null;
  function f(n) { return fiche.querySelector('[data-f="' + n + '"]'); }
  function ouvrir(e) {
    dernierFocus = document.activeElement;
    f("img").src = e.photo || "media/photos/e2.webp"; f("img").alt = e.titre;
    f("cat").textContent = e.categorie + (e.complet ? " · Complet" : "");
    f("titre").textContent = e.titre;
    f("accroche").textContent = e.accroche || "";
    var infos = [["Date", jourLong(e) + " " + quand(e).getFullYear()], ["Horaires", h(e.heure) + (e.fin ? " – " + h(e.fin) : "")]];
    if (e.portes) infos.push(["Portes", h(e.portes)]);
    infos.push(["Tarif", prixDetail(e)]);
    if (+e.places) infos.push(["Places", e.places + (e.complet ? " · complet" : (+e.places <= 40 ? " · réservation conseillée" : ""))]);
    if (e.artistes) infos.push(["Avec", e.artistes]);
    if (e.public) infos.push(["Public", e.public]);
    infos.push(["Lieu", "26 rue Mathieu de Dombasle, Perpignan"]);
    f("infos").innerHTML = infos.map(function (x) { return "<dt>" + e_(x[0]) + "</dt><dd>" + e_(x[1]) + "</dd>"; }).join("");
    f("texte").innerHTML = paragraphes(e.description) + (e.ecoute ? '<p><a class="lien" href="' + e_(e.ecoute) + '" rel="noopener" target="_blank">Écouter ou voir un extrait</a></p>' : "");
    f("actions").innerHTML = boutonsActions(e) + '<a class="lien" href="contact.html#venir">Venir</a>';
    brancherActions(f("actions"), e);
    if (VC.lenis) VC.lenis.stop();
    fiche.showModal();
    fiche.scrollTop = 0;
    history.replaceState(null, "", "#evt-" + e.id);
  }
  fiche.addEventListener("close", function () {
    if (VC.lenis) VC.lenis.start();
    history.replaceState(null, "", location.pathname + location.search);
    if (dernierFocus) dernierFocus.focus();
  });
  fiche.querySelector("[data-fermer]").addEventListener("click", function () { fiche.close(); });
  fiche.addEventListener("click", function (ev) { if (ev.target === fiche) fiche.close(); });

  /* ---------- À la une ---------- */
  function une(e) {
    var s = document.getElementById("une");
    function q(n) { return s.querySelector("[data-une-" + n + "]"); }
    q("repere").textContent = "À la une · " + e.categorie;
    q("titre").textContent = e.titre;
    q("date").innerHTML = "<strong>" + e_(jourLong(e)) + "</strong><span>" + e_(h(e.heure)) + (e.portes ? " · portes " + e_(h(e.portes)) : "") + (e.artistes ? " · " + e_(e.artistes) : "") + "</span>";
    q("accroche").textContent = e.accroche || "";
    q("compte").innerHTML = '<span class="une-compte">' + e_(e.complet ? "Complet" : compte(e)) + "</span>";
    q("img").src = e.photo || q("img").src; q("img").alt = e.titre;
    q("prix").innerHTML = '<span class="etiquette-prix">' + e_(prixCourt(e)) + (+e.prevente ? "<small>" + e_(VC.prix(e.prevente)) + " en prévente</small>" : "") + "</span>";
    q("actions").innerHTML = boutonsActions(e) + '<button type="button" class="lien" data-detail>Tous les détails</button>';
    brancherActions(q("actions"), e);
    q("actions").querySelector("[data-detail]").addEventListener("click", function () { ouvrir(e); });
  }

  /* ---------- Agenda ---------- */
  var tous = [], catActive = "";
  function agenda() {
    var zone = document.querySelector("[data-agenda]");
    var liste = tous.filter(function (e) { return !catActive || e.categorie === catActive; });
    if (!liste.length) { zone.innerHTML = '<p class="agenda-vide">Rien de prévu dans cette catégorie pour le moment. La programmation se renouvelle chaque trimestre, revenez bientôt.</p>'; return; }
    var parMois = [], courant = null;
    liste.forEach(function (e) {
      var m = maj(fMois.format(quand(e)));
      if (!courant || courant.m !== m) { courant = { m: m, l: [] }; parMois.push(courant); }
      courant.l.push(e);
    });
    zone.innerHTML = parMois.map(function (g) {
      return '<div class="agenda-mois"><h3>' + e_(g.m) + "</h3>" + g.l.map(function (e) {
        var d = quand(e);
        return '<article class="ligne-evt" data-id="' + e_(e.id) + '">' +
          '<p class="ligne-date"><span>' + e_(fJourCourt.format(d).replace(".", "")) + "</span><b>" + d.getDate() + "</b><span>" + e_(fMoisCourt.format(d).replace(".", "")) + "</span></p>" +
          '<img class="ligne-img" src="' + e_(e.photo || "media/photos/e2.webp") + '" alt="" loading="lazy">' +
          '<div><p class="ligne-meta"><span>' + e_(e.categorie) + "</span><span>" + e_(h(e.heure)) + (e.fin ? " – " + e_(h(e.fin)) : "") + "</span>" + (e.complet ? '<span class="badge cire">Complet</span>' : "") + (e.une ? '<span class="badge">À la une</span>' : "") + "</p>" +
          '<h4 class="ligne-titre"><button type="button" aria-haspopup="dialog">' + e_(e.titre) + "</button></h4>" +
          '<p class="ligne-accroche">' + e_(e.accroche || "") + "</p></div>" +
          '<p class="ligne-prix">' + e_(prixCourt(e)) + (+e.prevente ? "<small>" + e_(VC.prix(e.prevente)) + " en prévente</small>" : "") + "</p>" +
          "</article>";
      }).join("") + "</div>";
    }).join("");
    zone.querySelectorAll(".ligne-evt").forEach(function (row) {
      row.addEventListener("click", function () {
        var e = tous.filter(function (x) { return x.id === row.getAttribute("data-id"); })[0];
        if (e) ouvrir(e);
      });
    });
  }
  function filtres() {
    var zone = document.querySelector("[data-filtres]");
    var cats = [];
    tous.forEach(function (e) { if (cats.indexOf(e.categorie) < 0) cats.push(e.categorie); });
    cats.sort().forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "filtre"; b.setAttribute("aria-pressed", "false"); b.setAttribute("data-cat", c);
      b.textContent = c; zone.appendChild(b);
    });
    zone.addEventListener("click", function (ev) {
      var b = ev.target.closest(".filtre"); if (!b) return;
      catActive = b.getAttribute("data-cat");
      zone.querySelectorAll(".filtre").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      agenda();
    });
  }

  VC.donnees("evenements").then(function (liste) {
    var maintenant = new Date();
    tous = liste.filter(function (e) { return e.date && fin(e) > maintenant; })
      .sort(function (a, b) { return quand(a) - quand(b); });
    if (tous.length) une(tous.filter(function (e) { return e.une; })[0] || tous[0]);
    filtres(); agenda();
    var m = location.hash.match(/^#evt-(.+)$/);
    if (m) { var e = liste.filter(function (x) { return x.id === decodeURIComponent(m[1]); })[0]; if (e) ouvrir(e); }
  }).catch(function () {
    document.querySelector("[data-agenda]").innerHTML = '<p class="agenda-vide">La programmation n\'a pas pu être chargée. Appelez-nous au ' + TEL + ' ou suivez-nous sur Facebook.</p>';
  });
})();
