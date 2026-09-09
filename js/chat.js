// Fil de discussion client <-> Alexia. Tant que la connexion par
// voyageur (voir ROADMAP.md) n'existe pas, on envoie les messages au nom
// du premier voyageur "zoe" du voyage démo — la policy RLS temporaire de
// 0003_admin_and_messages.sql n'autorise d'ailleurs que ça pour l'instant.
window.MyCompanion = window.MyCompanion || {};

(function () {
  var currentTripId = null;
  var currentTravelerId = null;
  var channel = null;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderMessages(messages) {
    var threadEl = document.getElementById('chatThread');
    if (!threadEl) return;
    threadEl.innerHTML = (messages || [])
      .map(function (m) {
        return '<div class="msg-bubble ' + m.sender_type + '">' + escapeHtml(m.body) + '</div>';
      })
      .join('');
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  window.MyCompanion.initChat = async function (tripId, travelers) {
    var supabase = window.MyCompanion.client;
    if (!supabase || !tripId) return;

    var me = (travelers || []).find(function (t) { return t.owner_slug === 'zoe'; });
    if (!me) return;
    currentTripId = tripId;
    currentTravelerId = me.id;

    var res = await supabase.from('messages').select('*').eq('trip_id', tripId).order('created_at');
    if (!res.error) renderMessages(res.data || []);

    var form = document.getElementById('chatForm');
    var input = document.getElementById('chatInput');
    if (form && !form.dataset.wired) {
      form.dataset.wired = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var body = input.value.trim();
        if (!body) return;
        var insertRes = await supabase.from('messages').insert({
          trip_id: currentTripId,
          sender_type: 'traveler',
          sender_traveler_id: currentTravelerId,
          body: body,
        });
        if (insertRes.error) {
          console.warn('[MyCompanion] Envoi du message impossible', insertRes.error);
          return;
        }
        input.value = '';
        // Rafraîchit tout de suite : ne pas dépendre uniquement du canal
        // temps réel pour voir son propre message apparaître.
        var refreshed = await supabase.from('messages').select('*').eq('trip_id', currentTripId).order('created_at');
        if (!refreshed.error) renderMessages(refreshed.data || []);
      });
    }

    if (channel) supabase.removeChannel(channel);
    channel = supabase
      .channel('client-messages-' + tripId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'trip_id=eq.' + tripId },
        async function () {
          var refreshed = await supabase.from('messages').select('*').eq('trip_id', tripId).order('created_at');
          if (!refreshed.error) renderMessages(refreshed.data || []);
        }
      )
      .subscribe();
  };
})();
