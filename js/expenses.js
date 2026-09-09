// Câble le formulaire d'ajout de dépense, l'ajout d'un compagnon de route
// sans compte, et les boutons de suppression de l'écran Frais partagés.
window.MyCompanion = window.MyCompanion || {};

window.MyCompanion.initExpenses = function (tripId, onChange) {
  var form = document.getElementById('expenseForm');
  var listEl = document.getElementById('expensesList');
  var companionLink = document.getElementById('addCompanionLink');
  var companionForm = document.getElementById('addCompanionForm');
  if (!form || form.dataset.wired) return;
  form.dataset.wired = '1';

  if (companionLink && companionForm) {
    companionLink.addEventListener('click', function () {
      companionForm.style.display = companionForm.style.display === 'none' ? 'flex' : 'none';
    });
    companionForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = document.getElementById('companionName').value.trim();
      if (!name) return;
      try {
        await window.MyCompanion.addCompanionTraveler(tripId, name);
        companionForm.reset();
        companionForm.style.display = 'none';
        if (onChange) await onChange();
      } catch (err) {
        console.warn('[MyCompanion] Ajout du compagnon impossible', err);
        alert("Impossible d'ajouter cette personne pour l'instant.");
      }
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var description = document.getElementById('expenseDescription').value.trim();
    var amount = parseFloat(document.getElementById('expenseAmount').value);
    var paidBy = document.getElementById('expensePaidBy').value;
    if (!description || !amount || amount <= 0 || !paidBy) return;

    try {
      await window.MyCompanion.addExpense({ tripId: tripId, description: description, amount: amount, paidBy: paidBy });
      form.reset();
      if (onChange) await onChange();
    } catch (err) {
      console.warn('[MyCompanion] Ajout de dépense impossible', err);
      alert("Impossible d'ajouter cette dépense pour l'instant.");
    }
  });

  if (listEl) {
    listEl.addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-kind="delete-expense"]');
      if (!btn) return;
      if (!confirm('Supprimer cette dépense ?')) return;
      try {
        await window.MyCompanion.deleteExpense(btn.dataset.id);
        if (onChange) await onChange();
      } catch (err) {
        console.warn('[MyCompanion] Suppression de dépense impossible', err);
        alert('Impossible de supprimer cette dépense pour l\'instant.');
      }
    });
  }
};
