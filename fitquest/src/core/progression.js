import { COMB_BONUS_PER_LEVEL, COUNTER_TYPE, RARITY_VALUE } from '../data/constants.js';

/** Exercice du type que le boss contrôle (triangle Force / Vitesse / Endurance) : moins efficace. */
export function isWeakMatchup(exerciseType, bossType) {
  return COUNTER_TYPE[exerciseType] === bossType;
}

export function xpForNextLevel(level) {
  return 200 * (level + 1);
}

export function getEffectiveStats(item) {
  if (!item || !item.stats) return {};
  const lvl = item.combLevel || 0;
  const mult = 1 + COMB_BONUS_PER_LEVEL * lvl;
  const out = {};
  Object.entries(item.stats).forEach(([k, v]) => {
    out[k] = Math.round(v * mult);
  });
  return out;
}

/** Bonus cumulés des pièces équipées (stats effectives avec fusion). */
export function computeEquipmentBonus(player) {
  const bonus = { force: 0, defense: 0, agility: 0, constitution: 0 };
  Object.values(player.equipment).forEach((item) => {
    if (item) {
      const eff = getEffectiveStats(item);
      Object.entries(eff).forEach(([k, v]) => {
        bonus[k] = (bonus[k] || 0) + v;
      });
    }
  });
  return bonus;
}

/**
 * Tranche de badge boss (assets boss_badge_1.webp … _5.webp).
 * 1–25 → 1, 26–50 → 2, 51–75 → 3, 76–99 → 4, 100+ → 5.
 */
export function getBossLevelBadgeTier(level) {
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  if (lv >= 100) return 5;
  if (lv >= 76) return 4;
  if (lv >= 51) return 3;
  if (lv >= 26) return 2;
  return 1;
}

export function getDifficultyTier(level) {
  if (level <= 10) return { tier: 'easy', numEx: 3, sets: 3, reps: 10, seconds: 30 };
  if (level <= 30) return { tier: 'medium', numEx: 4, sets: 3, reps: 12, seconds: 40 };
  if (level <= 50) return { tier: 'hard', numEx: 5, sets: 4, reps: 14, seconds: 50 };
  return { tier: 'extreme', numEx: 6, sets: 4, reps: 16, seconds: 60 };
}

const TIER_RANK = { easy: 1, medium: 2, hard: 3, extreme: 4 };

/**
 * Score 1–10 pour l’UI (pré-séance).
 * @param {object} boss
 * @param {{ tier: string, numEx: number }} tier
 */
export function getDifficultyScore(boss, tier) {
  const tr = TIER_RANK[tier.tier] || 2;
  const lvl = Math.min(10, Math.max(1, Math.round(boss.level / 8)));
  const rarityBonus = Math.min(3, Math.floor((RARITY_VALUE[boss.rarity] || 25) / 100));
  const hpFactor = Math.min(2, Math.floor((boss.hp_max || 100) / 400));
  const raw = tr * 1.4 + lvl * 0.35 + rarityBonus + hpFactor * 0.4 + tier.numEx * 0.15;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

/**
 * Durée estimée (minutes) pour le programme proposé.
 * @param {Array<{ unit?: string }>} exercises
 * @param {{ sets: number, reps: number, seconds: number, numEx: number }} tier
 * @param {{ secPerRep?: number, restBetweenExSec?: number }} [opts]
 */
export function estimateSessionMinutes(exercises, tier, opts = {}) {
  const secPerRep = opts.secPerRep ?? 4;
  const rest = opts.restBetweenExSec ?? 25;
  let sec = 0;
  exercises.forEach((ex) => {
    const vol = ex.unit === 'seconds' ? tier.seconds : tier.reps;
    const perSet = ex.unit === 'seconds' ? vol : vol * secPerRep;
    sec += tier.sets * perSet;
  });
  sec += Math.max(0, exercises.length - 1) * rest;
  return Math.max(1, Math.round(sec / 60));
}

export function isGoodMatchup(exerciseType, bossType) {
  return COUNTER_TYPE[bossType] === exerciseType;
}

/** Multiplicateur si l’exercice cible la faiblesse du boss (triangle Force / Vitesse / Endurance). */
export const MATCHUP_ADVANTAGE_MULT = 1.5;

/**
 * Multiplicateur si le type d’exercice est celui que le boss « domine » sur le triangle (symétrique du bonus).
 * Ce n’est pas une armure générique : seuls les exercices de ce type subissent la pénalité.
 */
export const MATCHUP_WEAK_MULT = 1 / MATCHUP_ADVANTAGE_MULT;

/** Pourcentage arrondi affiché en UI pour le malus (×2/3 des dégâts de base). */
export const MATCHUP_WEAK_PCT_LABEL = Math.round((1 - MATCHUP_WEAK_MULT) * 100);

/**
 * Type d’exercice qui inflige moins de dégâts à ce boss (multiplicateur {@link MATCHUP_WEAK_MULT}).
 * @param {string} bossType
 */
export function disadvantagedExerciseTypeVsBoss(bossType) {
  const t = Object.keys(COUNTER_TYPE).find((k) => COUNTER_TYPE[k] === bossType);
  return t ?? null;
}

/** +50 % si le type cible la faiblesse du boss ; malus {@link MATCHUP_WEAK_PCT_LABEL} % si mauvais matchup. */
export function matchupMultiplier(exerciseType, bossType) {
  if (isGoodMatchup(exerciseType, bossType)) return MATCHUP_ADVANTAGE_MULT;
  if (isWeakMatchup(exerciseType, bossType)) return MATCHUP_WEAK_MULT;
  return 1.0;
}

/**
 * Mutate state.player / state.meta — renvoie le nombre de niveaux gagnés.
 * @param {{ player: object, meta: object }} state
 */
export function applyXp(state, amount) {
  state.player.xp += amount;
  let lvl = 0;
  while (state.player.xp >= xpForNextLevel(state.player.level)) {
    state.player.xp -= xpForNextLevel(state.player.level);
    state.player.level += 1;
    lvl += 1;
    state.meta.total_levelups += 1;
    state.player.stats.force += 5;
    state.player.stats.defense += 2;
    state.player.stats.agility += 2;
    state.player.stats.constitution += 8;
    state.player.stats.mana = (state.player.stats.mana || 100) + 10;
    state.player.stats.hp_current = state.player.stats.constitution;
    state.player.stats.mp_current = state.player.stats.mana;
  }
  return lvl;
}
