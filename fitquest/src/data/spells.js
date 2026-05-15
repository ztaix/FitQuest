export const spells = [
  // ===== DÉPART =====
  {id:'fireball',name:'Boule de Feu',icon:'fire-ball',element:'fire',manaCost:20,effect:'damage_flat',value:30,oncePerCombat:false,desc:'Une sphère ardente jaillit de tes paumes.'},
  {id:'holy_light',name:'Lumière Sacrée',icon:'sun-priest',element:'holy',manaCost:25,effect:'heal_flat',value:60,oncePerCombat:false,desc:'Un rayon doré t\'enveloppe et guérit tes blessures.'},
  {id:'wind_strike',name:'Trait de Vent',icon:'wind-slap',element:'wind',manaCost:15,effect:'damage_flat',value:20,oncePerCombat:false,desc:'Un coup d\'air tranchant et précis.'},
  // ===== DÉBLOQUABLES =====
  {id:'ice_lance',name:'Lance de Glace',icon:'ice-bolt',element:'water',manaCost:25,effect:'damage_flat',value:35,oncePerCombat:false,desc:'Une lance de glace transperce l\'ennemi de part en part.'},
  {id:'thunder_bolt',name:'Éclair Foudroyant',icon:'lightning-bolt',element:'wind',manaCost:30,effect:'damage_flat',value:45,oncePerCombat:false,desc:'La foudre s\'abat sur le boss avec fracas.'},
  {id:'poison_cloud',name:'Nuage Toxique',icon:'cloud',element:'dark',manaCost:20,effect:'damage_flat',value:25,oncePerCombat:false,desc:'Un brouillard corrosif enveloppe et brûle l\'ennemi.'},
  {id:'divine_shield',name:'Bouclier Divin',icon:'shield',element:'holy',manaCost:40,effect:'heal_flat',value:80,oncePerCombat:false,desc:'Une protection lumineuse absorbe les prochains coups.'},
  {id:'regen_aura',name:'Aura de Régénération',icon:'healing',element:'holy',manaCost:35,effect:'heal_flat',value:50,oncePerCombat:false,desc:'Tu récupères progressivement tes forces au fil du combat.'},
  {id:'shadow_strike',name:'Frappe des Ombres',icon:'shadow-grasp',element:'dark',manaCost:30,effect:'damage_flat',value:40,oncePerCombat:false,desc:'Une attaque furtive jaillit depuis les ténèbres.'},
  {id:'blizzard',name:'Blizzard',icon:'snowflake',element:'water',manaCost:45,effect:'damage_flat',value:60,oncePerCombat:false,desc:'Une tempête de glace martèle l\'ennemi sans relâche.'},
  // ===== ULTIMES (1× par combat) =====
  {id:'meteor',name:'Météore',icon:'meteor-impact',element:'fire',manaCost:60,effect:'damage_flat',value:100,oncePerCombat:true,desc:'Un rocher enflammé s\'écrase sur l\'ennemi. Imparable.'},
  {id:'full_restore',name:'Restauration Totale',icon:'health-normal',element:'holy',manaCost:80,effect:'heal_flat',value:200,oncePerCombat:true,desc:'Tu es entièrement soigné en plein combat.'},
];
