// Fil de discussion client <-> Alexia, au nom du voyageur connecté
// (résolu par auth.js).
window.MyCompanion = window.MyCompanion || {};

(function () {
  var currentTripId = null;
  var currentTravelerId = null;
  var currentTraveler = null;
  var channel = null;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatMsgTime(iso) {
    try {
      var d = new Date(iso);
      var now = new Date();
      var time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      if (d.toDateString() === now.toDateString()) return time;
      var yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Hier ' + time;
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + time;
    } catch (err) {
      return '';
    }
  }

  function renderMessages(messages) {
    var threadEl = document.getElementById('chatThread');
    if (!threadEl) return;
    threadEl.innerHTML = (messages || [])
      .map(function (m) {
        return (
          '<div class="msg-group ' + m.sender_type + '">' +
          '<div class="msg-bubble ' + m.sender_type + '">' + escapeHtml(m.body) + '</div>' +
          '<span class="msg-time">' + formatMsgTime(m.created_at) + '</span>' +
          '</div>'
        );
      })
      .join('');
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  // Badge "message non lu" (onglet Plus + tuile "Message à Alexia") : pas
  // de statut par message, juste la date du dernier message vu par le
  // voyageur (traveler.last_message_read_at, voir migration 0013).
  function updateUnreadBadge(messages) {
    var lastRead = currentTraveler && currentTraveler.last_message_read_at;
    var unread = (messages || []).some(function (m) {
      return m.sender_type === 'concierge' && (!lastRead || new Date(m.created_at) > new Date(lastRead));
    });
    var navDot = document.getElementById('chatBadgeNav');
    var tileDot = document.getElementById('chatBadgeTile');
    if (navDot) navDot.hidden = !unread;
    if (tileDot) tileDot.hidden = !unread;
  }

  // Appelé quand l'écran Chat s'ouvre (voir showTab() dans index.html) :
  // marque tout comme lu et efface le badge tout de suite, sans attendre
  // la confirmation serveur.
  window.MyCompanion.markChatRead = async function () {
    var supabase = window.MyCompanion.client;
    if (!supabase || !currentTraveler) return;
    var navDot = document.getElementById('chatBadgeNav');
    var tileDot = document.getElementById('chatBadgeTile');
    if (navDot) navDot.hidden = true;
    if (tileDot) tileDot.hidden = true;
    var res = await supabase.rpc('mark_messages_read');
    if (!res.error) currentTraveler.last_message_read_at = new Date().toISOString();
  };

  window.MyCompanion.initChat = async function (tripId, travelerId, traveler) {
    var supabase = window.MyCompanion.client;
    if (!supabase || !tripId || !travelerId) return;

    currentTripId = tripId;
    currentTravelerId = travelerId;
    currentTraveler = traveler || currentTraveler;

    var res = await supabase.from('messages').select('*').eq('trip_id', tripId).order('created_at');
    if (!res.error) {
      renderMessages(res.data || []);
      updateUnreadBadge(res.data || []);
    }

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
        if (!refreshed.error) {
          renderMessages(refreshed.data || []);
          updateUnreadBadge(refreshed.data || []);
        }
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
          if (!refreshed.error) {
            renderMessages(refreshed.data || []);
            // Si l'écran Chat est ouvert au moment où le message arrive,
            // il est vu tout de suite — inutile de le compter en non lu.
            var chatScreenOpen = document.getElementById('screen-chat') &&
              document.getElementById('screen-chat').classList.contains('active');
            if (chatScreenOpen && window.MyCompanion.markChatRead) {
              window.MyCompanion.markChatRead();
            } else {
              updateUnreadBadge(refreshed.data || []);
            }
          }
        }
      )
      .subscribe();
  };
})();
