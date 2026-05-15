import {
  RARITY_COLORS,
  FALLBACK_WEAPON,
  FALLBACK_MAT,
  FALLBACK_ING,
  RARITY_VALUE,
  RARITY_ORDER,
  UPGRADE_COST,
  SLOT_LABEL,
  POTION_PRICE,
  SELL_MATERIAL,
  SELL_INGREDIENT,
  MAX_COMB_LEVEL,
} from '../data/constants.js';
import { getEffectiveStats } from '../core/progression.js';
import { uiCtx } from './renderContext.js';
import { limits } from '../data/limits.js';

export function renderInventoryView() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  $('invGold').textContent = state.player.gold;
  $('invPotions').textContent = state.player.potions;
  document.querySelectorAll('#viewInventory .tab[data-tab]').forEach((t) =>
    t.classList.toggle('active', t.dataset.tab === uiCtx.inventoryUi.activeInvTab)
  );
  $('tabInventory').style.display = uiCtx.inventoryUi.activeInvTab === 'inventory' ? 'block' : 'none';
  $('tabSpells').style.display = uiCtx.inventoryUi.activeInvTab === 'spells' ? 'block' : 'none';
  $('tabBlacksmith').style.display = uiCtx.inventoryUi.activeInvTab === 'blacksmith' ? 'block' : 'none';
  $('tabWitch').style.display = uiCtx.inventoryUi.activeInvTab === 'witch' ? 'block' : 'none';
  $('tabMerchant').style.display = uiCtx.inventoryUi.activeInvTab === 'merchant' ? 'block' : 'none';
  $('tabLimites').style.display = uiCtx.inventoryUi.activeInvTab === 'limites' ? 'block' : 'none';
  if (uiCtx.inventoryUi.activeInvTab === 'inventory') renderInventoryGrid();
  else if (uiCtx.inventoryUi.activeInvTab === 'spells') renderSpellEquip();
  else if (uiCtx.inventoryUi.activeInvTab === 'blacksmith') renderBlacksmith();
  else if (uiCtx.inventoryUi.activeInvTab === 'witch') renderWitch();
  else if (uiCtx.inventoryUi.activeInvTab === 'merchant') renderMerchant();
  else if (uiCtx.inventoryUi.activeInvTab === 'limites') renderLimites();
}

export function renderInventoryGrid() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const grid = $('inventoryGrid');
  let cells = [];
  Object.entries(state.player.equipment).forEach(([slot, item]) => {
    if (item && (uiCtx.inventoryUi.invTypeFilter === 'all' || uiCtx.inventoryUi.invTypeFilter === 'weapon'))
      cells.push({ kind: 'weapon', item: { ...item, _equipped: true, _slot: slot } });
  });
  if (uiCtx.inventoryUi.invTypeFilter === 'all' || uiCtx.inventoryUi.invTypeFilter === 'weapon') {
    state.player.weapons.forEach((it) => cells.push({ kind: 'weapon', item: it }));
  }
  if (uiCtx.inventoryUi.invTypeFilter === 'all' || uiCtx.inventoryUi.invTypeFilter === 'material') {
    Object.entries(state.player.materials).forEach(([id, qty]) => {
      if (qty > 0) {
        const data = uiCtx.allMaterials().find((m) => m.id === id);
        if (data) cells.push({ kind: 'material', item: { ...data, qty } });
      }
    });
  }
  if (uiCtx.inventoryUi.invTypeFilter === 'all' || uiCtx.inventoryUi.invTypeFilter === 'ingredient') {
    Object.entries(state.player.ingredients).forEach(([id, qty]) => {
      if (qty > 0) {
        const data = uiCtx.allIngredients().find((m) => m.id === id);
        if (data) cells.push({ kind: 'ingredient', item: { ...data, qty } });
      }
    });
  }
  if (cells.length === 0) {
    grid.className = '';
    grid.innerHTML = `<div class="empty-inventory"><span class="icon">🎒</span>Rien à voir ici.<br><small>Vainquez des boss pour collecter du butin.</small></div>`;
    return;
  }
  grid.className = 'item-grid';
  grid.innerHTML = cells
    .map((c, i) => {
      const item = c.item;
      const color = RARITY_COLORS[item.rarity];
      let fallback;
      if (c.kind === 'weapon') fallback = FALLBACK_WEAPON[item.id] || FALLBACK_WEAPON.default;
      else if (c.kind === 'material') fallback = FALLBACK_MAT[item.id] || FALLBACK_MAT.default;
      else fallback = FALLBACK_ING[item.id] || FALLBACK_ING.default;
      const iconHtml = item.icon
        ? `<img src="${uiCtx.iconUrl(item.icon, color)}" alt="" onerror="this.outerHTML='<span class=&quot;item-emoji&quot;>${fallback}</span>'">`
        : `<span class="item-emoji">${fallback}</span>`;
      const qtyBadge = item.qty ? `<div class="qty-badge">×${item.qty}</div>` : '';
      const equippedClass = item._equipped ? 'equipped' : '';
      const nameSuffix = c.kind === 'weapon' && item.combLevel ? ' +' + item.combLevel : '';
      let statsLine = '';
      if (c.kind === 'weapon') {
        const eff = getEffectiveStats(item);
        const parts = Object.entries(eff).map(
          ([k, v]) => `+${v}${({ force: 'F', defense: 'D', agility: 'A', constitution: 'PV' })[k] || k.charAt(0)}`
        );
        statsLine = `<div style="font-size:9px;color:var(--gold-bright);margin-top:2px;">${parts.join(' · ')}</div>`;
      }
      return `<div class="item-card rarity-${item.rarity} ${equippedClass}" data-i="${i}" data-kind="${c.kind}">${qtyBadge}${iconHtml}<div class="item-name">${item.name}${nameSuffix}</div><div class="item-rarity-tag">${uiCtx.rarityLabel(item.rarity)}</div>${statsLine}</div>`;
    })
    .join('');
  grid.querySelectorAll('.item-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.i);
      const c = cells[idx];
      openItemDetail(c);
    });
  });
}

function openItemDetail(cell) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const item = cell.item;
  const color = RARITY_COLORS[item.rarity];
  let fallback;
  if (cell.kind === 'weapon') fallback = FALLBACK_WEAPON[item.id] || FALLBACK_WEAPON.default;
  else if (cell.kind === 'material') fallback = FALLBACK_MAT[item.id] || FALLBACK_MAT.default;
  else fallback = FALLBACK_ING[item.id] || FALLBACK_ING.default;
  $('itemDetailPortrait').innerHTML = `<img src="${uiCtx.iconUrl(item.icon, color)}" alt="" onerror="this.outerHTML='<span class=&quot;emoji&quot;>${fallback}</span>'">`;
  $('itemDetailPortrait').style.borderColor = color;
  $('itemDetailName').textContent = item.name + (cell.kind === 'weapon' && item.combLevel ? ' +' + item.combLevel : '');
  $('itemDetailName').style.color = color;
  let typeLabel = '';
  if (cell.kind === 'weapon') typeLabel = SLOT_LABEL[item.slot] || 'Équipement';
  else if (cell.kind === 'material') typeLabel = 'Matériau';
  else typeLabel = 'Ingrédient';
  $('itemDetailRarity').innerHTML = `${uiCtx.rarityLabel(item.rarity)} · ${typeLabel}${item._equipped ? ' · <span style="color:var(--success);">✓ Équipé</span>' : ''}`;
  $('itemDetailDesc').textContent = '« ' + (item.desc || '') + ' »';
  if (cell.kind === 'weapon') {
    const labels = { force: '💪 Force', defense: '🛡️ Défense', agility: '⚡ Vitesse', constitution: '❤️ Vie max' };
    const eff = getEffectiveStats(item);
    const statLines = Object.entries(item.stats || {})
      .map(([k, v]) => {
        const effV = eff[k];
        const bonusTxt = effV > v ? ` <small style="color:var(--rarity-rare);">(${v} +${effV - v})</small>` : '';
        return `<div class="item-stat-line"><span class="label">${labels[k] || k}</span><span class="value">+${effV}${bonusTxt}</span></div>`;
      })
      .join('');
    const combLine = item.combLevel
      ? `<div class="item-stat-line"><span class="label">Niveau d'amélioration</span><span class="value" style="color:var(--gold-bright);">+${item.combLevel}/${MAX_COMB_LEVEL}</span></div>`
      : '';
    $('itemDetailStats').innerHTML = combLine + (statLines || '<div class="item-stat-line"><span class="label">Aucun bonus stat</span></div>');
  } else {
    $('itemDetailStats').innerHTML = `<div class="item-stat-line"><span class="label">Quantité</span><span class="value">×${item.qty}</span></div><div class="item-stat-line"><span class="label">Usage</span><span class="value" style="color:var(--text-dim);font-weight:400;font-size:11px;">${cell.kind === 'material' ? '⚒ Forgeron' : '🧙‍♀️ Sorcière'}</span></div>`;
  }
  let actionsHtml = '';
  if (cell.kind === 'weapon') {
    const sellValue = Math.round((RARITY_VALUE[item.rarity] || 50) * 0.5);
    const nextRarityIdx = RARITY_ORDER.indexOf(item.rarity) + 1;
    const canUpgrade = nextRarityIdx < RARITY_ORDER.length;
    const upgradeCost = UPGRADE_COST[item.rarity];
    actionsHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">';
    if (item._equipped) actionsHtml += `<button class="btn btn-secondary" id="btnUnequipItem" style="font-size:11px;">📤 Déséquiper</button>`;
    else actionsHtml += `<button class="btn btn-success" id="btnEquipItem" style="font-size:11px;">⚔ Équiper</button>`;
    actionsHtml += `<button class="btn btn-secondary" id="btnSellItem" style="font-size:11px;color:var(--blood-bright);border-color:rgba(196,30,58,0.4);">💰 Vendre (${sellValue})</button></div>`;
    if (canUpgrade) {
      const dis = state.player.gold < upgradeCost ? 'disabled' : '';
      actionsHtml += `<div style="margin-top:8px;"><button class="btn btn-gold" id="btnUpgradeItem" style="width:100%;font-size:11px;padding:10px;" ${dis}>⬆ Améliorer en ${uiCtx.rarityLabel(RARITY_ORDER[nextRarityIdx])} (${upgradeCost} 💰)</button></div>`;
    }
    const combCandidate = uiCtx.findCombineCandidate(item.uid);
    const canCombine = combCandidate !== null && (item.combLevel || 0) < MAX_COMB_LEVEL;
    if (canCombine) {
      actionsHtml += `<div style="margin-top:8px;"><button class="btn btn-gold" id="btnCombineItem" style="width:100%;font-size:11px;padding:10px;background:linear-gradient(135deg,#A855F7 0%,#C084FC 100%);color:#FFF;border-color:#A855F7;">🔮 Combiner → +${(item.combLevel || 0) + 1} (consomme 1 ${item.name} identique)</button></div>`;
    } else if ((item.combLevel || 0) >= MAX_COMB_LEVEL) {
      actionsHtml += `<div style="margin-top:8px;text-align:center;font-size:10px;color:var(--gold-bright);font-style:italic;">✨ Niveau d'amélioration maximum atteint</div>`;
    } else {
      actionsHtml += `<div style="margin-top:8px;text-align:center;font-size:10px;color:var(--text-faint);font-style:italic;">🔮 Combinaison : il faut un autre ${item.name}${item.combLevel ? ' +' + item.combLevel : ''} identique en sac</div>`;
    }
  }
  actionsHtml += `<div style="margin-top:8px;"><button class="btn btn-secondary" id="btnCloseItem" style="width:100%;font-size:11px;">Fermer</button></div>`;
  $('itemDetailActions').innerHTML = actionsHtml;
  if (cell.kind === 'weapon') {
    if (item._equipped) {
      $('btnUnequipItem').addEventListener('click', () => {
        uiCtx.unequipItem(item._slot);
        uiCtx.closeModal('itemDetailModal');
        renderInventoryView();
        uiCtx.showToast('📤 Objet déséquipé');
      });
    } else {
      $('btnEquipItem').addEventListener('click', () => {
        uiCtx.equipItem(item.uid);
        uiCtx.closeModal('itemDetailModal');
        renderInventoryView();
        uiCtx.showToast('⚔ Objet équipé');
      });
    }
    $('btnSellItem').addEventListener('click', () => {
      const sv = Math.round((RARITY_VALUE[item.rarity] || 50) * 0.5);
      if (!confirm(`Vendre ${item.name} pour ${sv} or ?`)) return;
      uiCtx.sellItem(item.uid, item._equipped ? item._slot : null, sv);
      uiCtx.closeModal('itemDetailModal');
      renderInventoryView();
      uiCtx.showToast(`💰 +${sv} or`);
    });
    const nextIdx = RARITY_ORDER.indexOf(item.rarity) + 1;
    if (nextIdx < RARITY_ORDER.length) {
      $('btnUpgradeItem').addEventListener('click', () => {
        const cost = UPGRADE_COST[item.rarity];
        if (state.player.gold < cost) {
          uiCtx.showToast('⚠ Or insuffisant');
          return;
        }
        if (!confirm(`Améliorer ${item.name} en ${uiCtx.rarityLabel(RARITY_ORDER[nextIdx])} pour ${cost} or ?\n\n(Stats x1.5)`)) return;
        uiCtx.upgradeItem(item.uid, item._equipped ? item._slot : null);
        uiCtx.closeModal('itemDetailModal');
        renderInventoryView();
        uiCtx.showToast(`⬆ ${item.name} amélioré !`, 3000);
      });
    }
    const btnComb = $('btnCombineItem');
    if (btnComb) {
      btnComb.addEventListener('click', () => {
        if (
          !confirm(
            `Combiner deux ${item.name}${item.combLevel ? ' +' + item.combLevel : ''} ? Une copie sera consommée et l'arme passera au niveau +${(item.combLevel || 0) + 1} (stats +20%).`
          )
        )
          return;
        if (uiCtx.combineWeapons(item.uid)) {
          uiCtx.closeModal('itemDetailModal');
          renderInventoryView();
          uiCtx.showToast(`🔮 ${item.name} combinée → +${(item.combLevel || 0) + 1}`, 3000);
        } else uiCtx.showToast('⚠ Combinaison impossible');
      });
    }
  }
  $('btnCloseItem').addEventListener('click', () => uiCtx.closeModal('itemDetailModal'));
  uiCtx.openModal('itemDetailModal');
}

export function renderBlacksmith() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const container = $('blacksmithRecipes');
  const recipes = uiCtx.allBlacksmithRecipes();
  if (!recipes || recipes.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><span class="icon">⚒</span>Aucune recette pour l\'instant.<br><small>Ajoutez-en dans Admin → 📜 Recettes.</small></div>';
    return;
  }
  const html = recipes
    .map((recipe, i) => {
      const weapon = uiCtx.allEquipment().find((w) => w.id === recipe.weaponId);
      if (!weapon)
        return `<div class="recipe-card" style="opacity:0.5;"><div class="recipe-info"><div class="recipe-name">⚠ Recette orpheline</div><div class="recipe-rarity" style="color:var(--text-faint);">L'équipement "${recipe.weaponId}" n'existe plus.</div></div></div>`;
      const color = RARITY_COLORS[weapon.rarity];
      const fb = FALLBACK_WEAPON[weapon.id] || FALLBACK_WEAPON.default;
      const iconHtml = `<img src="${uiCtx.iconUrl(weapon.icon, color)}" alt="" onerror="this.outerHTML='<span class=&quot;emoji&quot;>${fb}</span>'">`;
      let canCraft = state.player.gold >= recipe.gold;
      const costTags = recipe.materials
        .map((m) => {
          const data = uiCtx.allMaterials().find((mat) => mat.id === m.id);
          const have = state.player.materials[m.id] || 0;
          const ok = have >= m.qty;
          if (!ok) canCraft = false;
          const ico = FALLBACK_MAT[m.id] || FALLBACK_MAT.default;
          return `<span class="cost-tag ${ok ? 'have' : 'miss'}"><span class="ico">${ico}</span> ${data ? data.name : m.id} ${have}/${m.qty}</span>`;
        })
        .join('');
      const goldTag = `<span class="cost-tag ${state.player.gold >= recipe.gold ? 'have' : 'miss'}"><span class="ico">💰</span> ${recipe.gold}</span>`;
      const stats = Object.entries(weapon.stats || {})
        .map(([k, v]) => `+${v} ${({ force: 'Force', defense: 'Déf', agility: 'Agi', constitution: 'PV' })[k] || k}`)
        .join(', ');
      return `<div class="recipe-card"><div class="recipe-head"><div class="recipe-icon" style="border:2px solid ${color}">${iconHtml}</div><div class="recipe-info"><div class="recipe-name" style="color:${color}">${weapon.name}</div><div class="recipe-rarity" style="color:${color}">${uiCtx.rarityLabel(weapon.rarity)} · ${stats}</div></div></div><div class="recipe-cost">${costTags}${goldTag}</div><div class="recipe-action"><button data-recipe="${i}" ${canCraft ? '' : 'disabled'}>⚒ Forger</button></div></div>`;
    })
    .join('');
  container.innerHTML = html;
  container.querySelectorAll('button[data-recipe]').forEach((b) => {
    b.addEventListener('click', () => uiCtx.forgeWeapon(parseInt(b.dataset.recipe)));
  });
}

export function renderWitch() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const container = $('witchRecipes');
  const recipes = uiCtx.allWitchRecipes();

  // ── Section 1 : Potions ──────────────────────────────────────────────────────
  let potionHtml = '';
  if (!recipes || recipes.length === 0) {
    potionHtml = '<div class="empty-state"><span class="icon">🧙‍♀️</span>Aucune recette de potion.</div>';
  } else {
    potionHtml = recipes.map((recipe, i) => {
      const color = RARITY_COLORS[recipe.rarity];
      const fb = '🧪';
      const iconHtml = `<img src="${uiCtx.iconUrl(recipe.icon, color)}" alt="" onerror="this.outerHTML='<span class=&quot;emoji&quot;>${fb}</span>'">`;
      let canCraft = state.player.gold >= recipe.gold;
      const costTags = recipe.ingredients.map((m) => {
        const data = uiCtx.allIngredients().find((ing) => ing.id === m.id);
        const have = state.player.ingredients[m.id] || 0;
        const ok = have >= m.qty;
        if (!ok) canCraft = false;
        const ico = FALLBACK_ING[m.id] || FALLBACK_ING.default;
        return `<span class="cost-tag ${ok ? 'have' : 'miss'}"><span class="ico">${ico}</span> ${data ? data.name : m.id} ${have}/${m.qty}</span>`;
      }).join('');
      const goldTag = recipe.gold > 0 ? `<span class="cost-tag ${state.player.gold >= recipe.gold ? 'have' : 'miss'}"><span class="ico">💰</span> ${recipe.gold}</span>` : '';
      return `<div class="recipe-card"><div class="recipe-head"><div class="recipe-icon" style="border:2px solid ${color}">${iconHtml}</div><div class="recipe-info"><div class="recipe-name" style="color:${color}">${recipe.name}</div><div class="recipe-rarity" style="color:var(--text-dim);font-style:italic;">${recipe.desc}</div></div></div><div class="recipe-cost">${costTags}${goldTag}</div><div class="recipe-action"><button data-recipe="${i}" ${canCraft ? '' : 'disabled'}>🧙‍♀️ Préparer</button></div></div>`;
    }).join('');
  }

  // ── Section 2 : Sorts à apprendre ───────────────────────────────────────────
  const SPELL_PRICES = {
    ice_lance: 100, thunder_bolt: 150, poison_cloud: 100,
    divine_shield: 200, regen_aura: 180, shadow_strike: 150,
    blizzard: 300, meteor: 800, full_restore: 1000,
  };
  const allSpells = uiCtx.allSpells ? uiCtx.allSpells() : [];
  const knownSpells = state.player.knownSpells || [];
  const unknownSpells = allSpells.filter((s) => !knownSpells.includes(s.id) && SPELL_PRICES[s.id]);
  const ELEMENTS_COLOR = { fire: '#ef4444', holy: '#fbbf24', wind: '#34d399', water: '#60a5fa', dark: '#a78bfa' };

  let spellHtml = '';
  if (unknownSpells.length === 0) {
    spellHtml = '<div class="empty-state" style="padding:12px 0;"><span class="icon">📚</span>Tu connais déjà tous mes sorts, voyageur.</div>';
  } else {
    spellHtml = unknownSpells.map((s) => {
      const price = SPELL_PRICES[s.id];
      const canBuy = state.player.gold >= price;
      const elColor = ELEMENTS_COLOR[s.element] || '#bfdbfe';
      const onceBadge = s.oncePerCombat ? '<span class="spell-equipped-badge" style="background:rgba(239,68,68,0.2);color:#fca5a5;margin-left:4px;">1×/combat</span>' : '';
      const effectLabel = s.effect === 'damage_flat' ? `⚔ ${s.value} dégâts` : `💚 ${s.value} PV`;
      return `<div class="recipe-card">
        <div class="recipe-head">
          <div class="recipe-icon" style="border:2px solid ${elColor};font-size:24px;display:flex;align-items:center;justify-content:center;">${s.element === 'fire' ? '🔥' : s.element === 'holy' ? '✨' : s.element === 'wind' ? '💨' : s.element === 'water' ? '❄️' : '🌑'}</div>
          <div class="recipe-info">
            <div class="recipe-name" style="color:${elColor};">${s.name}${onceBadge}</div>
            <div class="recipe-rarity" style="color:var(--text-dim);">${effectLabel} · ${s.manaCost} MP · ${s.desc}</div>
          </div>
        </div>
        <div class="recipe-cost"><span class="cost-tag ${canBuy ? 'have' : 'miss'}"><span class="ico">💰</span> ${price}</span></div>
        <div class="recipe-action"><button class="witch-learn-spell" data-spell-id="${s.id}" data-price="${price}" ${canBuy ? '' : 'disabled'}>📚 Apprendre</button></div>
      </div>`;
    }).join('');
  }

  container.innerHTML = `
    <div class="section-label"><span>🧪 Potions</span></div>
    ${potionHtml}
    <div class="section-label" style="margin-top:16px;"><span>📚 Sorts à apprendre</span></div>
    ${spellHtml}
  `;

  container.querySelectorAll('button[data-recipe]').forEach((b) => {
    b.addEventListener('click', () => uiCtx.brewPotion(parseInt(b.dataset.recipe)));
  });
  container.querySelectorAll('.witch-learn-spell').forEach((b) => {
    b.addEventListener('click', () => {
      const spellId = b.dataset.spellId;
      const price = parseInt(b.dataset.price, 10);
      if (state.player.gold < price) { uiCtx.showToast('⚠ Or insuffisant'); return; }
      if ((state.player.knownSpells || []).includes(spellId)) { uiCtx.showToast('⚠ Sort déjà connu'); return; }
      state.player.gold -= price;
      if (!state.player.knownSpells) state.player.knownSpells = [];
      state.player.knownSpells.push(spellId);
      uiCtx.saveState();
      renderWitch();
      const sp = allSpells.find((s) => s.id === spellId);
      uiCtx.showToast(`📚 <strong>${sp ? sp.name : spellId}</strong> appris ! Va l'équiper dans l'onglet Sorts.`, 3500);
    });
  });
}

export function renderMerchant() {
  const $ = uiCtx.$;
  document.querySelectorAll('[data-merchant]').forEach((b) =>
    b.classList.toggle('active', b.dataset.merchant === uiCtx.inventoryUi.activeMerchantTab)
  );
  $('merchantBuy').style.display = uiCtx.inventoryUi.activeMerchantTab === 'buy' ? 'block' : 'none';
  $('merchantSell').style.display = uiCtx.inventoryUi.activeMerchantTab === 'sell' ? 'block' : 'none';
  if (uiCtx.inventoryUi.activeMerchantTab === 'buy') renderMerchantBuy();
  else renderMerchantSell();
}

export function renderMerchantBuy() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const ETHER_PRICE = 30;
  $('merchantBuy').innerHTML = `
    <div class="shop-item"><div class="shop-icon">🧪</div><div class="shop-info"><div class="shop-name">Potion de soin</div><div class="shop-desc">Restaure 50 PV. (${state.player.potions} en stock)</div></div><button class="shop-buy" id="btnBuyPotion" ${state.player.gold < POTION_PRICE ? 'disabled' : ''}>${POTION_PRICE} 💰</button></div>
    <div class="shop-item"><div class="shop-icon">💧</div><div class="shop-info"><div class="shop-name">Éther</div><div class="shop-desc">Restaure 10 MP. (${state.player.ethers} en stock)</div></div><button class="shop-buy" id="btnBuyEther" ${state.player.gold < ETHER_PRICE ? 'disabled' : ''}>${ETHER_PRICE} 💰</button></div>`;
  $('btnBuyPotion').addEventListener('click', () => {
    if (state.player.gold < POTION_PRICE) {
      uiCtx.showToast('⚠ Or insuffisant');
      return;
    }
    state.player.gold -= POTION_PRICE;
    state.player.potions += 1;
    uiCtx.saveState();
    renderInventoryView();
    uiCtx.showToast('🧪 Potion achetée');
  });
  $('btnBuyEther').addEventListener('click', () => {
    if (state.player.gold < ETHER_PRICE) {
      uiCtx.showToast('⚠ Or insuffisant');
      return;
    }
    state.player.gold -= ETHER_PRICE;
    state.player.ethers += 1;
    uiCtx.saveState();
    renderInventoryView();
    uiCtx.showToast('💧 Éther acheté');
  });
}

export function renderMerchantSell() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  let html = '';
  Object.entries(state.player.materials).forEach(([id, qty]) => {
    if (qty <= 0) return;
    const data = uiCtx.allMaterials().find((m) => m.id === id);
    if (!data) return;
    const price = SELL_MATERIAL[data.rarity] || 10;
    const color = RARITY_COLORS[data.rarity];
    const fb = FALLBACK_MAT[id] || FALLBACK_MAT.default;
    html += `<div class="shop-item"><div class="shop-icon"><img src="${uiCtx.iconUrl(data.icon, color)}" style="width:36px;height:36px;" alt="" onerror="this.outerHTML='<span style=&quot;font-size:30px;&quot;>${fb}</span>'"></div><div class="shop-info"><div class="shop-name" style="color:${color}">${data.name} ×${qty}</div><div class="shop-desc">${price} 💰 / unité</div></div><div style="display:flex;flex-direction:column;gap:4px;"><button class="shop-buy" data-sell-mat="${id}" data-qty="1">×1 (${price})</button><button class="shop-buy" data-sell-mat="${id}" data-qty="all" style="font-size:9px;padding:4px 10px;">×Tout (${price * qty})</button></div></div>`;
  });
  Object.entries(state.player.ingredients).forEach(([id, qty]) => {
    if (qty <= 0) return;
    const data = uiCtx.allIngredients().find((m) => m.id === id);
    if (!data) return;
    const price = SELL_INGREDIENT[data.rarity] || 15;
    const color = RARITY_COLORS[data.rarity];
    const fb = FALLBACK_ING[id] || FALLBACK_ING.default;
    html += `<div class="shop-item"><div class="shop-icon"><img src="${uiCtx.iconUrl(data.icon, color)}" style="width:36px;height:36px;" alt="" onerror="this.outerHTML='<span style=&quot;font-size:30px;&quot;>${fb}</span>'"></div><div class="shop-info"><div class="shop-name" style="color:${color}">${data.name} ×${qty}</div><div class="shop-desc">${price} 💰 / unité</div></div><div style="display:flex;flex-direction:column;gap:4px;"><button class="shop-buy" data-sell-ing="${id}" data-qty="1">×1 (${price})</button><button class="shop-buy" data-sell-ing="${id}" data-qty="all" style="font-size:9px;padding:4px 10px;">×Tout (${price * qty})</button></div></div>`;
  });
  if (!html)
    html =
      '<div class="empty-state"><span class="icon">📦</span>Rien à vendre.<br><small>Vainquez des boss pour collecter du butin.</small></div>';
  $('merchantSell').innerHTML = html;
  $('merchantSell').querySelectorAll('[data-sell-mat]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.sellMat;
      const qtyStr = b.dataset.qty;
      const qty = qtyStr === 'all' ? state.player.materials[id] : 1;
      if (!qty || qty < 1) return;
      const data = uiCtx.allMaterials().find((m) => m.id === id);
      const price = SELL_MATERIAL[data.rarity] || 10;
      const total = price * qty;
      state.player.materials[id] -= qty;
      if (state.player.materials[id] <= 0) delete state.player.materials[id];
      state.player.gold += total;
      uiCtx.saveState();
      renderInventoryView();
      uiCtx.showToast(`💰 +${total} or`);
    });
  });
  $('merchantSell').querySelectorAll('[data-sell-ing]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.sellIng;
      const qtyStr = b.dataset.qty;
      const qty = qtyStr === 'all' ? state.player.ingredients[id] : 1;
      if (!qty || qty < 1) return;
      const data = uiCtx.allIngredients().find((m) => m.id === id);
      const price = SELL_INGREDIENT[data.rarity] || 15;
      const total = price * qty;
      state.player.ingredients[id] -= qty;
      if (state.player.ingredients[id] <= 0) delete state.player.ingredients[id];
      state.player.gold += total;
      uiCtx.saveState();
      renderInventoryView();
      uiCtx.showToast(`💰 +${total} or`);
    });
  });
}

export function renderSpellEquip() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const equipped = state.player.equippedSpells || [null, null, null];
  const allSpells = uiCtx.allSpells();

  // Emplacements equipés
  const slotsHtml = equipped.map((id, i) => {
    const s = id ? allSpells.find((sp) => sp.id === id) : null;
    if (!s) {
      return `<div class="spell-slot spell-slot--empty" data-slot="${i}">
        <div class="spell-slot-num">Emplacement ${i + 1}</div>
        <div class="spell-slot-empty-label">🪄 Vide</div>
      </div>`;
    }
    return `<div class="spell-slot spell-slot--filled" data-slot="${i}">
      <div class="spell-slot-num">Emplacement ${i + 1}</div>
      <div class="spell-slot-name">${s.name}</div>
      <div class="spell-slot-meta">${s.manaCost} MP · ${s.effect === 'damage_flat' ? '⚔ ' + s.value + ' dégâts' : '💚 ' + s.value + ' PV'}</div>
      <button class="spell-unequip-btn" data-slot="${i}">📤 Retirer</button>
    </div>`;
  }).join('');

  // Catalogue filtré aux sorts connus uniquement
  const knownIds = state.player.knownSpells || [];
  const catalogHtml = allSpells.filter((s) => knownIds.includes(s.id)).map((s) => {
    const equippedSlot = equipped.indexOf(s.id);
    const isEquipped = equippedSlot >= 0;
    return `<div class="spell-catalog-card ${isEquipped ? 'spell-equipped' : ''}">
      <div class="spell-catalog-name">${s.name}${isEquipped ? ' <span class="spell-equipped-badge">Équipé</span>' : ''}${s.oncePerCombat ? ' <span class="spell-equipped-badge" style="background:rgba(239,68,68,0.2);color:#fca5a5;">1×/combat</span>' : ''}</div>
      <div class="spell-catalog-meta">${s.manaCost} MP · ${s.effect === 'damage_flat' ? '⚔ ' + s.value + ' dégâts' : '💚 ' + s.value + ' PV'} · ${s.desc || ''}</div>
      ${!isEquipped ? `<div class="spell-equip-btns">${equipped.map((e, i) => `<button class="btn-spell-equip" data-spell="${s.id}" data-slot="${i}">${e ? '↔ Slot ' + (i+1) : '+ Slot ' + (i+1)}</button>`).join('')}</div>` : ''}
    </div>`;
  }).join('') || '<div class="empty-state"><span class="icon">🪄</span>Aucun sort connu. Apprends-en chez la Sorcière.</div>';

  $('spellSlots').innerHTML = `<div class="spell-slots-grid">${slotsHtml}</div>`;
  $('spellCatalog').innerHTML = catalogHtml;

  // Retirer un sort équipé
  $('spellSlots').querySelectorAll('.spell-unequip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slot = parseInt(btn.dataset.slot, 10);
      state.player.equippedSpells[slot] = null;
      uiCtx.saveState();
      renderSpellEquip();
    });
  });

  // Équiper un sort dans un slot
  $('spellCatalog').querySelectorAll('.btn-spell-equip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const spellId = btn.dataset.spell;
      const slot = parseInt(btn.dataset.slot, 10);
      const prev = state.player.equippedSpells.indexOf(spellId);
      if (prev >= 0) state.player.equippedSpells[prev] = null;
      state.player.equippedSpells[slot] = spellId;
      uiCtx.saveState();
      renderSpellEquip();
      const sp = allSpells.find((s) => s.id === spellId);
      uiCtx.showToast(`✨ ${sp ? sp.name : spellId} équipé en slot ${slot + 1}`);
    });
  });
}

// ─── Onglet Limites ────────────────────────────────────────────────────────────

const LIMIT_TIER_COLOR = { 1: '#3B82F6', 2: '#8B5CF6', 3: '#EF4444' };
const LIMIT_TIER_LABEL = { 1: 'Tier I — Débutant', 2: 'Tier II — Avancé', 3: 'Tier III — Ultime' };
const EFFECT_LABEL = {
  damage_flat: (v) => `⚔ ${v} dégâts`,
  damage_pct: (v) => `⚔ ${v}% PV boss`,
  heal_flat: (v) => `💚 +${v} PV`,
  heal_pct: (v) => `💚 +${v}% PV`,
  buff_atk: (v) => `⚡ ×2 dégâts (${v} exercices)`,
};

function unlockLabel(unlock) {
  if (!unlock) return '';
  switch (unlock.type) {
    case 'level': return `Niveau ${unlock.value} requis`;
    case 'kill_count': return `Vaincre ${unlock.bossId} × ${unlock.kills}`;
    case 'limit_uses': {
      const ref = limits.find((l) => l.id === unlock.limitId);
      return `Utiliser "${ref ? ref.name : unlock.limitId}" × ${unlock.uses}`;
    }
    case 'quest': return `Quête : ${unlock.questId}`;
    default: return '?';
  }
}

export function renderLimites() {
  const state = uiCtx.getState();
  const container = uiCtx.$('limitesContent');
  if (!container) return;

  const known = state.player.knownLimits || ['blade_rush'];
  const equipped = state.player.equippedLimit || 'blade_rush';
  const usesCount = state.player.limitUsesCount || {};
  const barPct = Math.round((state.player.limitBar || 0) * 100);

  const barHtml = `<div class="limit-menu-bar-block">
    <div class="limit-menu-bar-label">Barre de Limite <span style="color:#fbbf24;font-weight:700;">${barPct}%</span></div>
    <div class="combat-limit-track" style="height:10px;margin:6px 0 0;">
      <div class="combat-limit-fill ${barPct >= 100 ? 'combat-limit-fill--ready' : ''}" style="width:${barPct}%;"></div>
    </div>
    <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">Se remplit quand tu prends des dégâts. Persiste entre les séances.</div>
  </div>`;

  const byTier = { 1: [], 2: [], 3: [] };
  limits.forEach((l) => { if (byTier[l.tier]) byTier[l.tier].push(l); });

  let html = barHtml;

  for (const tier of [1, 2, 3]) {
    const color = LIMIT_TIER_COLOR[tier];
    html += `<div class="section-label" style="margin-top:16px;"><span style="color:${color};">${LIMIT_TIER_LABEL[tier]}</span></div>`;

    for (const limit of byTier[tier]) {
      const isKnown = known.includes(limit.id);
      const isEquipped = limit.id === equipped;
      const uses = usesCount[limit.id] || 0;
      const effectHtml = EFFECT_LABEL[limit.effect] ? EFFECT_LABEL[limit.effect](limit.value) : limit.effect;

      if (isKnown) {
        html += `<div class="limit-card ${isEquipped ? 'limit-card--equipped' : ''}" style="--limit-color:${color};">
          <div class="limit-card-head">
            <div class="limit-card-name" style="color:${color};">${limit.name}</div>
            <div class="limit-card-badges">
              ${isEquipped ? '<span class="limit-badge-equipped">✓ Équipée</span>' : ''}
              <span class="limit-card-effect">${effectHtml}</span>
            </div>
          </div>
          <div class="limit-card-desc">${limit.desc}</div>
          <div class="limit-card-footer">
            <span class="limit-card-uses">${uses} utilisation${uses !== 1 ? 's' : ''}</span>
            ${!isEquipped ? `<button class="limit-equip-btn" data-limit-id="${limit.id}">Équiper</button>` : ''}
          </div>
        </div>`;
      } else {
        html += `<div class="limit-card limit-card--locked">
          <div class="limit-card-head">
            <div class="limit-card-name limit-card-name--locked">🔒 ${limit.name}</div>
            <span class="limit-card-effect limit-card-effect--locked">${effectHtml}</span>
          </div>
          <div class="limit-card-desc limit-card-desc--locked">${limit.desc}</div>
          <div class="limit-card-footer">
            <span class="limit-unlock-cond">🔓 ${unlockLabel(limit.unlock)}</span>
          </div>
        </div>`;
      }
    }
  }

  container.innerHTML = html;

  container.querySelectorAll('.limit-equip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const limitId = btn.dataset.limitId;
      const lim = limits.find((l) => l.id === limitId);
      if (!lim || !known.includes(limitId)) return;
      state.player.equippedLimit = limitId;
      uiCtx.saveState();
      renderLimites();
      uiCtx.showToast(`💥 <strong>${lim.name}</strong> équipée !`, 2500);
    });
  });
}
