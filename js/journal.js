// Carnet de voyage (tuile "Carnet de voyage" dans Plus) : notes
// personnelles du voyageur, une par jour d'itinéraire, en complément de
// l'album photo partagé. Privé : chaque voyageur ne voit/modifie que ses
// propres notes, jamais celles d'un autre membre du même voyage (RLS,
// voir supabase/migrations/0016_journal.sql). Chargé à la demande à
// l'ouverture de l'écran seulement, pas au chargement du voyage — ce
// sont des notes qu'un voyageur peut ne jamais utiliser.
window.MyCompanion = window.MyCompanion || {};

(function () {
  var ctx = { tripId: null, travelerId: null, days: [] };

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.MyCompanion.setJournalContext = function (tripId, travelerId, days) {
    ctx.tripId = tripId;
    ctx.travelerId = travelerId;
    ctx.days = days || [];
  };

  function renderJournal(entries) {
    var listEl = document.getElementById('journalList');
    if (!listEl) return;

    var sorted = ctx.days.slice().sort(function (a, b) { return a.day_number - b.day_number; });
    if (!sorted.length) {
      listEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Aucune étape pour l\'instant.</p>';
      return;
    }

    var byDayId = {};
    (entries || []).forEach(function (e) { byDayId[e.day_id] = e; });

    listEl.innerHTML = sorted
      .map(function (d) {
        var entry = byDayId[d.id];
        return (
          '<div class="journal-card" data-day-id="' + d.id + '">' +
          '<h4>Jour ' + d.day_number + (d.location_label ? ' · ' + esc(d.location_label) : '') + '</h4>' +
          '<textarea class="journal-textarea" placeholder="Vos notes pour cette journée...">' +
          esc(entry ? entry.body : '') + '</textarea>' +
          '<div class="journal-actions">' +
          '<button type="button" class="journal-save-btn" disabled>Enregistrer</button>' +
          '<span class="journal-status"></span>' +
          '</div></div>'
        );
      })
      .join('');
  }

  function wireJournalList() {
    var listEl = document.getElementById('journalList');
    if (!listEl || listEl.dataset.wired) return;
    listEl.dataset.wired = '1';

    listEl.addEventListener('input', function (e) {
      var textarea = e.target.closest('.journal-textarea');
      if (!textarea) return;
      var card = textarea.closest('.journal-card');
      var btn = card.querySelector('.journal-save-btn');
      if (btn) btn.disabled = false;
      var status = card.querySelector('.journal-status');
      if (status) status.textContent = '';
    });

    listEl.addEventListener('click', async function (e) {
      var btn = e.target.closest('.journal-save-btn');
      if (!btn) return;
      var card = btn.closest('.journal-card');
      var textarea = card.querySelector('.journal-textarea');
      var status = card.querySelector('.journal-status');
      var supabase = window.MyCompanion.client;
      if (!supabase || !ctx.tripId || !ctx.travelerId) return;

      btn.disabled = true;
      if (status) status.textContent = 'Enregistrement...';
      var res = await supabase.from('journal_entries').upsert(
        {
          trip_id: ctx.tripId,
          traveler_id: ctx.travelerId,
          day_id: card.dataset.dayId,
          body: textarea.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'traveler_id,day_id' }
      );
      if (res.error) {
        console.warn('[MyCompanion] Enregistrement du carnet impossible', res.error);
        if (status) status.textContent = 'Erreur, réessayez.';
        btn.disabled = false;
        return;
      }
      if (status) status.textContent = 'Enregistré ✓';
    });
  }

  window.MyCompanion.openJournal = async function () {
    wireJournalList();
    var listEl = document.getElementById('journalList');
    if (listEl) listEl.innerHTML = '<p style="color:#8a8470;font-size:13px;">Chargement...</p>';

    var supabase = window.MyCompanion.client;
    if (!supabase || !ctx.tripId || !ctx.travelerId) { renderJournal([]); return; }

    var res = await supabase
      .from('journal_entries')
      .select('*')
      .eq('trip_id', ctx.tripId)
      .eq('traveler_id', ctx.travelerId);
    if (res.error) {
      console.warn('[MyCompanion] Chargement du carnet impossible', res.error);
      renderJournal([]);
      return;
    }
    renderJournal(res.data || []);
  };
})();
