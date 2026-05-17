/**
 * 10 Invocations — système inspiré de FF7.
 * Jauge : se remplit à chaque contre-attaque du boss (+25% par coup reçu).
 * Usage : 1 invocation par jauge pleine. Chaque invocation = 1 usage par combat.
 * Max 3 invocations différentes équipées simultanément.
 *
 * Obtention :
 *  - 'drop:<boss_id>'   → drop rare du boss concerné
 *  - 'quest'            → récompense d'une quête spéciale
 *  - 'forge'            → recette forgeron légendaire (matériaux rares)
 *  - 'regional'         → drop du boss régional
 */
export const summons = [
  {
    id: 'titan',
    name: 'Titan',
    icon: '🗿',
    element: 'earth',
    rarity: 'rare',
    desc: 'Le colosse de pierre soulève la terre et écrase l\'ennemi sous son poing de granite.',
    flavor: '« La montagne ne fléchit pas. »',
    effect: {
      type: 'damage_force',   // dégâts fixes + bonus force joueur
      baseDamage: 100,
      statScale: { stat: 'force', mult: 1.5 }, // + force × 1.5
    },
    sideEffect: null,
    obtain: 'drop:giant_boar',
    obtainDesc: 'Drop rare du Sanglier Géant',
    gaugeRequired: 1.0,
  },
  {
    id: 'shiva',
    name: 'Shiva',
    icon: '❄️',
    element: 'ice',
    rarity: 'rare',
    desc: 'La reine des glaces enveloppe le champ de bataille d\'un blizzard paralysant.',
    flavor: '« Le froid n\'est pas une punition, c\'est une vérité. »',
    effect: {
      type: 'damage_flat',
      baseDamage: 110,
    },
    sideEffect: { type: 'boss_weaken', turns: 1, reduction: 0.5, label: 'Shiva a réduit l\'attaque du boss de 50% pendant 1 tour !' },
    obtain: 'drop:corrupted_dryad',
    obtainDesc: 'Drop rare de la Dryade Corrompue',
    gaugeRequired: 1.0,
  },
  {
    id: 'ifrit',
    name: 'Ifrit',
    icon: '🔥',
    element: 'fire',
    rarity: 'rare',
    desc: 'Le seigneur du feu déferle en flammes et réduit tout sur son passage en cendres.',
    flavor: '« La flamme ne demande pas la permission. »',
    effect: {
      type: 'damage_flat',
      baseDamage: 130,
    },
    sideEffect: null,
    obtain: 'drop:goblin_woods',
    obtainDesc: 'Drop rare du Gobelin des Bois',
    gaugeRequired: 1.0,
  },
  {
    id: 'ramuh',
    name: 'Ramuh',
    icon: '⚡',
    element: 'lightning',
    rarity: 'epic',
    desc: 'Le sage à la foudre frappe d\'un éclair dévastateur qui paralyse momentanément l\'ennemi.',
    flavor: '« Le jugement tombe vite et sans appel. »',
    effect: {
      type: 'damage_flat',
      baseDamage: 180,
    },
    sideEffect: { type: 'boss_stun', turns: 1, label: 'Ramuh a étourdi le boss ! Il ne contre-attaque pas ce tour !' },
    obtain: 'drop:wolf_alpha',
    obtainDesc: 'Drop rare du Loup Alpha',
    gaugeRequired: 1.0,
  },
  {
    id: 'leviathan',
    name: 'Léviathan',
    icon: '🌊',
    element: 'water',
    rarity: 'epic',
    desc: 'Le serpent des mers surgit et déchaîne un torrent purificateur, blessant l\'ennemi et soignant l\'âme.',
    flavor: '« L\'eau donne et reprend à sa guise. »',
    effect: {
      type: 'damage_flat',
      baseDamage: 150,
    },
    sideEffect: { type: 'heal_pct', value: 0.3, label: 'Léviathan vous restaure 30% de vos PV max !' },
    obtain: 'drop:swamp_troll',
    obtainDesc: 'Drop rare du Troll des Marais',
    gaugeRequired: 1.0,
  },
  {
    id: 'odin',
    name: 'Odin',
    icon: '☠️',
    element: 'dark',
    rarity: 'epic',
    desc: 'Le dieu de la mort galope sur Sleipnir et tranche l\'ennemi d\'un seul coup d\'Odinfell.',
    flavor: '« Certains destin ne connaissent pas d\'appel. »',
    effect: {
      type: 'instakill_or_damage', // si boss < 30% PV : mort instantanée, sinon dégâts
      baseDamage: 200,
      instakillThreshold: 0.30,
    },
    sideEffect: null,
    obtain: 'drop:witch_woods',
    obtainDesc: 'Drop rare de la Sorcière des Bois',
    gaugeRequired: 1.0,
  },
  {
    id: 'alexander',
    name: 'Alexander',
    icon: '🏰',
    element: 'holy',
    rarity: 'epic',
    desc: 'La forteresse sacrée descend du ciel et écrase l\'ennemi d\'une lumière divine, restaurant votre mana.',
    flavor: '« Le sacré protège autant qu\'il détruit. »',
    effect: {
      type: 'damage_flat',
      baseDamage: 160,
    },
    sideEffect: { type: 'restore_mp', value: 35, label: 'Alexander restaure 35 MP !' },
    obtain: 'quest',
    obtainDesc: 'Récompense de la quête "Lumière des Anciens" (vaincre 10 boss)',
    gaugeRequired: 1.0,
  },
  {
    id: 'bahamut',
    name: 'Bahamut',
    icon: '🐲',
    element: 'wind',
    rarity: 'legendary',
    desc: 'Le roi des dragons plonge du ciel et souffle son Mégaflare dévastateur sur tout ennemi.',
    flavor: '« Face au roi des dragons, l\'orgueil se tait. »',
    effect: {
      type: 'damage_flat',
      baseDamage: 350,
    },
    sideEffect: null,
    obtain: 'regional:wolf_king',
    obtainDesc: 'Drop du Boss Régional Roi des Loups',
    gaugeRequired: 1.0,
  },
  {
    id: 'phoenix',
    name: 'Phénix',
    icon: '🦅',
    element: 'fire',
    rarity: 'legendary',
    desc: 'L\'oiseau de feu renaît de ses cendres et brûle l\'ennemi tout en purifiant le champion.',
    flavor: '« De la cendre naît la force. »',
    effect: {
      type: 'damage_flat',
      baseDamage: 220,
    },
    sideEffect: { type: 'conditional_heal', hpThreshold: 0.4, healTo: 0.65, label: 'Phénix vous soigne à 65% de vos PV !' },
    obtain: 'drop:cursed_fairy',
    obtainDesc: 'Drop rare de la Fée Maudite',
    gaugeRequired: 1.0,
  },
  {
    id: 'knights_of_round',
    name: 'Chevaliers de la Table',
    icon: '⚔️',
    element: null,
    rarity: 'legendary',
    desc: 'Treize chevaliers légendaires surgissent et frappent l\'ennemi à tour de rôle dans un ballet d\'acier.',
    flavor: '« Seuls les plus vaillants méritent leur aide. »',
    effect: {
      type: 'multihit', // 5 frappes de 100 dégâts chacune
      hits: 5,
      baseDamagePerHit: 100,
    },
    sideEffect: null,
    obtain: 'forge',
    obtainDesc: 'Forge légendaire : 3× Fang d\'Argent + 2× Cristal de Mana + 1× Os Runique',
    gaugeRequired: 1.0,
  },
];
