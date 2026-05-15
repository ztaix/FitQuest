/**
 * Branche les contrôles du panneau admin (liste, export/import, reset).
 * @param {object} deps
 * @param {() => void} deps.getRenderAdmin — ré-invoke le rendu admin complet (évite cycle avec adminForms)
 */
export function createBindAdminListeners(deps) {
  const {
    $,
    getState,
    showToast,
    saveState,
    resetState,
    replaceStoredSave,
    adminForms,
    adminActions,
    getRenderAdmin,
  } = deps;

  return function bindAdminListeners() {
    $('adminContent').querySelectorAll('[data-action]').forEach((b) => {
      b.addEventListener('click', () => {
        const action = b.dataset.action;
        if (action === 'add') {
          adminForms.openAdminEdit(b.dataset.type, null);
        } else if (action === 'edit') {
          adminForms.openAdminEdit(b.dataset.type, b.dataset.id);
        } else if (action === 'delete') {
          if (!confirm('Supprimer cet élément ?')) return;
          adminActions.deleteCustom(b.dataset.type, b.dataset.id);
          getRenderAdmin()();
        } else if (action === 'toggle') {
          adminActions.toggleDisabled(b.dataset.id);
          getRenderAdmin()();
        } else if (action === 'reset-override') {
          if (!confirm('Réinitialiser cet élément aux valeurs de base ?')) return;
          const state = getState();
          if (state?.player?.custom?.overrides) {
            delete state.player.custom.overrides[b.dataset.id];
            saveState();
            getRenderAdmin()();
            showToast('↩ Valeurs d\'origine restaurées');
          }
        } else if (action === 'add-recipe') {
          adminForms.openRecipeEdit(b.dataset.recipeType);
        } else if (action === 'delete-recipe') {
          if (!confirm('Supprimer cette recette ?')) return;
          const t = b.dataset.recipeType;
          const i = parseInt(b.dataset.idx, 10);
          getState().player.custom[t].splice(i, 1);
          saveState();
          getRenderAdmin()();
        }
      });
    });

    if ($('exportArea')) {
      $('exportArea').value = JSON.stringify(getState(), null, 2);
      $('btnDoExport').addEventListener('click', () => {
        const txt = $('exportArea').value;
        navigator.clipboard.writeText(txt).then(() => showToast('📋 Copié au presse-papier')).catch(() => {
          $('exportArea').select();
          showToast('⚠ Sélectionne et copie manuellement');
        });
      });
      $('btnDoImport').addEventListener('click', () => {
        const txt = $('importArea').value.trim();
        if (!txt) {
          showToast('⚠ Colle un JSON d\'abord');
          return;
        }
        try {
          const parsed = JSON.parse(txt);
          if (!parsed.player) {
            throw new Error('Format invalide');
          }
          if (!confirm('Remplacer toute ta progression par ce JSON ?')) return;
          replaceStoredSave(parsed);
          location.reload();
        } catch (e) {
          showToast('⚠ JSON invalide');
        }
      });
      $('btnResetCustom').addEventListener('click', () => {
        if (!confirm('Effacer tout le contenu custom ? La progression sera gardée.')) return;
        getState().player.custom = {
          zones: [],
          exercises: [],
          bosses: [],
          equipment: [],
          materials: [],
          ingredients: [],
          blacksmith: [],
          witch: [],
          spells: [],
          disabledIds: [],
          overrides: {},
        };
        saveState();
        getRenderAdmin()();
        showToast('\u2713 Custom effac\u00e9');
      });
      $('btnResetFull').addEventListener('click', () => {
        if (!confirm('Effacer TOUTE la progression et tout le custom ?')) return;
        resetState();
        location.reload();
      });
    }
  };
}
