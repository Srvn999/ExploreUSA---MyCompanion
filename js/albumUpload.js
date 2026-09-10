// Branche les boutons "Depuis la galerie" / "Prendre une photo" de
// l'album sur un vrai envoi vers Supabase Storage (window.MyCompanion.uploadPhoto,
// voir data.js).
window.MyCompanion = window.MyCompanion || {};

window.MyCompanion.initAlbumUpload = function (tripId, travelerId, days, onUploaded) {
  var galleryInput = document.getElementById('galleryInput');
  var cameraInput = document.getElementById('cameraInput');
  var galleryBtn = document.getElementById('fabGalleryBtn');
  var cameraBtn = document.getElementById('fabCameraBtn');
  var fabPanel = document.getElementById('fabPanel');
  if (!galleryInput || !cameraInput || galleryInput.dataset.wired) return;
  galleryInput.dataset.wired = '1';

  function pickDayId() {
    var today = new Date().toISOString().slice(0, 10);
    var match = (days || []).find(function (d) { return d.date === today; });
    return match ? match.id : null;
  }

  async function handleFile(file) {
    if (!file) return;
    if (fabPanel) fabPanel.classList.remove('show');
    var check = window.MyCompanion.validateUpload(file, { maxBytes: 15 * 1024 * 1024, allowedPrefixes: ['image/'] });
    if (!check.ok) {
      alert(check.message);
      return;
    }
    try {
      await window.MyCompanion.uploadPhoto({
        tripId: tripId,
        travelerId: travelerId,
        dayId: pickDayId(),
        file: file,
      });
      if (onUploaded) await onUploaded();
    } catch (err) {
      console.warn('[MyCompanion] Envoi de la photo impossible', err);
      alert("Impossible d'envoyer cette photo pour l'instant. Réessaie plus tard.");
    }
  }

  if (galleryBtn) galleryBtn.addEventListener('click', function () { galleryInput.click(); });
  if (cameraBtn) cameraBtn.addEventListener('click', function () { cameraInput.click(); });

  galleryInput.addEventListener('change', function () {
    handleFile(this.files[0]);
    this.value = '';
  });
  cameraInput.addEventListener('change', function () {
    handleFile(this.files[0]);
    this.value = '';
  });
};
