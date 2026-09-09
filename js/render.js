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
  // Taux de taxe sur les ventes indicatifs (moyenne État + taxes locales),
  // par code d'État à 2 lettres. À prendre comme un ordre de grandeur : la
  // taxe réelle varie par ville/comté et change d'une année sur l'autre.
  var US_STATE_TAX = {
    AL: ['Alabama', 0.0925], AK: ['Alaska', 0.0176], AZ: ['Arizona', 0.084], AR: ['Arkansas', 0.0945],
    CA: ['Californie', 0.0882], CO: ['Colorado', 0.0772], CT: ['Connecticut', 0.0635], DE: ['Delaware', 0],
    FL: ['Floride', 0.0702], GA: ['Géorgie', 0.074], HI: ['Hawaï', 0.0444], ID: ['Idaho', 0.0603],
    IL: ['Illinois', 0.0882], IN: ['Indiana', 0.07], IA: ['Iowa', 0.0694], KS: ['Kansas', 0.087],
    KY: ['Kentucky', 0.06], LA: ['Louisiane', 0.0955], ME: ['Maine', 0.055], MD: ['Maryland', 0.06],
    MA: ['Massachusetts', 0.0625], MI: ['Michigan', 0.06], MN: ['Minnesota', 0.0749], MS: ['Mississippi', 0.0707],
    MO: ['Missouri', 0.0829], MT: ['Montana', 0], NE: ['Nebraska', 0.0694], NV: ['Nevada', 0.0823],
    NH: ['New Hampshire', 0], NJ: ['New Jersey', 0.066], NM: ['Nouveau-Mexique', 0.0772], NY: ['New York', 0.0852],
    NC: ['Caroline du Nord', 0.0698], ND: ['Dakota du Nord', 0.0696], OH: ['Ohio', 0.0724], OK: ['Oklahoma', 0.0895],
    OR: ['Oregon', 0], PA: ['Pennsylvanie', 0.0634], RI: ['Rhode Island', 0.07], SC: ['Caroline du Sud', 0.0744],
    SD: ['Dakota du Sud', 0.064], TN: ['Tennessee', 0.0955], TX: ['Texas', 0.082], UT: ['Utah', 0.0719],
    VT: ['Vermont', 0.0624], VA: ['Virginie', 0.0575], WA: ['Washington', 0.0886], WV: ['Virginie-Occidentale', 0.065],
    WI: ['Wisconsin', 0.0543], WY: ['Wyoming', 0.0536], DC: ['Washington D.C.', 0.06],
  };
  // Noms anglais (pour matcher la réponse de l'API de géolocalisation,
  // qui renvoie souvent les États américains en anglais même en français).
  var US_STATE_NAMES_EN = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
    CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
    IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
    ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
    OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
    WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
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

  // Pour un champ "date" seul (YYYY-MM-DD, sans heure ni fuseau) : on
  // reconstruit la date en local plutôt que de passer par new Date(iso),
  // qui interprète la chaîne comme minuit UTC et peut afficher la veille
  // pour un voyageur aux États-Unis (fuseaux en retard sur UTC).
  function formatLongDate(dateStr) {
    if (!dateStr) return '';
    var parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    try {
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  function formatTimeFr(timeStr) {
    return timeStr ? String(timeStr).replace(':', 'h') : '';
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

    var tripLabel = trip ? (trip.name || trip.destination || 'Votre voyage') : 'Votre voyage';
    var todayIso = new Date().toISOString().slice(0, 10);
    var sortedDays = (days || []).slice().sort(function (a, b) { return a.day_number - b.day_number; });
    if (sortedDays.length) {
      var currentDay = sortedDays[0];
      sortedDays.forEach(function (d) { if (d.date && d.date <= todayIso) currentDay = d; });
      tripLabel += ' · Jour ' + currentDay.day_number + '/' + sortedDays.length;
    }
    eyebrowEl.textContent = tripLabel;
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

    // Toutes les étapes de tous les jours, pour retrouver l'objet complet
    // au clic sur une carte (ouverture de la fiche détail) quel que soit
    // le jour affiché.
    var itemsById = {};
    sorted.forEach(function (day) {
      (day.itinerary_items || []).forEach(function (item) { itemsById[item.id] = item; });
    });

    function renderDay(day) {
      var itemsHtml = (day.itinerary_items || [])
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

      // Conseils libres d'Alexia pour le temps libre de ce jour (pas de
      // réservation, pas d'horaire — juste des idées à suivre ou non).
      var tips = (day.day_tips || []).slice().sort(function (a, b) { return a.sort_order - b.sort_order; });
      var tipsHtml = !tips.length ? '' : (
        '<div class="day-tips">' +
        '<div class="day-tips-title">💡 Suggestions d\'Alexia' + (day.location_label ? ' à ' + escapeHtml(day.location_label) : '') + '</div>' +
        tips
          .map(function (t) {
            return (
              '<div class="tip-card">' +
              '<div class="tip-card-body"><h4>' + escapeHtml(t.title) + '</h4>' +
              (t.description ? '<p>' + escapeHtml(t.description) + '</p>' : '') +
              '</div>' +
              (t.map_query
                ? '<div class="maplink" title="Ouvrir dans Maps" data-query="' + escapeHtml(t.map_query) + '">' + MAPLINK_ICON + '</div>'
                : '') +
              '</div>'
            );
          })
          .join('') +
        '</div>'
      );

      timelineEl.innerHTML = itemsHtml + tipsHtml;

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

    // Par défaut, on ouvre le jour d'aujourd'hui plutôt que toujours le
    // Jour 1 : le dernier jour dont la date n'est pas dans le futur (à
    // défaut, le premier jour si le voyage n'a pas encore commencé).
    var todayIso = new Date().toISOString().slice(0, 10);
    var defaultIndex = 0;
    sorted.forEach(function (d, i) {
      if (d.date && d.date <= todayIso) defaultIndex = i;
    });

    pillsEl.innerHTML = sorted
      .map(function (d, i) {
        var classes = 'day-pill' + (i === defaultIndex ? ' active' : '') + (d.date === todayIso ? ' today' : '');
        return '<div class="' + classes + '" data-index="' + i + '">J' + d.day_number + '</div>';
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

    if (!timelineEl.dataset.wired) {
      timelineEl.dataset.wired = '1';
      timelineEl.addEventListener('click', function (e) {
        var mapEl = e.target.closest('.maplink');
        if (mapEl) {
          var q = mapEl.dataset.query;
          if (q) window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q), '_blank');
          return;
        }
        var cardEl = e.target.closest('.titem .card');
        if (!cardEl) return;
        var titemEl = cardEl.closest('.titem');
        var item = titemEl && itemsById[titemEl.dataset.itemId];
        if (item && window.MyCompanion.renderItemDetail) {
          window.MyCompanion.renderItemDetail(item);
          if (window.showTab) window.showTab('item-detail');
        }
      });
    }

    renderDay(sorted[defaultIndex]);
  };

  // ---- Fiche détail d'une étape (adresse, horaires, conseil d'Alexia,
  // galerie de photos, distance GPS) ----
  window.MyCompanion.renderItemDetail = function (item) {
    var titleEl = document.getElementById('itemDetailTitle');
    var contentEl = document.getElementById('itemDetailContent');
    if (!titleEl || !contentEl || !item) return;

    titleEl.textContent = item.title;

    var mapQuery = item.map_query || item.address || item.title;
    var badges = (item.badge_labels || [])
      .map(function (b) { return '<span class="badge ' + classifyBadge(b) + '">' + escapeHtml(b) + '</span>'; })
      .join('');

    var html = '<div class="item-detail-type">' + (TYPE_LABELS[item.item_type] || '') + '</div>';
    html += item.image_path ? '<img class="item-detail-hero" id="itemDetailHero" alt="">' : '';

    html +=
      '<div class="item-detail-row">' +
      '<div class="ic">' + MAPLINK_ICON + '</div>' +
      '<div class="txt">' +
      (item.address ? '<b>Adresse</b>' + escapeHtml(item.address) + ' · ' : '<b>Lieu</b>') +
      '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery) + '" target="_blank" rel="noopener">Ouvrir dans Maps</a>' +
      '</div></div>';

    if (item.opening_hours) {
      html +=
        '<div class="item-detail-row">' +
        '<div class="ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>' +
        '<div class="txt"><b>Horaires</b>' + escapeHtml(item.opening_hours) + '</div></div>';
    }

    html +=
      '<div class="item-detail-row">' +
      '<div class="ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-7-7 18-3-8-8-3Z"/></svg></div>' +
      '<div class="txt"><b>Distance</b>' +
      '<button type="button" id="itemDetailDistanceBtn" class="distance-btn">📍 Voir la distance jusqu\'ici</button>' +
      '<span id="itemDetailDistanceValue" style="display:none;"></span>' +
      '</div></div>';

    if (badges) html += '<div class="badges">' + badges + '</div>';

    contentEl.innerHTML = html;

    if (item.image_path) {
      window.MyCompanion.getStepVisualUrl(item.image_path).then(function (url) {
        var hero = document.getElementById('itemDetailHero');
        if (hero && url) hero.src = url;
      });
    }

    if (item.alexia_tip) {
      contentEl.insertAdjacentHTML(
        'beforeend',
        '<div class="alexia-card" style="margin-top:6px;">' +
          '<div class="alexia-avatar">A</div>' +
          '<div><p>' + escapeHtml(item.alexia_tip) + '</p></div>' +
          '</div>'
      );
    }

    // Galerie de photos : chargée à part (URLs signées), affichée dès
    // qu'elle arrive plutôt que de bloquer le reste de la fiche.
    window.MyCompanion.getItemGalleryPhotos(item.id).then(function (photos) {
      if (!photos || !photos.length) return;
      contentEl.insertAdjacentHTML(
        'beforeend',
        '<p class="item-detail-gallery-label">Photos</p>' +
          '<div class="item-detail-gallery">' +
          photos.map(function (p) { return '<img src="' + p.url + '" alt="" data-full="' + p.url + '">'; }).join('') +
          '</div>'
      );
      var galleryEl = contentEl.querySelector('.item-detail-gallery');
      if (galleryEl) {
        galleryEl.addEventListener('click', function (e) {
          var img = e.target.closest('img[data-full]');
          if (img) window.open(img.dataset.full, '_blank');
        });
      }
    });

    // Distance depuis la position actuelle : demandée seulement sur tap
    // explicite, pas au chargement de la fiche — la géolocalisation
    // déclenche une demande de permission, ça ne doit jamais surgir sans
    // que le voyageur ait demandé quelque chose.
    var distBtn = document.getElementById('itemDetailDistanceBtn');
    var distValue = document.getElementById('itemDetailDistanceValue');
    if (distBtn && distValue) {
      distBtn.addEventListener('click', function () {
        distBtn.textContent = 'Recherche en cours...';
        distBtn.disabled = true;
        Promise.all([
          window.MyCompanion.getCurrentPosition(),
          window.MyCompanion.geocodeLabel(item.address || mapQuery),
        ]).then(function (res) {
          var pos = res[0];
          var place = res[1];
          if (!pos) {
            distBtn.textContent = 'Position indisponible';
            return;
          }
          if (!place) {
            distBtn.textContent = 'Lieu introuvable';
            return;
          }
          var km = window.MyCompanion.distanceKm(pos.lat, pos.lon, place.lat, place.lon);
          distValue.textContent =
            (km < 1
              ? Math.round(km * 1000) + ' m'
              : km.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' km') +
            ' de votre position';
          distValue.style.display = '';
          distBtn.style.display = 'none';
        });
      });
    }
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
        [formatLongDate(rentalCar.pickup_date), rentalCar.pickup_time ? 'à ' + formatTimeFr(rentalCar.pickup_time) : null]
          .filter(Boolean).join(' ') +
          (rentalCar.pickup_location ? ' · ' + rentalCar.pickup_location : ''),
      ]);
    }
    if (rentalCar.return_date) {
      rows.push([
        'Retour',
        [formatLongDate(rentalCar.return_date), rentalCar.return_time ? 'à ' + formatTimeFr(rentalCar.return_time) : null]
          .filter(Boolean).join(' ') +
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
          return '<div class="rental-row"><span class="rlabel">' + escapeHtml(r[0]) + '</span><span class="rvalue">' + escapeHtml(r[1]) + '</span></div>';
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

  // ---- Météo : toutes les étapes du voyage (passées, en cours, à venir) ----
  window.MyCompanion.renderWeatherDays = async function (days) {
    var listEl = document.getElementById('weatherDaysList');
    if (!listEl) return;

    var todayIso = new Date().toISOString().slice(0, 10);
    var sorted = (days || [])
      .filter(function (d) { return d.location_label; })
      .sort(function (a, b) { return a.day_number - b.day_number; });

    if (!sorted.length) {
      listEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucune étape avec un lieu renseigné pour l\'instant.</p>';
      return;
    }

    listEl.innerHTML = sorted
      .map(function (d) {
        var status = !d.date ? '' : d.date === todayIso ? 'today' : d.date < todayIso ? 'past' : '';
        return (
          '<div class="weather-day-row ' + status + '" data-row-id="' + d.id + '">' +
          '<div class="wd-left"><div class="wd-icon">…</div>' +
          '<div><h4>Jour ' + d.day_number + (status === 'today' ? ' · Aujourd\'hui' : '') + '</h4>' +
          '<p>' + escapeHtml(d.location_label) + (d.date ? ' · ' + formatShortDate(d.date) : '') + '</p></div></div>' +
          '<div class="wd-temps">…</div>' +
          '</div>'
        );
      })
      .join('');

    var geocodeCache = {};
    var todayDate = new Date(todayIso);

    sorted.forEach(function (d) {
      var row = listEl.querySelector('.weather-day-row[data-row-id="' + d.id + '"]');
      if (!row) return;
      var iconEl = row.querySelector('.wd-icon');
      var tempsEl = row.querySelector('.wd-temps');

      // Les prévisions météo (chez n'importe quel fournisseur) ne sont
      // fiables qu'à ~16 jours. Au-delà, inutile d'appeler l'API : on
      // l'indique clairement plutôt que d'afficher un "indisponible" qui
      // ressemble à un bug.
      if (d.date) {
        var diffDays = Math.round((new Date(d.date) - todayDate) / 86400000);
        if (diffDays > 16) {
          iconEl.textContent = '🕐';
          tempsEl.innerHTML = '<span>prévision à J-16</span>';
          return;
        }
        if (diffDays < -92) {
          iconEl.textContent = '—';
          tempsEl.innerHTML = '<span>trop ancien</span>';
          return;
        }
      }

      window.MyCompanion.getWeatherForDate(d.location_label, d.date, geocodeCache).then(function (weather) {
        if (!weather) {
          iconEl.textContent = '—';
          tempsEl.innerHTML = '<span>lieu introuvable</span>';
          return;
        }
        var codeInfo = WEATHER_CODES[weather.weatherCode] || ['🌡️', 'Météo'];
        iconEl.textContent = codeInfo[0];
        tempsEl.innerHTML = weather.maxTemp + '° <span>/ ' + weather.minTemp + '°</span>';
      });
    });
  };

  // ---- Météo : recherche libre d'un lieu ----
  window.MyCompanion.renderWeatherSearchResult = async function (query) {
    var resultEl = document.getElementById('weatherSearchResult');
    if (!resultEl) return;

    resultEl.innerHTML = '<div class="weather-card"><div class="wc-place">Recherche...</div></div>';

    var weather = await window.MyCompanion.getWeatherForLocation(query);
    if (!weather) {
      resultEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Lieu introuvable ou météo indisponible pour "' + escapeHtml(query) + '".</p>';
      return;
    }

    var codeInfo = WEATHER_CODES[weather.weatherCode] || ['🌡️', 'Météo'];
    resultEl.innerHTML =
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

  window.MyCompanion.initWeatherSearch = function () {
    var form = document.getElementById('weatherSearchForm');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var query = document.getElementById('weatherSearchInput').value.trim();
      if (query) window.MyCompanion.renderWeatherSearchResult(query);
    });
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

  // Reconnaît un État soit via un code à 2 lettres en fin de texte
  // ("Chicago, IL"), soit via le nom complet écrit n'importe où
  // ("Chicago, Illinois" ou juste "Illinois").
  function matchUsState(label) {
    var suffixMatch = /,\s*([A-Za-z]{2})\s*$/.exec(label || '');
    if (suffixMatch) {
      var code = suffixMatch[1].toUpperCase();
      if (US_STATE_TAX[code]) return code;
    }
    var lower = (label || '').toLowerCase();
    for (var c in US_STATE_TAX) {
      if (US_STATE_TAX[c][0] && lower.indexOf(US_STATE_TAX[c][0].toLowerCase()) !== -1) return c;
    }
    return null;
  }

  // Repli quand le texte seul ne suffit pas (ex. juste "Chicago", sans
  // État) : on géolocalise le lieu (même service que la météo) et on lit
  // la région ("admin1", ex. "Illinois") renvoyée.
  async function resolveStateViaGeocoding(label, cache) {
    if (Object.prototype.hasOwnProperty.call(cache, label)) return cache[label];
    try {
      var res = await fetch(
        'https://geocoding-api.open-meteo.com/v1/search?name=' +
          encodeURIComponent(label) + '&count=1&language=fr&format=json&country=US'
      );
      var geo = await res.json();
      var place = geo.results && geo.results[0];
      var admin1 = place && place.admin1 ? place.admin1.toLowerCase() : null;
      var code = null;
      if (admin1) {
        for (var c in US_STATE_TAX) {
          if (
            (US_STATE_TAX[c][0] && US_STATE_TAX[c][0].toLowerCase() === admin1) ||
            (US_STATE_NAMES_EN[c] && US_STATE_NAMES_EN[c].toLowerCase() === admin1)
          ) {
            code = c;
            break;
          }
        }
      }
      cache[label] = code;
      return code;
    } catch (err) {
      cache[label] = null;
      return null;
    }
  }

  // ---- Liste des États pour le calculateur de taxes ----
  // Ne montre que les États réellement traversés pendant ce voyage
  // (déduits du lieu de chaque étape, ex. "Amarillo, TX" -> TX, ou juste
  // "Chicago" via géolocalisation).
  window.MyCompanion.renderStateTaxOptions = async function (days) {
    var selectEl = document.getElementById('stateTax');
    if (!selectEl) return;

    var codes = [];
    var geocodeCache = {};
    var withLocation = (days || []).filter(function (d) { return d.location_label; });

    for (var i = 0; i < withLocation.length; i++) {
      var label = withLocation[i].location_label;
      var code = matchUsState(label) || (await resolveStateViaGeocoding(label, geocodeCache));
      if (code && codes.indexOf(code) === -1) codes.push(code);
    }

    if (!codes.length) {
      // Pas d'État identifiable dans les lieux renseignés : on ne propose
      // plus une liste figée qui n'a rien à voir avec le voyage.
      selectEl.innerHTML = '<option value="0">Autre / pas de taxe</option>';
      if (window.computeTip) window.computeTip();
      return;
    }

    codes.sort(function (a, b) { return US_STATE_TAX[a][0].localeCompare(US_STATE_TAX[b][0]); });

    selectEl.innerHTML =
      codes
        .map(function (code) {
          var entry = US_STATE_TAX[code];
          var pct = (entry[1] * 100).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
          return '<option value="' + entry[1] + '">' + escapeHtml(entry[0]) + ' — ' + pct + ' %</option>';
        })
        .join('') +
      '<option value="0">Autre / pas de taxe</option>';

    if (window.computeTip) window.computeTip();
  };

  // ---- Guides e-SIM ----
  window.MyCompanion.renderEsimBrandList = function (guides) {
    var listEl = document.getElementById('esimBrandList');
    if (!listEl) return;

    listEl.innerHTML = (guides || [])
      .map(function (g) {
        return (
          '<div class="doc-card" data-guide-id="' + g.id + '">' +
          '<div class="doc-ic">' + (g.logo_emoji ? escapeHtml(g.logo_emoji) : '📶') + '</div>' +
          '<div><h4>' + escapeHtml(g.brand) + '</h4><p>Voir le tuto</p></div>' +
          '</div>'
        );
      })
      .join('');

    if (!listEl.dataset.wired) {
      listEl.dataset.wired = '1';
      listEl.addEventListener('click', function (e) {
        var card = e.target.closest('.doc-card[data-guide-id]');
        if (!card) return;
        var guide = (guides || []).find(function (g) { return g.id === card.dataset.guideId; });
        if (!guide) return;
        window.MyCompanion.renderEsimGuide(guide);
        if (window.showTab) window.showTab('esim-guide');
      });
    }
  };

  window.MyCompanion.renderEsimGuide = function (guide) {
    var titleEl = document.getElementById('esimGuideTitle');
    var stepsEl = document.getElementById('esimGuideSteps');
    if (!titleEl || !stepsEl || !guide) return;

    titleEl.textContent = (guide.logo_emoji ? guide.logo_emoji + ' ' : '') + guide.brand;

    var steps = (guide.steps || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    stepsEl.innerHTML = steps.length
      ? steps
          .map(function (s, i) {
            return '<div class="esim-step"><div class="esim-num">' + (i + 1) + '</div><div><p>' + escapeHtml(s) + '</p></div></div>';
          })
          .join('')
      : '<p style="color:#8a8470;font-size:13px;">Pas encore de détail pour cette marque — contactez Alexia.</p>';
  };
})();
