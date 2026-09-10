// Cache local du dernier voyage chargé avec succès (roadbook hors-ligne) :
// permet de continuer à consulter l'itinéraire, les documents (leur liste,
// pas les fichiers eux-mêmes), les infos urgence, la voiture de location...
// sans réseau (zones désertiques, parcs nationaux, roaming capricieux).
// Uniquement les données déjà renvoyées par Supabase pour ce voyageur (donc
// déjà filtrées par les policies RLS) : rien de plus n'est exposé hors
// connexion que ce que le voyageur peut déjà voir en ligne.
window.MyCompanion = window.MyCompanion || {};

(function () {
  var STORAGE_KEY = 'mc_offline_cache_v1';

  window.MyCompanion.saveOfflineCache = function (traveler, bundle) {
    try {
      var payload = {
        traveler: traveler,
        bundle: bundle,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      // Quota dépassé ou stockage indisponible (navigation privée...) :
      // le hors-ligne ne fonctionnera simplement pas cette fois-ci.
      console.warn('[MyCompanion] Cache hors-ligne indisponible.', err);
    }
  };

  window.MyCompanion.loadOfflineCache = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  };

  // Appelé à la déconnexion : un appareil peut être partagé (famille,
  // groupe d'amis), on ne laisse pas le voyage d'un voyageur consultable
  // hors-ligne après qu'il se soit déconnecté.
  window.MyCompanion.clearOfflineCache = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // rien à faire
    }
  };

  window.MyCompanion.setOfflineBanner = function (offlineSince) {
    var banner = document.getElementById('offlineBanner');
    var dateEl = document.getElementById('offlineBannerDate');
    if (!banner) return;
    if (!offlineSince) {
      banner.classList.remove('show');
      return;
    }
    if (dateEl) {
      var d = new Date(offlineSince);
      dateEl.textContent = isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
          ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    banner.classList.add('show');
  };

  // Petit message ponctuel réutilisable (ex : "document indisponible hors
  // connexion"), sur le même modèle visuel que le toast du bouton retour
  // mais indépendant de sa logique (élément et minuteur séparés).
  window.MyCompanion.showToast = function (message, ms) {
    var toast = document.getElementById('mcToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, ms || 2500);
  };
})();
