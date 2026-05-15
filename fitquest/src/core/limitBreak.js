/**
 * Système de Limite — équivalent des Limit Breaks de FF7.
 * La barre se remplit quand le joueur prend des dégâts.
 * Quand elle est pleine (≥ barRequired), il peut déclencher sa Limite équipée.
 * La barre repart à 0 après usage. Elle persiste entre les sessions.
 */
import { limits, getLimitById } from '../data/limits.js';

// ─── Helpers défensifs ────────────────────────────────────────────────────────

function ensureLimitFields(state) {
  const p = state.player;
  if (typeof p.limitBar !== 'number') p.limitBar = 0;
  if (!Array.isArray(p.knownLimits)) p.knownLimits = ['blade_rush'];
  if (!p.equippedLimit) p.equippedLimit = 'blade_rush';
  if (typeof p.limitUsesCount !== 'object' || !p.limitUsesCount) p.limitUsesCount = {};
  if (typeof p.bossKillCounts !== 'object' || !p.bossKillCounts) p.bossKillCounts = {};
}

// ─── Remplissage de la barre ──────────────────────────────────────────────────

/**
 * Appeler après chaque contre-attaque boss.
 * Taux : +damage / constitution × 1.5 → barre pleine en ~4 coups reçus.
 */
export function fillLimitBar(state, damage) {
  ensureLimitFields(state);
  const maxHp = state.player.stats.constitution || 100;
  const fill = (damage / maxHp) * 1.5;
  state.player.limitBar = Math.min(1.0, state.player.limitBar + fill);
}

// ─── Déclenchement ───────────────────────────────────────────────────────────

/**
 * Déclenche la Limite équipée.
 * Retourne l'objet limit si OK, null sinon (barre insuffisante, pas de Limite, etc.).
 */
export function triggerLimit(state) {
  ensureLimitFields(state);
  const limitId = state.player.equippedLimit;
  if (!limitId) return null;
  const limit = getLimitById(limitId);
  if (!limit) return null;
  if (state.player.limitBar < limit.barRequired) return null;

  state.player.limitBar = 0;
  state.player.limitUsesCount[limitId] = (state.player.limitUsesCount[limitId] || 0) + 1;
  return limit;
}

// ─── Application des effets ───────────────────────────────────────────────────

/**
 * Applique l'effet de la Limite sur le boss ou le joueur.
 * @param {object} state
 * @param {object} limit  — objet de limits.js
 * @returns {{ dmg: number, heal: number, buffTurns: number, msg: string }}
 */
export function applyLimitEffect(state, limit) {
  const result = { dmg: 0, heal: 0, buffTurns: 0, msg: '' };

  switch (limit.effect) {
    case 'damage_flat': {
      result.dmg = limit.value;
      state.boss.current.hp = Math.max(0, state.boss.current.hp - result.dmg);
      result.msg = `💥 <strong>${limit.name}</strong> ! <strong>-${result.dmg} dégâts</strong>`;
      break;
    }
    case 'damage_pct': {
      result.dmg = Math.round(state.boss.current.hp_max * (limit.value / 100));
      state.boss.current.hp = Math.max(0, state.boss.current.hp - result.dmg);
      result.msg = `💥 <strong>${limit.name}</strong> ! <strong>-${result.dmg} dégâts (${limit.value}% PV boss)</strong>`;
      break;
    }
    case 'heal_flat': {
      const before1 = state.player.stats.hp_current;
      state.player.stats.hp_current = Math.min(state.player.stats.constitution, before1 + limit.value);
      result.heal = state.player.stats.hp_current - before1;
      result.msg = `💥 <strong>${limit.name}</strong> ! <strong>+${result.heal} PV récupérés</strong>`;
      break;
    }
    case 'heal_pct': {
      const healAmt = Math.round(state.player.stats.constitution * (limit.value / 100));
      const before2 = state.player.stats.hp_current;
      state.player.stats.hp_current = Math.min(state.player.stats.constitution, before2 + healAmt);
      result.heal = state.player.stats.hp_current - before2;
      result.msg = `💥 <strong>${limit.name}</strong> ! <strong>+${result.heal} PV récupérés (${limit.value}%)</strong>`;
      break;
    }
    case 'buff_atk': {
      // Arme N exercices consécutifs à ×2 dégâts (stocké dans session)
      state.session_current.limitBuffTurns = (state.session_current.limitBuffTurns || 0) + limit.value;
      result.buffTurns = limit.value;
      result.msg = `💥 <strong>${limit.name}</strong> ! <strong>${limit.value} prochains exercices × 2 dégâts</strong>`;
      break;
    }
    default:
      result.msg = `💥 <strong>${limit.name}</strong> déclenchée !`;
  }

  return result;
}

// ─── Vérification des déblocages ──────────────────────────────────────────────

/**
 * Vérifie si de nouvelles Limites doivent être débloquées.
 * À appeler après victoire, montée de niveau, ou usage d'une Limite.
 * @returns {string[]} noms des Limites nouvellement débloquées
 */
export function checkLimitUnlocks(state) {
  ensureLimitFields(state);
  const unlocked = [];

  for (const limit of limits) {
    if (state.player.knownLimits.includes(limit.id)) continue;
    const u = limit.unlock;
    let should = false;

    if (u.type === 'level') {
      should = state.player.level >= u.value;
    } else if (u.type === 'kill_count') {
      const kills = (state.player.bossKillCounts || {})[u.bossId] || 0;
      should = kills >= u.kills;
    } else if (u.type === 'limit_uses') {
      const uses = (state.player.limitUsesCount || {})[u.limitId] || 0;
      should = uses >= u.uses;
    } else if (u.type === 'quest') {
      should = (state.quests.completedIds || []).includes(u.questId);
    }

    if (should) {
      state.player.knownLimits.push(limit.id);
      unlocked.push(limit.name);
    }
  }

  return unlocked;
}

// ─── Utilitaire UI ────────────────────────────────────────────────────────────

/** Retourne la Limite équipée (objet complet) ou null. */
export function getEquippedLimit(state) {
  ensureLimitFields(state);
  return getLimitById(state.player.equippedLimit);
}
