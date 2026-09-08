// Accès aux données du voyage courant. Si Supabase n'est pas configuré
// (window.MyCompanion.client est null), toutes les fonctions renvoient null
// et le prototype garde son contenu de démo statique.
window.MyCompanion = window.MyCompanion || {};

window.MyCompanion.fetchTripBundle = async function (tripId) {
  var supabase = window.MyCompanion.client;
  if (!supabase || !tripId) return null;

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

  var firstError =
    daysRes.error || flightsRes.error || photosRes.error || travelersRes.error;
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
    days: days,
    flights: flightsRes.data || [],
    photos: photosRes.data || [],
    travelers: travelersRes.data || [],
  };
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
