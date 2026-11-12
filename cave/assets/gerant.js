/* Vinochope · espace gérant
   Ajoute, modifie et supprime les événements, fûts, options et bouteilles.
   Les listes sont enregistrées dans ce navigateur (clé vc-gerant-<nom>) et lues en priorité par le site ;
   « Exporter » produit le fichier data/<nom>.json à publier. */
(function () {
  var VC = window.VC, e_ = VC.echapper;

  // Description des champs de chaque liste : [clé, libellé, type, options]
  var SCHEMAS = {
    evenements: {
      titre: "un événement", page: "evenements.html", ancre: function (x) { return "#evt-" + x.id; },
      resume: function (x) { return [x.titre, (x.date || "") + " · " + (x.categorie || "") + (x.une ? " · à la une" : "")]; },
      tri: function (a, b) { return (a.date + a.heure) < (b.date + b.heure) ? -1 : 1; },
      champs: [
        ["titre", "Titre de l'événement", "text", { requis: 1, plein: 1 }],
        ["categorie", "Type", "select", { choix: ["Concert", "Exposition", "Danse", "Dégustation", "Conférence", "Soirée"] }],
        ["public", "Public", "select", { choix: ["Tout public", "18 ans et plus"] }],
        ["date", "Date", "date", { requis: 1 }],
        ["heure", "Heure de début", "time", { requis: 1 }],
        ["fin", "Heure de fin", "time", {}],
        ["portes", "Ouverture des portes", "time", { aide: "Laisser vide si sans objet" }],
        ["prix", "Prix sur place (€)", "number", { aide: "0 = entrée libre", min: 0, pas: 0.5 }],
        ["prevente", "Prix en prévente (€)", "number", { aide: "Laisser 0 s'il n'y a pas de prévente", min: 0, pas: 0.5 }],
        ["places", "Nombre de places", "number", { aide: "0 si pas de limite", min: 0 }],
        ["billetterie", "Lien de billetterie", "url", { aide: "Sinon, le bouton propose de réserver par téléphone", plein: 1 }],
        ["artistes", "Artistes, intervenants", "text", { plein: 1 }],
        ["accroche", "Accroche (une phrase)", "text", { plein: 1, aide: "Affichée dans l'agenda et à la une", max: 160 }],
        ["description", "Description complète", "textarea", { plein: 1, aide: "Laissez une ligne vide entre deux paragraphes" }],
        ["photo", "Photo", "photo", { plein: 1 }],
        ["ecoute", "Lien d'écoute ou vidéo", "url", { plein: 1 }],
        ["une", "Mettre à la une de la page Événements", "case", { plein: 1 }],
        ["complet", "Complet", "case", { plein: 1 }]
      ],
      vide: { categorie: "Concert", public: "Tout public", heure: "20:30", prix: 0, prevente: 0, places: 0, une: false, complet: false }
    },
    futs: {
      titre: "un fût", page: "tireuses.html", ancre: function () { return "#futs"; },
      resume: function (x) { return [x.nom, x.style + " · " + x.volume + " L · " + VC.prix(x.prix) + (x.dispo === false ? " · indisponible" : "")]; },
      champs: [
        ["nom", "Nom de la bière", "text", { requis: 1, plein: 1 }],
        ["brasserie", "Brasserie", "text", {}],
        ["style", "Style", "text", { liste: ["Blonde", "Blanche", "Ambrée", "Brune", "IPA", "Sans alcool"] }],
        ["degre", "Degré d'alcool (%)", "number", { min: 0, pas: 0.1 }],
        ["volume", "Volume du fût (L)", "select", { choix: ["20", "30", "50"], nombre: 1 }],
        ["prix", "Prix du fût (€)", "number", { requis: 1, min: 0 }],
        ["description", "Description", "textarea", { plein: 1 }],
        ["photo", "Photo", "photo", { plein: 1 }],
        ["dispo", "Disponible à la location", "case", { plein: 1 }]
      ],
      vide: { style: "Blonde", volume: 30, prix: 80, dispo: true }
    },
    options: {
      titre: "une option", page: "tireuses.html", ancre: function () { return "#options"; },
      resume: function (x) { return [x.nom, x.prix]; },
      champs: [
        ["nom", "Nom de l'option", "text", { requis: 1, plein: 1 }],
        ["description", "Description", "textarea", { plein: 1 }],
        ["prix", "Prix affiché", "text", { plein: 1, aide: "Par exemple : 15 €, Sur devis, Offerte" }]
      ],
      vide: { prix: "Sur devis" }
    },
    vins: {
      titre: "une bouteille", page: "la-cave.html", ancre: function () { return "#boutique"; },
      resume: function (x) { return [x.cuvee, x.domaine + " · " + VC.prix(x.prix)]; },
      tri: function (a, b) { return b.prix - a.prix; },
      champs: [
        ["cuvee", "Cuvée", "text", { requis: 1, plein: 1 }],
        ["domaine", "Domaine", "text", { requis: 1 }],
        ["type", "Famille (pour le filtre)", "text", { liste: ["Banyuls", "Maury", "Rivesaltes", "Xérès et Porto", "Rouge", "Blanc", "Rosé"] }],
        ["appellation", "Appellation", "text", {}],
        ["prix", "Prix (€)", "number", { requis: 1, min: 0, pas: 0.5 }],
        ["description", "Description", "textarea", { plein: 1 }],
        ["distinction", "Distinction (médaille, guide)", "text", { plein: 1 }],
        ["photo", "Photo", "photo", { plein: 1 }]
      ],
      vide: { type: "Banyuls" }
    }
  };

  var nom = "evenements", liste = [], courant = null;
  var zListe = document.querySelector("[data-liste]"), zForm = document.querySelector("[data-form]");

  function sauver() {
    var ok = VC.store.set(VC.cleGerant(nom), JSON.stringify(liste));
    if (!ok) alert("L'enregistrement a échoué : la mémoire du navigateur est pleine. Utilisez des photos plus légères, ou exportez puis réinitialisez.");
    return ok;
  }
  function charger(n) {
    nom = n; courant = null;
    VC.store.get(VC.cleGerant(n)); // lecture d'abord la version locale, sinon le fichier du site
    VC.donnees(n).then(function (l) { liste = l; rendreListe(); formulaire(null); });
  }
  function slug(s) {
    return String(s || "element").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Date.now().toString(36).slice(-4);
  }

  function rendreListe() {
    var S = SCHEMAS[nom], l = liste.slice();
    if (S.tri) l.sort(S.tri);
    var auj = new Date().toISOString().slice(0, 10);
    zListe.innerHTML = l.map(function (x) {
      var r = S.resume(x), passe = nom === "evenements" && x.date < auj;
      return '<li data-id="' + e_(x.id) + '"' + (courant && courant.id === x.id ? ' aria-current="true"' : "") + ">" +
        (x.photo ? '<img src="' + e_(x.photo) + '" alt="">' : '<span class="vide"></span>') +
        '<button type="button"><span><b>' + e_(r[0]) + "</b><small>" + e_(r[1]) + (passe ? " · passé" : "") + "</small></span></button></li>";
    }).join("") || '<li style="cursor:default"><span></span><span>Aucun élément. Cliquez sur « Ajouter ».</span></li>';
  }
  zListe.addEventListener("click", function (ev) {
    var li = ev.target.closest("li[data-id]"); if (!li) return;
    var x = liste.filter(function (y) { return y.id === li.getAttribute("data-id"); })[0];
    if (x) { formulaire(x); rendreListe(); zForm.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });

  function champHTML(c, val) {
    var k = c[0], lab = c[1], type = c[2], o = c[3] || {}, id = "g-" + k;
    var aide = o.aide ? '<p class="g-aide" id="aide-' + id + '">' + e_(o.aide) + "</p>" : "";
    var desc = o.aide ? ' aria-describedby="aide-' + id + '"' : "";
    var req = o.requis ? " required" : "";
    var w = '<div class="' + (o.plein ? "plein" : "") + '">';
    if (val == null) val = "";
    if (type === "case") return w + '<div class="cases"><label><input type="checkbox" id="' + id + '" name="' + k + '"' + (val ? " checked" : "") + "> " + e_(lab) + "</label></div>" + aide + "</div>";
    var l = '<label for="' + id + '">' + e_(lab) + (o.requis ? " *" : "") + "</label>";
    if (type === "select") return w + l + '<select id="' + id + '" name="' + k + '"' + desc + ">" + o.choix.map(function (ch) { return '<option' + (String(val) === ch ? " selected" : "") + ">" + e_(ch) + "</option>"; }).join("") + "</select>" + aide + "</div>";
    if (type === "textarea") return w + l + '<textarea id="' + id + '" name="' + k + '"' + desc + req + ">" + e_(val) + "</textarea>" + aide + "</div>";
    if (type === "photo") return w + '<label for="' + id + '">' + e_(lab) + '</label><div class="g-photo">' + (val ? '<img src="' + e_(val) + '" alt="Aperçu" data-apercu>' : '<span class="vide" data-apercu></span>') +
      '<div><input type="file" id="' + id + '" accept="image/*" data-photo><input type="hidden" name="' + k + '" value="' + e_(val) + '"><p class="g-aide">JPG, PNG ou WebP. L\'image est réduite automatiquement. Format conseillé : paysage ou portrait, sans texte.</p></div></div></div>';
    var extra = (o.min != null ? ' min="' + o.min + '"' : "") + (o.pas ? ' step="' + o.pas + '"' : "") + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.liste ? ' list="dl-' + id + '"' : "");
    var dl = o.liste ? '<datalist id="dl-' + id + '">' + o.liste.map(function (x) { return "<option value=\"" + e_(x) + "\">"; }).join("") + "</datalist>" : "";
    return w + l + '<input id="' + id + '" name="' + k + '" type="' + type + '" value="' + e_(val) + '"' + extra + desc + req + ">" + dl + '<p class="erreur" id="err-' + id + '"></p>' + aide + "</div>";
  }

  function formulaire(x) {
    var S = SCHEMAS[nom], neuf = !x;
    courant = x;
    var v = x || JSON.parse(JSON.stringify(S.vide));
    zForm.innerHTML = '<h2 id="g-form-t" class="plein">' + (neuf ? "Ajouter " + S.titre : "Modifier " + S.titre) + "</h2>" +
      S.champs.map(function (c) { return champHTML(c, v[c[0]]); }).join("") +
      '<div class="plein g-actions"><button type="submit" class="etiquette">Enregistrer</button>' +
      (neuf ? "" : '<button type="button" class="etiquette ligne" data-dupliquer>Dupliquer</button><a class="lien" href="' + S.page + S.ancre(x) + '" target="_blank" rel="noopener">Voir sur le site</a><button type="button" class="etiquette bouton-danger" data-supprimer>Supprimer</button>') +
      '<span class="g-message" role="status" data-message></span></div>';
    var fp = zForm.querySelector("[data-photo]");
    if (fp) fp.addEventListener("change", function () { photo(fp); });
    var dup = zForm.querySelector("[data-dupliquer]");
    if (dup) dup.addEventListener("click", function () {
      var copie = JSON.parse(JSON.stringify(courant)); copie.id = ""; copie.une = false;
      formulaire(null); remplir(copie); message("Copie prête : modifiez puis enregistrez.");
    });
    var sup = zForm.querySelector("[data-supprimer]");
    if (sup) sup.addEventListener("click", function () {
      if (!confirm("Supprimer « " + S.resume(courant)[0] + " » ? Cette action ne peut pas être annulée (sauf avec « Revenir à la version du site »).")) return;
      liste = liste.filter(function (y) { return y.id !== courant.id; });
      sauver(); formulaire(null); rendreListe(); message("Supprimé.");
    });
  }
  function remplir(v) {
    SCHEMAS[nom].champs.forEach(function (c) {
      var el = zForm.querySelector('[name="' + c[0] + '"]'); if (!el) return;
      if (c[2] === "case") el.checked = !!v[c[0]]; else el.value = v[c[0]] == null ? "" : v[c[0]];
      if (c[2] === "photo" && v[c[0]]) { var a = zForm.querySelector("[data-apercu]"); if (a) a.outerHTML = '<img src="' + e_(v[c[0]]) + '" alt="Aperçu" data-apercu>'; }
    });
  }
  function message(t) { var m = zForm.querySelector("[data-message]"); if (m) { m.textContent = t; setTimeout(function () { if (m.textContent === t) m.textContent = ""; }, 4000); } }

  // Photo : réduite à 1400 px et compressée, pour tenir dans la mémoire du navigateur
  function photo(input) {
    var f = input.files && input.files[0]; if (!f) return;
    var lecteur = new FileReader();
    lecteur.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1400, k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        var url = c.toDataURL("image/webp", .8);
        if (url.indexOf("data:image/webp") !== 0) url = c.toDataURL("image/jpeg", .82);
        input.parentNode.querySelector('input[type="hidden"]').value = url;
        var a = zForm.querySelector("[data-apercu]"); a.outerHTML = '<img src="' + url + '" alt="Aperçu" data-apercu>';
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(f);
  }

  zForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var S = SCHEMAS[nom], obj = courant ? JSON.parse(JSON.stringify(courant)) : {}, premier = null;
    S.champs.forEach(function (c) {
      var el = zForm.querySelector('[name="' + c[0] + '"]'); if (!el) return;
      var o = c[3] || {}, v;
      if (c[2] === "case") v = el.checked;
      else if (c[2] === "number" || o.nombre) v = el.value === "" ? 0 : +el.value;
      else v = el.value.trim();
      var err = document.getElementById("err-g-" + c[0]);
      var manque = o.requis && (v === "" || v == null);
      if (err) err.textContent = manque ? "Ce champ est obligatoire." : "";
      el.setAttribute("aria-invalid", manque ? "true" : "false");
      if (manque && !premier) premier = el;
      obj[c[0]] = v;
    });
    if (premier) { premier.focus(); return; }
    if (!obj.id) obj.id = slug(obj.titre || obj.nom || obj.cuvee);
    if (nom === "evenements" && obj.une) liste.forEach(function (y) { if (y.id !== obj.id) y.une = false; });  // une seule à la une
    var i = liste.map(function (y) { return y.id; }).indexOf(obj.id);
    if (i > -1) liste[i] = obj; else liste.push(obj);
    if (sauver()) { formulaire(obj); rendreListe(); message("Enregistré. Le site est à jour sur cet appareil."); }
  });

  document.querySelector("[data-nouveau]").addEventListener("click", function () { formulaire(null); rendreListe(); zForm.querySelector("input, select, textarea").focus(); });
  document.querySelector("[data-exporter]").addEventListener("click", function () {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(liste, null, 1)], { type: "application/json" }));
    a.download = nom + ".json"; document.body.appendChild(a); a.click(); a.remove();
  });
  document.querySelector("[data-importer]").addEventListener("change", function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var l = JSON.parse(t); if (!Array.isArray(l)) throw new Error();
      liste = l; sauver(); rendreListe(); formulaire(null);
    }).catch(function () { alert("Ce fichier n'est pas une liste valide."); });
    ev.target.value = "";
  });
  document.querySelector("[data-reinit]").addEventListener("click", function () {
    if (!confirm("Effacer vos modifications sur cet appareil et revenir à la version publiée du site ?")) return;
    VC.store.del(VC.cleGerant(nom)); charger(nom);
  });

  var onglets = document.querySelector("[data-onglets]");
  onglets.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-onglet]"); if (!b) return;
    onglets.querySelectorAll("[data-onglet]").forEach(function (x) { var on = x === b; x.setAttribute("aria-selected", on); x.setAttribute("aria-pressed", on); });
    charger(b.getAttribute("data-onglet"));
  });
  charger("evenements");
})();
