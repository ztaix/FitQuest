import { uiCtx } from './renderContext.js';

const TYPE_ICON = { force: '💪', agility: '⚡', endurance: '🫁' };
const TYPE_LABEL = { force: 'Force', agility: 'Vitesse', endurance: 'Endurance' };
const TYPE_CSS = { force: 'type-force', agility: 'type-agility', endurance: 'type-endurance' };
const GROUP_LABEL = { haut: 'Haut du corps', bas: 'Bas du corps', full: 'Corps entier' };

/**
 * Ouvre la modale de détail d'un exercice (GIF + description).
 * @param {string} exerciseId
 */
export function openExerciseDetail(exerciseId) {
  const $ = uiCtx.$;
  const ex = uiCtx.allExercises().find((e) => e.id === exerciseId);
  if (!ex) return;

  // Nom
  $('exDetailName').textContent = ex.name;

  // Badges (type + groupe)
  const typeCls = TYPE_CSS[ex.type] || '';
  $('exDetailBadges').innerHTML = `
    <span class="type-tag ${typeCls} ex-detail-badge">
      <span>${TYPE_ICON[ex.type]}</span>
      <span>${TYPE_LABEL[ex.type]}</span>
    </span>
    <span class="ex-detail-badge ex-detail-badge--group">${GROUP_LABEL[ex.group] || ex.group}</span>
  `;

  // Description
  $('exDetailDesc').textContent = ex.desc || '';

  // Icône de fallback dans le placeholder
  $('exDetailPlaceholderIcon').textContent = TYPE_ICON[ex.type] || '💪';

  // Media : GIF si disponible, sinon placeholder
  const gif = $('exDetailGif');
  const placeholder = $('exDetailPlaceholder');

  if (ex.gifUrl) {
    gif.src = ex.gifUrl;
    gif.alt = ex.name;
    gif.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    gif.src = '';
    gif.style.display = 'none';
    placeholder.style.display = 'flex';
  }

  uiCtx.openModal('exerciseDetailModal');
}
