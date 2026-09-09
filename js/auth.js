// Connexion par voyageur (lien magique). Tant que personne n'est
// connecté, l'écran de connexion (#authGate) reste affiché par-dessus
// l'appli. Une fois connecté, on "réclame" la ligne `travelers` qui
// porte le même email (voir supabase/migrations/0005_traveler_login.sql).
window.MyCompanion = window.MyCompanion || {};

(function () {
  var resolvedTraveler = null;

  function showGate(message) {
    var gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'flex';
    var msgEl = document.getElementById('authMessage');
    if (msgEl) msgEl.textContent = message || '';
  }

  function hideGate() {
    var gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'none';
  }

  async function resolveTraveler(supabase, user) {
    var mine = await supabase.from('travelers').select('*').eq('user_id', user.id).maybeSingle();
    if (mine.data) return mine.data;

    var claim = await supabase
      .from('travelers')
      .update({ user_id: user.id })
      .ilike('email', user.email) // insensible à la casse : évite un email
      // "Zoe@Email.com" saisi dans l'admin qui ne matcherait pas
      // "zoe@email.com" tel que Supabase Auth le normalise
      .is('user_id', null)
      .select()
      .maybeSingle();
    return claim.data || null;
  }

  window.MyCompanion.getCurrentTraveler = function () {
    return resolvedTraveler;
  };

  window.MyCompanion.signOut = async function () {
    var supabase = window.MyCompanion.client;
    if (supabase) await supabase.auth.signOut();
    location.reload();
  };

  // onReady(traveler) est appelé à chaque évaluation : avec un objet
  // voyageur si tout va bien, ou avec null si l'écran de connexion doit
  // rester affiché (pas de session, ou email non invité).
  window.MyCompanion.initAuth = async function (onReady) {
    var supabase = window.MyCompanion.client;
    var gate = document.getElementById('authGate');
    if (!supabase || !gate) {
      onReady(null);
      return;
    }

    var form = document.getElementById('authForm');
    if (form && !form.dataset.wired) {
      form.dataset.wired = '1';
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var email = document.getElementById('authEmail').value.trim();
        var redirectTo = window.location.origin + window.location.pathname;
        var res = await supabase.auth.signInWithOtp({
          email: email,
          options: { emailRedirectTo: redirectTo },
        });
        var msgEl = document.getElementById('authMessage');
        msgEl.textContent = res.error
          ? 'Erreur : ' + res.error.message
          : 'Lien envoyé ! Ouvrez votre boîte mail (sur cet appareil) et cliquez dessus.';
      });
    }

    async function evaluate() {
      var sessionRes = await supabase.auth.getSession();
      var session = sessionRes.data.session;
      if (!session) {
        resolvedTraveler = null;
        showGate();
        onReady(null);
        return;
      }

      var traveler = await resolveTraveler(supabase, session.user);
      if (!traveler) {
        resolvedTraveler = null;
        showGate("Aucun voyage associé à cet email pour l'instant. Contactez votre conciergerie.");
        onReady(null);
        return;
      }

      resolvedTraveler = traveler;
      hideGate();
      onReady(traveler);
    }

    supabase.auth.onAuthStateChange(function () {
      evaluate();
    });
    await evaluate();
  };
})();
