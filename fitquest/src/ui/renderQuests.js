import { uiCtx } from './renderContext.js';
import { listQuestsUi } from '../core/questEngine.js';

const TAB_CONFIG = [
  { key: 'daily',     label: '📅 Quotidiennes' },
  { key: 'zone',      label: '🗺 Zones'        },
  { key: 'challenge', label: '⚔️ Défis'        },
];

let activeQuestTab = 'daily';

function questCardHtml(q) {
  const pct = q.done ? 100 : Math.min(100, Math.round((q.current / q.target) * 100));
  const status = q.done ? '✓ Terminée' : `${q.current} / ${q.target}`;
  const completable = !q.done && q.current >= q.target;
  return `<div class="quest-card ${q.done ? 'quest-done' : ''} ${completable ? 'quest-completable' : ''}">
    <div class="quest-title">${q.title}${completable ? ' <span class="quest-ready-badge">À réclamer !</span>' : ''}</div>
    <div class="quest-desc">${q.desc}</div>
    <div class="quest-meta"><span>${status}</span><span class="quest-reward">💰 +${q.rewardGold}</span></div>
    <div class="quest-bar"><div class="quest-bar-fill" style="width:${pct}%"></div></div>
  </div>`;
}

export function renderQuestsView() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const list = listQuestsUi(state);

  const tabsHtml = TAB_CONFIG.map(({ key, label }) => {
    const tabQuests = list.filter((q) => (q.category || 'challenge') === key);
    const completable = tabQuests.filter((q) => !q.done && q.current >= q.target).length;
    const doneCount = tabQuests.filter((q) => q.done).length;
    const total = tabQuests.length;
    const badge = completable > 0 ? `<span class="quest-tab-badge">${completable}</span>` : '';
    const counter = total > 0 ? `<span class="quest-tab-counter">${doneCount}/${total}</span>` : '';
    return `<button class="quest-tab ${activeQuestTab === key ? 'active' : ''}" data-qtab="${key}">${label}${badge}${counter}</button>`;
  }).join('');

  // Sort: completable first ("à réclamer"), then in-progress, then done
  const activeQuests = list
    .filter((q) => (q.category || 'challenge') === activeQuestTab)
    .sort((a, b) => {
      const scoreA = a.done ? 0 : a.current >= a.target ? 2 : 1;
      const scoreB = b.done ? 0 : b.current >= b.target ? 2 : 1;
      return scoreB - scoreA;
    });

  const rows = activeQuests.length
    ? activeQuests.map(questCardHtml).join('')
    : `<div class="empty-state"><span class="icon">📜</span>Aucune quête dans cette catégorie.</div>`;

  $('questsContent').innerHTML = `
    <div class="quest-tabs">${tabsHtml}</div>
    <div class="quest-list">${rows}</div>
    <p style="font-size:11px;color:var(--text-dim);text-align:center;margin-top:14px;">Les récompenses d'or sont créditées à la complétion.</p>`;

  $('questsContent').querySelectorAll('.quest-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeQuestTab = btn.dataset.qtab;
      renderQuestsView();
    });
  });
}

/** Met à jour le badge sur le bouton Quêtes du dashboard. */
export function updateQuestBadge(state) {
  const badge = document.getElementById('questBadge');
  const btn = document.getElementById('btnQuests');
  if (!badge) return;
  const list = listQuestsUi(state);
  const completable = list.filter((q) => !q.done && q.current >= q.target).length;
  if (completable > 0) {
    badge.textContent = completable;
    badge.style.display = 'flex';
    btn && btn.classList.add('quest-btn--active');
  } else {
    badge.style.display = 'none';
    btn && btn.classList.remove('quest-btn--active');
  }
}
