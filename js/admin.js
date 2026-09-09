// Espace admin (Alexia) : gestion des voyages, itinéraire, vols,
// documents et messagerie. Toute la sécurité est appliquée côté base
// (RLS, voir supabase/migrations/0003_admin_and_messages.sql) — ce
// fichier ne fait que lire/écrire via le client Supabase.
(function () {
  var supabase = null;
  var currentAdmin = null; // { user_id, display_name }
  var currentTripId = null;
  var currentTrip = null;
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
    $('travelerForm').addEventListener('submit', onAddTraveler);
    $('dayForm').addEventListener('submit', onAddDay);
    $('flightForm').addEventListener('submit', onAddFlight);
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
      el.addEventListener('click', function () { selectTrip(el.dataset.tripId, res.data); });
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
    selectTrip(res.data.id, [res.data]);
  }

  function selectTrip(tripId, tripsCache) {
    currentTripId = tripId;
    Array.prototype.forEach.call(document.querySelectorAll('.trip-item'), function (el) {
      el.classList.toggle('active', el.dataset.tripId === tripId);
    });
    var trip = (tripsCache || []).find(function (t) { return t.id === tripId; });
    currentTrip = trip || null;
    $('noTripSelected').hidden = true;
    $('tripEditor').hidden = false;
    $('tripTitle').textContent = trip ? trip.name : 'Voyage';
    $('tripSub').textContent = trip
      ? [trip.destination, trip.start_date, trip.end_date].filter(Boolean).join(' · ')
      : '';

    var dayDateInput = $('dayForm').date;
    dayDateInput.min = trip && trip.start_date ? trip.start_date : '';
    dayDateInput.max = trip && trip.end_date ? trip.end_date : '';

    switchTab('voyageurs');
    loadTravelers();
    loadDays();
    loadFlights();
    loadDocuments();
    loadMessages();
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
        return (
          '<tr><td>' + escapeHtml(t.display_name) + '</td><td>' + escapeHtml(t.owner_slug) + '</td><td>' +
          (t.role === 'guide' ? 'Guide' : 'Voyageur') + '</td>' +
          '<td><button class="danger" data-id="' + t.id + '" data-kind="traveler">Supprimer</button></td></tr>'
        );
      })
      .join('');
    wireDeleteButtons($('travelersTableBody'));
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
      role: form.role.value,
      avatar_letter: name.charAt(0).toUpperCase(),
    });
    if (res.error) { alert('Erreur : ' + res.error.message); return; }
    form.reset();
    await loadTravelers();
  }

  // ---------------------------------------------------------------
  // ITINÉRAIRE (jours + étapes)
  // ---------------------------------------------------------------

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
            return (
              '<div class="item-row">' +
              '<div><b>' + (TYPE_LABELS[it.item_type] || it.item_type) + '</b> — ' + escapeHtml(it.title) +
              '<div class="meta">' + escapeHtml(it.time) + (it.image_path ? ' · 🖼️ visuel' : '') + '</div></div>' +
              '<button class="danger" data-id="' + it.id + '" data-kind="item">Supprimer</button>' +
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
          '<div class="field"><label>Heure</label><input type="time" name="time" required style="width:110px;"></div>' +
          '<div class="field"><label>Type</label><select name="item_type">' +
          '<option value="hotel">Hôtel</option><option value="activity">Activité</option><option value="restaurant">Restaurant</option>' +
          '</select></div>' +
          '<div class="field"><label>Titre</label><input type="text" name="title" placeholder="Cadillac Ranch" required></div>' +
          '<div class="field"><label>Nom du lieu pour Maps</label><input type="text" name="map_query" placeholder="Cadillac Ranch, Amarillo TX" style="width:200px;"></div>' +
          '<div class="field"><label>Badges (virgules)</label><input type="text" name="badges" placeholder="Payé ✓, Parking inclus"></div>' +
          '<div class="field"><label>Visuel (optionnel)</label><input type="file" name="image" accept="image/*"></div>' +
          '<button class="primary" type="submit">Ajouter l\'étape</button>' +
          '</form>' +
          '</div>'
        );
      })
      .join('') || '<p class="meta">Aucun jour pour l\'instant.</p>';

    Array.prototype.forEach.call(container.querySelectorAll('.item-form'), function (form) {
      form.addEventListener('submit', onAddItem);
    });
    wireDeleteButtons(container);
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
