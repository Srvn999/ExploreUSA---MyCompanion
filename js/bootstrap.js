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
      window.MyCompanion.renderWeatherDays(bundle.days);
      if (window.MyCompanion.initWeatherSearch) window.MyCompanion.initWeatherSearch();
      window.MyCompanion.renderStateTaxOptions(bundle.days);

      window.MyCompanion.fetchEsimGuides().then(function (guides) {
        window.MyCompanion.renderEsimBrandList(guides);
      });
      window.MyCompanion.renderExpenses(bundle.expenses, bundle.travelers);
      if (window.MyCompanion.initExpenses) {
        // Rafraîchissement ciblé (dépenses + voyageurs) plutôt que de
        // recharger tout le voyage pour un simple ajout/suppression.
        window.MyCompanion.initExpenses(traveler.trip_id, async function () {
          var fresh = await window.MyCompanion.fetchExpensesAndTravelers(traveler.trip_id);
          if (fresh) window.MyCompanion.renderExpenses(fresh.expenses, fresh.travelers);
        });
      }
      if (window.MyCompanion.initChat) window.MyCompanion.initChat(traveler.trip_id, traveler.id, traveler);
      if (window.MyCompanion.initReminders) window.MyCompanion.initReminders(traveler);

      window.MyCompanion.getTripPhotoStorageBytes(traveler.trip_id, bundle.travelers).then(function (bytes) {
        window.MyCompanion.renderAlbumStorage(bytes);
      });

      if (window.MyCompanion.initAlbumUpload) {
        // Rafraîchissement ciblé (photos + voyageurs) après un envoi —
        // les jours de l'itinéraire ne changent pas, pas besoin de les
        // recharger pour regrouper l'album par jour/lieu.
        window.MyCompanion.initAlbumUpload(traveler.trip_id, traveler.id, bundle.days, async function () {
          var fresh = await window.MyCompanion.fetchPhotosAndTravelers(traveler.trip_id);
          if (!fresh) return;
          window.MyCompanion.renderAlbum(bundle.days, fresh.photos, fresh.travelers);
          window.MyCompanion.renderAlbumPreview(fresh.photos);
          window.MyCompanion.getTripPhotoStorageBytes(traveler.trip_id, fresh.travelers).then(function (bytes) {
            window.MyCompanion.renderAlbumStorage(bytes);
          });
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
