/**
 * Limites — équivalent des Limit Breaks FF7.
 * La barre se remplit en prenant des dégâts. Quand elle est pleine, le joueur
 * peut déclencher sa Limite équipée. La barre repart à 0 après usage.
 *
 * unlock.type : 'level' | 'kill_count' | 'limit_uses' | 'quest'
 * effect      : 'damage_flat' | 'damage_pct' | 'heal_flat' | 'heal_pct' | 'buff_atk'
 * value       : dégâts/soin plat, % boss HP × 100 (ex: 20 = 20%), ou nb exercices boostés
 */
export const limits = [

  // ─── TIER 1 ────────────────────────────────────────────────────────────────
  {
    id: 'blade_rush',
    name: 'Ruée Tranchante',
    tier: 1,
    icon: 'sword-clash',
    effect: 'damage_flat',
    value: 220,
    barRequired: 1.0,
    desc: 'Une charge furieuse qui laboure l\'ennemi de coups rapides.',
    unlock: { type: 'level', value: 1 },  // débloquée dès le départ
  },
  {
    id: 'battle_surge',
    name: 'Surge de Bataille',
    tier: 1,
    icon: 'power-lightning',
    effect: 'buff_atk',
    value: 3,         // 3 prochains exercices font ×2 dégâts
    barRequired: 1.0,
    desc: 'L\'adrénaline monte. Tes 3 prochains exercices infligent le double de dégâts.',
    unlock: { type: 'level', value: 5 },
  },
  {
    id: 'iron_will',
    name: 'Volonté d\'Acier',
    tier: 1,
    icon: 'heart-shield',
    effect: 'heal_pct',
    value: 40,        // 40 % des PV max
    barRequired: 1.0,
    desc: 'Tu puises dans tes dernières réserves et récupères 40 % de tes PV.',
    unlock: { type: 'kill_count', bossId: 'wolf_alpha', kills: 3 },
  },

  // ─── TIER 2 ────────────────────────────────────────────────────────────────
  {
    id: 'limit_slash',
    name: 'Taillade Limite',
    tier: 2,
    icon: 'sword-spin',
    effect: 'damage_pct',
    value: 20,        // 20 % des PV max du boss
    barRequired: 1.0,
    desc: 'Un coup d\'une violence absolue qui arrache 20 % des PV du boss.',
    unlock: { type: 'level', value: 15 },
  },
  {
    id: 'crimson_wave',
    name: 'Vague Écarlate',
    tier: 2,
    icon: 'blood-swirl',
    effect: 'damage_flat',
    value: 500,
    barRequired: 1.0,
    desc: 'Une onde de choc écarlate qui dévaste tout sur son passage.',
    unlock: { type: 'limit_uses', limitId: 'blade_rush', uses: 10 },
  },
  {
    id: 'phoenix_wake',
    name: 'Éveil du Phénix',
    tier: 2,
    icon: 'fire-bird',
    effect: 'heal_pct',
    value: 70,        // 70 % des PV max
    barRequired: 1.0,
    desc: 'Tu renaîs de tes cendres. Récupère 70 % de tes PV et booste ton prochain exercice.',
    unlock: { type: 'kill_count', bossId: 'wolf_king', kills: 1 },
  },

  // ─── TIER 3 ────────────────────────────────────────────────────────────────
  {
    id: 'omega_break',
    name: 'Rupture Oméga',
    tier: 3,
    icon: 'omega',
    effect: 'damage_pct',
    value: 35,        // 35 % des PV max du boss
    barRequired: 1.0,
    desc: 'La technique ultime. Arrache 35 % des PV du boss en un seul coup dévastateur.',
    unlock: { type: 'level', value: 30 },
  },
  {
    id: 'ultima',
    name: 'Ultima',
    tier: 3,
    icon: 'explosive-meeting',
    effect: 'damage_flat',
    value: 1200,
    barRequired: 1.0,
    desc: 'L\'attaque la plus destructrice connue. Rien ne lui résiste.',
    unlock: { type: 'limit_uses', limitId: 'limit_slash', uses: 5 },
  },
];

export function getLimitById(id) {
  return limits.find((l) => l.id === id) || null;
}

export function getLimitsByTier(tier) {
  return limits.filter((l) => l.tier === tier);
}
