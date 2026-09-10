// Crée le client Supabase à partir de window.MYCOMPANION_CONFIG (voir index.html).
// La clé "anon" est publique par design chez Supabase : la protection des
// données est assurée par les policies Row Level Security (voir
// supabase/migrations/0001_init.sql), pas par le secret de cette clé.
window.MyCompanion = window.MyCompanion || {};

(function () {
  function createClient() {
    var cfg = window.MYCOMPANION_CONFIG;
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  window.MyCompanion.client = createClient();

  // Validation basique avant l'envoi d'un fichier vers Supabase Storage :
  // l'attribut HTML "accept" n'est qu'une suggestion pour le sélecteur de
  // fichiers, pas une vraie barrière — n'importe qui peut toujours
  // sélectionner autre chose. On vérifie ici le type MIME réel (tel que
  // rapporté par le navigateur) et une taille max, avant l'upload.
  window.MyCompanion.validateUpload = function (file, opts) {
    var options = opts || {};
    var maxBytes = options.maxBytes || 15 * 1024 * 1024;
    var allowedPrefixes = options.allowedPrefixes || ['image/'];
    var allowedTypes = options.allowedTypes || [];
    if (!file) return { ok: false, message: 'Aucun fichier sélectionné.' };
    if (file.size > maxBytes) {
      return {
        ok: false,
        message: 'Fichier trop volumineux (max ' + Math.round(maxBytes / (1024 * 1024)) + ' Mo).',
      };
    }
    var type = file.type || '';
    var prefixOk = allowedPrefixes.some(function (p) { return type.indexOf(p) === 0; });
    var typeOk = allowedTypes.indexOf(type) !== -1;
    if (!prefixOk && !typeOk) {
      return { ok: false, message: 'Type de fichier non pris en charge.' };
    }
    return { ok: true };
  };
})();
