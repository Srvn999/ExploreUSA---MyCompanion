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

  var expensesRes = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  var firstError =
    tripRes.error || daysRes.error || flightsRes.error || photosRes.error ||
    travelersRes.error || documentsRes.error || rentalCarRes.error || expensesRes.error;
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
    expenses: expensesRes.data || [],
  };
};

// Bibliothèque de tutos e-SIM, partagée entre tous les voyages (pas liée
// à un trip_id).
window.MyCompanion.fetchEsimGuides = async function () {
  var supabase = window.MyCompanion.client;
  if (!supabase) return [];
  var res = await supabase.from('esim_guides').select('*').order('sort_order').order('brand');
  if (res.error) {
    console.warn('[MyCompanion] Erreur chargement guides e-SIM', res.error);
    return [];
  }
  return res.data || [];
};

// Ajoute un "compagnon de route" au voyage : juste un prénom, sans email
// ni compte, pour pouvoir lui attribuer des dépenses dans la cagnotte.
window.MyCompanion.addCompanionTraveler = async function (tripId, displayName) {
  var supabase = window.MyCompanion.client;
  if (!supabase) throw new Error('Supabase non configuré');
  var slug =
    displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '') + '-' + Date.now().toString(36);
  var res = await supabase.from('travelers').insert({
    trip_id: tripId,
    display_name: displayName,
    owner_slug: slug,
    role: 'member',
  });
  if (res.error) throw res.error;
};

window.MyCompanion.addExpense = async function (params) {
  var supabase = window.MyCompanion.client;
  if (!supabase) throw new Error('Supabase non configuré');
  var res = await supabase.from('expenses').insert({
    trip_id: params.tripId,
    description: params.description,
    amount: params.amount,
    paid_by: params.paidBy,
  });
  if (res.error) throw res.error;
};

window.MyCompanion.deleteExpense = async function (expenseId) {
  var supabase = window.MyCompanion.client;
  if (!supabase) throw new Error('Supabase non configuré');
  var res = await supabase.from('expenses').delete().eq('id', expenseId);
  if (res.error) throw res.error;
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

// Météo du lieu de l'étape du jour, via Open-Meteo (gratuit, sans clé).
// Deux appels : géocodage du nom de lieu -> coordonnées, puis prévisions.
window.MyCompanion.getWeatherForLocation = async function (locationLabel) {
  if (!locationLabel) return null;
  try {
    var geoRes = await fetch(
      'https://geocoding-api.open-meteo.com/v1/search?name=' +
        encodeURIComponent(locationLabel) + '&count=1&language=fr&format=json'
    );
    var geo = await geoRes.json();
    var place = geo.results && geo.results[0];
    if (!place) return null;

    var forecastRes = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude +
        '&longitude=' + place.longitude +
        '&current=temperature_2m,weather_code' +
        '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
        '&forecast_days=1&timezone=auto'
    );
    var forecast = await forecastRes.json();

    return {
      place: place.name + (place.admin1 ? ', ' + place.admin1 : ''),
      currentTemp: forecast.current ? Math.round(forecast.current.temperature_2m) : null,
      weatherCode: forecast.current ? forecast.current.weather_code : null,
      maxTemp: forecast.daily ? Math.round(forecast.daily.temperature_2m_max[0]) : null,
      minTemp: forecast.daily ? Math.round(forecast.daily.temperature_2m_min[0]) : null,
    };
  } catch (err) {
    console.warn('[MyCompanion] Météo indisponible', err);
    return null;
  }
};

// Météo (min/max du jour) pour une date précise à un endroit donné —
// utilisé pour afficher toutes les étapes du voyage (passées incluses,
// jusqu'à ~92 jours en arrière, et à venir jusqu'à ~16 jours). Un cache de
// géocodage optionnel évite de re-géocoder deux étapes au même endroit.
window.MyCompanion.getWeatherForDate = async function (locationLabel, dateStr, geocodeCache) {
  if (!locationLabel) return null;
  try {
    var coords = geocodeCache && geocodeCache[locationLabel];
    if (!coords) {
      var geoRes = await fetch(
        'https://geocoding-api.open-meteo.com/v1/search?name=' +
          encodeURIComponent(locationLabel) + '&count=1&language=fr&format=json'
      );
      var geo = await geoRes.json();
      var place = geo.results && geo.results[0];
      if (!place) return null;
      coords = { lat: place.latitude, lon: place.longitude, name: place.name + (place.admin1 ? ', ' + place.admin1 : '') };
      if (geocodeCache) geocodeCache[locationLabel] = coords;
    }

    var params = 'latitude=' + coords.lat + '&longitude=' + coords.lon +
      '&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto';
    params += dateStr ? '&start_date=' + dateStr + '&end_date=' + dateStr : '&forecast_days=1';

    var forecastRes = await fetch('https://api.open-meteo.com/v1/forecast?' + params);
    var forecast = await forecastRes.json();
    if (!forecast.daily || !forecast.daily.time || !forecast.daily.time.length) return null;

    return {
      place: coords.name,
      maxTemp: Math.round(forecast.daily.temperature_2m_max[0]),
      minTemp: Math.round(forecast.daily.temperature_2m_min[0]),
      weatherCode: forecast.daily.weather_code[0],
    };
  } catch (err) {
    console.warn('[MyCompanion] Météo indisponible pour cette date', err);
    return null;
  }
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

// Bibliothèque de photos d'une étape d'itinéraire (fiche détail) : on
// récupère les lignes puis on résout une URL signée par photo (bucket
// 'trip-assets', privé). Les photos sans URL valide sont ignorées.
window.MyCompanion.getItemGalleryPhotos = async function (itemId) {
  var supabase = window.MyCompanion.client;
  if (!supabase || !itemId) return [];
  var res = await supabase
    .from('itinerary_item_photos')
    .select('*')
    .eq('item_id', itemId)
    .order('sort_order');
  if (res.error) {
    console.warn('[MyCompanion] Erreur galerie photos', res.error);
    return [];
  }
  var photos = res.data || [];
  var urls = await Promise.all(
    photos.map(function (p) {
      return supabase.storage
        .from('trip-assets')
        .createSignedUrl(p.storage_path, 3600)
        .then(function (r) { return r.error ? null : r.data.signedUrl; });
    })
  );
  return photos
    .map(function (p, i) { return Object.assign({}, p, { url: urls[i] }); })
    .filter(function (p) { return p.url; });
};

// Géocodage simple (même service gratuit que la météo) : renvoie les
// coordonnées d'un lieu à partir de son adresse/nom, ou null si introuvable.
window.MyCompanion.geocodeLabel = async function (label) {
  if (!label) return null;
  try {
    var res = await fetch(
      'https://geocoding-api.open-meteo.com/v1/search?name=' +
        encodeURIComponent(label) + '&count=1&language=fr&format=json'
    );
    var data = await res.json();
    var place = data.results && data.results[0];
    if (!place) return null;
    return { lat: place.latitude, lon: place.longitude };
  } catch (err) {
    console.warn('[MyCompanion] Géocodage indisponible', err);
    return null;
  }
};

// Distance à vol d'oiseau (formule de Haversine), en kilomètres.
window.MyCompanion.distanceKm = function (lat1, lon1, lat2, lon2) {
  var toRad = function (deg) { return (deg * Math.PI) / 180; };
  var R = 6371;
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Position GPS actuelle du visiteur, sous forme de Promise pratique à
// chaîner. Se résout à null si la géoloc n'est pas dispo/autorisée, plutôt
// que de rejeter — l'appelant n'a jamais besoin d'un try/catch.
window.MyCompanion.getCurrentPosition = function () {
  return new Promise(function (resolve) {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      function (pos) { resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }); },
      function () { resolve(null); },
      { timeout: 8000, maximumAge: 60000 }
    );
  });
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
