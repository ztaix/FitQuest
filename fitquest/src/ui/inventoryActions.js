import { MAX_COMB_LEVEL, RARITY_ORDER, UPGRADE_COST } from '../data/constants.js';
import { gameEvents } from '../audio/gameEvents.js';

/**
 * @param {object} deps
 * @param {() => object | null} deps.getState
 * @param {() => void} deps.saveState
 * @param {object} deps.catalog — résultat de createGameCatalog
 * @param {(msg: string, ms?: number) => void} deps.showToast
 * @param {(id: string) => HTMLElement | null} deps.$
 * @param {() => void} deps.renderInventoryView
 * @param {() => void} deps.renderHero
 */
export function createInventoryActions(deps) {
  const { getState, saveState, catalog, showToast, $, renderInventoryView, renderHero } = deps;

  function equipItem(uid, targetSlot) {
    const state = getState();
    if (!state?.player) return;
    const idx = state.player.weapons.findIndex((i) => i.uid === uid);
    if (idx === -1) return;
    const item = state.player.weapons[idx];
    if (!item.slot) return;

    // Resolution du slot reel pour les accessoires
    let resolvedSlot = targetSlot || item.slot;
    if (item.slot === 'accessory' && !targetSlot) {
      if (!state.player.equipment['accessory_1']) resolvedSlot = 'accessory_1';
      else if (!state.player.equipment['accessory_2']) resolvedSlot = 'accessory_2';
      else resolvedSlot = 'accessory_1';
    }

    const cur = state.player.equipment[resolvedSlot];
    state.player.weapons.splice(idx, 1);
    if (cur) state.player.weapons.push(cur);
    state.player.equipment[resolvedSlot] = item;
    saveState();
  }

  function unequipItem(slot) {
    const state = getState();
    if (!state?.player) return;
    const item = state.player.equipment[slot];
    if (!item) return;
    if (!item.uid) item.uid = 'i_' + Date.now() + '_' + Math.floor(Math.random() * 999);
    state.player.weapons.push(item);
    state.player.equipment[slot] = null;
    saveState();
  }

  function sellItem(uid, equippedSlot, value) {
    const state = getState();
    if (!state?.player) return;
    if (equippedSlot) {
      state.player.equipment[equippedSlot] = null;
    } else {
      const idx = state.player.weapons.findIndex((i) => i.uid === uid);
      if (idx === -1) return;
      state.player.weapons.splice(idx, 1);
    }
    state.player.gold += value;
    saveState();
  }

  function findCombineCandidate(uid) {
    const state = getState();
    if (!state?.player) return null;
    let target;
    const inWeapons = state.player.weapons.find((w) => w.uid === uid);
    if (inWeapons) target = inWeapons;
    else {
      Object.entries(state.player.equipment).forEach(([s, it]) => {
        if (it && it.uid === uid) target = it;
      });
    }
    if (!target) return null;
    if ((target.combLevel || 0) >= MAX_COMB_LEVEL) return null;
    return (
      state.player.weapons.find(
        (w) =>
          w.uid !== uid &&
          w.id === target.id &&
          w.rarity === target.rarity &&
          (w.combLevel || 0) === (target.combLevel || 0),
      ) || null
    );
  }

  function combineWeapons(uid) {
    const state = getState();
    if (!state?.player) return false;
    let target;
    let inEquipment = false;
    let idx = state.player.weapons.findIndex((w) => w.uid === uid);
    if (idx >= 0) target = state.player.weapons[idx];
    else {
      Object.entries(state.player.equipment).forEach(([s, it]) => {
        if (it && it.uid === uid) {
          target = it;
          inEquipment = true;
        }
      });
    }
    if (!target || (target.combLevel || 0) >= MAX_COMB_LEVEL) return false;
    const candIdx = state.player.weapons.findIndex(
      (w) =>
        w.uid !== uid &&
        w.id === target.id &&
        w.rarity === target.rarity &&
        (w.combLevel || 0) === (target.combLevel || 0),
    );
    if (candIdx < 0) return false;
    state.player.weapons.splice(candIdx, 1);
    if (!inEquipment) {
      idx = state.player.weapons.findIndex((w) => w.uid === uid);
      if (idx >= 0) state.player.weapons[idx].combLevel = (state.player.weapons[idx].combLevel || 0) + 1;
    } else {
      target.combLevel = (target.combLevel || 0) + 1;
    }
    saveState();
    return true;
  }

  function drinkPotionOOC() {
    const state = getState();
    if (!state?.player) return;
    if (state.player.potions <= 0) {
      showToast('Aucune potion');
      return;
    }
    if (state.player.stats.hp_current >= state.player.stats.constitution) {
      showToast('Vous etes deja a plein PV');
      return;
    }
    state.player.potions -= 1;
    const before = state.player.stats.hp_current;
    state.player.stats.hp_current = Math.min(state.player.stats.constitution, before + 50);
    const heal = state.player.stats.hp_current - before;
    saveState();
    gameEvents.emit('potion');
    if ($('viewInventory').classList.contains('active')) renderInventoryView();
    else renderHero();
    showToast(`Potion bue : +${heal} PV`);
  }

  function drinkEtherOOC() {
    const state = getState();
    if (!state?.player) return;
    if (state.player.ethers <= 0) {
      showToast('Aucun ether');
      return;
    }
    if (state.player.stats.mp_current >= state.player.stats.mana) {
      showToast('Mana deja au max');
      return;
    }
    state.player.ethers -= 1;
    const before = state.player.stats.mp_current;
    state.player.stats.mp_current = Math.min(state.player.stats.mana, before + 10);
    const gain = state.player.stats.mp_current - before;
    saveState();
    if ($('viewInventory').classList.contains('active')) renderInventoryView();
    else renderHero();
    showToast(`Ether bu : +${gain} MP`);
  }

  function upgradeItem(uid, equippedSlot) {
    const state = getState();
    if (!state?.player) return;
    let item;
    if (equippedSlot) item = state.player.equipment[equippedSlot];
    else item = state.player.weapons.find((i) => i.uid === uid);
    if (!item) return;
    const idx = RARITY_ORDER.indexOf(item.rarity);
    if (idx === RARITY_ORDER.length - 1) return;
    const cost = UPGRADE_COST[item.rarity];
    if (state.player.gold < cost) return;
    state.player.gold -= cost;
    item.rarity = RARITY_ORDER[idx + 1];
    Object.keys(item.stats || {}).forEach((k) => {
      item.stats[k] = Math.round(item.stats[k] * 1.5);
    });
    saveState();
  }

  function forgeWeapon(recipeIdx) {
    const state = getState();
    if (!state?.player) return;
    const recipe = catalog.allBlacksmithRecipes()[recipeIdx];
    if (!recipe) return;
    if (state.player.gold < recipe.gold) {
      showToast('Or insuffisant');
      return;
    }
    for (const m of recipe.materials) {
      if ((state.player.materials[m.id] || 0) < m.qty) {
        showToast('Materiaux insuffisants');
        return;
      }
    }
    state.player.gold -= recipe.gold;
    recipe.materials.forEach((m) => {
      state.player.materials[m.id] = (state.player.materials[m.id] || 0) - m.qty;
      if (state.player.materials[m.id] <= 0) delete state.player.materials[m.id];
    });
    const weapon = catalog.allEquipment().find((w) => w.id === recipe.weaponId);
    const newItem = { ...weapon, uid: 'i_' + Date.now() + '_' + Math.floor(Math.random() * 999) };
    state.player.weapons.push(newItem);
    saveState();
    renderInventoryView();
    showToast(`${weapon.name} forgee !`, 3000);
  }

  function brewPotion(recipeIdx) {
    const state = getState();
    if (!state?.player) return;
    const recipe = catalog.allWitchRecipes()[recipeIdx];
    if (!recipe) return;
    if (state.player.gold < recipe.gold) {
      showToast('Or insuffisant');
      return;
    }
    for (const m of recipe.ingredients) {
      if ((state.player.ingredients[m.id] || 0) < m.qty) {
        showToast('Ingredients insuffisants');
        return;
      }
    }
    state.player.gold -= recipe.gold;
    recipe.ingredients.forEach((m) => {
      state.player.ingredients[m.id] = (state.player.ingredients[m.id] || 0) - m.qty;
      if (state.player.ingredients[m.id] <= 0) delete state.player.ingredients[m.id];
    });
    if (recipe.effect === 'heal') state.player.potions += 1;
    saveState();
    renderInventoryView();
    showToast(`${recipe.name} preparee !`, 3000);
  }

  return {
    equipItem,
    unequipItem,
    sellItem,
    findCombineCandidate,
    combineWeapons,
    drinkPotionOOC,
    drinkEtherOOC,
    upgradeItem,
    forgeWeapon,
    brewPotion,
  };
}
