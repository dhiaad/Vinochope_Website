/* Vinochope · page Contact : formulaire qui prépare un e-mail */
(function () {
  var form = document.querySelector("[data-contact]"); if (!form) return;
  var sujet = document.getElementById("c-sujet"), aide = document.querySelector("[data-aide-prog]");
  var demande = new URLSearchParams(location.search).get("sujet");
  if (demande && sujet.querySelector('option[value="' + demande + '"]')) sujet.value = demande;
  function majAide() { aide.hidden = sujet.value !== "programmation"; }
  sujet.addEventListener("change", majAide); majAide();

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var premier = null;
    [["c-nom", "Indiquez votre nom."], ["c-mail", "Indiquez un e-mail ou un téléphone pour vous répondre."], ["c-msg", "Écrivez votre message."]].forEach(function (x) {
      var el = document.getElementById(x[0]), err = document.getElementById("err-" + x[0]), vide = !el.value.trim();
      el.setAttribute("aria-invalid", vide ? "true" : "false"); el.setAttribute("aria-describedby", "err-" + x[0]);
      err.textContent = vide ? x[1] : "";
      if (vide && !premier) premier = el;
    });
    if (premier) { premier.focus(); return; }
    var d = new FormData(form), libelle = sujet.options[sujet.selectedIndex].text;
    var corps = d.get("message") + "\n\n" + d.get("nom") + "\n" + d.get("contact");
    location.href = "mailto:contact@vinochope.com?subject=" + encodeURIComponent(libelle + " · " + d.get("nom")) + "&body=" + encodeURIComponent(corps);
    var ok = document.querySelector("[data-envoye]"); ok.hidden = false; ok.focus();
  });
})();
