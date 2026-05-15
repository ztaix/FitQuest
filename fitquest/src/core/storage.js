import { STORAGE_KEY, VERSION } from '../data/constants.js';
import { defaultState } from './state.js';
import { initQuestProgress } from './questEngine.js';

/**
 * Normalise une sauvegarde brute (anciens formats, champs manquants).
 * Ne pas persister : uniquement transformation en mémoire.
 */
export function migrateSave(s) {
  const def = defaultState();
  s.version = VERSION;
  s.player = Object.assign({}, def.player, s.player || {});
  s.player.stats = Object.assign({}, def.player.stats, s.player.stats || {});
  s.player.equipment = Object.assign({}, def.player.equipment, s.player.equipment || {});
  s.player.records = s.player.records || {};
  s.player.records_vol = s.player.records_vol || {};
  // Migration table rase : records_bonus passait de dégâts (+5 par record) à compteur de records.
  // Si les valeurs sont multiples de 5 (ancien format), on convertit. Sinon déjà migré.
  if (!s.player._records_migrated_v2) {
    const oldBonus = s.player.records_bonus || {};
    const newBonus = {};
    Object.entries(oldBonus).forEach(([id, val]) => {
      // Ancienne logique : +5 par record → nombre de records = val / 5
      newBonus[id] = typeof val === 'number' ? Math.round(val / 5) : 0;
    });
    s.player.records_bonus = newBonus;
    s.player._records_migrated_v2 = true;
  }
  s.player.records_bonus = s.player.records_bonus || {};
  s.player.weapons = s.player.weapons || [];
  s.player.weapons.forEach((w) => {
    if (typeof w.combLevel !== 'number') w.combLevel = 0;
  });
  Object.values(s.player.equipment || {}).forEach((it) => {
    if (it && typeof it.combLevel !== 'number') it.combLevel = 0;
  });
  s.player.materials = s.player.materials || {};
  s.player.ingredients = s.player.ingredients || {};
  if (!s.player.currentZone) s.player.currentZone = 'foret';
  if (!Array.isArray(s.player.unlockedZones)) s.player.unlockedZones = ['foret'];
  if (!Array.isArray(s.player.defeatedRegionalBosses)) s.player.defeatedRegionalBosses = [];
  if (typeof s.player.recovering !== 'boolean') s.player.recovering = false;
  if (!s.player.custom) s.player.custom = {};
  s.player.custom.zones = s.player.custom.zones || [];
  s.player.custom.exercises = s.player.custom.exercises || [];
  s.player.custom.bosses = s.player.custom.bosses || [];
  s.player.custom.equipment = s.player.custom.equipment || [];
  s.player.custom.materials = s.player.custom.materials || [];
  s.player.custom.ingredients = s.player.custom.ingredients || [];
  s.player.custom.blacksmith = s.player.custom.blacksmith || [];
  s.player.custom.witch = s.player.custom.witch || [];
  s.player.custom.spells = s.player.custom.spells || [];
  s.player.custom.disabledIds = s.player.custom.disabledIds || [];
  s.player.custom.overrides = s.player.custom.overrides || {};
  if (!Array.isArray(s.player.knownSpells)) s.player.knownSpells = ['fireball', 'holy_light', 'wind_strike'];
  if (!Array.isArray(s.player.equippedSpells))
    s.player.equippedSpells = [
      s.player.knownSpells[0] || null,
      s.player.knownSpells[1] || null,
      s.player.knownSpells[2] || null,
    ];
  if (s.player.inventory) {
    s.player.inventory.forEach((it) => {
      if (it.slot) {
        if (!it.uid) it.uid = 'i_' + Date.now() + '_' + Math.floor(Math.random() * 999);
        s.player.weapons.push(it);
      }
    });
    delete s.player.inventory;
  }
  if (typeof s.player.potions !== 'number') s.player.potions = 3;
  if (typeof s.player.ethers !== 'number') s.player.ethers = 2;
  if (typeof s.player.stats.mana !== 'number') s.player.stats.mana = 100;
  if (typeof s.player.stats.mp_current !== 'number') s.player.stats.mp_current = s.player.stats.mana;
  s.boss = Object.assign({}, def.boss, s.boss || {});
  s.sessions = s.sessions || [];
  s.session_current = s.session_current || null;
  s.settings = Object.assign({}, def.settings, s.settings || {});
  s.settings.audio = Object.assign({}, def.settings.audio, s.settings.audio || {});
  if (typeof s.settings.audio.masterVolume !== 'number') s.settings.audio.masterVolume = def.settings.audio.masterVolume;
  s.settings.audio.masterVolume = Math.min(1, Math.max(0, s.settings.audio.masterVolume));
  s.meta = Object.assign({}, def.meta, s.meta || {});
  delete s.combat_current;
  if (typeof s.player.stepBalance !== 'number') s.player.stepBalance = def.player.stepBalance ?? 5000;
  if (!s.quests) {
    s.quests = {
      completedIds: [],
      counters: { sessions_complete: 0, bosses_defeated: 0, steps_total: 0 },
      visitedZoneIds: [],
    };
  }
  if (!Array.isArray(s.quests.completedIds)) s.quests.completedIds = [];
  if (!s.quests.counters) s.quests.counters = { sessions_complete: 0, bosses_defeated: 0, steps_total: 0 };
  if (!Array.isArray(s.quests.visitedZoneIds)) s.quests.visitedZoneIds = [];
  initQuestProgress(s);
  return s;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw));
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * @param {object} state — référence mutée (meta.last_played)
 * @param {{ onPersistError?: () => void }} [opts]
 * @returns {boolean}
 */
export function saveGame(state, { onPersistError } = {}) {
  try {
    state.meta.last_played = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error(e);
    if (onPersistError) onPersistError();
    return false;
  }
}

/** Efface la clé localStorage (la variable runtime `state` reste à l’appelant). */
export function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Import admin : remplace la sauvegarde sans migration (comportement historique). */
export function replaceStoredSave(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}
