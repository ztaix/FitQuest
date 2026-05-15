/**
 * Definitions quetes solo (IDs stables pour la sauvegarde).
 * category : 'daily' | 'zone' | 'challenge'
 */

export const QUEST_DEFINITIONS = [
  // QUOTIDIENNES
  {
    id: 'tutorial_session',
    title: 'Premiere seance',
    desc: 'Terminez une seance d\'entrainement (au moins un exercice valide).',
    kind: 'sessions_complete',
    target: 1,
    rewardGold: 25,
    category: 'daily',
  },
  {
    id: 'sessions_5',
    title: 'Guerrier regulier',
    desc: 'Terminez 5 seances d\'entrainement.',
    kind: 'sessions_complete',
    target: 5,
    rewardGold: 80,
    category: 'daily',
  },
  {
    id: 'sessions_20',
    title: 'Athlete confirme',
    desc: 'Terminez 20 seances d\'entrainement.',
    kind: 'sessions_complete',
    target: 20,
    rewardGold: 200,
    category: 'daily',
  },
  {
    id: 'walker_forest',
    title: 'Marche vers l\'inconnu',
    desc: 'Accumulez 2 500 pas de marche.',
    kind: 'steps_total',
    target: 2500,
    rewardGold: 40,
    category: 'daily',
  },
  {
    id: 'walker_10k',
    title: 'Marcheur infatigable',
    desc: 'Accumulez 10 000 pas de marche.',
    kind: 'steps_total',
    target: 10000,
    rewardGold: 120,
    category: 'daily',
  },
  // ZONES
  {
    id: 'zones_2',
    title: 'Explorateur',
    desc: 'Visitez 2 zones differentes.',
    kind: 'zones_visited',
    target: 2,
    rewardGold: 60,
    category: 'zone',
  },
  {
    id: 'zones_4',
    title: 'Grand Voyageur',
    desc: 'Visitez 4 zones differentes.',
    kind: 'zones_visited',
    target: 4,
    rewardGold: 150,
    category: 'zone',
  },
  // DEFIS
  {
    id: 'slayer_1',
    title: 'Chasseur de monstres',
    desc: 'Vainquez 1 boss.',
    kind: 'bosses_defeated',
    target: 1,
    rewardGold: 75,
    category: 'challenge',
  },
  {
    id: 'slayer_10',
    title: 'Massacreur',
    desc: 'Vainquez 10 boss.',
    kind: 'bosses_defeated',
    target: 10,
    rewardGold: 300,
    category: 'challenge',
  },
  {
    id: 'slayer_50',
    title: 'Legende vivante',
    desc: 'Vainquez 50 boss.',
    kind: 'bosses_defeated',
    target: 50,
    rewardGold: 1000,
    category: 'challenge',
  },
];
