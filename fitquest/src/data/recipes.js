export const recipes_blacksmith = [
  // Common
  {weaponId:'sword_rusty',     materials:[{id:'iron_raw',qty:2},{id:'wood_dark',qty:1}],gold:50},
  {weaponId:'axe_woodcutter',  materials:[{id:'wood_dark',qty:2},{id:'iron_raw',qty:1}],gold:60},
  {weaponId:'dagger_swift',    materials:[{id:'iron_raw',qty:1},{id:'silver_fang',qty:1}],gold:80},
  {weaponId:'hammer_stone',    materials:[{id:'iron_raw',qty:3},{id:'wood_dark',qty:1}],gold:70},
  {weaponId:'leather_armor',   materials:[{id:'wood_dark',qty:2},{id:'silver_fang',qty:2}],gold:90},
  {weaponId:'shield_wooden',   materials:[{id:'wood_dark',qty:3},{id:'iron_raw',qty:1}],gold:75},
  {weaponId:'iron_boots',      materials:[{id:'iron_raw',qty:2},{id:'rune_bone',qty:1}],gold:100},
  // Rare
  {weaponId:'bow_hunter',      materials:[{id:'wood_dark',qty:3},{id:'silver_fang',qty:1}],gold:120},
  {weaponId:'sword_knight',    materials:[{id:'silver_fang',qty:3},{id:'iron_raw',qty:2},{id:'rune_bone',qty:1}],gold:200},
  {weaponId:'crossbow_hunter', materials:[{id:'wood_dark',qty:3},{id:'iron_raw',qty:2},{id:'silver_fang',qty:2}],gold:180},
  {weaponId:'sword_steel',     materials:[{id:'iron_raw',qty:4},{id:'rune_bone',qty:2}],gold:220},
  {weaponId:'shield_iron',     materials:[{id:'iron_raw',qty:3},{id:'silver_fang',qty:2}],gold:190},
  {weaponId:'chainmail',       materials:[{id:'iron_raw',qty:4},{id:'rune_bone',qty:2}],gold:230},
  {weaponId:'iron_helmet',     materials:[{id:'iron_raw',qty:3},{id:'rune_bone',qty:1}],gold:170},
  // Epic
  {weaponId:'staff_druid',        materials:[{id:'wood_dark',qty:2},{id:'rune_bone',qty:2},{id:'mana_crystal',qty:2}],gold:400},
  {weaponId:'greatsword_warrior', materials:[{id:'silver_fang',qty:4},{id:'rune_bone',qty:3},{id:'iron_raw',qty:3}],gold:500},
  {weaponId:'bow_elven',          materials:[{id:'wood_dark',qty:4},{id:'silver_fang',qty:3},{id:'mana_crystal',qty:2}],gold:450},
  {weaponId:'crystal_staff',      materials:[{id:'mana_crystal',qty:4},{id:'rune_bone',qty:2},{id:'crystal_shard',qty:2}],gold:600},
  {weaponId:'shadow_cloak',       materials:[{id:'rune_bone',qty:3},{id:'mana_crystal',qty:2},{id:'obsidian_chip',qty:2}],gold:550},
  // Legendary — drops boss uniquement (dragon_blade, frost_shield)
];

export const recipes_witch = [
  {id:'potion_heal',name:'Potion de soin',icon:'standing-potion',rarity:'common',desc:'+50 PV en combat.',effect:'heal',ingredients:[{id:'moon_herb',qty:2}],gold:0},
  {id:'potion_mana',name:'Potion de mana',icon:'magic-potion',rarity:'common',desc:'+30 MP en combat.',effect:'mana',ingredients:[{id:'fairy_tear',qty:1},{id:'moon_herb',qty:1}],gold:20},
  {id:'potion_fury', name:'Potion de furie',icon:'fire-potion',rarity:'rare',desc:'Prochain exercice x2 dégâts.',effect:'buff_atk',ingredients:[{id:'wolf_blood',qty:2},{id:'moon_herb',qty:1}],gold:50},
];
