/** Persistance, rarity, economie et labels UI (aucune logique de jeu). */

export const STORAGE_KEY = 'fitquest_save_v1';
export const VERSION = '3.1.0';

export const RARITY_COLORS = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

export const FALLBACK_BOSS = {
  goblin_woods: '👹',
  wolf_alpha: '🐺',
  bear_brown: '🐻',
  witch_woods: '🧙',
  wolf_king: '🐉',
  giant_boar: '🐗',
  cursed_fairy: '🧚',
  swamp_troll: '🧌',
  corrupted_dryad: '🌳',
  default: '🐲',
};
export const FALLBACK_WEAPON = {
  sword_rusty: '🗡',
  axe_woodcutter: '🪓',
  bow_hunter: '🏹',
  sword_knight: '⚔',
  staff_druid: '🪄',
  default: '⚔️',
};
export const FALLBACK_MAT = {
  wood_dark: '🪵',
  iron_raw: '⚙',
  silver_fang: '🦷',
  rune_bone: '🦴',
  mana_crystal: '💎',
  default: '🧱',
};
export const FALLBACK_ING = {
  moon_herb: '🌿',
  wolf_blood: '🩸',
  fairy_tear: '💧',
  default: '🧪',
};

export const TYPE_ICON = { force: '💪', agility: '⚡', endurance: '🫁' };
export const TYPE_LABEL = { force: 'Force', agility: 'Vitesse', endurance: 'Endurance' };
export const TYPE_CSS = { force: 'type-force', agility: 'type-agility', endurance: 'type-endurance' };
export const COUNTER_TYPE = { force: 'agility', agility: 'endurance', endurance: 'force' };

export const RARITY_VALUE = { common: 25, rare: 100, epic: 250, legendary: 500 };
export const UPGRADE_COST = { common: 200, rare: 400, epic: 800 };
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
export const POTION_PRICE = 50;
export const SELL_MATERIAL = { common: 5, rare: 15, epic: 40, legendary: 100 };
export const SELL_INGREDIENT = { common: 7, rare: 20, epic: 50, legendary: 125 };
export const MAX_COMB_LEVEL = 5;
export const COMB_BONUS_PER_LEVEL = 0.2;
export const SLOT_LABEL = {
  weapon_main: 'Arme principale',
  weapon_secondary: 'Arme secondaire',
  armor: 'Plastron',
  helmet: 'Casque',
  legs: 'Jambières',
  cape: 'Cape',
  accessory_1: 'Accessoire',
  accessory_2: 'Accessoire',
  accessory: 'Accessoire',
};

export const SUGGESTED_REPS = { reps: 10, seconds: 30 };
