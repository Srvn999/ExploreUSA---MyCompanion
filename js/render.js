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
  var TYPE_LABELS = { hotel: 'Hôtel', activity: 'Activité', restaurant: 'Restaurant' };
  var SWATCH_CLASSES = ['sw1', 'sw2', 'sw3', 'sw4', 'sw5'];

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

  // ---- Album photo ----
  window.MyCompanion.renderAlbum = function (days, photos, travelers) {
    var sectionsEl = document.getElementById('albumSections');
    if (!sectionsEl) return;

    if (!days || !days.length || !photos || !photos.length) {
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

    var sortedDays = days
      .slice()
      .sort(function (a, b) {
        return b.day_number - a.day_number;
      })
      .filter(function (d) {
        return (photosByDay[d.id] || []).length > 0;
      });

    if (!sortedDays.length) {
      sectionsEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucune photo pour l\'instant.</p>';
      return;
    }

    sectionsEl.innerHTML = sortedDays
      .map(function (day) {
        var dayPhotos = photosByDay[day.id] || [];
        var tiles = dayPhotos
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
        return (
          '<div class="album-section">' +
          '<div class="sec-title">' + SECTION_PIN_ICON + 'Jour ' + day.day_number + ' · ' + escapeHtml(day.location_label || '') + '</div>' +
          '<div class="album-grid">' + tiles + '</div>' +
          '</div>'
        );
      })
      .join('');

    Array.prototype.forEach.call(sectionsEl.querySelectorAll('.photo-tile[data-storage-path]'), function (tile) {
      window.MyCompanion.getPhotoSignedUrl(tile.dataset.storagePath).then(function (url) {
        if (!url) return;
        tile.style.backgroundImage = 'url("' + url + '")';
        tile.style.backgroundSize = 'cover';
        tile.style.backgroundPosition = 'center';
      });
    });
  };
})();
