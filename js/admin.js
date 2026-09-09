// Espace admin (Alexia) : gestion des voyages, itinéraire, vols,
// documents et messagerie. Toute la sécurité est appliquée côté base
// (RLS, voir supabase/migrations/0003_admin_and_messages.sql) — ce
// fichier ne fait que lire/écrire via le client Supabase.
(function () {
  var supabase = null;
  var currentAdmin = null; // { user_id, display_name }
  var currentTripId = null;
  var currentTrip = null;
  var editingItemId = null;
  var editingTravelerId = null;
  var currentRentalCarId = null;
  var messagesChannel = null;

  var TYPE_LABELS = { hotel: 'Hôtel', activity: 'Activité', restaurant: 'Restaurant' };
  var CATEGORY_LABELS = {
    passport: 'Passeport', esta: 'ESTA', insurance: 'Assurance',
    rental: 'Location voiture', ticket: 'Billet', other: 'Autre',
  };

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  // ---------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------

  async function init() {
    supabase = window.MyCompanion && window.MyCompanion.client;
    if (!supabase) {
      $('loginError').textContent = "Configuration Supabase manquante dans admin.html.";
      return;
    }

    $('loginForm').addEventListener('submit', onLoginSubmit);
    $('logoutBtn').addEventListener('click', onLogout);
    $('newTripBtn').addEventListener('click', function () { $('newTripCard').hidden = false; });
    $('cancelNewTrip').addEventListener('click', function () { $('newTripCard').hidden = true; });
    $('newTripForm').addEventListener('submit', onCreateTrip);
    $('newTripForm').start_date.addEventListener('change', function () {
      $('newTripForm').end_date.min = this.value;
    });
    $('tripInfoForm').addEventListener('submit', onSaveTripInfo);
    $('tripInfoForm').start_date.addEventListener('change', function () {
      $('tripInfoForm').end_date.min = this.value;
    });
    $('emergencyForm').addEventListener('submit', onSaveEmergency);
    $('travelerForm').addEventListener('submit', onAddTraveler);
    $('dayForm').addEventListener('submit', onAddDay);
    $('flightForm').addEventListener('submit', onAddFlight);
    $('rentalCarForm').addEventListener('submit', onSaveRentalCar);
    $('documentForm').addEventListener('submit', onAddDocument);
    $('adminChatForm').addEventListener('submit', onSendAdminMessage);

    Array.prototype.forEach.call(document.querySelectorAll('.tab-btn'), function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });

    var session = (await supabase.auth.getSession()).data.session;
    if (session) await tryEnterAsAdmin();
  }

  async function onLoginSubmit(e) {
    e.preventDefault();
    $('loginError').textContent = '';
    var email = $('loginEmail').value.trim();
    var password = $('loginPassword').value;
    var res = await supabase.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
      $('loginError').textContent = 'Connexion impossible : ' + res.error.message;
      return;
    }
    await tryEnterAsAdmin();
  }

  async function tryEnterAsAdmin() {
    var userRes = await supabase.auth.getUser();
    var user = userRes.data.user;
    if (!user) return;

    var adminRes = await supabase.from('admins').select('*').eq('user_id', user.id).maybeSingle();
    if (adminRes.error || !adminRes.data) {
      $('loginError').textContent =
        "Ce compte n'est pas autorisé sur l'espace admin (voir SETUP.md pour ajouter un admin).";
      await supabase.auth.signOut();
      return;
    }

    currentAdmin = adminRes.data;
    $('loginScreen').hidden = true;
    $('appShell').hidden = false;
    await loadTrips();
  }

  async function onLogout() {
    if (messagesChannel) supabase.removeChannel(messagesChannel);
    await supabase.auth.signOut();
    location.reload();
  }

  // ---------------------------------------------------------------
  // TRIPS
  // ---------------------------------------------------------------

  async function loadTrips() {
    var res = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (res.error) { console.warn(res.error); return; }
    var listEl = $('tripList');
    listEl.innerHTML = (res.data || [])
      .map(function (t) {
        return (
          '<div class="trip-item" data-trip-id="' + t.id + '">' +
          escapeHtml(t.name) +
          '<div class="sub">' + escapeHtml(t.destination || '') + '</div></div>'
        );
      })
      .join('');
    Array.prototype.forEach.call(listEl.querySelectorAll('.trip-item'), function (el) {
      el.addEventListener('click', function () { selectTrip(el.dataset.tripId); });
    });
  }

  async function onCreateTrip(e) {
    e.preventDefault();
    var form = e.target;
    var payload = {
      name: form.name.value.trim(),
      destination: form.destination.value.trim() || null,
      start_date: form.start_date.value || null,
      end_date: form.end_date.value || null,
    };
    if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) {
      alert('La date de fin ne peut pas être avant la date de début.');
      return;
    }
    var res = await supabase.from('trips').insert(payload).select().single();
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    form.reset();
    $('newTripCard').hidden = true;
    await loadTrips();
    selectTrip(res.data.id);
  }

  function selectTrip(tripId) {
    currentTripId = tripId;
    Array.prototype.forEach.call(document.querySelectorAll('.trip-item'), function (el) {
      el.classList.toggle('active', el.dataset.tripId === tripId);
    });
    $('noTripSelected').hidden = true;
    $('tripEditor').hidden = false;

    switchTab('infos');
    refreshTripInfo();
    loadTravelers();
    loadDays();
    loadFlights();
    loadDocuments();
    loadRentalCar();
    loadMessages();
  }

  async function refreshTripInfo() {
    var res = await supabase.from('trips').select('*').eq('id', currentTripId).maybeSingle();
    if (res.error || !res.data) return;
    currentTrip = res.data;

    $('tripTitle').textContent = currentTrip.name || 'Voyage';
    $('tripSub').textContent = [currentTrip.destination, currentTrip.start_date, currentTrip.end_date]
      .filter(Boolean)
      .join(' · ');

    var infoForm = $('tripInfoForm');
    infoForm.name.value = currentTrip.name || '';
    infoForm.destination.value = currentTrip.destination || '';
    infoForm.start_date.value = currentTrip.start_date || '';
    infoForm.end_date.value = currentTrip.end_date || '';

    var emForm = $('emergencyForm');
    emForm.embassy_phone.value = currentTrip.embassy_phone || '';
    emForm.insurance_phone.value = currentTrip.insurance_phone || '';
    emForm.emergency_notes.value = currentTrip.emergency_notes || '';

    var dayDateInput = $('dayForm').date;
    dayDateInput.min = currentTrip.start_date || '';
    dayDateInput.max = currentTrip.end_date || '';
  }

  async function onSaveTripInfo(e) {
    e.preventDefault();
    var form = e.target;
    var payload = {
      name: form.name.value.trim(),
      destination: form.destination.value.trim() || null,
      start_date: form.start_date.value || null,
      end_date: form.end_date.value || null,
    };
    if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) {
      alert('La date de fin ne peut pas être avant la date de début.');
      return;
    }
    var res = await supabase.from('trips').update(payload).eq('id', currentTripId);
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    await refreshTripInfo();
    await loadTrips();
  }

  async function onSaveEmergency(e) {
    e.preventDefault();
    var form = e.target;
    var res = await supabase.from('trips').update({
      embassy_phone: form.embassy_phone.value.trim() || null,
      insurance_phone: form.insurance_phone.value.trim() || null,
      emergency_notes: form.emergency_notes.value.trim() || null,
    }).eq('id', currentTripId);
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    await refreshTripInfo();
  }

  function switchTab(tab) {
    Array.prototype.forEach.call(document.querySelectorAll('.tab-btn'), function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tab-panel'), function (panel) {
      panel.hidden = panel.id !== 'tab-' + tab;
    });
  }

  // ---------------------------------------------------------------
  // VOYAGEURS
  // ---------------------------------------------------------------

  async function loadTravelers() {
    var res = await supabase.from('travelers').select('*').eq('trip_id', currentTripId).order('created_at');
    if (res.error) { console.warn(res.error); return; }
    $('travelersTableBody').innerHTML = (res.data || [])
      .map(function (t) {
        if (t.id === editingTravelerId) {
          return (
            '<tr><td colspan="6">' +
            '<form class="inline traveler-edit-form" data-traveler-id="' + t.id + '">' +
            '<div class="field"><label>Prénom</label><input type="text" name="display_name" required value="' + escapeHtml(t.display_name) + '"></div>' +
            '<div class="field"><label>Identifiant court</label><input type="text" name="owner_slug" required value="' + escapeHtml(t.owner_slug) + '"></div>' +
            '<div class="field"><label>Email</label><input type="email" name="email" value="' + escapeHtml(t.email || '') + '"></div>' +
            '<div class="field"><label>Rôle</label><select name="role">' +
            '<option value="member"' + (t.role === 'member' ? ' selected' : '') + '>Voyageur</option>' +
            '<option value="guide"' + (t.role === 'guide' ? ' selected' : '') + '>Guide</option>' +
            '</select></div>' +
            '<button class="primary" type="submit">Enregistrer</button> ' +
            '<button class="ghost" type="button" data-kind="cancel-edit-traveler">Annuler</button>' +
            '</form></td></tr>'
          );
        }
        var loginStatus = t.user_id ? '✅ Connecté' : (t.email ? '⏳ Invité, en attente' : '—');
        return (
          '<tr><td>' + escapeHtml(t.display_name) + '</td><td>' + escapeHtml(t.owner_slug) + '</td>' +
          '<td>' + escapeHtml(t.email || '') + '</td><td>' +
          (t.role === 'guide' ? 'Guide' : 'Voyageur') + '</td>' +
          '<td>' + loginStatus + '</td>' +
          '<td>' +
          (t.email && !t.user_id
            ? '<button class="ghost" data-email="' + escapeHtml(t.email) + '" data-kind="invite">Envoyer le lien</button> '
            : '') +
          '<button class="ghost" data-id="' + t.id + '" data-kind="edit-traveler">Modifier</button> ' +
          '<button class="danger" data-id="' + t.id + '" data-kind="traveler">Supprimer</button>' +
          '</td></tr>'
        );
      })
      .join('');
    wireDeleteButtons($('travelersTableBody'));
    Array.prototype.forEach.call($('travelersTableBody').querySelectorAll('[data-kind="invite"]'), function (btn) {
      btn.addEventListener('click', function () { sendMagicLink(btn.dataset.email); });
    });
    Array.prototype.forEach.call($('travelersTableBody').querySelectorAll('[data-kind="edit-traveler"]'), function (btn) {
      btn.addEventListener('click', function () { editingTravelerId = btn.dataset.id; loadTravelers(); });
    });
    Array.prototype.forEach.call($('travelersTableBody').querySelectorAll('[data-kind="cancel-edit-traveler"]'), function (btn) {
      btn.addEventListener('click', function () { editingTravelerId = null; loadTravelers(); });
    });
    Array.prototype.forEach.call($('travelersTableBody').querySelectorAll('.traveler-edit-form'), function (form) {
      form.addEventListener('submit', onSaveTraveler);
    });
  }

  async function sendMagicLink(email) {
    var redirectTo = window.location.origin + window.location.pathname.replace(/admin\.html$/, 'index.html');
    var res = await supabase.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirectTo } });
    if (res.error) { alert("Erreur d'envoi : " + res.error.message); return; }
    alert('Lien de connexion envoyé à ' + email + '.');
  }

  async function onAddTraveler(e) {
    e.preventDefault();
    var form = e.target;
    var name = form.display_name.value.trim();
    var slug = form.owner_slug.value.trim() || slugify(name);
    var res = await supabase.from('travelers').insert({
      trip_id: currentTripId,
      display_name: name,
      owner_slug: slug,
      email: form.email.value.trim() || null,
      role: form.role.value,
      avatar_letter: name.charAt(0).toUpperCase(),
    });
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    form.reset();
    await loadTravelers();
  }

  async function onSaveTraveler(e) {
    e.preventDefault();
    var form = e.target;
    var res = await supabase.from('travelers').update({
      display_name: form.display_name.value.trim(),
      owner_slug: form.owner_slug.value.trim(),
      email: form.email.value.trim() || null,
      role: form.role.value,
    }).eq('id', form.dataset.travelerId);
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    editingTravelerId = null;
    await loadTravelers();
  }

  // ---------------------------------------------------------------
  // ITINÉRAIRE (jours + étapes)
  // ---------------------------------------------------------------

  function itemFieldsHtml(defaults) {
    var d = defaults || {};
    var badgesValue = (d.badge_labels || []).join(', ');
    return (
      '<div class="field"><label>Heure</label><input type="time" name="time" required style="width:110px;" value="' + escapeHtml(d.time || '') + '"></div>' +
      '<div class="field"><label>Type</label><select name="item_type">' +
      ['hotel', 'activity', 'restaurant']
        .map(function (t) {
          return '<option value="' + t + '"' + (d.item_type === t ? ' selected' : '') + '>' + TYPE_LABELS[t] + '</option>';
        })
        .join('') +
      '</select></div>' +
      '<div class="field"><label>Titre</label><input type="text" name="title" placeholder="Cadillac Ranch" required value="' + escapeHtml(d.title || '') + '"></div>' +
      '<div class="field"><label>Nom du lieu pour Maps</label><input type="text" name="map_query" placeholder="Cadillac Ranch, Amarillo TX" style="width:200px;" value="' + escapeHtml(d.map_query || '') + '"></div>' +
      '<div class="field"><label>Badges (virgules)</label><input type="text" name="badges" placeholder="Payé ✓, Parking inclus" value="' + escapeHtml(badgesValue) + '"></div>' +
      '<div class="field"><label>' + (d.image_path ? 'Remplacer le visuel' : 'Visuel (optionnel)') + '</label><input type="file" name="image" accept="image/*"></div>'
    );
  }

  async function loadDays() {
    var res = await supabase
      .from('itinerary_days')
      .select('*, itinerary_items(*)')
      .eq('trip_id', currentTripId)
      .order('day_number');
    if (res.error) { console.warn(res.error); return; }

    var container = $('daysContainer');
    container.innerHTML = (res.data || [])
      .map(function (day) {
        var items = (day.itinerary_items || []).slice().sort(function (a, b) { return a.sort_order - b.sort_order; });
        var itemsHtml = items
          .map(function (it) {
            if (it.id === editingItemId) {
              return (
                '<form class="inline item-edit-form" data-item-id="' + it.id + '" style="margin-bottom:10px;">' +
                itemFieldsHtml(it) +
                '<button class="primary" type="submit">Enregistrer</button> ' +
                '<button class="ghost" type="button" data-kind="cancel-edit-item">Annuler</button>' +
                '</form>'
              );
            }
            return (
              '<div class="item-row">' +
              '<div><b>' + (TYPE_LABELS[it.item_type] || it.item_type) + '</b> — ' + escapeHtml(it.title) +
              '<div class="meta">' + escapeHtml(it.time) + (it.image_path ? ' · 🖼️ visuel' : '') + '</div></div>' +
              '<span>' +
              '<button class="ghost" data-id="' + it.id + '" data-kind="edit-item">Modifier</button> ' +
              '<button class="danger" data-id="' + it.id + '" data-kind="item">Supprimer</button>' +
              '</span>' +
              '</div>'
            );
          })
          .join('') || '<p class="meta">Aucune étape pour ce jour.</p>';

        return (
          '<div class="day-block" data-day-id="' + day.id + '">' +
          '<div class="day-head"><h4>Jour ' + day.day_number + (day.location_label ? ' · ' + escapeHtml(day.location_label) : '') + '</h4>' +
          '<button class="danger" data-id="' + day.id + '" data-kind="day">Supprimer le jour</button></div>' +
          itemsHtml +
          '<form class="inline item-form" data-day-id="' + day.id + '" style="margin-top:10px;">' +
          itemFieldsHtml() +
          '<button class="primary" type="submit">Ajouter l\'étape</button>' +
          '</form>' +
          '</div>'
        );
      })
      .join('') || '<p class="meta">Aucun jour pour l\'instant.</p>';

    Array.prototype.forEach.call(container.querySelectorAll('.item-form'), function (form) {
      form.addEventListener('submit', onAddItem);
    });
    Array.prototype.forEach.call(container.querySelectorAll('.item-edit-form'), function (form) {
      form.addEventListener('submit', onSaveItem);
    });
    Array.prototype.forEach.call(container.querySelectorAll('[data-kind="edit-item"]'), function (btn) {
      btn.addEventListener('click', function () { editingItemId = btn.dataset.id; loadDays(); });
    });
    Array.prototype.forEach.call(container.querySelectorAll('[data-kind="cancel-edit-item"]'), function (btn) {
      btn.addEventListener('click', function () { editingItemId = null; loadDays(); });
    });
    wireDeleteButtons(container);
  }

  async function onSaveItem(e) {
    e.preventDefault();
    var form = e.target;
    var itemId = form.dataset.itemId;
    var badges = form.badges.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    var payload = {
      time: form.time.value.trim(),
      item_type: form.item_type.value,
      title: form.title.value.trim(),
      map_query: form.map_query.value.trim() || null,
      badge_labels: badges,
    };

    var file = form.image.files[0];
    if (file) {
      var imagePath = currentTripId + '/' + itemId + '/' + Date.now() + '-' + file.name;
      var uploadRes = await supabase.storage.from('trip-assets').upload(imagePath, file);
      if (uploadRes.error) { alert("Erreur d'envoi du visuel : " + uploadRes.error.message); return; }
      payload.image_path = imagePath;
    }

    var res = await supabase.from('itinerary_items').update(payload).eq('id', itemId);
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    editingItemId = null;
    await loadDays();
  }

  async function onAddDay(e) {
    e.preventDefault();
    var form = e.target;
    var res = await supabase.from('itinerary_days').insert({
      trip_id: currentTripId,
      day_number: Number(form.day_number.value),
      date: form.date.value || null,
      location_label: form.location_label.value.trim() || null,
    });
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    form.reset();
    await loadDays();
  }

  async function onAddItem(e) {
    e.preventDefault();
    var form = e.target;
    var dayId = form.dataset.dayId;
    var badges = form.badges.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    var countRes = await supabase.from('itinerary_items').select('id', { count: 'exact', head: true }).eq('day_id', dayId);
    var sortOrder = (countRes.count || 0) + 1;

    var imagePath = null;
    var file = form.image.files[0];
    if (file) {
      imagePath = currentTripId + '/' + dayId + '/' + Date.now() + '-' + file.name;
      var uploadRes = await supabase.storage.from('trip-assets').upload(imagePath, file);
      if (uploadRes.error) { alert("Erreur d'envoi du visuel : " + uploadRes.error.message); return; }
    }

    var res = await supabase.from('itinerary_items').insert({
      day_id: dayId,
      time: form.time.value.trim(),
      item_type: form.item_type.value,
      title: form.title.value.trim(),
      map_query: form.map_query.value.trim() || null,
      badge_labels: badges,
      image_path: imagePath,
      sort_order: sortOrder,
    });
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    await loadDays();
  }

  // ---------------------------------------------------------------
  // VOLS
  // ---------------------------------------------------------------

  async function loadFlights() {
    var res = await supabase.from('flights').select('*').eq('trip_id', currentTripId).order('sort_order');
    if (res.error) { console.warn(res.error); return; }
    $('flightsTableBody').innerHTML = (res.data || [])
      .map(function (f) {
        return (
          '<tr><td>' + escapeHtml(f.tag) + '</td><td>' + escapeHtml(f.origin_code) + ' → ' + escapeHtml(f.destination_code) + '</td>' +
          '<td>' + escapeHtml(f.schedule_label) + '</td>' +
          '<td><button class="danger" data-id="' + f.id + '" data-kind="flight">Supprimer</button></td></tr>'
        );
      })
      .join('');
    wireDeleteButtons($('flightsTableBody'));
  }

  async function onAddFlight(e) {
    e.preventDefault();
    var form = e.target;
    var countRes = await supabase.from('flights').select('id', { count: 'exact', head: true }).eq('trip_id', currentTripId);
    var res = await supabase.from('flights').insert({
      trip_id: currentTripId,
      tag: form.tag.value.trim(),
      status: form.status.value.trim() || "À l'heure",
      origin_code: form.origin_code.value.trim().toUpperCase(),
      destination_code: form.destination_code.value.trim().toUpperCase(),
      schedule_label: form.schedule_label.value.trim(),
      passenger_name: form.passenger_name.value.trim() || null,
      gate: form.gate.value.trim() || null,
      boarding_time: form.boarding_time.value.trim() || null,
      seat: form.seat.value.trim() || null,
      sort_order: (countRes.count || 0) + 1,
    });
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    form.reset();
    form.status.value = "À l'heure";
    await loadFlights();
  }

  // ---------------------------------------------------------------
  // DOCUMENTS
  // ---------------------------------------------------------------

  async function loadRentalCar() {
    var res = await supabase.from('rental_cars').select('*').eq('trip_id', currentTripId).order('created_at').limit(1).maybeSingle();
    if (res.error) { console.warn(res.error); return; }
    currentRentalCarId = res.data ? res.data.id : null;
    var form = $('rentalCarForm');
    var r = res.data || {};
    form.company.value = r.company || '';
    form.booking_ref.value = r.booking_ref || '';
    form.vehicle_model.value = r.vehicle_model || '';
    form.pickup_date.value = r.pickup_date || '';
    form.pickup_time.value = r.pickup_time || '';
    form.pickup_location.value = r.pickup_location || '';
    form.return_date.value = r.return_date || '';
    form.return_time.value = r.return_time || '';
    form.return_location.value = r.return_location || '';
    form.counter_location.value = r.counter_location || '';
    form.notes.value = r.notes || '';
  }

  async function onSaveRentalCar(e) {
    e.preventDefault();
    var form = e.target;
    var payload = {
      trip_id: currentTripId,
      company: form.company.value.trim() || null,
      booking_ref: form.booking_ref.value.trim() || null,
      vehicle_model: form.vehicle_model.value.trim() || null,
      pickup_date: form.pickup_date.value || null,
      pickup_time: form.pickup_time.value || null,
      pickup_location: form.pickup_location.value.trim() || null,
      return_date: form.return_date.value || null,
      return_time: form.return_time.value || null,
      return_location: form.return_location.value.trim() || null,
      counter_location: form.counter_location.value.trim() || null,
      notes: form.notes.value.trim() || null,
    };
    var res = currentRentalCarId
      ? await supabase.from('rental_cars').update(payload).eq('id', currentRentalCarId)
      : await supabase.from('rental_cars').insert(payload).select().single();
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    if (!currentRentalCarId && res.data) currentRentalCarId = res.data.id;
    alert('Location de véhicule enregistrée.');
  }

  async function loadDocuments() {
    var res = await supabase.from('documents').select('*').eq('trip_id', currentTripId).order('created_at', { ascending: false });
    if (res.error) { console.warn(res.error); return; }
    $('documentsTableBody').innerHTML = (res.data || [])
      .map(function (d) {
        return (
          '<tr><td>' + escapeHtml(d.title) + '</td><td>' + (CATEGORY_LABELS[d.category] || d.category) + '</td>' +
          '<td><button class="danger" data-id="' + d.id + '" data-kind="document">Supprimer</button></td></tr>'
        );
      })
      .join('');
    wireDeleteButtons($('documentsTableBody'));
  }

  async function onAddDocument(e) {
    e.preventDefault();
    var form = e.target;
    var file = form.file.files[0];
    if (!file) return;
    var path = currentTripId + '/' + Date.now() + '-' + file.name;
    var uploadRes = await supabase.storage.from('trip-documents').upload(path, file);
    if (uploadRes.error) { alert('Erreur : ' + uploadRes.error.message); return; }
    var res = await supabase.from('documents').insert({
      trip_id: currentTripId,
      title: form.title.value.trim(),
      category: form.category.value,
      storage_path: path,
    });
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    form.reset();
    await loadDocuments();
  }

  // ---------------------------------------------------------------
  // MESSAGES
  // ---------------------------------------------------------------

  function renderMessages(messages) {
    $('adminMsgThread').innerHTML = (messages || [])
      .map(function (m) {
        return (
          '<div class="msg-bubble ' + m.sender_type + '">' +
          '<div class="who">' + (m.sender_type === 'concierge' ? 'Alexia' : 'Client') + '</div>' +
          escapeHtml(m.body) + '</div>'
        );
      })
      .join('');
    $('adminMsgThread').scrollTop = $('adminMsgThread').scrollHeight;
  }

  async function loadMessages() {
    if (messagesChannel) { supabase.removeChannel(messagesChannel); messagesChannel = null; }
    var res = await supabase.from('messages').select('*').eq('trip_id', currentTripId).order('created_at');
    if (res.error) { console.warn(res.error); return; }
    renderMessages(res.data || []);

    var tripIdAtSubscribe = currentTripId;
    messagesChannel = supabase
      .channel('admin-messages-' + tripIdAtSubscribe)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'trip_id=eq.' + tripIdAtSubscribe },
        async function () {
          var refreshed = await supabase.from('messages').select('*').eq('trip_id', tripIdAtSubscribe).order('created_at');
          if (!refreshed.error) renderMessages(refreshed.data || []);
        }
      )
      .subscribe();
  }

  async function onSendAdminMessage(e) {
    e.preventDefault();
    var input = $('adminChatInput');
    var body = input.value.trim();
    if (!body || !currentTripId) return;
    var res = await supabase.from('messages').insert({
      trip_id: currentTripId,
      sender_type: 'concierge',
      sender_admin_id: currentAdmin.user_id,
      body: body,
    });
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    input.value = '';
    // On rafraîchit tout de suite : ne pas dépendre uniquement du temps
    // réel, qui demande une table déclarée dans la publication Supabase
    // (voir SETUP.md).
    var refreshed = await supabase.from('messages').select('*').eq('trip_id', currentTripId).order('created_at');
    if (!refreshed.error) renderMessages(refreshed.data || []);
  }

  // ---------------------------------------------------------------
  // Suppression générique
  // ---------------------------------------------------------------

  function wireDeleteButtons(scopeEl) {
    Array.prototype.forEach.call(scopeEl.querySelectorAll('button.danger'), function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('Confirmer la suppression ?')) return;
        var table = { traveler: 'travelers', item: 'itinerary_items', day: 'itinerary_days', flight: 'flights', document: 'documents' }[btn.dataset.kind];
        if (!table) return;
        var res = await supabase.from(table).delete().eq('id', btn.dataset.id);
        if (res.error) { alert('Erreur : ' + res.error.message); return; }
        if (table === 'travelers') await loadTravelers();
        else if (table === 'itinerary_items' || table === 'itinerary_days') await loadDays();
        else if (table === 'flights') await loadFlights();
        else if (table === 'documents') await loadDocuments();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
