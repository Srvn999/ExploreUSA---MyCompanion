// Point d'entrée : si Supabase est configuré (window.MYCOMPANION_CONFIG dans
// index.html) et que le fetch réussit, on remplace le contenu de démo par les
// vraies données. Sinon, ou en cas d'erreur, le prototype garde tel quel son
// contenu statique — le design ne casse jamais.
(function () {
  async function init() {
    var cfg = window.MYCOMPANION_CONFIG;
    var supabase = window.MyCompanion && window.MyCompanion.client;
    if (!cfg || !cfg.tripId || !supabase) return;

    try {
      var bundle = await window.MyCompanion.fetchTripBundle(cfg.tripId);
      if (!bundle) return;
      window.MyCompanion.renderItinerary(bundle.days);
      window.MyCompanion.renderFlights(bundle.flights);
      window.MyCompanion.renderAlbum(bundle.days, bundle.photos, bundle.travelers);
      if (window.MyCompanion.initChat) window.MyCompanion.initChat(cfg.tripId, bundle.travelers);
    } catch (err) {
      console.warn('[MyCompanion] Chargement Supabase impossible, contenu de démo conservé.', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
