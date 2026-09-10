// Bouton SOS (écran Urgences) : envoie la position GPS actuelle du
// voyageur, avec le nom du voyage, à un proche choisi par lui-même (SMS
// ou WhatsApp) — utile si le groupe se sépare ou en cas de pépin. Rien
// n'est stocké côté serveur : la position ne quitte l'appareil que dans
// le message que le voyageur choisit lui-même d'envoyer, au contact
// qu'il choisit lui-même dans son propre carnet d'adresses/WhatsApp
// (jamais de numéro de contact demandé ni conservé par l'appli).
window.MyCompanion = window.MyCompanion || {};

(function () {
  // iOS et Android n'acceptent pas le même séparateur pour "sms:" sans
  // destinataire (avant le paramètre body) — voir la doc de chaque OS.
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  var SMS_SEPARATOR = isIOS ? '&' : '?';

  async function buildMessage(trip, statusEl) {
    if (statusEl) statusEl.textContent = 'Récupération de votre position...';
    var pos = window.MyCompanion.getCurrentPosition ? await window.MyCompanion.getCurrentPosition() : null;
    var tripName = (trip && trip.name) || 'mon voyage';
    var text = "Besoin d'aide pendant " + tripName + '.';
    if (pos) {
      text += ' Voici ma position actuelle : https://www.google.com/maps/search/?api=1&query=' +
        pos.lat + ',' + pos.lon;
    } else {
      text += " Impossible de récupérer ma position exacte pour l'instant.";
    }
    if (statusEl) statusEl.textContent = '';
    return text;
  }

  window.MyCompanion.initSos = function (trip) {
    var smsBtn = document.getElementById('sosSmsBtn');
    var waBtn = document.getElementById('sosWhatsappBtn');
    var statusEl = document.getElementById('sosStatus');
    if (!smsBtn || !waBtn) return;

    if (smsBtn.dataset.wired) return;
    smsBtn.dataset.wired = '1';
    waBtn.dataset.wired = '1';

    smsBtn.addEventListener('click', async function () {
      var text = await buildMessage(trip, statusEl);
      window.location.href = 'sms:' + SMS_SEPARATOR + 'body=' + encodeURIComponent(text);
    });

    waBtn.addEventListener('click', async function () {
      var text = await buildMessage(trip, statusEl);
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
  };
})();
