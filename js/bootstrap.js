// Point d'entrée : si Supabase n'est pas configuré (window.MYCOMPANION_CONFIG
// dans index.html), le prototype garde tel quel son contenu statique — le
// design ne casse jamais. Sinon, l'écran de connexion (#authGate, voir
// auth.js) prend le relais : une fois un voyageur identifié, on charge son
// voyage et on remplace le contenu de démo par ses vraies données.
(function () {
  async function loadTravelerTrip(traveler) {
    try {
      var bundle = await window.MyCompanion.fetchTripBundle(traveler.trip_id);
      if (!bundle) return;
      window.MyCompanion.renderHome(bundle.trip, traveler, bundle.days);
      window.MyCompanion.renderItinerary(bundle.days);
      window.MyCompanion.renderFlights(bundle.flights);
      window.MyCompanion.renderAlbum(bundle.days, bundle.photos, bundle.travelers);
      window.MyCompanion.renderAlbumPreview(bundle.photos);
      if (window.MyCompanion.initChat) window.MyCompanion.initChat(traveler.trip_id, traveler.id);
    } catch (err) {
      console.warn('[MyCompanion] Chargement du voyage impossible.', err);
    }
  }

  async function init() {
    var cfg = window.MYCOMPANION_CONFIG;
    var supabase = window.MyCompanion && window.MyCompanion.client;
    if (!cfg || !supabase) return;

    if (window.MyCompanion.initAuth) {
      window.MyCompanion.initAuth(function (traveler) {
        if (traveler) loadTravelerTrip(traveler);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
