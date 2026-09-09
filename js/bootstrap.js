// Point d'entrée : si Supabase n'est pas configuré (window.MYCOMPANION_CONFIG
// dans index.html), le prototype garde tel quel son contenu statique — le
// design ne casse jamais. Sinon, l'écran de connexion (#authGate, voir
// auth.js) prend le relais : une fois un voyageur identifié, on charge son
// voyage et on remplace le contenu de démo par ses vraies données.
(function () {
  async function loadTravelerTrip(traveler) {
    try {
      var bundle = await window.MyCompanion.fetchTripBundle(traveler.trip_id);
      if (!bundle) {
        if (window.MyCompanion.showAuthGate) {
          window.MyCompanion.showAuthGate('Impossible de charger votre voyage pour le moment. Réessayez plus tard.');
        }
        return;
      }
      window.MyCompanion.renderHome(bundle.trip, traveler, bundle.days);
      window.MyCompanion.renderItinerary(bundle.days);
      window.MyCompanion.renderFlights(bundle.flights);
      window.MyCompanion.renderAlbum(bundle.days, bundle.photos, bundle.travelers);
      window.MyCompanion.renderAlbumPreview(bundle.photos);
      window.MyCompanion.renderDocuments(bundle.documents);
      window.MyCompanion.renderRentalCar(bundle.rentalCar);
      window.MyCompanion.renderUrgences(bundle.trip, bundle.documents);
      if (window.MyCompanion.initChat) window.MyCompanion.initChat(traveler.trip_id, traveler.id);

      window.MyCompanion.getTripPhotoStorageBytes(traveler.trip_id, bundle.travelers).then(function (bytes) {
        window.MyCompanion.renderAlbumStorage(bytes);
      });

      if (window.MyCompanion.initAlbumUpload) {
        window.MyCompanion.initAlbumUpload(traveler.trip_id, traveler.id, bundle.days, function () {
          return loadTravelerTrip(traveler);
        });
      }

      if (window.MyCompanion.hideAuthGate) window.MyCompanion.hideAuthGate();
    } catch (err) {
      console.warn('[MyCompanion] Chargement du voyage impossible.', err);
      if (window.MyCompanion.showAuthGate) {
        window.MyCompanion.showAuthGate('Impossible de charger votre voyage pour le moment. Réessayez plus tard.');
      }
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
