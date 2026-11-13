"""Assemble les pages du site « La descente » (dossier cave/).

Chaque page vit dans cave/_pages/<nom>.html : une première ligne de réglages en JSON
dans un commentaire, puis le contenu du <main>. Ce script y ajoute la tête, l'en-tête,
le menu, le pied de page et la porte des 18 ans, communs à tout le site.
L'accueil (cave/index.html) garde son propre fichier : seuls son en-tête, son menu et
son pied sont remplacés, entre les repères <!--TETE--> et <!--/PIED-->.

Lancer : python tools/build_cave.py
"""
import json, pathlib, re

RACINE = pathlib.Path(__file__).resolve().parent.parent / "cave"
V = "14"  # version des fichiers css/js, à monter quand ils changent

# Le logo : un verre de bière, la bouteille, un verre de vin, posés sur le comptoir.
# Les couleurs viennent du CSS (classes s-*) ; le trait suit la couleur du texte.
def symbole(classe="symbole"):
    return f"""<svg class="{classe}" viewBox="18 10 204 184" aria-hidden="true" focusable="false"><path class="s-biere" d="M41.8 125 L45.6 187 H78.4 L82.2 125 Z"/><path class="s-mousse" d="M41 116 Q41 106 51 106 Q55 98 64 100 Q71 95 77 102 Q84 103 83 116 L82.2 126 H41.8 Z"/><path class="s-trait" d="M41.8 126 L45.6 188 H78.4 L82.2 126"/><path class="s-bouteille" d="M98 183 Q98 188 103 188 H137 Q142 188 142 183 V98 C142 81 127.5 77 127.5 64 V26 H129.5 V15 H110.5 V26 H112.5 V64 C112.5 77 98 81 98 98 Z"/><path class="s-vin" d="M160.6 122 C163 139 171 149 184 149 C197 149 205 139 207.4 122 Z"/><path class="s-trait" d="M159 94 C157 126 166 149 184 149 C202 149 211 126 209 94 Z"/><path class="s-trait" d="M184 149 V185 M168 186 H200 M22 190.5 H218"/></svg>"""


PAGES = [  # (fichier, libellé, ce qu'on y trouve : écrit comme le détail d'un plat sur une carte)
    ("index.html", "Accueil", "La maison"),
    ("la-cave.html", "La cave et la carte", "Vins, bières, planches"),
    ("evenements.html", "Événements", "Concerts, expositions"),
    ("tireuses.html", "Tireuses et fûts", "Dès 80 €"),
    ("histoire.html", "Notre histoire", "Depuis 2013"),
    ("contact.html", "Contact", "04 68 89 91 43"),
]


def tete_html(actif):
    ac = lambda f: ' aria-current="page"' if f == actif else ""
    nav = "".join(
        f'<a href="{f}"{ac(f)}>{l.replace(" et la carte", "").replace(" et fûts", "").replace("Notre ", "").capitalize()}</a>'
        for f, l, _ in PAGES[1:]
    )
    menu = "".join(
        f'<li><a href="{f}"{ac(f)}><span class="m-nom">{l}</span><span class="m-points" aria-hidden="true"></span><span class="m-detail">{n}</span></a></li>'
        for f, l, n in PAGES
    )
    return f"""<!--TETE-->
<header class="tete" data-ton="clair">
  <a class="marque" href="index.html" aria-label="Vinochope, accueil">{symbole()}<span class="marque-nom">Vinochope</span></a>
  <nav class="nav" aria-label="Navigation principale">{nav}</nav>
  <div class="tete-droite">
    <a class="etiquette bouton-carte" href="la-cave.html#carte">La carte</a>
    <button type="button" class="menu-btn" aria-expanded="false" aria-controls="menu">Menu</button>
  </div>
</header>
<div class="menu" id="menu" hidden>
  <div class="menu-carte">
    <div class="menu-cadre">
      {symbole("symbole menu-symbole")}
      <p class="menu-maison">Vinochope</p>
      <p class="menu-sous">Bar · cave · location de tireuses</p>
      <span class="menu-filet" aria-hidden="true"></span>
      <nav aria-label="Menu"><ol class="menu-liens">{menu}</ol></nav>
      <span class="menu-filet" aria-hidden="true"></span>
      <div class="menu-infos">
        <p>26 rue Mathieu de Dombasle, 66000 Perpignan</p>
        <p data-statut>Lun. 15 h – 21 h · mar.–sam. 10 h – 12 h 30 et 14 h 30 – 21 h</p>
      </div>
    </div>
  </div>
</div>
<!--/TETE-->"""


SYMBOLE_PIED = symbole("symbole pied-symbole")
PIED = f"""<!--PIED-->
<footer class="pied" data-ton="sombre">
  <div class="pied-haut">
    <div>
      <h2 class="pied-t">Venir</h2>
      <p>26 rue Mathieu de Dombasle<br>66000 Perpignan</p>
      <a class="lien" href="contact.html#venir">Itinéraire</a>
    </div>
    <div>
      <h2 class="pied-t">Horaires</h2>
      <p data-statut>Lundi 15 h – 21 h</p>
      <p class="pied-petit">Lundi 15 h – 21 h<br>Mardi au samedi 10 h – 12 h 30, 14 h 30 – 21 h<br>Plus tard les soirs d'événement</p>
    </div>
    <div>
      <h2 class="pied-t">Nous joindre</h2>
      <p><a href="tel:+33468899143">04 68 89 91 43</a><br><a href="mailto:contact@vinochope.com">contact@vinochope.com</a></p>
      <a class="lien" href="https://www.facebook.com/vinochope/" rel="noopener">Facebook</a>
    </div>
    <nav aria-label="Plan du site">
      <h2 class="pied-t">Le site</h2>
      <ul class="pied-liens">
        <li><a href="la-cave.html">La cave et la carte</a></li>
        <li><a href="evenements.html">Événements</a></li>
        <li><a href="tireuses.html">Tireuses et fûts</a></li>
        <li><a href="histoire.html">Notre histoire</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </nav>
  </div>
  <p class="pied-marque" aria-hidden="true">{SYMBOLE_PIED}<span>Vinochope</span></p>
  <div class="pied-bas">
    <p>L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p>
    <p>© <span data-annee>2026</span> Vinochope · <a href="gerant.html">Espace gérant</a></p>
  </div>
</footer>
<!--/PIED-->"""

SEUIL = """<div class="seuil" id="seuil" role="dialog" aria-modal="true" aria-labelledby="seuil-t" hidden>
  <div class="seuil-voute">
    """ + symbole("symbole seuil-symbole") + """
    <p class="repere">Avant d'entrer</p>
    <h2 id="seuil-t">Avez-vous<br>18 ans ou plus ?</h2>
    <p class="seuil-txt">Ce site parle de vin, de bière et de spiritueux.</p>
    <div class="seuil-btns">
      <button type="button" class="etiquette" data-oui>Oui, j'entre</button>
      <button type="button" class="etiquette ligne" data-non>Non</button>
    </div>
    <p class="seuil-non" hidden>Revenez nous voir à vos 18 ans.</p>
  </div>
  <p class="seuil-pied">L'abus d'alcool est dangereux pour la santé.</p>
</div>"""


# Lancement : l'arche se dessine, le nom apparaît, puis le rideau rouge se lève. Une fois par visite.
INTRO_TETE = """<script>try{if(sessionStorage.getItem("vc-intro"))document.documentElement.classList.add("intro-vue")}catch(e){}</script>"""
INTRO = """<div class="intro" aria-hidden="true">
  """ + symbole("symbole intro-symbole") + """
  <p class="intro-marque">Vinochope</p>
  <p class="intro-lieu">La cave à vin, Perpignan</p>
</div>"""


def page(nom, reglages, corps):
    titre = reglages["titre"]
    desc = reglages["description"]
    classe = reglages.get("classe", "")
    scripts = "".join(f'\n<script src="assets/{s}?v={V}"></script>' for s in reglages.get("scripts", []))
    seuil = "" if reglages.get("sans_seuil") else SEUIL
    lenis = "" if reglages.get("sans_lenis") else '\n<script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>'
    robots = '\n<meta name="robots" content="noindex">' if reglages.get("noindex") else ""
    return f"""<!doctype html>
<html lang="fr" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titre}</title>
<meta name="description" content="{desc}">{robots}
<meta name="theme-color" content="#220000">
<link rel="icon" href="media/logo/symbole.svg" type="image/svg+xml">
<meta property="og:title" content="{titre}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/cave.css?v={V}">
<link rel="stylesheet" href="assets/pages.css?v={V}">
{INTRO_TETE}
</head>
<body class="{classe}">
<a class="evite" href="#contenu">Aller au contenu</a>

{tete_html(nom)}

<main id="contenu">
{corps.strip()}
</main>

{PIED}

{seuil}
{INTRO}{lenis}
<script src="assets/commun.js?v={V}"></script>{scripts}
</body>
</html>
"""


def main():
    for src in sorted((RACINE / "_pages").glob("*.html")):
        texte = src.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--\s*(\{.*?\})\s*-->", texte, re.S)
        reglages = json.loads(m.group(1))
        corps = texte[m.end():]
        (RACINE / src.name).write_text(page(src.name, reglages, corps), encoding="utf-8")
        print("page", src.name)

    # Accueil : on remplace son en-tête, son menu et son pied par les versions communes
    acc = RACINE / "index.html"
    t = acc.read_text(encoding="utf-8")
    t = re.sub(r"<!--TETE-->.*?<!--/TETE-->", lambda _: tete_html("index.html"), t, flags=re.S)
    t = re.sub(r"<!--PIED-->.*?<!--/PIED-->", lambda _: PIED, t, flags=re.S)
    t = re.sub(r'(assets/(?:cave|pages|commun)\.(?:css|js))\?v=\d+', rf"\1?v={V}", t)
    t = re.sub(r'<div class="seuil".*?\n</div>', lambda _: SEUIL, t, count=1, flags=re.S)
    t = re.sub(r"<!--INTRO-->.*?<!--/INTRO-->", lambda _: "<!--INTRO-->" + INTRO + "<!--/INTRO-->", t, flags=re.S)
    t = re.sub(r"<!--INTRO_TETE-->.*?<!--/INTRO_TETE-->", lambda _: "<!--INTRO_TETE-->" + INTRO_TETE + "<!--/INTRO_TETE-->", t, flags=re.S)
    acc.write_text(t, encoding="utf-8")
    print("accueil mis à jour")


if __name__ == "__main__":
    main()
