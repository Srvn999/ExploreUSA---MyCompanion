// Checklist voyage (tuile "Checklist voyage" dans Plus) : avant le
// départ / avant le retour, personnalisable (ajout/suppression libres).
// Purement locale à l'appareil (localStorage, clé par voyageur) — pas de
// table Supabase : une checklist n'a pas besoin de se synchroniser entre
// appareils, et son contenu ne regarde qu'un seul voyageur.
window.MyCompanion = window.MyCompanion || {};

(function () {
  // Repères généraux et non spécifiques à un prestataire précis (pas de
  // procédure propre à une compagnie/agence) — à cocher, modifier ou
  // supprimer librement, ce ne sont que des suggestions de départ.
  var DEFAULT_ITEMS = {
    depart: [
      'Passeport valide (6 mois après la date de retour)',
      'ESTA approuvé',
      'Assurance voyage souscrite',
      "Billets d'avion / e-tickets à portée de main",
      'Réservations (hôtels, voiture de location) imprimées ou sur le téléphone',
      'Adaptateur de prise électrique US',
      "Banque prévenue d'un usage de la carte à l'étranger",
      'Photocopie/photo des papiers importants',
    ],
    retour: [
      "Vérifier le poids des bagages avant l'aéroport",
      'Restituer la voiture de location',
      'Déclarer les achats si la franchise douanière est dépassée',
      "Confirmer l'horaire d'enregistrement du vol retour",
      "Récupérer les objets laissés dans un coffre d'hôtel",
    ],
  };

  var travelerId = null;
  var state = null;

  function storageKey() {
    return 'mc_checklist_' + (travelerId || 'anon');
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(state));
    } catch (err) {
      // Stockage indisponible (navigation privée, quota...) : tant pis,
      // la session en cours fonctionne quand même.
    }
  }

  function defaultState() {
    function mk(items) {
      return items.map(function (text) { return { text: text, checked: false }; });
    }
    return { depart: mk(DEFAULT_ITEMS.depart), retour: mk(DEFAULT_ITEMS.retour) };
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderSection(key, containerId) {
    var listEl = document.getElementById(containerId);
    if (!listEl) return;
    var items = state[key] || [];
    listEl.innerHTML = items
      .map(function (item, i) {
        return (
          '<label class="checklist-item' + (item.checked ? ' checked' : '') + '">' +
          '<input type="checkbox" data-section="' + key + '" data-index="' + i + '"' + (item.checked ? ' checked' : '') + '>' +
          '<span>' + esc(item.text) + '</span>' +
          '<button type="button" class="checklist-remove" data-section="' + key + '" data-index="' + i + '" aria-label="Supprimer">×</button>' +
          '</label>'
        );
      })
      .join('') || '<p style="color:#8a8470;font-size:13px;">Rien ici pour l\'instant.</p>';
  }

  function render() {
    renderSection('depart', 'checklistDepartList');
    renderSection('retour', 'checklistRetourList');
  }

  function wire() {
    ['checklistDepartList', 'checklistRetourList'].forEach(function (id) {
      var listEl = document.getElementById(id);
      if (!listEl || listEl.dataset.wired) return;
      listEl.dataset.wired = '1';

      listEl.addEventListener('change', function (e) {
        var input = e.target.closest('input[type="checkbox"]');
        if (!input) return;
        state[input.dataset.section][Number(input.dataset.index)].checked = input.checked;
        saveState();
        render();
      });

      listEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.checklist-remove');
        if (!btn) return;
        state[btn.dataset.section].splice(Number(btn.dataset.index), 1);
        saveState();
        render();
      });
    });

    [
      { key: 'depart', formId: 'checklistDepartAddForm' },
      { key: 'retour', formId: 'checklistRetourAddForm' },
    ].forEach(function (entry) {
      var form = document.getElementById(entry.formId);
      if (!form || form.dataset.wired) return;
      form.dataset.wired = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[type="text"]');
        var text = input.value.trim();
        if (!text) return;
        state[entry.key].push({ text: text, checked: false });
        saveState();
        input.value = '';
        render();
      });
    });
  }

  window.MyCompanion.openChecklist = function (traveler) {
    travelerId = traveler ? traveler.id : 'anon';
    state = loadState() || defaultState();
    wire();
    render();
  };
})();
