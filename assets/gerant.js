/* Vinochope · espace gérant
   Le gérant modifie les événements, la carte et ses prix, la cave, les fûts, les options, les horaires et le contact.
   - Sans clé : les changements restent sur cet appareil (aperçu), le site les affiche ici seulement.
   - Avec la clé remise par Qamar : chaque enregistrement est publié sur le site en ligne (fichiers data/*.json
     de la branche publiée sur GitHub Pages), visible par tous une à deux minutes plus tard.
   - « Demande à Qamar » ouvre un fil de discussion chez Qamar (ticket GitHub) ; les réponses s'affichent ici. */
(function () {
  var VC = window.VC, e_ = VC.echapper;

  /* ---------- Réglages : où le site est publié, où arrivent les demandes ---------- */
  var CFG = {
    depot: "dhiaad/Vinochope_Website",      // dépôt du site
    branche: "gh-pages",                     // branche publiée
    demandes: "dhiaad/Vinochope_Website",    // dépôt qui reçoit les demandes (un dépôt privé est conseillé)
    etiquette: "demande-vinochope",
    qamarEmail: ""                           // si rempli : les demandes partent aussi par e-mail quand l'espace n'est pas relié
  };

  /* =================================================================
     Connexion et publication
     ================================================================= */
  function cle() { return VC.store.get("vc-cle") || ""; }
  function relie() { return !!cle(); }
  function gh(chemin, o) {
    o = o || {};
    var h = { "Accept": o.accept || "application/vnd.github+json", "Authorization": "Bearer " + cle(), "X-GitHub-Api-Version": "2022-11-28" };
    return fetch("https://api.github.com" + chemin, { method: o.method || "GET", headers: h, body: o.body ? JSON.stringify(o.body) : undefined, cache: "no-store" })
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { var er = new Error(t || r.statusText); er.status = r.status; throw er; });
        if (r.status === 204) return null;
        return o.texte ? r.text() : r.json();
      });
  }
  function b64(texte) { return btoa(unescape(encodeURIComponent(texte))); }
  function contenu(depot, chemin, branche) { return "/repos/" + depot + "/contents/" + chemin.split("/").map(encodeURIComponent).join("/") + (branche ? "?ref=" + branche : ""); }
  function lireFichier(chemin) {
    return gh(contenu(CFG.depot, chemin, CFG.branche), { accept: "application/vnd.github.raw+json", texte: true }).then(JSON.parse);
  }
  // Écrit un fichier (contenu déjà en base64) ; retente une fois si quelqu'un a publié entre-temps
  function ecrire(depot, chemin, base64, message, branche, essai) {
    return gh(contenu(depot, chemin, branche)).then(function (f) { return f.sha; }, function (er) { if (er.status === 404) return null; throw er; })
      .then(function (sha) {
        var corps = { message: message, content: base64 };
        if (branche) corps.branch = branche;
        if (sha) corps.sha = sha;
        return gh(contenu(depot, chemin), { method: "PUT", body: corps });
      })
      .catch(function (er) { if ((er.status === 409 || er.status === 422) && !essai) return ecrire(depot, chemin, base64, message, branche, 1); throw er; });
  }
  // Les photos ajoutées sont d'abord gardées dans la page ; à la publication, elles deviennent des fichiers du site
  function envoyerPhotos(data, nom) {
    var taches = [];
    (function parcours(o) {
      if (!o || typeof o !== "object") return;
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (typeof v === "string" && v.indexOf("data:image/") === 0) {
          var ext = v.indexOf("image/webp") > -1 ? "webp" : "jpg";
          var chemin = "media/gerant/" + nom + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + "." + ext;
          taches.push(ecrire(CFG.depot, chemin, v.split(",")[1], "Photo ajoutée depuis l'espace gérant", CFG.branche).then(function () { o[k] = chemin; }));
        } else if (typeof v === "object") parcours(v);
      });
    })(data);
    return Promise.all(taches);
  }
  var NOMS_FICHIERS = { evenements: "les événements", carte: "la carte", vins: "les grandes bouteilles", futs: "les fûts", options: "les options de location", infos: "les horaires et le contact" };
  function publier(nom, data) {
    var copie = JSON.parse(JSON.stringify(data));
    return envoyerPhotos(copie, nom).then(function () {
      return ecrire(CFG.depot, "data/" + nom + ".json", b64(JSON.stringify(copie, null, 1) + "\n"), "Espace gérant : mise à jour de " + NOMS_FICHIERS[nom], CFG.branche);
    }).then(function () { return copie; });
  }
  function erreurLisible(er) {
    if (er && er.status === 401) return "La clé n'est plus valable. Demandez-en une nouvelle à Qamar.";
    if (er && er.status === 403) return "Cette clé ne permet pas de publier. Demandez à Qamar de vérifier ses droits.";
    if (er && er.status === 404) return "Le site est introuvable avec cette clé. Demandez à Qamar de vérifier ses droits.";
    if (!navigator.onLine) return "Pas de connexion internet. Vos changements sont gardés sur cet appareil.";
    return "La publication n'a pas abouti. Vos changements sont gardés sur cet appareil, réessayez dans un instant.";
  }

  // Enregistre partout où c'est possible, et dit clairement où en est le site
  function enregistrer(nom, data, dire) {
    VC.ecrireLocal(nom, data, false);
    if (!relie()) {
      dire("Enregistré sur cet appareil. Pour que tout le monde le voie, reliez l'espace au site (cadre en haut de la page).");
      majEtat(); return Promise.resolve(data);
    }
    dire("Publication en cours…");
    return publier(nom, data).then(function (pub) {
      VC.ecrireLocal(nom, pub, true);
      dire("Publié. Le site en ligne sera à jour d'ici une à deux minutes.");
      majEtat(); return pub;
    }, function (er) {
      dire(erreurLisible(er)); majEtat(); return data;
    });
  }
  // Charge la version à modifier : d'abord un changement non publié sur cet appareil, sinon la version en ligne
  function chargerDonnees(nom) {
    var l = VC.lireLocal(nom);
    if (l && !l.publie) return Promise.resolve(l.data);
    if (relie()) return lireFichier("data/" + nom + ".json").catch(function () { return VC.donnees(nom); });
    return VC.donnees(nom);
  }

  /* ---------- Bloc de connexion ---------- */
  var zCx = document.querySelector("[data-connexion]");
  function rendreConnexion(msg) {
    if (relie()) {
      zCx.innerHTML = '<p class="g-cx-titre"><span class="g-point on" aria-hidden="true"></span>Relié au site</p>' +
        "<p>Chaque enregistrement est publié en ligne.</p>" +
        '<button type="button" class="lien" data-deconnecter>Délier cet appareil</button>' + (msg ? '<p class="g-cx-msg">' + e_(msg) + "</p>" : "");
      zCx.querySelector("[data-deconnecter]").addEventListener("click", function () {
        if (!confirm("Délier cet appareil ? Vos prochains changements resteront sur cet appareil jusqu'à ce que vous le reliiez à nouveau.")) return;
        VC.store.del("vc-cle"); rendreConnexion(); majEtat(); rendreFils();
      });
    } else {
      zCx.innerHTML = '<p class="g-cx-titre"><span class="g-point" aria-hidden="true"></span>Aperçu sur cet appareil</p>' +
        "<p>Pour publier vos changements pour tout le monde, entrez la clé que Qamar vous a remise.</p>" +
        '<form class="g-cx-form" data-cx-form><label for="g-cle" class="visuellement-cache">Clé de publication</label>' +
        '<input id="g-cle" type="password" autocomplete="off" spellcheck="false" placeholder="Clé de publication" required>' +
        '<button type="submit" class="etiquette">Relier</button></form>' + (msg ? '<p class="g-cx-msg" role="alert">' + e_(msg) + "</p>" : "");
      zCx.querySelector("[data-cx-form]").addEventListener("submit", function (ev) {
        ev.preventDefault();
        var v = zCx.querySelector("#g-cle").value.trim(); if (!v) return;
        VC.store.set("vc-cle", v);
        gh("/repos/" + CFG.depot).then(function (d) {
          if (!d.permissions || !d.permissions.push) throw { status: 403 };
          rendreConnexion("C'est relié. Vos prochains enregistrements seront publiés.");
          majEtat(); rendreFils(); afficher(onglet);
        }).catch(function (er) { VC.store.del("vc-cle"); rendreConnexion(er && er.status ? erreurLisible(er) : "Impossible de vérifier la clé. Vérifiez la connexion internet."); });
      });
    }
  }

  /* ---------- État : y a-t-il des changements pas encore publiés ? ---------- */
  var zEtat = document.querySelector("[data-etat]");
  function majEtat() {
    var en = Object.keys(NOMS_FICHIERS).filter(function (n) { var l = VC.lireLocal(n); return l && !l.publie; });
    if (!en.length) { zEtat.innerHTML = ""; zEtat.hidden = true; return; }
    zEtat.hidden = false;
    zEtat.innerHTML = "Pas encore en ligne : " + e_(en.map(function (n) { return NOMS_FICHIERS[n]; }).join(", ")) + ". " +
      (relie() ? '<button type="button" class="lien" data-tout-publier>Tout publier maintenant</button>' : "Reliez l'espace au site pour les publier.");
    var b = zEtat.querySelector("[data-tout-publier]");
    if (b) b.addEventListener("click", function () {
      b.disabled = true; b.textContent = "Publication…";
      en.reduce(function (p, n) {
        return p.then(function () { return publier(n, VC.lireLocal(n).data).then(function (pub) { VC.ecrireLocal(n, pub, true); }); });
      }, Promise.resolve()).then(function () { majEtat(); afficher(onglet); }, function (er) { alert(erreurLisible(er)); majEtat(); });
    });
  }

  /* =================================================================
     Les listes : événements, grandes bouteilles, fûts, options
     ================================================================= */
  var SCHEMAS = {
    evenements: {
      titre: "un événement", page: "evenements.html", ancre: function (x) { return "#evt-" + x.id; },
      resume: function (x) { return [x.titre, (x.date ? new Date(x.date + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "") + " · " + (x.categorie || "") + (x.une ? " · à la une" : "")]; },
      tri: function (a, b) { return (a.date + a.heure) < (b.date + b.heure) ? 1 : -1; },
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
  function slug(s) {
    return String(s || "element").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Date.now().toString(36).slice(-4);
  }
  function chargerListe(n) {
    nom = n; courant = null;
    zListe.innerHTML = '<li style="cursor:default"><span></span><span>Chargement…</span></li>';
    chargerDonnees(n).then(function (l) { liste = l; rendreListe(); formulaire(null); });
  }
  function rendreListe() {
    var S = SCHEMAS[nom], l = liste.slice();
    if (S.tri) l.sort(S.tri);
    var auj = new Date().toISOString().slice(0, 10);
    zListe.innerHTML = l.map(function (x) {
      var r = S.resume(x), passe = nom === "evenements" && x.date < auj;
      return '<li data-id="' + e_(x.id) + '"' + (courant && courant.id === x.id ? ' aria-current="true"' : "") + (passe ? ' class="passe"' : "") + ">" +
        (x.photo ? '<img src="' + e_(x.photo) + '" alt="">' : '<span class="vide"></span>') +
        '<button type="button"><span><b>' + e_(r[0]) + "</b><small>" + e_(r[1]) + (passe ? " · passé" : "") + "</small></span></button></li>";
    }).join("") || '<li style="cursor:default"><span></span><span>Rien pour l\'instant. Cliquez sur « Ajouter ».</span></li>';
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
    if (type === "select") return w + l + '<select id="' + id + '" name="' + k + '"' + desc + ">" + o.choix.map(function (ch) { return "<option" + (String(val) === ch ? " selected" : "") + ">" + e_(ch) + "</option>"; }).join("") + "</select>" + aide + "</div>";
    if (type === "textarea") return w + l + '<textarea id="' + id + '" name="' + k + '"' + desc + req + ">" + e_(val) + "</textarea>" + aide + "</div>";
    if (type === "photo") return w + '<label for="' + id + '">' + e_(lab) + '</label><div class="g-photo">' + (val ? '<img src="' + e_(val) + '" alt="Aperçu" data-apercu>' : '<span class="vide" data-apercu></span>') +
      '<div><input type="file" id="' + id + '" accept="image/*" data-photo><input type="hidden" name="' + k + '" value="' + e_(val) + '"><p class="g-aide">Une photo depuis votre téléphone ou votre ordinateur. Elle est réduite automatiquement.</p></div></div></div>';
    var extra = (o.min != null ? ' min="' + o.min + '"' : "") + (o.pas ? ' step="' + o.pas + '"' : "") + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.liste ? ' list="dl-' + id + '"' : "");
    var dl = o.liste ? '<datalist id="dl-' + id + '">' + o.liste.map(function (x) { return '<option value="' + e_(x) + '">'; }).join("") + "</datalist>" : "";
    return w + l + '<input id="' + id + '" name="' + k + '" type="' + type + '" value="' + e_(val) + '"' + extra + desc + req + ">" + dl + '<p class="erreur" id="err-' + id + '"></p>' + aide + "</div>";
  }
  function formulaire(x) {
    var S = SCHEMAS[nom], neuf = !x;
    courant = x;
    var v = x || JSON.parse(JSON.stringify(S.vide));
    zForm.innerHTML = '<h2 id="g-form-t" class="plein">' + (neuf ? "Ajouter " + S.titre : "Modifier " + S.titre) + "</h2>" +
      S.champs.map(function (c) { return champHTML(c, v[c[0]]); }).join("") +
      '<div class="plein g-actions"><button type="submit" class="etiquette">' + (relie() ? "Enregistrer et publier" : "Enregistrer") + "</button>" +
      (neuf ? "" : '<button type="button" class="etiquette ligne" data-dupliquer>Dupliquer</button><a class="lien" href="' + S.page + S.ancre(x) + '" target="_blank" rel="noopener">Voir sur le site</a><button type="button" class="etiquette bouton-danger" data-supprimer>Supprimer</button>') +
      '<p class="g-message plein" role="status" data-message></p></div>';
    var fp = zForm.querySelector("[data-photo]");
    if (fp) fp.addEventListener("change", function () { photo(fp, zForm); });
    var dup = zForm.querySelector("[data-dupliquer]");
    if (dup) dup.addEventListener("click", function () {
      var copie = JSON.parse(JSON.stringify(courant)); copie.id = ""; copie.une = false;
      formulaire(null); remplir(copie); dire(zForm, "Copie prête : modifiez puis enregistrez.");
    });
    var sup = zForm.querySelector("[data-supprimer]");
    if (sup) sup.addEventListener("click", function () {
      if (!confirm("Supprimer « " + S.resume(courant)[0] + " » du site ?")) return;
      liste = liste.filter(function (y) { return y.id !== courant.id; });
      formulaire(null); rendreListe();
      enregistrer(nom, liste, function (t) { dire(zForm, t.replace(/^Enregistré/, "Supprimé").replace(/^Publié/, "Supprimé")); });
    });
  }
  function remplir(v) {
    SCHEMAS[nom].champs.forEach(function (c) {
      var el = zForm.querySelector('[name="' + c[0] + '"]'); if (!el) return;
      if (c[2] === "case") el.checked = !!v[c[0]]; else el.value = v[c[0]] == null ? "" : v[c[0]];
      if (c[2] === "photo" && v[c[0]]) { var a = zForm.querySelector("[data-apercu]"); if (a) a.outerHTML = '<img src="' + e_(v[c[0]]) + '" alt="Aperçu" data-apercu>'; }
    });
  }
  function dire(zone, t) { var m = zone.querySelector("[data-message]"); if (m) m.textContent = t; }

  // Photo : réduite à 1600 px et compressée en WebP
  function photo(input, zone) {
    var f = input.files && input.files[0]; if (!f) return;
    var lecteur = new FileReader();
    lecteur.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        var url = c.toDataURL("image/webp", .8);
        if (url.indexOf("data:image/webp") !== 0) url = c.toDataURL("image/jpeg", .82);
        input.parentNode.querySelector('input[type="hidden"]').value = url;
        var a = zone.querySelector("[data-apercu]"); a.outerHTML = '<img src="' + url + '" alt="Aperçu" data-apercu>';
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
    var bouton = zForm.querySelector('[type="submit"]'); bouton.disabled = true;
    enregistrer(nom, liste, function (t) { dire(zForm, t); }).then(function (l) {
      liste = l; courant = liste.filter(function (y) { return y.id === obj.id; })[0] || obj;
      var msg = zForm.querySelector("[data-message]").textContent;
      formulaire(courant); rendreListe(); dire(zForm, msg);
    });
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
      liste = l; VC.ecrireLocal(nom, liste, false); majEtat(); rendreListe(); formulaire(null);
    }).catch(function () { alert("Ce fichier n'est pas une liste valide."); });
    ev.target.value = "";
  });
  document.querySelector("[data-reinit]").addEventListener("click", function () {
    if (!confirm("Effacer les changements pas encore publiés sur cet appareil et revenir à la version en ligne ?")) return;
    VC.store.del(VC.cleGerant(nom)); majEtat(); chargerListe(nom);
  });

  /* =================================================================
     La carte du bar : rubriques et lignes, modifiables directement
     ================================================================= */
  var zCarte = document.querySelector('[data-panneau="carte"]'), carte = null;
  function ligneHTML(p, ri, pi) {
    return '<tr data-p="' + pi + '">' +
      '<td><label class="visuellement-cache" for="c-' + ri + "-" + pi + '-n">Nom</label><input id="c-' + ri + "-" + pi + '-n" data-k="nom" value="' + e_(p.nom) + '" placeholder="Nom"></td>' +
      '<td><label class="visuellement-cache" for="c-' + ri + "-" + pi + '-p">Prix</label><input id="c-' + ri + "-" + pi + '-p" data-k="prix" value="' + e_(p.prix) + '" placeholder="4,50 €" class="g-prix"></td>' +
      '<td><label class="visuellement-cache" for="c-' + ri + "-" + pi + '-d">Détail</label><input id="c-' + ri + "-" + pi + '-d" data-k="detail" value="' + e_(p.detail) + '" placeholder="Détail (facultatif)"></td>' +
      '<td class="g-btns"><button type="button" data-act="p-haut" aria-label="Monter la ligne">↑</button><button type="button" data-act="p-bas" aria-label="Descendre la ligne">↓</button><button type="button" data-act="p-suppr" aria-label="Supprimer la ligne">✕</button></td></tr>';
  }
  function rendreCarte(msg) {
    zCarte.innerHTML =
      '<div class="g-carte-tete"><h2>La carte du bar</h2><p class="g-aide">Changez un prix ou un nom directement dans le tableau, puis enregistrez en bas. ' +
      'Ce qui est écrit ici s\'affiche tel quel sur la carte du QR code et sur la page de la cave.</p></div>' +
      '<div class="g-carte-gen"><div><label for="c-sous">Sous-titre</label><input id="c-sous" data-g="sous_titre" value="' + e_(carte.sous_titre) + '"></div>' +
      '<div><label for="c-note">Mention en bas de carte</label><input id="c-note" data-g="note" value="' + e_(carte.note) + '"></div></div>' +
      carte.rubriques.map(function (r, ri) {
        return '<fieldset class="g-rub" data-r="' + ri + '"><legend class="visuellement-cache">' + e_(r.titre || "Rubrique") + "</legend>" +
          '<div class="g-rub-tete"><div><label for="c-' + ri + '-t">Rubrique</label><input id="c-' + ri + '-t" data-rk="titre" value="' + e_(r.titre) + '" class="g-rub-titre"></div>' +
          '<div><label for="c-' + ri + '-pr">Précision</label><input id="c-' + ri + '-pr" data-rk="precision" value="' + e_(r.precision) + '" placeholder="ex. 12 cl"></div>' +
          '<div class="g-btns"><button type="button" data-act="r-haut" aria-label="Monter la rubrique">↑</button><button type="button" data-act="r-bas" aria-label="Descendre la rubrique">↓</button><button type="button" data-act="r-suppr">Supprimer la rubrique</button></div></div>' +
          '<table class="g-plats"><thead><tr><th scope="col">Nom</th><th scope="col">Prix</th><th scope="col">Détail</th><th scope="col"><span class="visuellement-cache">Actions</span></th></tr></thead><tbody>' +
          r.plats.map(function (p, pi) { return ligneHTML(p, ri, pi); }).join("") + "</tbody></table>" +
          '<button type="button" class="lien" data-act="p-ajout">Ajouter une ligne</button></fieldset>';
      }).join("") +
      '<button type="button" class="etiquette ligne" data-act="r-ajout">Ajouter une rubrique</button>' +
      '<div class="g-actions g-barre"><button type="submit" class="etiquette">' + (relie() ? "Enregistrer et publier la carte" : "Enregistrer la carte") + "</button>" +
      '<a class="lien" href="carte.html" target="_blank" rel="noopener">Voir la carte</a>' +
      '<button type="button" class="lien" data-act="annuler">Annuler mes changements non publiés</button>' +
      '<p class="g-message" role="status" data-message>' + e_(msg || "") + "</p></div>";
  }
  function lireCarte() {
    zCarte.querySelectorAll("[data-g]").forEach(function (el) { carte[el.getAttribute("data-g")] = el.value.trim(); });
    zCarte.querySelectorAll(".g-rub").forEach(function (fs) {
      var r = carte.rubriques[+fs.getAttribute("data-r")];
      fs.querySelectorAll("[data-rk]").forEach(function (el) { r[el.getAttribute("data-rk")] = el.value.trim(); });
      fs.querySelectorAll("tr[data-p]").forEach(function (tr) {
        var p = r.plats[+tr.getAttribute("data-p")];
        tr.querySelectorAll("[data-k]").forEach(function (el) { p[el.getAttribute("data-k")] = el.value.trim(); });
      });
    });
  }
  function bouge(l, i, d) { var j = i + d; if (j < 0 || j >= l.length) return; var x = l[i]; l[i] = l[j]; l[j] = x; }
  zCarte.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "annuler") {
      if (!confirm("Revenir à la carte en ligne ?")) return;
      VC.store.del(VC.cleGerant("carte")); majEtat(); afficher("carte"); return;
    }
    lireCarte();
    var fs = b.closest(".g-rub"), ri = fs ? +fs.getAttribute("data-r") : -1, r = carte.rubriques[ri];
    var tr = b.closest("tr[data-p]"), pi = tr ? +tr.getAttribute("data-p") : -1, focus = null;
    if (act === "r-ajout") { carte.rubriques.push({ titre: "Nouvelle rubrique", precision: "", plats: [{ nom: "", prix: "", detail: "" }] }); focus = "#c-" + (carte.rubriques.length - 1) + "-t"; }
    if (act === "r-haut") bouge(carte.rubriques, ri, -1);
    if (act === "r-bas") bouge(carte.rubriques, ri, 1);
    if (act === "r-suppr") { if (!confirm("Supprimer la rubrique « " + r.titre + " » et toutes ses lignes ?")) return; carte.rubriques.splice(ri, 1); }
    if (act === "p-ajout") { r.plats.push({ nom: "", prix: "", detail: "" }); focus = "#c-" + ri + "-" + (r.plats.length - 1) + "-n"; }
    if (act === "p-haut") bouge(r.plats, pi, -1);
    if (act === "p-bas") bouge(r.plats, pi, 1);
    if (act === "p-suppr") r.plats.splice(pi, 1);
    VC.ecrireLocal("carte", carte, false); majEtat();
    rendreCarte();
    if (focus) { var f = zCarte.querySelector(focus); if (f) { f.focus(); f.select && f.select(); } }
  });
  zCarte.addEventListener("submit", function (ev) {
    ev.preventDefault(); lireCarte();
    carte.rubriques.forEach(function (r) { r.plats = r.plats.filter(function (p) { return p.nom || p.prix; }); });
    var bouton = zCarte.querySelector('[type="submit"]'); bouton.disabled = true;
    enregistrer("carte", carte, function (t) { dire(zCarte, t); }).then(function (c) {
      carte = c; rendreCarte(zCarte.querySelector("[data-message]").textContent);
    });
  });
  // un changement non enregistré est gardé au fil de la frappe, pour ne rien perdre
  zCarte.addEventListener("change", function () { if (carte) { lireCarte(); VC.ecrireLocal("carte", carte, false); majEtat(); } });

  /* =================================================================
     Horaires et contact
     ================================================================= */
  var zInfos = document.querySelector('[data-panneau="infos"]'), infos = null;
  var JOURS = [[1, "Lundi"], [2, "Mardi"], [3, "Mercredi"], [4, "Jeudi"], [5, "Vendredi"], [6, "Samedi"], [0, "Dimanche"]];
  function rendreInfos(msg) {
    var h = infos.horaires || {};
    function champ(k, lab, type, aide) {
      return '<div><label for="i-' + k + '">' + lab + '</label><input id="i-' + k + '" name="' + k + '" type="' + (type || "text") + '" value="' + e_(infos[k]) + '">' + (aide ? '<p class="g-aide">' + aide + "</p>" : "") + "</div>";
    }
    zInfos.innerHTML = '<div class="g-carte-tete plein"><h2>Horaires et contact</h2><p class="g-aide">Ces informations s\'affichent dans le pied de page, le menu, la page Contact et l\'indication « Ouvert / Fermé ».</p></div>' +
      champ("telephone", "Téléphone", "tel") + champ("email", "E-mail", "email") + champ("adresse", "Adresse") + champ("ville", "Code postal et ville") +
      champ("facebook", "Page Facebook", "url") +
      '<div class="plein"><h3 class="g-sous-titre">Horaires d\'ouverture</h3><table class="g-horaires"><thead><tr><th scope="col">Jour</th><th scope="col">Fermé</th><th scope="col">Matin ou journée</th><th scope="col">Après-midi et soir</th></tr></thead><tbody>' +
      JOURS.map(function (j) {
        var p = h[j[0]] || [], a = p[0] || ["", ""], b = p[1] || ["", ""], ferme = !p.length;
        return '<tr data-jour="' + j[0] + '"><th scope="row">' + j[1] + "</th>" +
          '<td><input type="checkbox" data-ferme aria-label="' + j[1] + ' : fermé"' + (ferme ? " checked" : "") + "></td>" +
          '<td><input type="time" data-h="0" value="' + e_(a[0]) + '" aria-label="' + j[1] + ', début"> à <input type="time" data-h="1" value="' + e_(a[1]) + '" aria-label="' + j[1] + ', fin"></td>' +
          '<td><input type="time" data-h="2" value="' + e_(b[0]) + '" aria-label="' + j[1] + ', reprise"> à <input type="time" data-h="3" value="' + e_(b[1]) + '" aria-label="' + j[1] + ', fermeture"></td></tr>';
      }).join("") + '</tbody></table><p class="g-aide">Une seule plage dans la journée ? Remplissez seulement la première colonne.</p></div>' +
      '<div class="plein">' + champ("horaires_note", "Précision sur les horaires", "text", "Par exemple : Plus tard les soirs d'événement").replace(/^<div>|<\/div>$/g, "") + "</div>" +
      '<div class="plein"><label for="i-annonce">Annonce sur tout le site</label><textarea id="i-annonce" name="annonce">' + e_(infos.annonce) + '</textarea><p class="g-aide">Par exemple : « Fermeture exceptionnelle le 24 décembre ». Elle s\'affiche dans un petit carton en bas de l\'écran. Laissez vide pour ne rien afficher.</p></div>' +
      '<div class="plein g-actions"><button type="submit" class="etiquette">' + (relie() ? "Enregistrer et publier" : "Enregistrer") + "</button>" +
      '<a class="lien" href="contact.html" target="_blank" rel="noopener">Voir la page Contact</a><p class="g-message plein" role="status" data-message>' + e_(msg || "") + "</p></div>";
  }
  zInfos.addEventListener("submit", function (ev) {
    ev.preventDefault();
    ["telephone", "email", "adresse", "ville", "facebook", "horaires_note", "annonce"].forEach(function (k) { var el = zInfos.querySelector('[name="' + k + '"]'); if (el) infos[k] = el.value.trim(); });
    var h = {}, erreur = "";
    zInfos.querySelectorAll("tr[data-jour]").forEach(function (tr) {
      var d = tr.getAttribute("data-jour"), v = [].map.call(tr.querySelectorAll("[data-h]"), function (x) { return x.value; });
      if (tr.querySelector("[data-ferme]").checked) { h[d] = []; return; }
      var p = [];
      if (v[0] && v[1]) p.push([v[0], v[1]]);
      if (v[2] && v[3]) p.push([v[2], v[3]]);
      if (!p.length) erreur = "Pour chaque jour, cochez « Fermé » ou indiquez au moins une heure d'ouverture et de fermeture.";
      h[d] = p;
    });
    if (erreur) { dire(zInfos, erreur); return; }
    infos.horaires = h;
    zInfos.querySelector('[type="submit"]').disabled = true;
    enregistrer("infos", infos, function (t) { dire(zInfos, t); }).then(function (x) { infos = x; rendreInfos(zInfos.querySelector("[data-message]").textContent); });
  });

  /* =================================================================
     Demande à Qamar : un problème, une modification, une question
     ================================================================= */
  var zDem = document.querySelector("[data-demande]"), zFils = document.querySelector("[data-fils]");
  var PAGES = ["Tout le site", "Accueil", "La carte", "La cave", "Événements", "Tireuses et fûts", "Notre histoire", "Contact", "Espace gérant"];
  function rendreDemande(msg) {
    zDem.innerHTML = '<h2 id="g-dem-t" class="plein">Demande à Qamar</h2>' +
      '<p class="g-aide plein">Un problème sur le site, une couleur ou un texte à changer, une idée ? Décrivez-la ici : l\'équipe Qamar vous répond au plus vite, et sa réponse s\'affiche à droite.</p>' +
      '<div><label for="d-type">Votre demande</label><select id="d-type" name="type"><option>Corriger un problème</option><option>Modifier quelque chose</option><option>Ajouter une nouveauté</option><option>Poser une question</option></select></div>' +
      '<div><label for="d-page">Page concernée</label><select id="d-page" name="page">' + PAGES.map(function (p) { return "<option>" + e_(p) + "</option>"; }).join("") + "</select></div>" +
      '<div class="plein"><label for="d-texte">Décrivez ce que vous voulez *</label><textarea id="d-texte" name="texte" required placeholder="Par exemple : sur la page d\'accueil, je voudrais que le bouton « Voir la carte » soit vert plutôt qu\'orange."></textarea><p class="erreur" id="err-d-texte"></p></div>' +
      '<div class="plein"><label for="d-photo">Capture d\'écran (facultatif)</label><div class="g-photo"><span class="vide" data-apercu></span><div><input type="file" id="d-photo" accept="image/*" data-photo><input type="hidden" name="capture" value=""><p class="g-aide">Une image aide souvent à comprendre plus vite.</p></div></div></div>' +
      '<div class="plein cases"><label><input type="checkbox" name="urgent"> C\'est urgent (le site affiche quelque chose de faux ou ne fonctionne plus)</label></div>' +
      '<div class="plein g-actions"><button type="submit" class="etiquette">Envoyer à Qamar</button><p class="g-message plein" role="status" data-message>' + e_(msg || "") + "</p></div>";
    zDem.querySelector("[data-photo]").addEventListener("change", function (ev) { photo(ev.target, zDem); });
  }
  zDem.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var type = zDem.querySelector('[name="type"]').value, page = zDem.querySelector('[name="page"]').value;
    var texte = zDem.querySelector('[name="texte"]').value.trim(), capture = zDem.querySelector('[name="capture"]').value;
    var urgent = zDem.querySelector('[name="urgent"]').checked, err = document.getElementById("err-d-texte");
    err.textContent = texte ? "" : "Décrivez votre demande en quelques mots.";
    if (!texte) { zDem.querySelector('[name="texte"]').focus(); return; }
    var titre = (urgent ? "Urgent · " : "") + type + " · " + page + " · " + (texte.length > 60 ? texte.slice(0, 60) + "…" : texte);
    var corps = "**" + type + "** · page : " + page + (urgent ? " · **urgent**" : "") + "\n\n" + texte + "\n\n_Envoyé depuis l'espace gérant le " + new Date().toLocaleString("fr-FR") + "._";
    if (!relie()) {
      if (CFG.qamarEmail) {
        location.href = "mailto:" + CFG.qamarEmail + "?subject=" + encodeURIComponent("[Vinochope] " + titre) + "&body=" + encodeURIComponent(corps.replace(/\*\*|_/g, "") + (capture ? "\n\n(Joignez la capture d'écran à ce message.)" : ""));
        return;
      }
      dire(zDem, "Pour envoyer une demande, reliez d'abord l'espace au site avec votre clé (cadre en haut de la page).");
      return;
    }
    var b = zDem.querySelector('[type="submit"]'); b.disabled = true; dire(zDem, "Envoi…");
    var pret = Promise.resolve("");
    if (capture) {
      var chemin = "demandes/captures/" + new Date().toISOString().slice(0, 10) + "-" + Math.random().toString(36).slice(2, 8) + (capture.indexOf("webp") > -1 ? ".webp" : ".jpg");
      pret = ecrire(CFG.demandes, chemin, capture.split(",")[1], "Capture jointe à une demande Vinochope").then(function () {
        return "\n\n![Capture d'écran](https://github.com/" + CFG.demandes + "/raw/HEAD/" + chemin + ")";
      }, function () { return "\n\n(La capture n'a pas pu être jointe.)"; });
    }
    pret.then(function (img) {
      return gh("/repos/" + CFG.demandes + "/issues", { method: "POST", body: { title: titre, body: corps + img, labels: [CFG.etiquette].concat(urgent ? ["urgent"] : []) } });
    }).then(function () {
      rendreDemande("Merci, c'est envoyé. Qamar vous répond au plus vite : la réponse s'affichera dans « Vos demandes ».");
      rendreFils();
    }, function (er) { b.disabled = false; dire(zDem, er.status === 410 || er.status === 404 ? "Les demandes ne sont pas encore ouvertes pour ce site. Prévenez Qamar." : erreurLisible(er)); });
  });

  function etatFil(f) {
    if (f.state === "closed") return ["Terminée", "fini"];
    if (f.comments > 0) return ["Qamar a répondu", "repondu"];
    return ["Envoyée, en attente", "attente"];
  }
  function rendreFils() {
    if (!relie()) { zFils.innerHTML = "<li class=\"g-fil-vide\">Reliez l'espace au site pour suivre vos demandes et lire les réponses de Qamar.</li>"; return; }
    zFils.innerHTML = '<li class="g-fil-vide">Chargement…</li>';
    gh("/repos/" + CFG.demandes + "/issues?labels=" + CFG.etiquette + "&state=all&per_page=30").then(function (l) {
      zFils.innerHTML = l.map(function (f) {
        var et = etatFil(f);
        return '<li class="g-fil" data-num="' + f.number + '"><button type="button" aria-expanded="false"><span class="g-fil-etat ' + et[1] + '">' + et[0] + "</span>" +
          "<b>" + e_(f.title) + "</b><small>" + new Date(f.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) + "</small></button>" +
          '<div class="g-fil-corps" hidden></div></li>';
      }).join("") || '<li class="g-fil-vide">Aucune demande pour l\'instant.</li>';
    }, function (er) { zFils.innerHTML = '<li class="g-fil-vide">' + e_(er.status === 404 ? "Les demandes ne sont pas encore ouvertes pour ce site." : erreurLisible(er)) + "</li>"; });
  }
  function texteSimple(md) { return e_(md || "").replace(/!\[[^\]]*\]\(([^)]+)\)/g, '<a href="$1" target="_blank" rel="noopener">Voir la capture</a>').replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/_([^_]+)_/g, "$1").replace(/\n/g, "<br>"); }
  zFils.addEventListener("click", function (ev) {
    var bt = ev.target.closest(".g-fil > button"); if (!bt) return;
    var li = bt.parentNode, corps = li.querySelector(".g-fil-corps"), ouvert = bt.getAttribute("aria-expanded") === "true";
    bt.setAttribute("aria-expanded", !ouvert); corps.hidden = ouvert;
    if (ouvert || corps.getAttribute("data-charge")) return;
    corps.innerHTML = "<p>Chargement…</p>";
    var num = li.getAttribute("data-num");
    Promise.all([gh("/repos/" + CFG.demandes + "/issues/" + num), gh("/repos/" + CFG.demandes + "/issues/" + num + "/comments")]).then(function (r) {
      corps.setAttribute("data-charge", "1");
      corps.innerHTML = '<div class="g-msg vous"><p class="g-msg-qui">Vous</p><p>' + texteSimple(r[0].body) + "</p></div>" +
        r[1].map(function (c) {
          var vous = /espace gérant/.test(c.body || "");
          return '<div class="g-msg ' + (vous ? "vous" : "qamar") + '"><p class="g-msg-qui">' + (vous ? "Vous" : "Qamar") + " · " + new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) + "</p><p>" + texteSimple(c.body) + "</p></div>";
        }).join("") +
        (r[0].state === "open" ? '<form class="g-repondre" data-repondre><label for="rep-' + num + '">Répondre</label><textarea id="rep-' + num + '" required></textarea><button type="submit" class="etiquette ligne">Envoyer la réponse</button></form>' : "");
    }, function (er) { corps.innerHTML = "<p>" + e_(erreurLisible(er)) + "</p>"; });
  });
  zFils.addEventListener("submit", function (ev) {
    var f = ev.target.closest("[data-repondre]"); if (!f) return;
    ev.preventDefault();
    var t = f.querySelector("textarea").value.trim(); if (!t) return;
    var li = f.closest(".g-fil"), num = li.getAttribute("data-num");
    f.querySelector("button").disabled = true;
    gh("/repos/" + CFG.demandes + "/issues/" + num + "/comments", { method: "POST", body: { body: t + "\n\n_Réponse envoyée depuis l'espace gérant._" } }).then(function () {
      var c = li.querySelector(".g-fil-corps"); c.removeAttribute("data-charge"); c.hidden = true;
      li.querySelector("button").setAttribute("aria-expanded", "false"); li.querySelector("button").click();
    }, function (er) { alert(erreurLisible(er)); f.querySelector("button").disabled = false; });
  });

  /* =================================================================
     Onglets
     ================================================================= */
  var onglet = "evenements", panneaux = document.querySelectorAll("[data-panneau]");
  function montrer(p) { panneaux.forEach(function (x) { x.hidden = x.getAttribute("data-panneau") !== p; }); }
  function afficher(o) {
    onglet = o;
    if (SCHEMAS[o]) { montrer("liste"); chargerListe(o); return; }
    montrer(o);
    if (o === "carte") { zCarte.innerHTML = "<p>Chargement…</p>"; chargerDonnees("carte").then(function (c) { carte = c; rendreCarte(); }); }
    if (o === "infos") { zInfos.innerHTML = "<p>Chargement…</p>"; chargerDonnees("infos").then(function (x) { infos = x; rendreInfos(); }); }
    if (o === "demandes") { rendreDemande(); rendreFils(); }
  }
  var zOnglets = document.querySelector("[data-onglets]");
  zOnglets.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-onglet]"); if (!b) return;
    zOnglets.querySelectorAll("[data-onglet]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    afficher(b.getAttribute("data-onglet"));
    try { history.replaceState(null, "", "#" + b.getAttribute("data-onglet")); } catch (e) {}
  });

  rendreConnexion(); majEtat();
  var depart = location.hash.slice(1);
  var bDepart = depart && zOnglets.querySelector('[data-onglet="' + depart + '"]');
  if (bDepart) bDepart.click(); else afficher("evenements");
})();
