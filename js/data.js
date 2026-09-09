// Accès aux données du voyage courant. Si Supabase n'est pas configuré
// (window.MyCompanion.client est null), toutes les fonctions renvoient null
// et le prototype garde son contenu de démo statique.
window.MyCompanion = window.MyCompanion || {};

window.MyCompanion.fetchTripBundle = async function (tripId) {
  var supabase = window.MyCompanion.client;
  if (!supabase || !tripId) return null;

  var tripRes = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();

  var daysRes = await supabase
    .from('itinerary_days')
    .select('*, itinerary_items(*)')
    .eq('trip_id', tripId)
    .order('day_number');

  var flightsRes = await supabase
    .from('flights')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order');

  var photosRes = await supabase
    .from('photos')
    .select('*')
    .eq('trip_id', tripId)
    .order('taken_at', { ascending: false });

  var travelersRes = await supabase
    .from('travelers')
    .select('*')
    .eq('trip_id', tripId);

  var documentsRes = await supabase
    .from('documents')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  var rentalCarRes = await supabase
    .from('rental_cars')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  var firstError =
    tripRes.error || daysRes.error || flightsRes.error || photosRes.error ||
    travelersRes.error || documentsRes.error || rentalCarRes.error;
  if (firstError) {
    console.warn(
      '[MyCompanion] Erreur Supabase, contenu de démo conservé.',
      firstError
    );
    return null;
  }

  var days = (daysRes.data || []).map(function (d) {
    return Object.assign({}, d, {
      itinerary_items: (d.itinerary_items || [])
        .slice()
        .sort(function (a, b) {
          return a.sort_order - b.sort_order;
        }),
    });
  });

  return {
    trip: tripRes.data || null,
    days: days,
    flights: flightsRes.data || [],
    photos: photosRes.data || [],
    travelers: travelersRes.data || [],
    documents: documentsRes.data || [],
    rentalCar: rentalCarRes.data || null,
  };
};

// Taille réelle (en octets) de l'album photo d'un voyage : on liste le
// contenu du dossier de chaque voyageur dans le bucket 'trip-photos' et
// on additionne la taille de chaque fichier.
window.MyCompanion.getTripPhotoStorageBytes = async function (tripId, travelers) {
  var supabase = window.MyCompanion.client;
  if (!supabase || !tripId) return 0;
  var total = 0;
  var folders = (travelers || []).map(function (t) { return tripId + '/' + t.id; });
  for (var i = 0; i < folders.length; i++) {
    var res = await supabase.storage.from('trip-photos').list(folders[i], { limit: 1000 });
    if (!res.error && res.data) {
      res.data.forEach(function (obj) {
        if (obj.metadata && obj.metadata.size) total += obj.metadata.size;
      });
    }
  }
  return total;
};

// Bucket 'trip-documents' privé -> URL signée à l'ouverture.
window.MyCompanion.getDocumentSignedUrl = async function (storagePath) {
  var supabase = window.MyCompanion.client;
  if (!supabase || !storagePath) return null;
  var res = await supabase.storage.from('trip-documents').createSignedUrl(storagePath, 300);
  if (res.error) {
    console.warn('[MyCompanion] Erreur URL signée (document)', res.error);
    return null;
  }
  return res.data.signedUrl;
};

// Visuel d'étape d'itinéraire (bucket 'trip-assets', privé lui aussi).
window.MyCompanion.getStepVisualUrl = async function (storagePath) {
  var supabase = window.MyCompanion.client;
  if (!supabase || !storagePath) return null;
  var res = await supabase.storage.from('trip-assets').createSignedUrl(storagePath, 3600);
  if (res.error) {
    console.warn('[MyCompanion] Erreur URL signée (visuel)', res.error);
    return null;
  }
  return res.data.signedUrl;
};

// Bucket 'trip-photos' privé -> on passe par une URL signée temporaire.
window.MyCompanion.getPhotoSignedUrl = async function (storagePath) {
  var supabase = window.MyCompanion.client;
  if (!supabase || !storagePath) return null;
  var res = await supabase.storage
    .from('trip-photos')
    .createSignedUrl(storagePath, 3600);
  if (res.error) {
    console.warn('[MyCompanion] Erreur URL signée', res.error);
    return null;
  }
  return res.data.signedUrl;
};

// Utilitaire prêt à l'emploi pour brancher plus tard le bouton
// "Depuis la galerie" / "Prendre une photo" de l'album.
window.MyCompanion.uploadPhoto = async function (params) {
  var supabase = window.MyCompanion.client;
  if (!supabase) throw new Error('Supabase non configuré');
  var path =
    params.tripId + '/' + params.travelerId + '/' + Date.now() + '-' + params.file.name;
  var uploadRes = await supabase.storage
    .from('trip-photos')
    .upload(path, params.file);
  if (uploadRes.error) throw uploadRes.error;
  var insertRes = await supabase.from('photos').insert({
    trip_id: params.tripId,
    traveler_id: params.travelerId,
    day_id: params.dayId || null,
    storage_path: path,
    taken_at: new Date().toISOString(),
  });
  if (insertRes.error) throw insertRes.error;
  return path;
};
