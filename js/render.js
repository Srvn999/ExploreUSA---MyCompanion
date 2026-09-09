// Transforme les données Supabase en HTML identique à celui du prototype
// statique (mêmes classes CSS), pour que le design ne change pas.
window.MyCompanion = window.MyCompanion || {};

(function () {
  var MAPLINK_ICON =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2"/></svg>';
  var SECTION_PIN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2"/></svg>';
  var PHOTO_PIN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/></svg>';
  var WEATHER_CODES = {
    0: ['☀️', 'Ciel clair'], 1: ['🌤️', 'Plutôt clair'], 2: ['⛅', 'Partiellement nuageux'], 3: ['☁️', 'Couvert'],
    45: ['🌫️', 'Brouillard'], 48: ['🌫️', 'Brouillard givrant'],
    51: ['🌦️', 'Bruine légère'], 53: ['🌦️', 'Bruine'], 55: ['🌦️', 'Bruine forte'],
    56: ['🌧️', 'Bruine verglaçante'], 57: ['🌧️', 'Bruine verglaçante forte'],
    61: ['🌧️', 'Pluie légère'], 63: ['🌧️', 'Pluie'], 65: ['🌧️', 'Pluie forte'],
    66: ['🌧️', 'Pluie verglaçante'], 67: ['🌧️', 'Pluie verglaçante forte'],
    71: ['🌨️', 'Neige légère'], 73: ['🌨️', 'Neige'], 75: ['❄️', 'Neige forte'], 77: ['❄️', 'Grains de neige'],
    80: ['🌦️', 'Averses légères'], 81: ['🌧️', 'Averses'], 82: ['⛈️', 'Averses violentes'],
    85: ['🌨️', 'Averses de neige'], 86: ['❄️', 'Averses de neige fortes'],
    95: ['⛈️', 'Orage'], 96: ['⛈️', 'Orage avec grêle'], 99: ['⛈️', 'Orage avec grêle fort'],
  };
  var TYPE_LABELS = { hotel: 'Hôtel', activity: 'Activité', restaurant: 'Restaurant' };
  var SWATCH_CLASSES = ['sw1', 'sw2', 'sw3', 'sw4', 'sw5'];
  var CATEGORY_LABELS = {
    passport: 'Passeport', esta: 'ESTA', insurance: 'Assurance',
    rental: 'Location voiture', ticket: 'Billet', other: 'Document',
  };
  var DOC_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function classifyBadge(label) {
    var l = label.toLowerCase();
    if (l.indexOf('payé') !== -1 || l.indexOf('gratuit') !== -1) return 'ok';
    if (l.indexOf('à régler') !== -1 || l.indexOf('non inclus') !== -1) return 'due';
    return 'info';
  }

  function formatShortDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    } catch (e) {
      return '';
    }
  }

  // ---- Accueil (salutation + prochaine étape) ----
  window.MyCompanion.renderHome = function (trip, traveler, days) {
    var eyebrowEl = document.getElementById('homeEyebrow');
    var greetingEl = document.getElementById('homeGreeting');
    var nextCardEl = document.getElementById('nextCard');
    var nextTitleEl = document.getElementById('nextCardTitle');
    var nextMetaEl = document.getElementById('nextCardMeta');
    var nextLabelEl = document.getElementById('nextCardLabel');
    if (!eyebrowEl || !greetingEl || !nextCardEl) return;

    eyebrowEl.textContent = trip ? (trip.name || trip.destination || 'Votre voyage') : 'Votre voyage';
    greetingEl.textContent = 'Bonjour ' + (traveler && traveler.display_name ? traveler.display_name : '');

    var upcoming = [];
    (days || []).forEach(function (day) {
      (day.itinerary_items || []).forEach(function (item) {
        upcoming.push({ day: day, item: item });
      });
    });
    upcoming.sort(function (a, b) {
      var da = a.day.date || '';
      var db = b.day.date || '';
      if (da !== db) return da < db ? -1 : 1;
      return (a.item.time || '').localeCompare(b.item.time || '');
    });

    var todayIso = new Date().toISOString().slice(0, 10);
    var next = upcoming.find(function (u) { return !u.day.date || u.day.date >= todayIso; }) || upcoming[0];

    if (!next) {
      nextLabelEl.textContent = '';
      nextTitleEl.textContent = "Aucune étape prévue pour l'instant";
      nextMetaEl.textContent = '';
      return;
    }

    nextLabelEl.textContent = 'Prochaine étape';
    nextTitleEl.textContent = next.item.title;
    nextMetaEl.textContent = [next.item.time, next.day.location_label].filter(Boolean).join(' · ');
  };

  // ---- Aperçu album (carte d'accueil) ----
  window.MyCompanion.renderAlbumPreview = function (photos) {
    var card = document.getElementById('albumPreviewCard');
    var countEl = document.getElementById('albumPreviewCount');
    var stripEl = document.getElementById('albumPreviewStrip');
    if (!card || !countEl || !stripEl) return;

    var list = photos || [];
    if (!list.length) {
      card.style.display = 'none';
      return;
    }
    card.style.display = '';
    countEl.textContent = list.length + (list.length > 1 ? ' photos' : ' photo');

    var shown = list.slice(0, 5);
    stripEl.innerHTML = shown
      .map(function (p, i) {
        var extra = i === 4 && list.length > 5 ? (list.length - 4) : null;
        return '<div class="photo-swatch ' + SWATCH_CLASSES[i % SWATCH_CLASSES.length] + '">' + (extra ? '+' + extra : '') + '</div>';
      })
      .join('');
  };

  // ---- Itinéraire (jours + timeline) ----
  window.MyCompanion.renderItinerary = function (days) {
    var pillsEl = document.getElementById('daypills');
    var timelineEl = document.getElementById('itineraryTimeline');
    if (!pillsEl || !timelineEl) return;

    if (!days || !days.length) {
      pillsEl.innerHTML = '';
      timelineEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucune étape prévue pour l\'instant.</p>';
      return;
    }

    var sorted = days.slice().sort(function (a, b) {
      return a.day_number - b.day_number;
    });

    function renderDay(day) {
      timelineEl.innerHTML = (day.itinerary_items || [])
        .map(function (item) {
          var badges = (item.badge_labels || [])
            .map(function (b) {
              return '<span class="badge ' + classifyBadge(b) + '">' + escapeHtml(b) + '</span>';
            })
            .join('');
          return (
            '<div class="titem" data-item-id="' + item.id + '">' +
            '<div class="time">' + escapeHtml(item.time) + '</div>' +
            '<div class="card">' +
            '<div class="row1">' +
            '<div><div class="type">' + (TYPE_LABELS[item.item_type] || '') + '</div><h4>' + escapeHtml(item.title) + '</h4></div>' +
            '<div class="maplink" title="Ouvrir dans Maps" data-query="' + escapeHtml(item.map_query || item.title) + '">' + MAPLINK_ICON + '</div>' +
            '</div>' +
            (item.image_path ? '<img class="step-visual" alt="">' : '') +
            '<div class="badges">' + badges + '</div>' +
            '</div></div>'
          );
        })
        .join('');

      // Visuels d'étape : bucket privé -> URL signée chargée en tâche de fond.
      (day.itinerary_items || []).forEach(function (item) {
        if (!item.image_path) return;
        var titem = timelineEl.querySelector('.titem[data-item-id="' + item.id + '"]');
        var img = titem && titem.querySelector('img.step-visual');
        if (!img) return;
        window.MyCompanion.getStepVisualUrl(item.image_path).then(function (url) {
          if (url) img.src = url;
        });
      });
    }

    pillsEl.innerHTML = sorted
      .map(function (d, i) {
        return '<div class="day-pill' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">J' + d.day_number + '</div>';
      })
      .join('');

    Array.prototype.forEach.call(pillsEl.querySelectorAll('.day-pill'), function (pill) {
      pill.addEventListener('click', function () {
        Array.prototype.forEach.call(pillsEl.querySelectorAll('.day-pill'), function (p) {
          p.classList.remove('active');
        });
        pill.classList.add('active');
        renderDay(sorted[Number(pill.dataset.index)]);
      });
    });

    timelineEl.addEventListener('click', function (e) {
      var el = e.target.closest('.maplink');
      if (!el) return;
      var q = el.dataset.query;
      if (q) window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q), '_blank');
    });

    renderDay(sorted[0]);
  };

  // ---- Vols ----
  window.MyCompanion.renderFlights = function (flights) {
    var listEl = document.getElementById('flightsList');
    if (!listEl) return;

    if (!flights || !flights.length) {
      listEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucun vol renseigné pour l\'instant.</p>';
      return;
    }

    listEl.innerHTML = flights
      .map(function (f) {
        var flightNumber = (f.tag.split('·').pop() || '').trim();
        return (
          '<div class="flight-card">' +
          '<div class="flight-top"><span class="flight-tag">' + escapeHtml(f.tag) + '</span><span class="flight-status">' + escapeHtml(f.status) + '</span></div>' +
          '<div class="flight-route"><span class="city">' + escapeHtml(f.origin_code) + '</span><div class="line"></div><span class="city">' + escapeHtml(f.destination_code) + '</span></div>' +
          '<div class="flight-meta">' + escapeHtml(f.schedule_label) + '</div>' +
          '<button class="flight-btn" data-flight-id="' + f.id + '">Voir mon billet</button>' +
          '<div class="boarding-pass" id="bp-' + f.id + '">' +
          '<div class="bp-row"><span>Passager</span><b>' + escapeHtml(f.passenger_name || '—') + '</b></div>' +
          '<div class="bp-row"><span>Vol</span><b>' + escapeHtml(flightNumber) + '</b></div>' +
          (f.gate ? '<div class="bp-row"><span>Porte</span><b>' + escapeHtml(f.gate) + '</b></div>' : '') +
          (f.boarding_time ? '<div class="bp-row"><span>Embarquement</span><b>' + escapeHtml(f.boarding_time) + '</b></div>' : '') +
          '<div class="bp-row"><span>Siège</span><b>' + escapeHtml(f.seat || '—') + '</b></div>' +
          '</div></div>'
        );
      })
      .join('');

    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.flight-btn');
      if (!btn) return;
      var bp = document.getElementById('bp-' + btn.dataset.flightId);
      if (bp) bp.classList.toggle('show');
    });
  };

  // ---- Espace utilisé (album) ----
  window.MyCompanion.renderAlbumStorage = function (bytes) {
    var textEl = document.getElementById('storageUsedText');
    var fillEl = document.getElementById('storageFill');
    if (!textEl || !fillEl) return;

    var QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 Go, indicatif
    var mb = bytes / (1024 * 1024);
    var used = mb >= 1024 ? (mb / 1024).toFixed(1) + ' Go' : Math.round(mb) + ' Mo';
    textEl.textContent = used + ' / 5 Go';
    fillEl.style.width = Math.min(100, (bytes / QUOTA_BYTES) * 100) + '%';
  };

  // ---- Album photo ----
  window.MyCompanion.renderAlbum = function (days, photos, travelers) {
    var sectionsEl = document.getElementById('albumSections');
    if (!sectionsEl) return;

    var filterEl = document.getElementById('ownerFilter');
    if (filterEl) {
      filterEl.innerHTML =
        '<div class="filter-pill active" onclick="filterOwner(this,\'all\')">Tout le monde</div>' +
        (travelers || [])
          .map(function (t) {
            return (
              '<div class="filter-pill" onclick="filterOwner(this,\'' + t.owner_slug + '\')">' +
              escapeHtml(t.display_name) + '</div>'
            );
          })
          .join('');
    }

    if (!photos || !photos.length) {
      sectionsEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucune photo pour l\'instant.</p>';
      return;
    }

    var travelerById = {};
    (travelers || []).forEach(function (t) {
      travelerById[t.id] = t;
    });

    var photosByDay = {};
    (photos || []).forEach(function (p) {
      var key = p.day_id || 'none';
      (photosByDay[key] = photosByDay[key] || []).push(p);
    });

    function buildTiles(list) {
      return list
        .map(function (p, i) {
          var traveler = travelerById[p.traveler_id];
          var owner = traveler ? traveler.owner_slug : 'alexia';
          var pin = p.taken_at
            ? '<span class="pin">' + PHOTO_PIN_ICON + formatShortDate(p.taken_at) + '</span>'
            : '';
          return (
            '<div class="photo-tile ' + SWATCH_CLASSES[i % SWATCH_CLASSES.length] + '" data-owner="' +
            escapeHtml(owner) + '" data-storage-path="' + escapeHtml(p.storage_path) + '">' + pin + '</div>'
          );
        })
        .join('');
    }

    function buildSection(title, list) {
      return (
        '<div class="album-section">' +
        '<div class="sec-title">' + SECTION_PIN_ICON + escapeHtml(title) + '</div>' +
        '<div class="album-grid">' + buildTiles(list) + '</div>' +
        '</div>'
      );
    }

    var sortedDays = (days || [])
      .slice()
      .sort(function (a, b) {
        return b.day_number - a.day_number;
      })
      .filter(function (d) {
        return (photosByDay[d.id] || []).length > 0;
      });

    var sectionsHtml = sortedDays
      .map(function (day) {
        return buildSection('Jour ' + day.day_number + ' · ' + (day.location_label || ''), photosByDay[day.id]);
      })
      .join('');

    var uncategorized = photosByDay.none || [];
    if (uncategorized.length) {
      sectionsHtml += buildSection('Autres photos', uncategorized);
    }

    sectionsEl.innerHTML = sectionsHtml;

    Array.prototype.forEach.call(sectionsEl.querySelectorAll('.photo-tile[data-storage-path]'), function (tile) {
      window.MyCompanion.getPhotoSignedUrl(tile.dataset.storagePath).then(function (url) {
        if (!url) return;
        tile.style.backgroundImage = 'url("' + url + '")';
        tile.style.backgroundSize = 'cover';
        tile.style.backgroundPosition = 'center';
      });
    });
  };

  // ---- Documents ----
  window.MyCompanion.renderDocuments = function (documents) {
    var listEl = document.getElementById('documentsList');
    if (!listEl) return;

    if (!documents || !documents.length) {
      listEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucun document pour l\'instant.</p>';
      return;
    }

    var byCategory = {};
    documents.forEach(function (d) {
      (byCategory[d.category] = byCategory[d.category] || []).push(d);
    });

    listEl.innerHTML = Object.keys(byCategory)
      .map(function (cat) {
        var docs = byCategory[cat]
          .map(function (d) {
            return (
              '<div class="doc-card" data-storage-path="' + escapeHtml(d.storage_path) + '">' +
              '<div class="doc-ic">' + DOC_ICON + '</div>' +
              '<div><h4>' + escapeHtml(d.title) + '</h4><p>Toucher pour ouvrir</p></div>' +
              '</div>'
            );
          })
          .join('');
        return (
          '<div class="doc-section">' +
          '<div class="sec-title">' + (CATEGORY_LABELS[cat] || cat) + '</div>' +
          docs +
          '</div>'
        );
      })
      .join('');

    listEl.addEventListener('click', function (e) {
      var card = e.target.closest('.doc-card');
      if (!card) return;
      window.MyCompanion.getDocumentSignedUrl(card.dataset.storagePath).then(function (url) {
        if (url) window.open(url, '_blank');
      });
    });
  };

  // ---- Voiture de location (carte dans l'écran Documents) ----
  window.MyCompanion.renderRentalCar = function (rentalCar) {
    var el = document.getElementById('rentalCarCard');
    if (!el) return;
    if (!rentalCar) { el.innerHTML = ''; return; }

    var rows = [];
    if (rentalCar.company) rows.push(['Loueur', rentalCar.company]);
    if (rentalCar.booking_ref) rows.push(['Réservation', rentalCar.booking_ref]);
    if (rentalCar.vehicle_model) rows.push(['Véhicule', rentalCar.vehicle_model]);
    if (rentalCar.pickup_date) {
      rows.push([
        'Prise en charge',
        [rentalCar.pickup_date, rentalCar.pickup_time].filter(Boolean).join(' à ') +
          (rentalCar.pickup_location ? ' · ' + rentalCar.pickup_location : ''),
      ]);
    }
    if (rentalCar.return_date) {
      rows.push([
        'Retour',
        [rentalCar.return_date, rentalCar.return_time].filter(Boolean).join(' à ') +
          (rentalCar.return_location ? ' · ' + rentalCar.return_location : ''),
      ]);
    }
    if (rentalCar.counter_location) rows.push(['Comptoir', rentalCar.counter_location]);
    if (rentalCar.notes) rows.push(['Notes', rentalCar.notes]);

    if (!rows.length) { el.innerHTML = ''; return; }

    el.innerHTML =
      '<div class="rental-card"><h4>🚗 Voiture de location</h4>' +
      rows
        .map(function (r) {
          return '<div class="rental-row"><span>' + escapeHtml(r[0]) + '</span><b>' + escapeHtml(r[1]) + '</b></div>';
        })
        .join('') +
      '</div>';
  };

  // ---- Urgences ----
  window.MyCompanion.renderUrgences = function (trip, documents) {
    var listEl = document.getElementById('emergencyList');
    if (!listEl) return;

    var PHONE_ICON =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L7.9 9.9a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z"/></svg>';

    var blocks = [];

    blocks.push(
      '<a class="emg-btn primary" href="tel:911">' +
      '<div class="emg-ic">' + PHONE_ICON + '</div>' +
      '<div><h4>Urgences (911)</h4><p>Police, pompiers, secours médicaux</p></div>' +
      '</a>'
    );

    blocks.push(
      trip && trip.embassy_phone
        ? '<a class="emg-btn" href="tel:' + escapeHtml(trip.embassy_phone) + '">' +
          '<div class="emg-ic">' + PHONE_ICON + '</div>' +
          '<div><h4>Ambassade</h4><p>' + escapeHtml(trip.embassy_phone) + '</p></div></a>'
        : '<div class="emg-btn"><div class="emg-ic">' + PHONE_ICON + '</div>' +
          '<div><h4>Ambassade</h4><p>Pas encore renseigné — contactez Alexia</p></div></div>'
    );

    blocks.push(
      trip && trip.insurance_phone
        ? '<a class="emg-btn" href="tel:' + escapeHtml(trip.insurance_phone) + '">' +
          '<div class="emg-ic">' + PHONE_ICON + '</div>' +
          '<div><h4>Assurance / rapatriement</h4><p>' + escapeHtml(trip.insurance_phone) + '</p></div></a>'
        : '<div class="emg-btn"><div class="emg-ic">' + PHONE_ICON + '</div>' +
          '<div><h4>Assurance / rapatriement</h4><p>Pas encore renseigné — contactez Alexia</p></div></div>'
    );

    var insuranceDoc = (documents || []).find(function (d) { return d.category === 'insurance'; });
    if (insuranceDoc) {
      blocks.push(
        '<div class="doc-card" data-storage-path="' + escapeHtml(insuranceDoc.storage_path) + '" style="margin-top:10px;">' +
        '<div class="doc-ic">' + DOC_ICON + '</div>' +
        '<div><h4>' + escapeHtml(insuranceDoc.title) + '</h4><p>Toucher pour ouvrir votre contrat</p></div>' +
        '</div>'
      );
    }

    if (trip && trip.emergency_notes) {
      blocks.push('<div class="emg-notes">' + escapeHtml(trip.emergency_notes) + '</div>');
    }

    listEl.innerHTML = blocks.join('');

    var docTile = listEl.querySelector('.doc-card[data-storage-path]');
    if (docTile) {
      docTile.addEventListener('click', function () {
        window.MyCompanion.getDocumentSignedUrl(docTile.dataset.storagePath).then(function (url) {
          if (url) window.open(url, '_blank');
        });
      });
    }
  };

  // ---- Météo (étape du jour) ----
  window.MyCompanion.renderWeather = async function (days) {
    var cardEl = document.getElementById('weatherCard');
    if (!cardEl) return;

    var todayIso = new Date().toISOString().slice(0, 10);
    var sorted = (days || [])
      .filter(function (d) { return d.location_label; })
      .sort(function (a, b) { return a.day_number - b.day_number; });
    var target =
      sorted.find(function (d) { return d.date === todayIso; }) ||
      sorted.find(function (d) { return !d.date || d.date >= todayIso; }) ||
      sorted[0];

    if (!target) {
      cardEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucune étape avec un lieu renseigné pour l\'instant.</p>';
      return;
    }

    cardEl.innerHTML = '<div class="weather-card"><div class="wc-place">Chargement...</div></div>';

    var weather = await window.MyCompanion.getWeatherForLocation(target.location_label);
    if (!weather) {
      cardEl.innerHTML =
        '<p style="color:#8a8470;font-size:13px;">Météo indisponible pour "' +
        escapeHtml(target.location_label) + '" pour le moment.</p>';
      return;
    }

    var codeInfo = WEATHER_CODES[weather.weatherCode] || ['🌡️', 'Météo'];
    cardEl.innerHTML =
      '<div class="weather-card">' +
      '<div class="wc-place">' + escapeHtml(weather.place) + '</div>' +
      '<div class="wc-icon">' + codeInfo[0] + '</div>' +
      (weather.currentTemp != null ? '<div class="wc-temp">' + weather.currentTemp + '°</div>' : '') +
      '<div class="wc-desc">' + codeInfo[1] + '</div>' +
      '<div class="wc-minmax">' +
      (weather.minTemp != null ? '<span>Min <b>' + weather.minTemp + '°</b></span>' : '') +
      (weather.maxTemp != null ? '<span>Max <b>' + weather.maxTemp + '°</b></span>' : '') +
      '</div></div>';
  };

  // ---- Frais partagés ----
  // Répartition simple : chaque dépense est divisée à parts égales entre
  // tous les voyageurs de rôle "member" (le guide ne participe pas à la cagnotte).
  window.MyCompanion.renderExpenses = function (expenses, travelers) {
    var summaryEl = document.getElementById('expensesSummary');
    var listEl = document.getElementById('expensesList');
    var payerSelect = document.getElementById('expensePaidBy');
    if (!summaryEl || !listEl) return;

    var members = (travelers || []).filter(function (t) { return t.role !== 'guide'; });

    if (payerSelect) {
      var previousValue = payerSelect.value;
      payerSelect.innerHTML = members
        .map(function (t) { return '<option value="' + t.id + '">' + escapeHtml(t.display_name) + '</option>'; })
        .join('');
      if (previousValue && members.some(function (t) { return t.id === previousValue; })) {
        payerSelect.value = previousValue;
      }
    }

    var totalsByTraveler = {};
    members.forEach(function (t) { totalsByTraveler[t.id] = 0; });
    var grandTotal = 0;
    (expenses || []).forEach(function (e) {
      grandTotal += Number(e.amount);
      if (totalsByTraveler[e.paid_by] != null) totalsByTraveler[e.paid_by] += Number(e.amount);
    });
    var fairShare = members.length ? grandTotal / members.length : 0;

    var balanceRows = members
      .map(function (t) {
        var paid = totalsByTraveler[t.id] || 0;
        var balance = paid - fairShare;
        var balanceClass = balance >= -0.01 ? 'pos' : 'neg';
        var balanceLabel =
          balance > 0.01 ? '+' + balance.toFixed(2) + ' € à récupérer' :
          balance < -0.01 ? balance.toFixed(2) + ' € à devoir' : 'équilibré';
        return (
          '<div class="expense-balance-row">' +
          '<div><div class="name">' + escapeHtml(t.display_name) + '</div>' +
          '<div class="paid">' + paid.toFixed(2) + ' € payés</div></div>' +
          '<div class="balance ' + balanceClass + '">' + balanceLabel + '</div>' +
          '</div>'
        );
      })
      .join('');

    summaryEl.innerHTML =
      '<div class="expense-total">' +
      '<div class="et-amount">' + grandTotal.toFixed(2) + ' €</div>' +
      '<div class="et-meta">' + (expenses || []).length + ' dépense(s) · part de chacun : ' + fairShare.toFixed(2) + ' € (' + members.length + ' pers.)</div>' +
      '</div>' + balanceRows;

    if (!expenses || !expenses.length) {
      listEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucune dépense pour l\'instant.</p>';
      return;
    }

    var travelerById = {};
    members.forEach(function (t) { travelerById[t.id] = t; });

    listEl.innerHTML = expenses
      .map(function (e) {
        var payer = travelerById[e.paid_by];
        var date = new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return (
          '<div class="expense-row">' +
          '<div><h4>' + escapeHtml(e.description) + '</h4>' +
          '<div class="meta">' + (payer ? escapeHtml(payer.display_name) : '—') + ' · ' + date + '</div></div>' +
          '<div><span class="amount">' + Number(e.amount).toFixed(2) + ' €</span>' +
          '<button type="button" data-id="' + e.id + '" data-kind="delete-expense">✕</button></div>' +
          '</div>'
        );
      })
      .join('');
  };
})();
