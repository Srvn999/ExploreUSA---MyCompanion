// Rappels par notification push avant l'heure prévue d'une étape. Le
// voyageur active/désactive à sa guise (#screen-reminders) ; l'envoi
// effectif est fait côté serveur (supabase/functions/send-itinerary-
// reminders), appelé périodiquement — ce fichier ne fait que gérer
// l'abonnement Web Push du navigateur et les préférences en base.
window.MyCompanion = window.MyCompanion || {};

(function () {
  var currentTraveler = null;

  // Web Push exige la clé VAPID publique encodée en Uint8Array, pas en
  // chaîne — conversion standard depuis le format base64url.
  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function setStatus(text) {
    var el = document.getElementById('reminderStatus');
    if (el) el.textContent = text || '';
  }

  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  async function subscribe() {
    var supabase = window.MyCompanion.client;
    var vapidKey = window.MYCOMPANION_CONFIG && window.MYCOMPANION_CONFIG.vapidPublicKey;
    if (!supabase || !currentTraveler || !vapidKey) return false;

    var permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus("Notifications refusées — vous pouvez les autoriser dans les réglages de votre navigateur/téléphone.");
      return false;
    }

    var registration = await navigator.serviceWorker.ready;
    var subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    var json = subscription.toJSON();

    var res = await supabase.from('push_subscriptions').upsert(
      {
        traveler_id: currentTraveler.id,
        trip_id: currentTraveler.trip_id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'endpoint' }
    );
    if (res.error) {
      console.warn('[MyCompanion] Abonnement push non enregistré', res.error);
      setStatus("Erreur lors de l'activation, réessayez.");
      return false;
    }
    return true;
  }

  async function unsubscribe() {
    var supabase = window.MyCompanion.client;
    if (!supabase) return;
    try {
      var registration = await navigator.serviceWorker.ready;
      var subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
      }
    } catch (err) {
      console.warn('[MyCompanion] Désabonnement push incomplet', err);
    }
  }

  async function savePrefs(enabled, leadMinutes) {
    var supabase = window.MyCompanion.client;
    if (!supabase || !currentTraveler) return;
    // Passe par une fonction RPC dédiée (set_reminder_prefs) plutôt qu'un
    // update direct : un voyageur ne peut modifier que ces deux colonnes
    // sur sa propre ligne, jamais trip_id/role/etc (voir migration 0013).
    var res = await supabase.rpc('set_reminder_prefs', { p_enabled: enabled, p_lead_minutes: leadMinutes });
    if (!res.error) {
      currentTraveler.reminders_enabled = enabled;
      currentTraveler.reminder_lead_minutes = leadMinutes;
    }
  }

  window.MyCompanion.initReminders = function (traveler) {
    currentTraveler = traveler;
    var toggle = document.getElementById('remindersToggle');
    var leadSelect = document.getElementById('reminderLeadSelect');
    if (!toggle || !leadSelect) return;

    if (!supported()) {
      toggle.disabled = true;
      setStatus("Les notifications ne sont pas prises en charge sur ce navigateur/appareil.");
      return;
    }

    toggle.checked = !!traveler.reminders_enabled;
    leadSelect.value = String(traveler.reminder_lead_minutes || 30);
    leadSelect.disabled = !toggle.checked;

    if (toggle.dataset.wired) return;
    toggle.dataset.wired = '1';

    toggle.addEventListener('change', async function () {
      setStatus('');
      if (toggle.checked) {
        toggle.disabled = true;
        var ok = await subscribe();
        toggle.disabled = false;
        if (!ok) { toggle.checked = false; return; }
        await savePrefs(true, Number(leadSelect.value));
        leadSelect.disabled = false;
        setStatus('Rappels activés — vous serez notifié ' + leadSelect.value + ' min avant chaque étape.');
      } else {
        await unsubscribe();
        await savePrefs(false, Number(leadSelect.value));
        leadSelect.disabled = true;
        setStatus('Rappels désactivés.');
      }
    });

    leadSelect.addEventListener('change', async function () {
      await savePrefs(toggle.checked, Number(leadSelect.value));
      if (toggle.checked) setStatus('Rappels activés — vous serez notifié ' + leadSelect.value + ' min avant chaque étape.');
    });
  };
})();
