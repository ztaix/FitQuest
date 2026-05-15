import { RARITY_COLORS, FALLBACK_MAT, FALLBACK_ING } from '../data/constants.js';
import { uiCtx } from './renderContext.js';

export function showSummaryModal(s) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const b = s.remainingBoss;
  let levelUpHtml =
    s.levelsGained > 0
      ? `<div class="levelup-banner"><div class="title">🎉 Niveau supérieur !</div><div class="sub">Vous êtes maintenant niveau ${state.player.level}<br><small>+5 Force, +3 Défense, +2 Vitesse, +10 PV, +10 MP</small></div></div>`
      : '';
  const recordsLine = s.records.length
    ? `<div class="summary-stat"><span class="label">🏆 Records battus</span><span class="value">${s.records.length}</span></div><div style="font-size:11px;color:var(--gold-bright);text-align:center;margin-top:-6px;margin-bottom:6px;">${s.records.map(r => r.statLabel ? `+1 ${r.statLabel}` : '').filter(Boolean).join(' · ')}</div>`
    : '';
  const bossStatus = b
    ? `<div style="text-align:center;padding:12px;background:rgba(196,30,58,0.1);border:1px solid var(--blood);border-radius:8px;margin-bottom:14px;color:var(--blood-bright);font-size:12px;">⚔ ${b.name} reste à terre, blessé (${b.hp}/${b.hp_max} PV). Reprenez la séance plus tard pour l'achever.</div>`
    : '';
  $('summaryLevelUp').innerHTML = levelUpHtml;
  $('summaryContent').innerHTML = `${bossStatus}<div class="summary-stat big"><span class="label">⚔ Dégâts infligés</span><span class="value">${s.totalDamage}</span></div><div class="summary-stat"><span class="label">💔 Dégâts reçus</span><span class="value">${s.totalReceived}</span></div><div class="summary-stat"><span class="label">✅ Exercices complétés</span><span class="value">${s.completed} / ${s.total}</span></div><div class="summary-stat"><span class="label">✨ Expérience gagnée</span><span class="value">+${s.xpGained}</span></div>${recordsLine}`;
  $('summarySubtitle').textContent = 'Vous reprenez votre souffle après le combat.';
  uiCtx.openModal('summaryModal');
}

export function showRecoverySummaryModal() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  $('summaryLevelUp').innerHTML = '';
  $('summaryContent').innerHTML = `<div style="text-align:center;padding:14px;background:rgba(34,197,94,0.15);border:1px solid var(--success);border-radius:8px;color:var(--success);font-family:'Cinzel',serif;font-weight:700;margin-bottom:12px;">⚕ Vous reprenez vos esprits !</div><div class="summary-stat"><span class="label">❤️ Vie restaurée</span><span class="value">${state.player.stats.hp_current} / ${state.player.stats.constitution}</span></div><div class="summary-stat"><span class="label">💧 Mana restaurée</span><span class="value">${state.player.stats.mp_current} / ${state.player.stats.mana}</span></div><div style="font-size:12px;color:var(--text-dim);margin-top:10px;text-align:center;font-style:italic;">Un nouvel adversaire vous attendra à la prochaine séance.</div>`;
  $('summarySubtitle').textContent = 'Le repos a porté ses fruits.';
  uiCtx.openModal('summaryModal');
}

export function showVictoryModal(boss, drops, levelsGained, totalXp) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  let levelUpHtml =
    levelsGained > 0
      ? `<div class="levelup-banner"><div class="title">🎉 Niveau supérieur !</div><div class="sub">Vous êtes maintenant niveau ${state.player.level}<br><small>+5 Force, +3 Défense, +2 Agilité, +10 PV</small></div></div>`
      : '';
  let dropsHtml = '';
  if (drops.length) {
    dropsHtml =
      `<div class="section-label" style="margin-top:14px;"><span>Butin</span></div><div class="item-grid">` +
      drops
        .map((d) => {
          const data =
            d.type === 'material'
              ? uiCtx.allMaterials().find((m) => m.id === d.id)
              : uiCtx.allIngredients().find((i) => i.id === d.id);
          if (!data) return '';
          const color = RARITY_COLORS[data.rarity];
          const fb =
            d.type === 'material'
              ? FALLBACK_MAT[d.id] || FALLBACK_MAT.default
              : FALLBACK_ING[d.id] || FALLBACK_ING.default;
          return `<div class="item-card rarity-${data.rarity}"><div class="qty-badge">×${d.qty}</div><img src="${uiCtx.iconUrl(data.icon, color)}" alt="" onerror="this.outerHTML='<span class=&quot;item-emoji&quot;>${fb}</span>'"><div class="item-name">${data.name}</div><div class="item-rarity-tag">${uiCtx.rarityLabel(data.rarity)}</div></div>`;
        })
        .join('') +
      `</div>`;
  } else {
    dropsHtml =
      '<div style="text-align:center;font-size:12px;color:var(--text-faint);font-style:italic;margin-top:10px;">Aucun butin laissé par le boss cette fois.</div>';
  }
  $('victoryTitle').textContent = `${boss.name} VAINCU !`;
  const lv = state._lastVictory || {};
  let unlockedHtml = '';
  if (lv.unlockedZone) {
    unlockedHtml = `<div class="levelup-banner" style="border-color:var(--success);background:linear-gradient(135deg,rgba(34,197,94,0.2) 0%,rgba(168,85,247,0.1) 100%);"><div class="title" style="color:var(--success);">🗺 Nouvelle zone débloquée !</div><div class="sub">Vous pouvez désormais voyager vers <strong style="color:var(--gold-bright);">${lv.unlockedZone.name}</strong></div></div>`;
  }
  $('victorySubtitle').textContent = boss.isRegionalBoss
    ? '⭐ Boss régional terrassé ! Sa puissance ne reviendra plus.'
    : "La voie s'ouvre devant vous.";
  $('victoryLevelUp').innerHTML = unlockedHtml + levelUpHtml;
  $('victoryContent').innerHTML = `<div class="summary-stat big"><span class="label">💰 Or gagné</span><span class="value">+${lv.goldGain || boss.gold}</span></div><div class="summary-stat"><span class="label">✨ Expérience totale</span><span class="value">+${lv.xpGain || totalXp}</span></div>${dropsHtml}`;
  uiCtx.openModal('victoryModal');
}

export function showDefeatModal(bossName) {
  const $ = uiCtx.$;
  $('defeatContent').innerHTML = `${bossName} vous a terrassé. Vos forces sont brisées.<br><br>⚕ <strong>Vous êtes convalescent.</strong> Pour reprendre l'aventure, vous devez d'abord effectuer un <strong>set d'exercices de récupération</strong>. Vous reviendrez alors avec <strong>50% de vos PV</strong>.`;
  uiCtx.openModal('defeatModal');
}
