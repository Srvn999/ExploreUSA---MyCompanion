// "Appuyer 2 fois sur retour pour quitter", uniquement quand l'appli tourne
// installée (écran d'accueil), pas dans un simple onglet de navigateur où
// le bouton retour doit garder son comportement normal.
(function () {
  var isStandalone =
    window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if (!isStandalone) return;

  var CONFIRM_WINDOW_MS = 2000;
  var armed = false;
  var rearmTimer = null;

  function arm() {
    history.pushState({ mcBackGuard: true }, '');
    armed = true;
  }

  function showToast() {
    var toast = document.getElementById('backToast');
    if (!toast) return;
    toast.classList.add('show');
    clearTimeout(showToast._hideTimer);
    showToast._hideTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, CONFIRM_WINDOW_MS);
  }

  arm();

  window.addEventListener('popstate', function () {
    if (!armed) return; // pas notre état tampon : on laisse faire (l'appli se ferme)
    armed = false;
    showToast();
    clearTimeout(rearmTimer);
    rearmTimer = setTimeout(arm, CONFIRM_WINDOW_MS);
  });
})();
