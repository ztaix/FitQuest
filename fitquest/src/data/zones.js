export const ZONE_SVG = {
  forest: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" style="width:100%;height:100%">
    <rect width="400" height="200" fill="#0f2e1a"/>
    <ellipse cx="200" cy="220" rx="280" ry="120" fill="#1a4a2a"/>
    <polygon points="60,160 90,80 120,160" fill="#1d5c30"/>
    <polygon points="80,160 120,60 160,160" fill="#256b38"/>
    <polygon points="160,160 200,70 240,160" fill="#1d5c30"/>
    <polygon points="240,160 280,55 320,160" fill="#256b38"/>
    <polygon points="280,160 320,75 360,160" fill="#1d5c30"/>
    <polygon points="20,160 55,90 90,160" fill="#163d22"/>
    <circle cx="200" cy="40" r="18" fill="#ffd700" opacity="0.15"/>
    <circle cx="200" cy="40" r="10" fill="#ffd700" opacity="0.25"/>
  </svg>`,
  swamp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" style="width:100%;height:100%">
    <rect width="400" height="200" fill="#1a0a2e"/>
    <ellipse cx="200" cy="180" rx="300" ry="60" fill="#2d1458" opacity="0.8"/>
    <rect x="0" y="130" width="400" height="70" fill="#1f0d3d" opacity="0.6"/>
    <ellipse cx="100" cy="150" rx="80" ry="20" fill="#3b1f6e" opacity="0.5"/>
    <ellipse cx="300" cy="155" rx="100" ry="18" fill="#3b1f6e" opacity="0.5"/>
    <line x1="50" y1="160" x2="50" y2="80" stroke="#4a2a7a" stroke-width="3"/>
    <line x1="150" y1="160" x2="145" y2="70" stroke="#4a2a7a" stroke-width="2"/>
    <line x1="310" y1="160" x2="315" y2="85" stroke="#4a2a7a" stroke-width="3"/>
    <circle cx="120" cy="100" r="3" fill="#c084fc" opacity="0.6"/>
    <circle cx="280" cy="90" r="2" fill="#c084fc" opacity="0.5"/>
    <circle cx="200" cy="110" r="2" fill="#c084fc" opacity="0.4"/>
  </svg>`,
  crystal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" style="width:100%;height:100%">
    <rect width="400" height="200" fill="#061e2e"/>
    <polygon points="80,160 100,80 120,160" fill="#0e4a6a" opacity="0.8"/>
    <polygon points="110,160 140,50 170,160" fill="#0e6b8a" opacity="0.9"/>
    <polygon points="180,160 210,60 240,160" fill="#0e7a9a" opacity="0.8"/>
    <polygon points="250,160 275,75 300,160" fill="#0e6b8a" opacity="0.9"/>
    <polygon points="310,160 330,90 350,160" fill="#0e4a6a" opacity="0.8"/>
    <polygon points="80,160 100,80 120,160" fill="#22d3ee" opacity="0.15"/>
    <polygon points="110,160 140,50 170,160" fill="#22d3ee" opacity="0.2"/>
    <polygon points="180,160 210,60 240,160" fill="#22d3ee" opacity="0.25"/>
    <polygon points="250,160 275,75 300,160" fill="#22d3ee" opacity="0.2"/>
    <circle cx="140" cy="80" r="4" fill="#67e8f9" opacity="0.8"/>
    <circle cx="210" cy="60" r="5" fill="#67e8f9" opacity="0.9"/>
    <circle cx="275" cy="75" r="3" fill="#67e8f9" opacity="0.7"/>
  </svg>`,
  default: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" style="width:100%;height:100%">
    <rect width="400" height="200" fill="#1a1a2e"/>
    <circle cx="200" cy="100" r="60" fill="#2a2a4e" opacity="0.5"/>
    <text x="200" y="110" text-anchor="middle" fill="#888" font-size="14">Zone inconnue</text>
  </svg>`,
};

export const zones = [
  {id:'foret',name:'Forêt de Débutant',element:'wind',levelMin:1,levelMax:15,requiredLevel:1,requiredRegionalBoss:null,regionalBossId:'wolf_king',enterStepCost:0,travelKm:0,themeColor:'#22c55e',accent:'#86efac',desc:'Une forêt sombre et silencieuse. Les sentiers serpentent entre des arbres millénaires.',bgImage:'/environnements/foret-dashboard.png',combatBgImage:'/environnements/foret-combat.png',preSessionBgImage:'/environnements/foret-presession.png',svgKey:'forest'},
  {id:'marais',name:'Marais des Ombres',element:'dark',levelMin:16,levelMax:30,requiredLevel:12,requiredRegionalBoss:'wolf_king',regionalBossId:'corrupted_dryad',enterStepCost:0,travelKm:2,themeColor:'#a855f7',accent:'#c084fc',desc:'Brume violette et eaux stagnantes. Les ombres grouillent dans les roseaux.',bgImage:'/environnements/marais-dashboard.png',combatBgImage:'/environnements/marais-combat.png',preSessionBgImage:'/environnements/marais-presession.png',svgKey:'swamp'},
  {id:'caverne',name:'Caverne de Cristal',element:'water',levelMin:31,levelMax:50,requiredLevel:28,requiredRegionalBoss:'corrupted_dryad',regionalBossId:null,enterStepCost:0,travelKm:5,themeColor:'#22d3ee',accent:'#67e8f9',desc:'Profondeurs scintillantes. Les cristaux résonnent d\'une magie ancienne.',bgImage:'/environnements/caverne-dashboard.png',combatBgImage:'/environnements/caverne-combat.png',preSessionBgImage:'/environnements/caverne-presession.png',svgKey:'crystal'}
];
