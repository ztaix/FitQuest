import { GAME_DATA } from '../data/gameData.js';
import { RARITY_COLORS, TYPE_LABEL, SLOT_LABEL } from '../data/constants.js';
import { ELEMENTS } from '../data/elements.js';
import { uiCtx } from './renderContext.js';

export function adminListHtml(type, items, metaFn, defaultIcon) {
  const html = items
    .map((item) => {
      const builtin = uiCtx.isBuiltIn(item.id, type);
      const disabled = uiCtx.isEntryDisabled(item.id);
      let iconHtml = defaultIcon;
      if (item.icon) {
        const c = RARITY_COLORS[item.rarity] || '#fff';
        iconHtml = `<img src="${uiCtx.iconUrl(item.icon, c)}" alt="" onerror="this.outerHTML='${defaultIcon}'">`;
      }
      const hasOverride = !!uiCtx.getState()?.player?.custom?.overrides?.[item.id];
      const builtinActions = `<button data-action="edit" data-type="${type}" data-id="${item.id}" title="Modifier">&#x270F;</button><button data-action="toggle" data-type="${type}" data-id="${item.id}" title="${disabled ? 'Activer' : 'Desactiver'}">${disabled ? '&#x25B6;' : '&#x23F8;'}</button>${hasOverride ? `<button data-action="reset-override" data-type="${type}" data-id="${item.id}" class="danger" title="Reinitialiser">&#x21A9;</button>` : ''}`;
      return `<div class="admin-list-item ${builtin ? 'builtin' : ''} ${disabled ? 'disabled' : ''} ${hasOverride ? 'overridden' : ''}"><div class="alist-icon">${iconHtml}</div><div class="alist-info"><div class="alist-name">${item.name || item.id}${builtin ? ' <small style="color:var(--text-faint);">(de base)</small>' : ''}${hasOverride ? ' <small style="color:#7DD3FC;">modifie</small>' : ''}</div><div class="alist-meta">${metaFn(item)}</div></div><div class="alist-actions">${builtin ? builtinActions : `<button data-action="edit" data-type="${type}" data-id="${item.id}">&#x270F;</button><button data-action="delete" data-type="${type}" data-id="${item.id}" class="danger">&#x1F5D1;</button>`}</div></div>`;
    })
    .join('');
  return `<button class="admin-add-btn" data-action="add" data-type="${type}">+ Ajouter</button>${html || '<div class="empty-state">Aucun element.</div>'}`;
}

export function renderRecipesAdmin() {
  const bs = uiCtx.allBlacksmithRecipes();
  const ws = uiCtx.allWitchRecipes();
  const bsHtml = bs
    .map((r, i) => {
      const w = uiCtx.allEquipment().find((x) => x.id === r.weaponId);
      const builtin = i < GAME_DATA.recipes_blacksmith.length;
      const matsTxt = r.materials
        .map((m) => {
          const mat = uiCtx.allMaterials().find((x) => x.id === m.id);
          return `${m.qty}x ${mat ? mat.name : m.id}`;
        })
        .join(', ');
      return `<div class="admin-list-item ${builtin ? 'builtin' : ''}"><div class="alist-icon">&#x2692;</div><div class="alist-info"><div class="alist-name">${w ? w.name : r.weaponId}${builtin ? ' <small style="color:var(--text-faint);">(de base)</small>' : ''}</div><div class="alist-meta">${matsTxt} &middot; ${r.gold || 0} or</div></div><div class="alist-actions">${builtin ? '' : `<button data-action="delete-recipe" data-recipe-type="blacksmith" data-idx="${i - GAME_DATA.recipes_blacksmith.length}" class="danger">&#x1F5D1;</button>`}</div></div>`;
    })
    .join('');
  const wsHtml = ws
    .map((r, i) => {
      const builtin = i < GAME_DATA.recipes_witch.length;
      const ingTxt = r.ingredients
        .map((m) => {
          const ing = uiCtx.allIngredients().find((x) => x.id === m.id);
          return `${m.qty}x ${ing ? ing.name : m.id}`;
        })
        .join(', ');
      return `<div class="admin-list-item ${builtin ? 'builtin' : ''}"><div class="alist-icon">&#x1F9D9;</div><div class="alist-info"><div class="alist-name">${r.name || r.id}${builtin ? ' <small style="color:var(--text-faint);">(de base)</small>' : ''}</div><div class="alist-meta">${ingTxt} &middot; ${r.gold || 0} or</div></div><div class="alist-actions">${builtin ? '' : `<button data-action="delete-recipe" data-recipe-type="witch" data-idx="${i - GAME_DATA.recipes_witch.length}" class="danger">&#x1F5D1;</button>`}</div></div>`;
    })
    .join('');
  return `<div class="section-label"><span>&#x2692; Recettes Forgeron</span></div><button class="admin-add-btn" data-action="add-recipe" data-recipe-type="blacksmith">+ Ajouter recette Forgeron</button>${bsHtml}<div class="section-label" style="margin-top:16px;"><span>&#x1F9D9; Recettes Sorciere</span></div><button class="admin-add-btn" data-action="add-recipe" data-recipe-type="witch">+ Ajouter recette Sorciere</button>${wsHtml}`;
}

export function renderDataAdmin() {
  return `
    <div class="section-label"><span>&#x1F4BE; Sauvegarde</span></div>
    <p style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Exporte tout (progression + contenu custom) en JSON. Tu peux le copier dans un fichier pour le sauvegarder ailleurs.</p>
    <textarea class="export-area" id="exportArea" readonly></textarea>
    <button class="admin-add-btn" id="btnDoExport" style="margin-top:8px;">&#x1F4CB; Copier au presse-papier</button>
    <div class="section-label" style="margin-top:16px;"><span>&#x1F4E5; Import</span></div>
    <p style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Colle un JSON exporte precedemment pour restaurer.</p>
    <textarea class="export-area" id="importArea" placeholder="Colle ton JSON ici..."></textarea>
    <button class="admin-add-btn" id="btnDoImport" style="background:linear-gradient(135deg,#1d4ed8 0%,var(--rarity-rare) 100%);margin-top:8px;">&#x2B06; Importer</button>
    <div class="section-label" style="margin-top:16px;"><span>&#x26A0; Reset</span></div>
    <button class="admin-add-btn" id="btnResetCustom" style="background:linear-gradient(135deg,#7f1d1d 0%,var(--blood-bright) 100%);">&#x1F5D1; Reinitialiser uniquement le contenu custom</button>
    <button class="admin-add-btn" id="btnResetFull" style="background:linear-gradient(135deg,#7f1d1d 0%,var(--blood-bright) 100%);margin-top:8px;">&#x26A0; Reinitialiser TOUT (progression + custom)</button>
  `;
}

export function renderAdminPanel() {
  const $ = uiCtx.$;
  document.querySelectorAll('.admin-tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.admintab === uiCtx.adminUi.activeTab)
  );
  const c = $('adminContent');
  c.innerHTML = '';
  try {
    const tab = uiCtx.adminUi.activeTab;
    if (tab === 'zones') c.innerHTML = adminListHtml('zones', uiCtx.allZones(), (z) => `Niveau ${z.levelMin}-${z.levelMax} - Entree niv.${z.requiredLevel}`, '&#x1F5FA;');
    else if (tab === 'exercises')
      c.innerHTML = adminListHtml(
        'exercises',
        uiCtx.allExercises(),
        (e) => `${TYPE_LABEL[e.type] || '?'} - ${e.baseDamage} deg - ${e.unit === 'seconds' ? 'sec' : 'reps'}`,
        '&#x1F4AA;'
      );
    else if (tab === 'bosses')
      c.innerHTML = adminListHtml(
        'bosses',
        uiCtx.allBosses(),
        (b) =>
          `Niv.${b.level} - ${uiCtx.rarityLabel(b.rarity)} - ${TYPE_LABEL[b.type] || '?'} - ${b.region || '-'}${b.isRegionalBoss ? ' &#x2B50;' : ''}`,
        '&#x1F409;'
      );
    else if (tab === 'equipment')
      c.innerHTML = adminListHtml(
        'equipment',
        uiCtx.allEquipment(),
        (w) =>
          `${uiCtx.rarityLabel(w.rarity)} - ${SLOT_LABEL[w.slot] || '?'} - ${Object.entries(w.stats || {})
            .map(([k, v]) => '+' + v + ' ' + k.charAt(0).toUpperCase())
            .join(', ')}`,
        '&#x2694;'
      );
    else if (tab === 'materials')
      c.innerHTML = adminListHtml('materials', uiCtx.allMaterials(), (m) => `${uiCtx.rarityLabel(m.rarity)} - ${m.desc || ''}`, '&#x1FAB5;');
    else if (tab === 'ingredients')
      c.innerHTML = adminListHtml('ingredients', uiCtx.allIngredients(), (m) => `${uiCtx.rarityLabel(m.rarity)} - ${m.desc || ''}`, '&#x1F33F;');
    else if (tab === 'spells')
      c.innerHTML = adminListHtml(
        'spells',
        uiCtx.allSpells(),
        (s) => `${ELEMENTS[s.element] ? ELEMENTS[s.element].icon : ''} ${s.element || ''} - ${s.manaCost} MP - ${s.effect}`,
        '&#x1FA84;'
      );
    else if (tab === 'recipes') c.innerHTML = renderRecipesAdmin();
    else if (tab === 'data') c.innerHTML = renderDataAdmin();
  } catch (e) {
    console.error('Admin render error:', e);
    c.innerHTML =
      '<div style="color:var(--blood-bright);padding:20px;text-align:center;background:rgba(196,30,58,0.1);border:1px solid var(--blood);border-radius:8px;">&#x26A0; Erreur de rendu : ' +
      (e.message || e) +
      '<br><small>Voir la console pour plus de details.</small></div>';
  }
}

