/* Vinochope · page Histoire : les coupures de presse s'ouvrent en grand */
(function () {
  var VC = window.VC, loupe = document.getElementById("loupe"), avant = null;
  if (!loupe) return;
  var img = loupe.querySelector("img"), txt = loupe.querySelector("p");
  document.querySelector("[data-presse]").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-src]"); if (!b) return;
    avant = b;
    var cap = b.parentNode.querySelector("figcaption");
    img.src = b.getAttribute("data-src"); img.alt = b.querySelector("img").alt;
    txt.textContent = cap ? cap.textContent.replace(/\s+/g, " ").trim() : "";
    if (VC.lenis) VC.lenis.stop();
    loupe.showModal();
  });
  loupe.addEventListener("close", function () { if (VC.lenis) VC.lenis.start(); if (avant) avant.focus(); });
  loupe.addEventListener("click", function (e) { if (e.target === loupe || e.target.closest("[data-fermer]")) loupe.close(); });
})();
