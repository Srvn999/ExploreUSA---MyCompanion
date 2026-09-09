// Deux choses gérées ici, via l'historique du navigateur :
//
// 1. Navigation en profondeur (Documents, Album, Chat, Urgences...) :
//    chaque fois qu'on entre dans un de ces écrans, showTab() (dans
//    index.html) appelle pushScreenState() ci-dessous, qui enregistre un
//    état dans l'historique. Le retour matériel/geste remonte alors à
//    l'écran précédent au lieu de fermer l'appli.
//
// 2. "Appuyer 2 fois sur retour pour quitter", uniquement une fois arrivé
//    à la racine (plus aucun écran secondaire dans l'historique) ET
//    seulement quand l'appli tourne installée (écran d'accueil) — dans un
//    simple onglet de navigateur, le bouton retour doit garder son
//    comportement normal (quitter la page).
(function () {
  var isStandalone =
    window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

  var CONFIRM_WINDOW_MS = 2000;
  var exitArmed = false;
  var rearmTimer = null;

  function armExit() {
    history.pushState({ mcExitGuard: true }, '');
    exitArmed = true;
  }

  function showExitToast() {
    var toast = document.getElementById('backToast');
    if (!toast) return;
    toast.classList.add('show');
    clearTimeout(showExitToast._hideTimer);
    showExitToast._hideTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, CONFIRM_WINDOW_MS);
  }

  window.MyCompanion = window.MyCompanion || {};
  window.MyCompanion.pushScreenState = function (screen, sub) {
    history.pushState({ mcScreen: screen, mcSub: sub || null }, '');
  };

  window.addEventListener('popstate', function (e) {
    var state = e.state;

    if (state && state.mcScreen) {
      if (window.showTab) window.showTab(state.mcScreen, state.mcSub, true);
      return;
    }

    // Plus aucun écran dans l'historique de l'appli : on est à la racine.
    if (!isStandalone) return; // onglet navigateur normal : comportement natif

    if (exitArmed) {
      exitArmed = false;
      showExitToast();
      clearTimeout(rearmTimer);
      rearmTimer = setTimeout(armExit, CONFIRM_WINDOW_MS);
    }
  });

  if (isStandalone) armExit();
})();
