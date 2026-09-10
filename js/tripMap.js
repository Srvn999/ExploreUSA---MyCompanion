// Vue carte globale de l'itinéraire (bouton "Carte" en haut de l'onglet
// Itinéraire) : Leaflet + tuiles OpenStreetMap, gratuit et sans clé —
// cohérent avec les choix déjà faits pour la météo et le géocodage
// (Open-Meteo). La carte n'est construite qu'à l'ouverture de l'écran,
// jamais au chargement du voyage : pas de géocodage inutile si le
// voyageur n'ouvre jamais la carte.
window.MyCompanion = window.MyCompanion || {};

(function () {
  var map = null;
  var markersLayer = null;
  var lastDays = null;
  var builtForDays = null;

  window.MyCompanion.setItineraryMapDays = function (days) {
    lastDays = days || [];
  };

  function statusEl() {
    return document.getElementById('itineraryMapStatus');
  }

  function escapeHtmlLocal(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function buildMap() {
    var container = document.getElementById('itineraryMapEl');
    var status = statusEl();
    if (!container || !window.L) {
      if (status) status.textContent = "Carte indisponible pour l'instant.";
      return;
    }

    if (!map) {
      map = L.map(container, { attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; contributeurs OpenStreetMap',
      }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);
    }

    // Voyage déjà géocodé lors du dernier passage sur cet écran : on
    // évite de re-géocoder (et de re-solliciter l'API gratuite) pour rien.
    if (builtForDays === lastDays) {
      map.invalidateSize();
      return;
    }

    markersLayer.clearLayers();
    if (status) status.textContent = 'Repérage des étapes sur la carte...';

    var entries = [];
    (lastDays || []).forEach(function (day) {
      (day.itinerary_items || []).forEach(function (item) {
        var label = item.map_query || item.title;
        if (label) entries.push({ label: label, title: item.title, dayNumber: day.day_number, time: item.time, kind: 'étape' });
      });
      (day.day_tips || []).forEach(function (tip) {
        if (tip.map_query) entries.push({ label: tip.map_query, title: tip.title, dayNumber: day.day_number, time: null, kind: 'suggestion' });
      });
    });

    if (!entries.length) {
      if (status) status.textContent = "Aucune étape géolocalisable pour l'instant.";
      map.setView([39.8, -98.6], 4); // vue par défaut centrée sur les USA
      builtForDays = lastDays;
      return;
    }

    var geocodeCache = {};
    var points = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var coords = geocodeCache[entry.label];
      if (!coords) {
        coords = await window.MyCompanion.geocodeLabel(entry.label);
        if (coords) {
          geocodeCache[entry.label] = coords;
          // Petite pause entre deux vrais appels : reste raisonnable vis-
          // à-vis de l'API gratuite de géocodage quand il y a beaucoup
          // d'étapes sur un même voyage.
          await new Promise(function (r) { setTimeout(r, 120); });
        }
      }
      if (coords) points.push({ lat: coords.lat, lon: coords.lon, entry: entry });
    }

    if (!points.length) {
      if (status) status.textContent = "Impossible de localiser les étapes sur la carte pour l'instant.";
      map.setView([39.8, -98.6], 4);
      builtForDays = lastDays;
      return;
    }

    var latlngs = [];
    var etapeCount = 0;
    points.forEach(function (p) {
      var isEtape = p.entry.kind === 'étape';
      if (isEtape) etapeCount++;
      var marker = L.circleMarker([p.lat, p.lon], {
        radius: isEtape ? 8 : 6,
        color: isEtape ? '#A64A2E' : '#1C2B45',
        fillColor: isEtape ? '#C15B3C' : '#D9A544',
        fillOpacity: 1,
        weight: 2,
      }).addTo(markersLayer);
      var popup =
        '<strong>' + escapeHtmlLocal(p.entry.title) + '</strong><br>' +
        'Jour ' + p.entry.dayNumber + (p.entry.time ? ' · ' + escapeHtmlLocal(p.entry.time) : ' · suggestion');
      marker.bindPopup(popup);
      if (isEtape) latlngs.push([p.lat, p.lon]);
    });

    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: '#1C2B45', weight: 3, opacity: 0.55, dashArray: '6 8' }).addTo(markersLayer);
      map.fitBounds(latlngs, { padding: [24, 24] });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 11);
    } else {
      map.fitBounds(points.map(function (p) { return [p.lat, p.lon]; }), { padding: [24, 24] });
    }

    if (status) {
      status.textContent = points.length + ' lieu(x) repéré(s) sur ' + entries.length +
        (etapeCount ? ' (' + etapeCount + ' étape(s) reliée(s) par le trajet)' : '') + '.';
    }
    builtForDays = lastDays;
  }

  window.MyCompanion.openItineraryMap = function () {
    // Leaflet a besoin que son conteneur soit déjà visible et dimensionné
    // pour calculer correctement sa taille : un léger différé après
    // l'affichage de l'écran (display:block) suffit.
    setTimeout(function () {
      buildMap();
    }, 60);
  };
})();
