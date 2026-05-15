import { GAME_DATA } from './gameData.js';

/**
 * Catalogue fusionné (données de base + custom joueur), filtré par désactivations admin.
 * Les overrides (state.player.custom.overrides) modifient les items built-in sans les remplacer.
 * @param {() => object | null} getState — renvoie l'état runtime (ex. `() => state`)
 */
export function createGameCatalog(getState) {
  function isEntryDisabled(id) {
    const s = getState();
    return s && s.player && s.player.custom && s.player.custom.disabledIds.includes(id);
  }

  /** Applique les overrides admin sur un tableau d'items built-in */
  function applyOverrides(items) {
    const s = getState();
    const overrides = s?.player?.custom?.overrides || {};
    if (Object.keys(overrides).length === 0) return items;
    return items.map((item) =>
      overrides[item.id] ? { ...item, ...overrides[item.id] } : item
    );
  }

  function allZones() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.zones;
    return [...applyOverrides(GAME_DATA.zones), ...s.player.custom.zones].filter((z) => !isEntryDisabled(z.id));
  }

  function allExercises() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.exercises;
    return [...applyOverrides(GAME_DATA.exercises), ...s.player.custom.exercises].filter((e) => !isEntryDisabled(e.id));
  }

  function allBosses() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.bosses;
    return [...applyOverrides(GAME_DATA.bosses), ...s.player.custom.bosses].filter((b) => !isEntryDisabled(b.id));
  }

  function allEquipment() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.weapons;
    return [...applyOverrides(GAME_DATA.weapons), ...s.player.custom.equipment].filter((w) => !isEntryDisabled(w.id));
  }

  function allMaterials() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.materials;
    return [...applyOverrides(GAME_DATA.materials), ...s.player.custom.materials].filter((m) => !isEntryDisabled(m.id));
  }

  function allIngredients() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.ingredients;
    return [...applyOverrides(GAME_DATA.ingredients), ...s.player.custom.ingredients].filter((i) => !isEntryDisabled(i.id));
  }

  function allBlacksmithRecipes() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.recipes_blacksmith;
    return [...GAME_DATA.recipes_blacksmith, ...(s.player.custom.blacksmith || [])];
  }

  function allWitchRecipes() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.recipes_witch;
    return [...GAME_DATA.recipes_witch, ...(s.player.custom.witch || [])];
  }

  function allSpells() {
    const s = getState();
    if (!s || !s.player || !s.player.custom) return GAME_DATA.spells;
    return [...applyOverrides(GAME_DATA.spells), ...(s.player.custom.spells || [])].filter((sp) => !isEntryDisabled(sp.id));
  }

  function getSpellById(id) {
    return allSpells().find((sp) => sp.id === id);
  }

  function isBuiltIn(id, type) {
    const map = {
      zones: GAME_DATA.zones,
      exercises: GAME_DATA.exercises,
      bosses: GAME_DATA.bosses,
      equipment: GAME_DATA.weapons,
      materials: GAME_DATA.materials,
      ingredients: GAME_DATA.ingredients,
      spells: GAME_DATA.spells,
    };
    return (map[type] || []).some((x) => x.id === id);
  }

  return {
    isEntryDisabled,
    allZones,
    allExercises,
    allBosses,
    allEquipment,
    allMaterials,
    allIngredients,
    allBlacksmithRecipes,
    allWitchRecipes,
    allSpells,
    getSpellById,
    isBuiltIn,
  };
}
