# -*- coding: utf-8 -*-
"""Assemble les pages du site Vinochope (en-tête, menu et pied de page communs).
Lancer : python tools/build_site.py  → écrit les .html dans site/"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "site"
URL = "https://www.vinochope.fr/"
V = "10"

NAV = [
    ("index.html", "Accueil"),
    ("la-cave.html", "La cave"),
    ("le-bar.html", "Le bar"),
    ("programmation.html", "Programmation"),
    ("location-tireuses.html", "Location de tireuses"),
    ("infos-pratiques.html", "Infos pratiques"),
]

HOURS_ROWS = """<table class="hours">
  <caption class="sr-only">Horaires d'ouverture</caption>
  <tbody>
    <tr data-days="1"><th scope="row">Lundi</th><td>15 h – 21 h</td></tr>
    <tr data-days="2,3,4,5,6"><th scope="row">Mardi – samedi</th><td>10 h – 12 h 30<br>14 h 30 – 21 h</td></tr>
    <tr data-days="0"><th scope="row">Dimanche</th><td>Fermé</td></tr>
  </tbody>
</table>"""

SCHEMA = {
    "@context": "https://schema.org",
    "@type": ["LiquorStore", "BarOrPub"],
    "name": "Vinochope",
    "description": "Cave, bar et lieu culturel à Perpignan : 200 vins dont 80 % du Roussillon, 450 bières, 150 spiritueux. Location de tireuses à bière.",
    "url": URL,
    "telephone": "+33468899143",
    "foundingDate": "2013-09",
    "address": {"@type": "PostalAddress", "streetAddress": "26 rue Mathieu de Dombasle", "postalCode": "66000", "addressLocality": "Perpignan", "addressCountry": "FR"},
    "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification", "dayOfWeek": "Monday", "opens": "15:00", "closes": "21:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "opens": "10:00", "closes": "12:30"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "opens": "14:30", "closes": "21:00"},
    ],
    "sameAs": ["https://www.facebook.com/vinochope/"],
}


def head(title, desc, path, extra=""):
    canon = URL + ("" if path == "index.html" else path)
    return f"""<!doctype html>
<html lang="fr" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#1A1114">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="Vinochope">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{URL}media/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="assets/css/main.css?v={V}">
{extra}</head>
"""


def header(active):
    cur = lambda href: ' aria-current="page"' if href == active else ""
    items = "".join(
        f'<li><a href="{href}"{cur(href)}>{label}</a></li>'
        for href, label in NAV[1:] if href != "location-tireuses.html"
    )
    drawer_items = "".join(
        f'<li><a href="{href}"{cur(href)}>{label}<span class="n">0{i}</span></a></li>'
        for i, (href, label) in enumerate(NAV)
    )
    return f"""<a class="skip" href="#contenu">Aller au contenu</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="Vinochope, accueil">Vinochope<span>.</span></a>
    <nav aria-label="Navigation principale"><ul class="menu">{items}</ul></nav>
    <a class="btn s" href="location-tireuses.html">Louer une tireuse</a>
    <button class="burger" type="button" aria-expanded="false" aria-controls="drawer">Menu</button>
  </div>
</header>
<div class="drawer" id="drawer" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="drawer-head">
    <a class="brand" href="index.html">Vinochope<span>.</span></a>
    <button class="burger" style="display:inline-flex" type="button" data-close>Fermer</button>
  </div>
  <nav aria-label="Menu mobile"><ul>{drawer_items}</ul></nav>
  <div class="drawer-foot"><span data-status>26 rue Mathieu de Dombasle</span><a class="link" href="tel:+33468899143">04 68 89 91 43</a></div>
</div>
"""


FOOTER = f"""<footer class="foot">
  <div class="wrap">
    <p class="foot-mark" aria-hidden="true">Vinochope<span>.</span></p>
    <div class="grid">
      <div class="c-4">
        <h2>Venir</h2>
        <address>26 rue Mathieu de Dombasle<br>66000 Perpignan</address>
        <p style="margin-top:.75rem"><a href="https://www.google.com/maps/search/?api=1&amp;query=Vinochope%2026%20rue%20Mathieu%20de%20Dombasle%20Perpignan" rel="noopener" target="_blank">Itinéraire<span class="sr-only"> (s'ouvre dans un nouvel onglet)</span></a></p>
      </div>
      <div class="c-4">
        <h2>Horaires</h2>
        {HOURS_ROWS}
        <p class="small muted" style="margin-top:.75rem">Les soirs de concert ou de vernissage, on ferme plus tard.</p>
      </div>
      <div class="c-4">
        <h2>Nous joindre</h2>
        <ul>
          <li><a href="tel:+33468899143">04 68 89 91 43</a></li>
          <li><a href="infos-pratiques.html#contact">Écrire un message</a></li>
          <li><a href="https://www.facebook.com/vinochope/" rel="noopener" target="_blank">Facebook<span class="sr-only"> (s'ouvre dans un nouvel onglet)</span></a></li>
          <li><a href="mentions-legales.html">Mentions légales</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-base">
      <p class="evin">L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p>
      <p>© <span data-year>2026</span> Vinochope · Perpignan depuis 2013</p>
    </div>
  </div>
</footer>
<div class="gate" id="gate" hidden role="dialog" aria-modal="true" aria-labelledby="gate-t">
  <div class="gate-box">
    <span class="eyebrow">Vinochope · Perpignan</span>
    <div class="gate-q stack">
      <h2 id="gate-t">Avez-vous 18 ans ou plus ?</h2>
      <p class="muted">Ce site parle de vin, de bière et de spiritueux. La vente d'alcool est interdite aux mineurs.</p>
      <div class="actions"><button class="btn" type="button" data-yes>Oui, j'ai 18 ans</button><button class="btn ghost" type="button" data-no>Non</button></div>
    </div>
    <div class="gate-msg stack" hidden>
      <h2>À bientôt.</h2>
      <p class="muted">Revenez nous voir à votre majorité. En attendant, la programmation culturelle est ouverte à tous.</p>
    </div>
    <p class="notice">L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p>
  </div>
</div>
<div class="grain" aria-hidden="true"></div>
<script src="assets/js/main.js?v={V}" defer></script>
"""


def page(path, title, desc, body, extra_head="", extra_foot="", body_class=""):
    html = head(title, desc, path, extra_head) + f'<body class="{body_class}">\n' + header(path) + \
        f'<main id="contenu">\n{body}\n</main>\n' + FOOTER + extra_foot + "</body>\n</html>\n"
    (ROOT / path).write_text(html, encoding="utf-8")
    print("écrit", path)


def form_ok(text):
    return f'<div class="ok full" role="status">{text}</div>'


def field(fid, label, kind="text", required=True, full=False, attrs="", ph=""):
    req = " required" if required else ""
    star = "" if required else ' <span class="small">(facultatif)</span>'
    cls = "field full" if full else "field"
    ph = f' placeholder="{ph}"' if ph else ""
    if kind == "textarea":
        ctrl = f'<textarea id="{fid}" name="{fid}"{req}{ph} {attrs}></textarea>'
    else:
        ctrl = f'<input id="{fid}" name="{fid}" type="{kind}"{req}{ph} {attrs}>'
    return f'<div class="{cls}"><label for="{fid}">{label}{star}</label>{ctrl}<span class="err" id="e-{fid}" data-err="{fid}"></span></div>'


# =====================================================================================
# ACCUEIL
# =====================================================================================
home = f"""
<div class="stage" aria-hidden="true">
  <img class="poster" src="media/lg/f000.webp" alt="" width="1280" height="720" fetchpriority="high">
  <canvas></canvas>
  <div class="loader"><i></i></div>
</div>

<nav class="progress" aria-label="Chapitres de la page">
  <a href="#c0">La grappe</a><a href="#c1">La cave</a><a href="#c2">Programmation</a>
  <a href="#c3">Le bar</a><a href="#c4">Tireuses</a><a href="#c5">Venir</a>
</nav>

<div class="story">
  <section class="chapter hero left" id="c0" aria-labelledby="t0">
    <div class="txt">
      <span class="eyebrow">Cave · bar · lieu culturel · Perpignan</span>
      <h1 id="t0">Vino<br>chope<span class="or">.</span></h1>
      <p class="lead words">Des vins choisis chez ceux qui les font, <span class="or">à boire au comptoir</span> ou à emporter.</p>
      <dl class="facts">
        <div><dt>Aujourd'hui</dt><dd data-status>Lun. 15 h – 21 h · mar.–sam. 10 h – 21 h</dd></div>
        <div><dt>Adresse</dt><dd>26 rue Mathieu de Dombasle</dd></div>
      </dl>
      <span class="cue">Faites défiler, on vous sert un verre</span>
    </div>
  </section>

  <section class="chapter right" id="c1" aria-labelledby="t1">
    <div class="txt">
      <span class="eyebrow"><span class="n">01</span>La cave</span>
      <h2 id="t1" class="words">Deux cents vins, dont <span class="or">huit sur dix</span> du Roussillon.</h2>
      <p class="muted">400 m² de bouteilles choisies une à une. La sélection tourne au fil de l'année, et on prend toujours le temps de vous conseiller.</p>
      <div class="stats" role="list">
        <div role="listitem"><strong class="num">200</strong><span>vins</span></div>
        <div role="listitem"><strong class="num">450</strong><span>bières</span></div>
        <div role="listitem"><strong class="num">150</strong><span>spiritueux</span></div>
      </div>
      <a class="btn" href="la-cave.html">Découvrir la cave</a>
    </div>
  </section>

  <section class="chapter left" id="c2" aria-labelledby="t2">
    <div class="txt">
      <span class="eyebrow"><span class="n">02</span>Programmation</span>
      <h2 id="t2" class="words">Concerts, expositions, <span class="or">danse</span> et conférences.</h2>
      <p class="muted">Une programmation renouvelée chaque trimestre. Habitués et gens de passage s'y croisent, verre en main.</p>
      <ul class="rows">
        <li><span class="d">Concerts</span><span class="t">Groupes de la région, en acoustique</span></li>
        <li><span class="d">Expos</span><span class="t">Vernissages et artistes locaux</span></li>
        <li><span class="d">Danse</span><span class="t">Cours et soirées</span></li>
      </ul>
      <a class="link" href="programmation.html">Voir la programmation</a>
    </div>
  </section>

  <section class="chapter right" id="c3" aria-labelledby="t3">
    <div class="txt">
      <span class="eyebrow"><span class="n">03</span>Le bar</span>
      <h2 id="t3" class="words">Au verre, <span class="or">au comptoir</span>, avec des tapas.</h2>
      <p class="muted">Le bar sert une large part des références de la cave. Vous goûtez ici, vous repartez avec la bouteille si elle vous plaît.</p>
      <a class="link" href="le-bar.html">Découvrir le bar</a>
    </div>
  </section>

  <section class="chapter left" id="c4" aria-labelledby="t4">
    <div class="txt">
      <span class="eyebrow"><span class="n">04</span>Location de tireuses</span>
      <h2 id="t4" class="words">Une tireuse pour <span class="or">votre événement</span>.</h2>
      <p class="muted">Mariage, anniversaire, association. La location de la tireuse est offerte, le fût de 30 L part à partir de 80 €, soit 0,67 € le demi.</p>
      <div class="actions"><a class="btn" href="location-tireuses.html#devis">Demander un devis</a><a class="link" href="location-tireuses.html">Comment ça marche</a></div>
    </div>
  </section>

  <section class="chapter right end" id="c5" aria-labelledby="t5">
    <div class="txt">
      <span class="eyebrow"><span class="n">05</span>Votre verre est servi</span>
      <h2 id="t5" class="words">Il ne manque <span class="or">plus que vous</span>.</h2>
      <p class="muted">26 rue Mathieu de Dombasle, à Perpignan. <span data-status>Lun. 15 h – 21 h · mar.–sam. 10 h – 21 h</span></p>
      <div class="actions"><a class="btn" href="infos-pratiques.html">Venir nous voir</a><a class="link" href="tel:+33468899143">04 68 89 91 43</a></div>
    </div>
  </section>
</div>

<section class="section after" aria-labelledby="nl-t">
  <div class="wrap grid">
    <div class="c-5 stack">
      <span class="eyebrow">La lettre de Vinochope</span>
      <h2 id="nl-t">Les nouveautés et la programmation, une fois par mois.</h2>
    </div>
    <form class="c-6 o-7 stack" data-form aria-labelledby="nl-t" style="align-self:end;gap:.75rem">
      <div class="field" style="width:100%"><label for="nl-mail">Adresse e-mail</label>
        <div class="inline"><input id="nl-mail" type="email" required placeholder="prenom@exemple.fr" autocomplete="email"><button class="btn" type="submit">S'inscrire</button></div>
        <span class="err" id="e-nl-mail" data-err="nl-mail"></span></div>
      <fieldset class="choices"><legend class="legend" style="margin-bottom:.5rem">Ce qui vous intéresse <span class="small">(facultatif)</span></legend>
        <label class="check"><input type="checkbox" name="i" value="vins"> Les vins</label><label class="check"><input type="checkbox" name="i" value="bieres"> Les bières</label>
        <label class="check"><input type="checkbox" name="i" value="spiritueux"> Les spiritueux</label><label class="check"><input type="checkbox" name="i" value="evenements"> Les événements</label></fieldset>
      <label class="check"><input type="checkbox" id="nl-ok" required> J'accepte de recevoir la lettre de Vinochope. Désinscription en un clic.</label>
      <span class="err" id="e-nl-ok" data-err="nl-ok"></span>
      <div class="ok" role="status">C'est noté. Rendez-vous dans votre boîte mail.</div>
    </form>
  </div>
</section>
"""
page("index.html", "Vinochope · Cave, bar et lieu culturel à Perpignan",
     "Cave à vins, bières et spiritueux, bar à tapas et lieu de concerts à Perpignan depuis 2013. 200 vins dont 80 % du Roussillon. Location de tireuses à bière.",
     home,
     extra_head='<link rel="preload" as="image" href="media/lg/f000.webp" fetchpriority="high">\n<script type="application/ld+json">' + json.dumps(SCHEMA, ensure_ascii=False) + "</script>\n",
     extra_foot=f'<script src="assets/js/story.js?v={V}" defer></script>\n', body_class="home")

# =====================================================================================
# LA CAVE
# =====================================================================================
cave = """
<header class="page-head">
  <div class="wrap grid">
    <div class="c-6 stack" style="align-self:center">
      <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a> / La cave</nav>
      <span class="eyebrow"><span class="n">01</span>La cave</span>
      <h1 class="words">Le Roussillon d'abord, <span class="or">le monde ensuite</span>.</h1>
      <p class="lead">200 vins, 450 bières et 150 spiritueux sur 400 m². Huit vins sur dix viennent d'ici.</p>
      <div class="actions"><a class="btn" href="infos-pratiques.html">Venir à la cave</a><a class="link" href="tel:+33468899143">Appeler la cave</a></div>
    </div>
    <div class="c-6 still reveal"><img src="media/lg/f146.webp" alt="Une bouteille de vin rouge sur fond bordeaux" width="1280" height="720" loading="eager"></div>
  </div>
</header>

<section class="section tint" aria-labelledby="t-fam">
  <div class="wrap stack" style="gap:3rem">
    <div class="grid" style="width:100%">
      <h2 class="c-6" id="t-fam">Trois familles, une même exigence.</h2>
      <p class="c-5 o-8 muted" style="align-self:end">Chaque référence a été goûtée avant d'entrer en rayon. La sélection change au fil des saisons et des arrivages.</p>
    </div>
    <div class="grid" style="width:100%">
      <article class="c-4 card reveal"><span class="tag">Vins</span><p class="big num">200</p><h3>Dont 80 % du Roussillon</h3><p class="muted">Vignerons indépendants, domaines familiaux et quelques belles découvertes d'ailleurs.</p></article>
      <article class="c-4 card reveal d1"><span class="tag">Bières</span><p class="big num">450</p><h3>Artisanales et brassées avec soin</h3><p class="muted">Brasseries catalanes, belges, anglaises et américaines, en bouteille et en fût.</p></article>
      <article class="c-4 card reveal d2"><span class="tag">Spiritueux</span><p class="big num">150</p><h3>Whiskys, rhums, gins, liqueurs</h3><p class="muted">Pour la dégustation, pour un cocktail ou pour un cadeau qui fera date.</p></article>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="t-conseil">
  <div class="wrap grid">
    <div class="c-5 stack">
      <span class="eyebrow">Le conseil</span>
      <h2 id="t-conseil" class="words">Dites-nous le plat, <span class="or">on trouve la bouteille</span>.</h2>
    </div>
    <ol class="c-6 o-7 steps" style="grid-template-columns:1fr 1fr">
      <li><h3>Le moment</h3><p class="muted small">Un dîner, un apéritif, un cadeau, une grande tablée.</p></li>
      <li><h3>Le goût</h3><p class="muted small">Léger ou charpenté, sec ou fruité, classique ou nature.</p></li>
      <li><h3>Le budget</h3><p class="muted small">Il y a de très belles bouteilles à tous les prix.</p></li>
      <li><h3>La découverte</h3><p class="muted small">On vous fait goûter au bar quand c'est possible.</p></li>
    </ol>
  </div>
</section>

<section class="section card-bg" aria-labelledby="t-moment">
  <div class="wrap stack" style="gap:2.5rem">
    <div class="actions" style="justify-content:space-between;width:100%">
      <h2 id="t-moment">En ce moment en cave</h2>
      <p class="notice">Sélection à mettre à jour chaque mois par l'équipe.</p>
    </div>
    <div class="grid" style="width:100%">
      <div class="c-4 ph reveal">[Photo · coup de cœur du mois]</div>
      <div class="c-4 ph reveal d1">[Photo · nouvel arrivage]</div>
      <div class="c-4 ph reveal d2">[Photo · bière du moment]</div>
    </div>
  </div>
</section>
"""
page("la-cave.html", "La cave · Vinochope Perpignan",
     "200 vins dont 80 % du Roussillon, 450 bières et 150 spiritueux sur 400 m² à Perpignan. Conseil personnalisé.", cave)

# =====================================================================================
# LE BAR
# =====================================================================================
bar = """
<header class="page-head">
  <div class="wrap grid">
    <div class="c-6 still reveal"><img src="media/lg/f290.webp" alt="Du vin rouge versé dans un verre" width="1280" height="720" loading="eager"></div>
    <div class="c-5 o-8 stack" style="align-self:center">
      <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a> / Le bar</nav>
      <span class="eyebrow"><span class="n">03</span>Le bar</span>
      <h1 class="words">Au verre, <span class="or">au comptoir</span>.</h1>
      <p class="lead">Une large part des références de la cave, servies au bar, avec des tapas. Un cadre chaleureux où l'on vient seul, à deux ou à dix.</p>
      <p data-status>Lun. 15 h – 21 h · mar.–sam. 10 h – 21 h</p>
    </div>
  </div>
</header>

<section class="section tint" aria-labelledby="t-carte">
  <div class="wrap grid">
    <div class="c-4 stack">
      <h2 id="t-carte">À la carte</h2>
      <p class="muted">La carte suit la cave : elle change souvent. Demandez au comptoir ce qui vient d'être ouvert.</p>
      <p class="notice">Prix et références du moment à ajouter par l'équipe.</p>
    </div>
    <ul class="c-7 o-6 rows">
      <li><span class="t">Vins au verre<small>Rouges, blancs, rosés, en majorité du Roussillon</small></span><span class="p">[prix]</span></li>
      <li><span class="t">Bières à la pression<small>Fûts qui tournent au fil des semaines</small></span><span class="p">[prix]</span></li>
      <li><span class="t">Bières en bouteille<small>Choisies parmi les 450 références de la cave</small></span><span class="p">[prix]</span></li>
      <li><span class="t">Spiritueux<small>À la dégustation</small></span><span class="p">[prix]</span></li>
      <li><span class="t">Tapas<small>Planches, assiettes à partager</small></span><span class="p">[prix]</span></li>
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="t-amb">
  <div class="wrap grid">
    <h2 class="c-6 words" id="t-amb">Un comptoir où <span class="or">tout le monde se croise</span>.</h2>
    <div class="c-5 o-8 stack">
      <p class="muted">Habitués et clients de passage, amateurs exigeants et curieux. Le soir, la programmation culturelle prend le relais : concerts, vernissages, conférences.</p>
      <a class="link" href="programmation.html">Voir la programmation</a>
    </div>
    <div class="c-4 ph reveal">[Photo · le comptoir]</div>
    <div class="c-4 ph reveal d1">[Photo · tapas]</div>
    <div class="c-4 ph reveal d2">[Photo · soirée concert]</div>
  </div>
</section>
"""
page("le-bar.html", "Le bar · Vinochope Perpignan",
     "Bar à vins et à bières à Perpignan : les références de la cave servies au verre, avec des tapas, dans un cadre chaleureux.", bar)

# =====================================================================================
# PROGRAMMATION
# =====================================================================================
prog_form = "".join([
    field("p-nom", "Nom de l'artiste ou du projet"), field("p-mail", "E-mail", "email", attrs='autocomplete="email"'),
    field("p-tel", "Téléphone", "tel", required=False, attrs='autocomplete="tel"'), field("p-lien", "Lien vers vos photos, vidéos ou musique", "url", required=False, ph="https://"),
    field("p-msg", "Présentation du projet", "textarea", full=True),
])
prog = f"""
<header class="page-head">
  <div class="wrap grid">
    <div class="c-8 stack">
      <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a> / Programmation</nav>
      <span class="eyebrow"><span class="n">02</span>Programmation</span>
      <h1 class="words">Ici, on sert <span class="or">aussi de la culture</span>.</h1>
      <p class="lead">Concerts, expositions, cours de danse, conférences. Une programmation renouvelée chaque trimestre.</p>
    </div>
  </div>
</header>

<section class="section tint" aria-labelledby="t-agenda">
  <div class="wrap stack" style="gap:2.5rem">
    <div class="actions" style="justify-content:space-between;width:100%">
      <h2 id="t-agenda">À venir</h2>
      <p class="notice">Agenda à relier à la programmation du trimestre.</p>
    </div>
    <ul class="rows">
      <li><span class="d num">[date]</span><span class="t">[Concert · nom de l'artiste]<small>[Style] · [heure] · entrée libre</small></span><span class="small muted">Concert</span></li>
      <li><span class="d num">[date]</span><span class="t">[Vernissage · nom de l'artiste]<small>Exposition visible tout le mois</small></span><span class="small muted">Expo</span></li>
      <li><span class="d num">[date]</span><span class="t">[Cours de danse]<small>[Style] · [heure]</small></span><span class="small muted">Danse</span></li>
      <li><span class="d num">[date]</span><span class="t">[Conférence · sujet]<small>[Intervenant] · [heure]</small></span><span class="small muted">Conférence</span></li>
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="t-genres">
  <div class="wrap grid">
    <h2 class="c-12" id="t-genres">Quatre façons de passer la soirée</h2>
    <article class="c-3 card reveal"><span class="tag">Concerts</span><p class="muted">Musiciens de la région et d'ailleurs, au plus près du public.</p></article>
    <article class="c-3 card reveal d1"><span class="tag">Expositions</span><p class="muted">Les murs changent de visage, vernissage à chaque accrochage.</p></article>
    <article class="c-3 card reveal d2"><span class="tag">Danse</span><p class="muted">Des cours et des soirées pour bouger entre deux verres.</p></article>
    <article class="c-3 card reveal d3"><span class="tag">Conférences</span><p class="muted">Vin, bière, histoire, culture : on apprend en trinquant.</p></article>
  </div>
</section>

<section class="section card-bg" id="jouer" aria-labelledby="t-jouer">
  <div class="wrap grid">
    <div class="c-5 stack">
      <span class="eyebrow">Artistes</span>
      <h2 id="t-jouer">Vous souhaitez jouer ou exposer ?</h2>
      <p class="muted">Présentez-nous votre projet avec quelques photos ou vidéos. Si votre projet peut rejoindre la programmation trimestrielle, on vous recontacte.</p>
    </div>
    <form class="c-6 o-7 form" data-form aria-labelledby="t-jouer">
      {prog_form}
      <div class="full"><button class="btn" type="submit">Envoyer mon projet</button></div>
      {form_ok("Merci, votre projet est bien parti. On vous répond dès qu'on a pu le regarder.")}
    </form>
  </div>
</section>
"""
page("programmation.html", "Programmation · concerts et expositions · Vinochope Perpignan",
     "Concerts, expositions, cours de danse et conférences à Vinochope, Perpignan. Programmation trimestrielle. Artistes, proposez votre projet.", prog)

# =====================================================================================
# LOCATION DE TIREUSES
# =====================================================================================
devis = "".join([
    field("d-nom", "Nom"), field("d-tel", "Téléphone", "tel", attrs='autocomplete="tel"'),
    field("d-mail", "E-mail", "email", full=True, attrs='autocomplete="email"'),
    field("d-date", "Date de l'événement", "date"), field("d-lieu", "Lieu (ville)", attrs='autocomplete="address-level2"'),
    field("d-nb", "Nombre de personnes", "number", attrs='min="1" inputmode="numeric"'),
    '<fieldset class="field"><legend class="legend">Livraison souhaitée</legend><div class="choices" style="min-height:3rem;align-items:center">'
    '<label class="check"><input type="radio" name="d-liv" value="oui" checked> Oui</label><label class="check"><input type="radio" name="d-liv" value="non"> Non, je passe la chercher</label></div></fieldset>',
    field("d-msg", "Bières souhaitées, options, demande particulière", "textarea", required=False, full=True),
])
tireuses = f"""
<header class="page-head">
  <div class="wrap grid">
    <div class="c-7 stack">
      <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a> / Location de tireuses</nav>
      <span class="eyebrow"><span class="n">04</span>Location de tireuses</span>
      <h1 class="words">La tireuse est offerte, <span class="or">vous choisissez la bière</span>.</h1>
      <p class="lead">Mariage, anniversaire, événement associatif. On s'occupe de la bière, vous profitez de la fête.</p>
      <div class="actions"><a class="btn" href="#devis">Demander un devis</a><a class="link" href="tel:+33468899143">04 68 89 91 43</a></div>
    </div>
    <div class="c-4 o-9 stack" style="align-self:end">
      <div class="stats" style="grid-template-columns:1fr 1fr">
        <div><strong class="num">80 €</strong><span>le fût de 30 L, à partir de</span></div>
        <div><strong class="num">0,67 €</strong><span>le demi de 25 cl</span></div>
      </div>
      <p class="notice">Tarif indicatif selon la bière choisie.</p>
    </div>
  </div>
</header>

<section class="section tint" aria-labelledby="t-how">
  <div class="wrap stack" style="gap:3rem">
    <h2 id="t-how">Comment ça marche</h2>
    <ol class="steps" style="width:100%">
      <li><h3>Vous faites la demande</h3><p class="muted small">Par le formulaire ou par téléphone : date, lieu, nombre de personnes.</p></li>
      <li><h3>On choisit les bières</h3><p class="muted small">On vous conseille les fûts et les quantités selon vos invités.</p></li>
      <li><h3>On livre et on installe</h3><p class="muted small">En option. Sinon, vous passez prendre le matériel à la cave.</p></li>
      <li><h3>On reprend le matériel</h3><p class="muted small">Tireuse, fûts et bouteilles après la fête.</p></li>
    </ol>
  </div>
</section>

<section class="section" aria-labelledby="t-opt">
  <div class="wrap grid">
    <div class="c-5 stack"><h2 id="t-opt">Les options</h2><p class="muted">À ajouter selon votre événement.</p></div>
    <ul class="c-7 o-6 rows">
      <li><span class="t">Location de verres</span></li>
      <li><span class="t">Gobelets réutilisables consignés<small>Type écocup</small></span></li>
      <li><span class="t">Reprise des bouteilles et des fûts</span></li>
      <li><span class="t">Livraison et installation de la tireuse</span></li>
    </ul>
  </div>
</section>

<section class="section card-bg" id="devis" aria-labelledby="t-devis">
  <div class="wrap grid">
    <div class="c-4 stack">
      <span class="eyebrow">Devis gratuit</span>
      <h2 id="t-devis">Votre demande</h2>
      <p class="muted">On vous rappelle pour caler les détails. Pour une date proche, appelez-nous directement.</p>
      <a class="link" href="tel:+33468899143">04 68 89 91 43</a>
    </div>
    <form class="c-7 o-6 form" data-form aria-labelledby="t-devis">
      {devis}
      <div class="full"><button class="btn" type="submit">Envoyer la demande</button></div>
      {form_ok("Merci, votre demande est bien arrivée. On vous rappelle rapidement pour la confirmer.")}
    </form>
  </div>
</section>

<section class="section" aria-labelledby="t-faq">
  <div class="wrap grid">
    <h2 class="c-4" id="t-faq">Questions fréquentes</h2>
    <div class="c-8 faq">
      <details><summary>Combien de demis dans un fût de 30 L ?</summary><p>120 demis de 25 cl. On vous aide à estimer la quantité selon le nombre d'invités et la durée de la fête.</p></details>
      <details><summary>La location de la tireuse est vraiment offerte ?</summary><p>Oui, vous payez la bière. Les options (verres, gobelets, livraison, installation) sont en plus.</p></details>
      <details><summary>Faut-il savoir se servir d'une tireuse ?</summary><p>Non. On vous montre comment faire, ça prend quelques minutes.</p></details>
      <details><summary>Camping, bar, association : une tireuse pour la saison ?</summary><p>Oui, on met aussi des tireuses à disposition à l'année ou pour une saison. Contactez-nous, on trouve toujours une solution.</p></details>
    </div>
  </div>
</section>
"""
page("location-tireuses.html", "Location de tireuse à bière à Perpignan · Vinochope",
     "Location de tireuse à bière offerte à Perpignan pour mariage, anniversaire ou association. Fût de 30 L dès 80 €, soit 0,67 € le demi. Livraison et installation.", tireuses)

# =====================================================================================
# INFOS PRATIQUES
# =====================================================================================
contact = "".join([
    field("c-nom", "Nom", attrs='autocomplete="name"'), field("c-mail", "E-mail", "email", attrs='autocomplete="email"'),
    field("c-msg", "Message", "textarea", full=True),
])
infos = f"""
<header class="page-head">
  <div class="wrap grid">
    <div class="c-8 stack">
      <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a> / Infos pratiques</nav>
      <span class="eyebrow"><span class="n">05</span>Infos pratiques</span>
      <h1>Venir à <span class="or">Vinochope</span>.</h1>
      <p data-status class="lead">Lun. 15 h – 21 h · mar.–sam. 10 h – 21 h</p>
    </div>
  </div>
</header>

<section class="section tint" id="acces" aria-labelledby="t-acces">
  <div class="wrap grid">
    <div class="c-5 stack">
      <h2 id="t-acces">Adresse</h2>
      <address class="lead" style="font-style:normal">26 rue Mathieu de Dombasle<br>66000 Perpignan</address>
      <div class="actions"><a class="btn" href="https://www.google.com/maps/search/?api=1&amp;query=Vinochope%2026%20rue%20Mathieu%20de%20Dombasle%20Perpignan" rel="noopener" target="_blank">Itinéraire<span class="sr-only"> (s'ouvre dans un nouvel onglet)</span></a><a class="link" href="tel:+33468899143">04 68 89 91 43</a></div>
    </div>
    <div class="c-6 o-7 stack">
      <h2>Horaires</h2>
      {HOURS_ROWS}
      <p class="muted small">Les soirs d'événement (concert, vernissage), on peut fermer plus tard.</p>
    </div>
  </div>
</section>

<section class="section" id="contact" aria-labelledby="t-contact">
  <div class="wrap grid">
    <div class="c-4 stack">
      <h2 id="t-contact">Nous écrire</h2>
      <p class="muted">Une question sur un vin, une commande, un événement ? Écrivez-nous, on répond vite.</p>
      <a class="link" href="programmation.html#jouer">Artiste ? Proposez votre projet</a>
    </div>
    <form class="c-7 o-6 form" data-form aria-labelledby="t-contact">
      {contact}
      <div class="full"><button class="btn" type="submit">Envoyer</button></div>
      {form_ok("Merci, votre message est bien parti. On vous répond rapidement.")}
    </form>
  </div>
</section>
"""
page("infos-pratiques.html", "Infos pratiques · horaires et accès · Vinochope Perpignan",
     "Vinochope, 26 rue Mathieu de Dombasle, 66000 Perpignan. Ouvert le lundi de 15 h à 21 h, du mardi au samedi de 10 h à 12 h 30 et de 14 h 30 à 21 h. 04 68 89 91 43.", infos)

# =====================================================================================
# MENTIONS LÉGALES
# =====================================================================================
legal = """
<header class="page-head">
  <div class="wrap grid">
    <div class="c-8 stack">
      <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a> / Mentions légales</nav>
      <h1>Mentions légales</h1>
    </div>
  </div>
</header>
<section class="section" style="padding-top:0">
  <div class="wrap grid">
    <div class="c-8 stack measure" style="gap:2.5rem">
      <div class="stack-s"><h2 class="h3" style="font-size:var(--t-h3)">Éditeur du site</h2><p class="muted">Vinochope, [forme juridique et capital], SIRET [à compléter], 26 rue Mathieu de Dombasle, 66000 Perpignan. Téléphone : 04 68 89 91 43. Directeur de la publication : [nom].</p></div>
      <div class="stack-s"><h2 style="font-size:var(--t-h3)">Hébergement</h2><p class="muted">[Hébergeur, adresse, téléphone].</p></div>
      <div class="stack-s"><h2 style="font-size:var(--t-h3)">Vente d'alcool</h2><p class="muted">La vente d'alcool est interdite aux mineurs. L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p></div>
      <div class="stack-s" id="cookies"><h2 style="font-size:var(--t-h3)">Cookies</h2><p class="muted">Ce site ne dépose aucun cookie publicitaire ni de mesure d'audience. Votre réponse à la question de l'âge est gardée dans votre navigateur uniquement, pour ne pas vous la reposer.</p></div>
      <div class="stack-s"><h2 style="font-size:var(--t-h3)">Données personnelles</h2><p class="muted">Les informations envoyées par les formulaires servent uniquement à vous répondre. [Durée de conservation, contact pour exercer vos droits RGPD : à compléter.]</p></div>
      <p class="notice">Textes à compléter et à faire valider.</p>
    </div>
  </div>
</section>
"""
page("mentions-legales.html", "Mentions légales · Vinochope", "Mentions légales, cookies et données personnelles du site Vinochope.", legal)

(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {URL}sitemap.xml\n", encoding="utf-8")
urls = "".join(f"<url><loc>{URL}{'' if p == 'index.html' else p}</loc></url>" for p, _ in NAV + [("mentions-legales.html", "")])
(ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n', encoding="utf-8")
(ROOT / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1A1114"/>'
    '<path d="M20 12h24c0 14-4 22-12 23-8-1-12-9-12-23z" fill="none" stroke="#C4A35A" stroke-width="3"/>'
    '<path d="M21.5 22h21c-1 8-4.6 12-10.5 12.6C26.1 34 22.5 30 21.5 22z" fill="#6B1E2A"/>'
    '<path d="M32 35v14M23 51h18" stroke="#C4A35A" stroke-width="3"/></svg>', encoding="utf-8")
print("ok")
