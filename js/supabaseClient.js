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
})();
