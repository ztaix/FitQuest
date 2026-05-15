import {
  RARITY_COLORS,
  FALLBACK_BOSS,
  TYPE_ICON,
  TYPE_LABEL,
  TYPE_CSS,
  COUNTER_TYPE,
} from '../data/constants.js';
import { ELEMENTS, elementTag } from '../data/elements.js';
import { ZONE_SVG } from '../data/zones.js';
import {
  getDifficultyTier,
  isGoodMatchup,
  isWeakMatchup,
  getDifficultyScore,
  estimateSessionMinutes,
  matchupMultiplier,
  MATCHUP_WEAK_PCT_LABEL,
} from '../core/progression.js';
import { gameEvents } from '../audio/gameEvents.js';
import { mountBossSprite, getBossSpriteKey } from '../sprites/spritePlayer.js';
import { playBossIdleOrFury } from './renderCombatFx.js';
import { mountBossSpriteDebugStrip } from './bossSpriteDebug.js';
import { bossLevelBadgeUrl } from './gameIcons.js';
import { uiCtx } from './renderContext.js';
import { getEquippedLimit } from '../core/limitBreak.js';

/** Mettre à true pour réafficher « Modifier les exercices » et « Réduire la séance » (pré-séance). */
const SHOW_PRESESSION_TWEAK_ACTIONS = false;

const PRESESSION_LAUNCH_MS = 3000;
/** Durée d’apparition de l’anneau (à garder alignée avec le CSS `presession-ring-enter`) */
const PRESESSION_RING_POP_MS = 420;
let presessionLaunchTimeoutId = null;
let presessionRingFillTimeoutId = null;

let presessionNumExOverride = null;

const COMBAT_ARRIVAL_HALO_MS = 3000;

/**
 * Halo de flou d’arrivée : injecté après le `innerHTML` du bandeau pour survivre aux re-rendus,
 * avec délai d’animation négatif pour rester aligné sur le temps écoulé depuis `startedAt`.
 * @param {HTMLElement | null} bannerEl
 * @param {string} [startedAtIso]
 */
function mountCombatArrivalHalo(bannerEl, startedAtIso) {
  if (!bannerEl || !startedAtIso) return;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  const t0 = Date.parse(startedAtIso);
  if (!Number.isFinite(t0)) return;
  const elapsed = Date.now() - t0;
  if (elapsed < 0 || elapsed >= COMBAT_ARRIVAL_HALO_MS + 200) return;
  const bg = bannerEl.querySelector('.combat-stage-bg');
  if (!bg) return;
  const delay = `-${Math.min(elapsed, COMBAT_ARRIVAL_HALO_MS)}ms`;
  bannerEl.classList.add('combat-arrival-active');
  bannerEl.style.setProperty('--combat-arrival-delay', delay);
  const halo = document.createElement('div');
  halo.className = 'combat-bg-focus-halo';
  halo.setAttribute('aria-hidden', 'true');
  halo.style.animationDelay = delay;
  bg.insertAdjacentElement('afterend', halo);
  window.setTimeout(
    () => {
      bannerEl.classList.remove('combat-arrival-active');
      bannerEl.style.removeProperty('--combat-arrival-delay');
      halo.remove();
    },
    Math.max(0, COMBAT_ARRIVAL_HALO_MS - elapsed) + 80,
  );
}

export function cancelPresessionLaunchUi() {
  if (presessionRingFillTimeoutId != null) {
    clearTimeout(presessionRingFillTimeoutId);
    presessionRingFillTimeoutId = null;
  }
  if (presessionLaunchTimeoutId != null) {
    clearTimeout(presessionLaunchTimeoutId);
    presessionLaunchTimeoutId = null;
  }
  const wrap = document.querySelector('#viewPreSession .presession-launch-wrap');
  const pill = document.getElementById('btnLaunchSession');
  const ring = document.querySelector('#viewPreSession .presession-launch-ring-progress');
  const ringSvg = document.querySelector('#viewPreSession .presession-launch-ring');
  if (ring) {
    ring.style.transition = 'none';
    ring.style.strokeDasharray = '100';
    ring.style.strokeDashoffset = '100';
    void ring.getBoundingClientRect();
    ring.style.transition = '';
  }
  if (ringSvg) {
    ringSvg.style.animation = 'none';
    void ringSvg.offsetWidth;
    ringSvg.style.animation = '';
  }
  if (pill) {
    pill.style.animation = 'none';
    pill.style.transition = 'none';
    void pill.offsetWidth;
  }
  if (wrap) wrap.classList.remove('is-charging');
  if (pill) {
    void pill.offsetWidth;
    pill.style.animation = '';
    pill.style.transition = '';
    pill.removeAttribute('aria-busy');
    pill.setAttribute(
      'aria-label',
      'Lancer le combat. Premier appui : chargement 3 secondes. Réappuyer pour annuler.',
    );
  }
}

/**
 * Premier appui : charge 3 s (anneau + pulsation type cœur). Second appui : annule.
 * @param {HTMLButtonElement} buttonEl
 * @param {{ onCommit: () => void }} opts
 */
export function handlePresessionLaunchInteraction(buttonEl, { onCommit }) {
  const wrap = buttonEl.closest('.presession-launch-wrap');
  if (!wrap) return;

  if (wrap.classList.contains('is-charging')) {
    cancelPresessionLaunchUi();
    return;
  }

  cancelPresessionLaunchUi();

  const ring = wrap.querySelector('.presession-launch-ring-progress');
  if (!ring) {
    onCommit();
    return;
  }

  ring.style.transition = 'none';
  ring.style.strokeDasharray = '100';
  ring.style.strokeDashoffset = '100';
  void ring.getBoundingClientRect();

  buttonEl.setAttribute('aria-busy', 'true');
  buttonEl.setAttribute('aria-label', 'Annuler le lancement du combat');
  wrap.classList.add('is-charging');

  const fillMs = PRESESSION_LAUNCH_MS - PRESESSION_RING_POP_MS;
  presessionRingFillTimeoutId = window.setTimeout(() => {
    presessionRingFillTimeoutId = null;
    ring.style.transition = `stroke-dashoffset ${fillMs}ms linear`;
    ring.style.strokeDashoffset = '0';
  }, PRESESSION_RING_POP_MS);

  presessionLaunchTimeoutId = window.setTimeout(() => {
    presessionLaunchTimeoutId = null;
    cancelPresessionLaunchUi();
    onCommit();
  }, PRESESSION_LAUNCH_MS);
}

function sessionPaceLabel(tierKey) {
  const m = {
    easy: 'Séance rapide',
    medium: 'Séance standard',
    hard: 'Séance intense',
    extreme: 'Séance épique',
  };
  return m[tierKey] || 'Séance';
}

function challengeLabelFromScore(diffScore) {
  if (diffScore <= 3) return 'Niveau facile';
  if (diffScore <= 6) return 'Niveau modéré';
  if (diffScore <= 8) return 'Niveau corsé';
  return 'Niveau intense';
}

function zoneBackgroundHtml(zone, imageKey) {
  const svg = ZONE_SVG[zone?.svgKey] || ZONE_SVG.default;
  const img = zone?.[imageKey] || zone?.bgImage;
  return img
    ? `<img src="${img}" alt="" onerror="this.parentNode.innerHTML='${svg.replace(/"/g, '&quot;').replace(/\n/g, '')}'">`
    : svg;
}

export function resetPresessionDraft() {
  presessionNumExOverride = null;
}

export function handlePresessionAction(action) {
  const state = uiCtx.getState();
  const boss = state.boss.current;
  if (!boss) return;
  const tier = getDifficultyTier(boss.level);
  if (action === 'reshuffle') {
    renderPreSessionView();
    uiCtx.showToast('🔄 Nouveau programme proposé', 2000);
    return;
  }
  if (action === 'reduce') {
    const cur = presessionNumExOverride ?? tier.numEx;
    if (cur <= 2) {
      uiCtx.showToast('⚠ Minimum : 2 exercices', 2500);
      return;
    }
    presessionNumExOverride = cur - 1;
    renderPreSessionView();
    uiCtx.showToast(`⏱ Séance raccourcie : ${presessionNumExOverride} exercice(s)`, 2500);
  }
}

export function renderPreSessionView() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  let boss = state.boss.current;
  if (!boss) {
    const pick = uiCtx.pickBossForLevel(state.player.level);
    boss = { ...pick, hp: pick.hp_max };
    state.boss.current = boss;
    uiCtx.saveState();
  }
  const tier = getDifficultyTier(boss.level);
  // Tâche 1 : verrouiller les exercices dès la première vue pré-session
  let proposed;
  if (boss.lockedExercises && boss.lockedExercises.length > 0) {
    proposed = boss.lockedExercises
      .map((id) => uiCtx.allExercises().find((e) => e.id === id))
      .filter(Boolean);
  } else {
    const genOpts = presessionNumExOverride != null ? { numEx: presessionNumExOverride } : {};
    proposed = uiCtx.generateProposedExercises(boss, genOpts);
    state.boss.current.lockedExercises = proposed.map((e) => e.id);
    uiCtx.saveState();
  }
  const counterT = COUNTER_TYPE[boss.type];
  const color = RARITY_COLORS[boss.rarity] || RARITY_COLORS.common;
  const fallback = FALLBACK_BOSS[boss.id] || FALLBACK_BOSS.default;
  const iconHtml = `<img src="${uiCtx.iconUrl(boss.icon, color)}" alt="" class="boss-fallback-img" onerror="this.outerHTML='<span class=&quot;boss-emoji&quot;>${fallback}</span>'">`;
  const stackIconHtml = `<img src="${uiCtx.iconUrl(boss.icon, color)}" alt="" class="presession-boss-iconify-img" decoding="async" onerror="this.outerHTML='<span class=&quot;presession-boss-stack-emoji&quot;>${fallback}</span>'">`;
  const effectiveTier = { ...tier, numEx: proposed.length };
  const diffScore = getDifficultyScore(boss, effectiveTier);
  const estMin = estimateSessionMinutes(proposed, tier);
  const zone = uiCtx.getCurrentZone();
  const preSessionBgHtml = zoneBackgroundHtml(zone, 'preSessionBgImage');

  const introBossHtml = `<div class="presession-intro-card">
  <div class="presession-scene-bg">${preSessionBgHtml}</div>
  <div class="presession-scene-vignette"></div>
  <div class="presession-boss-atmosphere" aria-hidden="true"></div>
  <div class="presession-intro-session">
    <div class="presession-summary-head">${sessionPaceLabel(tier.tier)} · ${challengeLabelFromScore(diffScore)}</div>
    <div class="presession-summary-stats"><span>⏱ ~${estMin} min</span><span class="presession-dot">·</span><span>🔥 Intensité ${diffScore}/10</span><span class="presession-dot">·</span><span>⚔️ ${proposed.length} exercices</span></div>
  </div>
  <div class="presession-boss-stack">
    <div class="presession-boss-stack-icon" aria-hidden="true">${stackIconHtml}</div>
    <span class="presession-rarity-subline presession-rarity-corner">${uiCtx.rarityLabel(boss.rarity)}</span>
    <div class="presession-portrait-wrap">
      <div class="combat-boss-portrait-mid presession-boss-portrait rarity-${boss.rarity}" id="bossPortraitPre">${iconHtml}</div>
    </div>
    <div class="presession-boss-identity">
      <div class="presession-boss-title-line">
        <div class="presession-boss-level-wrap">
          <img class="presession-boss-level-badge" src="${bossLevelBadgeUrl(boss.level)}" alt="" width="56" height="56" decoding="async" fetchpriority="high" onerror="const w=this.closest('.presession-boss-level-wrap');if(w)w.outerHTML='<span class=&quot;presession-boss-level-fallback&quot; role=&quot;img&quot; aria-label=&quot;Niveau ${boss.level}&quot;>${boss.level}</span>'">
          <span class="presession-boss-level-num${boss.level >= 100 ? ' presession-boss-level-num--triple' : boss.level >= 10 ? ' presession-boss-level-num--double' : ''}" aria-label="Niveau ${boss.level}">${boss.level}</span>
        </div>
        <h2 class="presession-boss-name" style="color:${color}">${boss.name}</h2>
      </div>
      <p class="presession-boss-flavor">« ${boss.desc} »</p>
      <div class="presession-hp-block">
        <div class="bar presession-hp-track"><div class="bar-fill hp presession-hp-fill" style="width:${(boss.hp / boss.hp_max) * 100}%"></div></div>
        <div class="presession-boss-hp-label">❤️ ${boss.hp} / ${boss.hp_max}</div>
      </div>
    </div>
    <div class="presession-weak-block">
      <div class="presession-weak-rows">
        <div class="presession-weak-row">
          <span class="presession-weak-label">Spécialité</span>
          <span class="type-tag ${TYPE_CSS[boss.type]} presession-resist-type-tag cycle-trigger specialty-cycle-trigger" data-cycle-kind="specialty" title="Voir le cadran des spécialités">${TYPE_ICON[boss.type]} ${TYPE_LABEL[boss.type]}</span>
        </div>
        <div class="presession-weak-row">
          <span class="presession-weak-label">Élément</span>
          ${
            boss.element
              ? `<div class="presession-element-slot">${elementTag(boss.element, { interactive: true })}</div>`
              : '<div class="presession-element-slot presession-element-slot--empty"><span class="presession-weak-dash">—</span></div>'
          }
        </div>
      </div>
      <button type="button" class="presession-stats-trigger" aria-label="Ouvrir le détail des statistiques de l’adversaire">Statistiques</button>
    </div>
  </div>
</div>`;

  const exHtml = proposed
    .map((ex) => {
      const recordBonus = state.player.records_bonus[ex.id] || 0;
      const unitLabel = ex.unit === 'seconds' ? 'sec' : 'reps';
      const suggestedVol = ex.unit === 'seconds' ? tier.seconds : tier.reps;
      const mm = matchupMultiplier(ex.type, boss.type);
      const rawBase = ex.baseDamage + recordBonus;
      const adjBase = Math.max(0, Math.round(rawBase * mm));
      const bossTypeCls = TYPE_CSS[boss.type] || '';
      const dmgInner = `<strong class="presession-dmg-base">${adjBase}</strong> Dégâts`;
      const dmgPct = Math.max(0, Math.min(100, adjBase));
      const dmgFadeStart = Math.max(0, dmgPct - 18);
      const dmgCore =
        mm > 1 && bossTypeCls
          ? `<span class="presession-dmg-by-boss-type ${bossTypeCls}">${dmgInner}</span>`
          : mm < 1
            ? `<span class="presession-dmg-line presession-dmg-line--disadv">${dmgInner}</span>`
            : `<span class="presession-dmg-line presession-dmg-line--normal">${dmgInner}</span>`;
      const volLine = `${tier.sets}×${suggestedVol} ${unitLabel}${ex.hasWeight ? ' · 🏋' : ''}`;
      const typeCls = TYPE_CSS[ex.type] || '';
      // Tâche 6/11 : afficher le record personnel (kg + volume)
      const recKg = ex.hasWeight ? (state.player.records[ex.id] || 0) : 0;
      const recVol = (state.player.records_vol || {})[ex.id] || 0;
      const recUnit = ex.unit === 'seconds' ? 'sec' : 'reps';
      let recordHtml = '';
      if (recKg > 0 || recVol > 0) {
        const parts = [];
        if (recKg > 0) parts.push(`${recKg} kg`);
        if (recVol > 0) parts.push(`${recVol} ${recUnit}`);
        recordHtml = `<span class="presession-personal-record">🏆 Record : <strong>${parts.join(' · ')}</strong></span>`;
      } else {
        recordHtml = `<span class="presession-personal-record presession-personal-record--none">🏆 Pas encore de record</span>`;
      }
      return `<div class="exercise-card presession-exercise ${typeCls}" style="--presession-dmg-fade-start:${dmgFadeStart}%;--presession-dmg-pct:${dmgPct}%;">
  <div class="exercise-info">
    <div class="exercise-name presession-exercise-title"><span class="presession-exercise-name-text">${ex.name}</span><span class="presession-exercise-volume">${volLine}</span></div>
    <div class="presession-exercise-badges-row">
      <div class="presession-type-dmg-bar ${typeCls}">
        <span class="type-tag ${typeCls} presession-type-badge"><span class="presession-type-badge-ico" aria-hidden="true">${TYPE_ICON[ex.type]}</span><span class="presession-type-badge-lbl">${TYPE_LABEL[ex.type]}</span></span>
        <span class="presession-dmg-in-bar">${dmgCore}</span>
      </div>
    </div>
    ${recordHtml}
  </div>
</div>`;
    })
    .join('');

  const presessionSecondaryRowHtml = SHOW_PRESESSION_TWEAK_ACTIONS
    ? `<div class="presession-secondary-row">
    <button type="button" class="btn btn-secondary presession-secondary-btn" data-presession-action="reshuffle">Modifier les exercices</button>
    <button type="button" class="btn btn-secondary presession-secondary-btn" data-presession-action="reduce">Réduire la séance</button>
  </div>`
    : '';

  const footerHtml = `<div class="presession-footer">
  ${presessionSecondaryRowHtml}
  <p class="presession-safety"><strong>Échauffement conseillé :</strong> 30&nbsp;sec. Arrête-toi en cas de douleur thoracique, malaise ou essoufflement inhabituel.</p>
</div>
<div class="presession-launch-sticky">
  <div class="presession-launch-wrap">
    <svg class="presession-launch-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="presession-launch-ring-bg" cx="50" cy="50" r="46" pathLength="100" />
      <circle class="presession-launch-ring-progress" cx="50" cy="50" r="46" pathLength="100" />
    </svg>
    <button type="button" class="presession-launch-pill" id="btnLaunchSession"
      aria-label="Lancer le combat. Premier appui : chargement 3 secondes. Réappuyer pour annuler.">
      <span class="presession-launch-icon" aria-hidden="true">⚔️</span>
    </button>
  </div>
</div>`;

  $('preSessionContent').innerHTML = `${introBossHtml}<div class="section-label presession-programme-label"><span>Programme proposé</span><span class="section-label-meta">${proposed.length} exercices</span></div>${exHtml}${footerHtml}`;

  const launch = $('btnLaunchSession');
  if (launch) {
    launch.dataset.proposed = JSON.stringify(proposed.map((e) => e.id));
    launch.dataset.bossId = boss.id;
  }
  const preHost = $('bossPortraitPre');
  if (preHost) {
    if (uiCtx.bossSpritePreCtl?.destroy) uiCtx.bossSpritePreCtl.destroy();
    mountBossSprite(preHost, getBossSpriteKey(boss), 'idle').then((ctl) => {
      uiCtx.bossSpritePreCtl = ctl;
      playBossIdleOrFury(ctl, boss);
      const wrap = preHost.closest('.presession-portrait-wrap');
      mountBossSpriteDebugStrip(wrap || preHost, ctl);
    });
  }
}

export function renderSessionView() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  if (!state.session_current) {
    uiCtx.showView('dashboard');
    return;
  }
  if (state.session_current.isRecovery) {
    if (uiCtx.bossSpriteCtl?.destroy) uiCtx.bossSpriteCtl.destroy();
    uiCtx.bossSpriteCtl = null;
    return renderRecoverySession();
  }
  if (!state.boss.current) {
    uiCtx.showView('dashboard');
    return;
  }
  if (uiCtx.bossSpriteCtl?.destroy) uiCtx.bossSpriteCtl.destroy();
  uiCtx.bossSpriteCtl = null;
  const b = state.boss.current;
  const color = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
  const fallback = FALLBACK_BOSS[b.id] || FALLBACK_BOSS.default;
  const hpPct = (b.hp / b.hp_max) * 100;
  const playerHpPct = (state.player.stats.hp_current / state.player.stats.constitution) * 100;
  const tokenUsed = !!state.session_current.spellUsedThisTurn;
  // Limite (FF7-style)
  const equippedLimit = getEquippedLimit(state);
  const limitBar = state.player.limitBar || 0;
  const limitPct = Math.round(limitBar * 100);
  const limitReady = equippedLimit && limitBar >= (equippedLimit.barRequired || 1.0);
  const limitName = equippedLimit ? equippedLimit.name : 'Limite';
  const limitBuffTurns = state.session_current.limitBuffTurns || 0;
  const mpMax = state.player.stats.mana || 100,
    mp = state.player.stats.mp_current || 0;
  const mpPct = (mp / mpMax) * 100;
  const equippedSpells = (state.player.equippedSpells || []).map((id) => (id ? uiCtx.getSpellById(id) : null));
  const spellsUsedOnce = state.boss.current.spellsUsedThisFight || {};
  const zone = uiCtx.getCurrentZone();
  const zoneBgHtml = zoneBackgroundHtml(zone, 'combatBgImage');
  const spellButtons = equippedSpells
    .map((s, i) => {
      if (!s)
        return `<button class="action-btn" disabled style="opacity:0.3;"><div class="ico">·</div>Vide<div class="sub">Slot ${i + 1}</div></button>`;
      const noMana = mp < s.manaCost;
      const usedOnce = s.oncePerCombat && spellsUsedOnce[s.id];
      const disabled = tokenUsed || noMana || usedOnce;
      const elIcon = ELEMENTS[s.element] ? ELEMENTS[s.element].icon : '🪄';
      const subLine = usedOnce ? '1×/combat utilisé' : noMana ? `Manque ${s.manaCost - mp} MP` : `${s.manaCost} MP`;
      return `<button class="action-btn spell" data-spell-idx="${i}" ${disabled ? 'disabled' : ''} style="border-color:${ELEMENTS[s.element] ? ELEMENTS[s.element].color : 'var(--gold)'};"><div class="ico">${elIcon}</div>${s.name}<div class="sub">${subLine}</div></button>`;
    })
    .join('');
  const itemPotionHtml = `<button class="action-btn potion" id="actPotion" ${state.player.potions <= 0 ? 'disabled' : ''}><div class="ico">🧪</div>Potion<div class="sub">+50 PV · ${state.player.potions}</div></button>`;
  const enemyTypeLine = `<span class="type-tag ${TYPE_CSS[b.type]} cycle-trigger specialty-cycle-trigger" data-cycle-kind="specialty" title="Voir le cadran des spécialités">${TYPE_ICON[b.type]} ${TYPE_LABEL[b.type]}</span>${b.element ? elementTag(b.element, { interactive: true }) : ''}`;
  const combatPlayerStatusHtml = `<div class="combat-status-panel combat-status-player"><div class="combat-status-title"><span>${state.player.name || 'Champion'}</span><span>Niv. ${state.player.level ?? 1}</span></div><div class="combat-stat-line"><span>PV</span><strong id="playerHpText">${state.player.stats.hp_current} / ${state.player.stats.constitution}</strong></div><div class="bar"><div class="bar-fill hp" id="playerHpBar" style="width:${playerHpPct}%"></div></div><div class="combat-stat-line"><span>MP</span><strong id="playerMpText">${mp} / ${mpMax}</strong></div><div class="bar"><div class="bar-fill mp" id="playerMpBar" style="width:${mpPct}%"></div></div></div>`;
  const limitSubLabel = limitReady
    ? 'LIMITE !'
    : limitBuffTurns > 0
      ? `💥 ×2 (${limitBuffTurns} ex.)`
      : `${limitPct}%`;
  const combatCommandColumnHtml = `<div class="combat-command-panel combat-command-panel--side"><div class="combat-limit-section"><div class="combat-limit-bar-row" title="${limitName} — ${limitPct}%"><span class="combat-limit-label">LIMITE</span><div class="combat-limit-track"><div class="combat-limit-fill ${limitReady ? 'combat-limit-fill--ready' : ''}" id="limitBarFill" style="width:${limitPct}%"></div></div></div><button type="button" class="action-btn skill combat-command-head combat-command-skill-full ${limitReady ? 'active limit-ready' : limitBuffTurns > 0 ? 'active limit-buff-active' : ''}" id="actLimit" ${!limitReady ? 'disabled' : ''} title="${limitReady ? limitName + ' — Déclencher !' : limitBuffTurns > 0 ? limitName + ' actif' : limitName + ' — Barre à ' + limitPct + '%'}"><span class="action-btn-inline"><span class="ico">💥</span><span class="action-btn-text">${limitName}</span></span><span class="action-btn-sub">${limitSubLabel}</span></button></div><div class="combat-special-actions" role="group" aria-label="Actions spéciales"><button type="button" class="action-btn combat-drawer-toggle combat-special-toggle" id="toggleSpellDrawer" aria-expanded="false" aria-controls="combatSpellDrawer"><span class="ico">✨</span><span class="action-btn-text">Sorts</span></button><button type="button" class="action-btn combat-drawer-toggle combat-drawer-toggle--items combat-special-toggle" id="toggleItemDrawer" aria-expanded="false" aria-controls="combatItemDrawer"><span class="ico">🎒</span><span class="action-btn-text">Objets</span></button></div></div>`;
  const combatDrawersHtml = `<div class="combat-hud-drawers"><div class="combat-drawer combat-spell-drawer" id="combatSpellDrawer" role="region" aria-label="Sorts équipés"><div class="combat-drawer-inner"><div class="combat-drawer-grid">${spellButtons}</div></div></div><div class="combat-drawer combat-item-drawer" id="combatItemDrawer" role="region" aria-label="Objets"><div class="combat-drawer-inner"><div class="combat-drawer-grid">${itemPotionHtml}</div></div></div></div>`;
  const combatHudHtml = `<div class="combat-ff7-hud"><div class="combat-hud-player-row">${combatPlayerStatusHtml}${combatCommandColumnHtml}</div>${combatDrawersHtml}</div>`;
  const combatBannerEl = $('combatBanner');
  combatBannerEl.innerHTML = `<div class="combat-stage-bg">${zoneBgHtml}</div><div class="combat-stage-vignette"></div><div class="combat-stage"><div class="combat-actors"><div class="combat-boss-center"><div class="combat-boss-stack"><div class="combat-boss-row"><div class="combat-boss-portrait-mid rarity-${b.rarity}" id="bossPortraitInBanner"><img src="${uiCtx.iconUrl(b.icon, color)}" alt="" class="boss-fallback-img" onerror="this.outerHTML='<span class=&quot;boss-emoji&quot;>${fallback}</span>'"></div></div><div class="combat-boss-nameplate" role="group" aria-label="Ennemi"><div class="combat-boss-nameplate-title"><span class="combat-boss-nameplate-name" style="color:${color}">${b.name}</span><span class="combat-boss-nameplate-level">Niv. ${b.level}</span></div><div class="combat-boss-nameplate-meta">${enemyTypeLine}</div><div class="bar combat-boss-nameplate-bar"><div class="bar-fill hp" id="bossHpBar" style="width:${hpPct}%"></div></div><div class="combat-boss-nameplate-hp combat-stat-line"><span>PV</span><strong id="bossHpText">❤️ ${b.hp} / ${b.hp_max}</strong></div></div></div></div></div>${combatHudHtml}</div>`;
  const spellDrawerEl = combatBannerEl.querySelector('#combatSpellDrawer');
  const itemDrawerEl = combatBannerEl.querySelector('#combatItemDrawer');
  const toggleSpellBtn = combatBannerEl.querySelector('#toggleSpellDrawer');
  const toggleItemBtn = combatBannerEl.querySelector('#toggleItemDrawer');
  const syncCombatDrawers = (spellOpen, itemOpen) => {
    spellDrawerEl?.classList.toggle('is-open', spellOpen);
    itemDrawerEl?.classList.toggle('is-open', itemOpen);
    toggleSpellBtn?.classList.toggle('is-active', spellOpen);
    toggleItemBtn?.classList.toggle('is-active', itemOpen);
    toggleSpellBtn?.setAttribute('aria-expanded', spellOpen ? 'true' : 'false');
    toggleItemBtn?.setAttribute('aria-expanded', itemOpen ? 'true' : 'false');
  };
  toggleSpellBtn?.addEventListener('click', () => {
    const wasOpen = spellDrawerEl?.classList.contains('is-open');
    syncCombatDrawers(!wasOpen, false);
  });
  toggleItemBtn?.addEventListener('click', () => {
    const wasOpen = itemDrawerEl?.classList.contains('is-open');
    syncCombatDrawers(false, !wasOpen);
  });
  mountCombatArrivalHalo(combatBannerEl, state.session_current.startedAt);
  const remaining = state.session_current.exercises.filter((e) => !e.completed).length;
  const total = state.session_current.exercises.length;
  $('exerciseCount').textContent = `${total - remaining} / ${total} fait${total - remaining > 1 ? 's' : ''}`;
  const list = $('sessionExerciseList');
  list.innerHTML = state.session_current.exercises
    .map((ex) => {
      const recordBonus = state.player.records_bonus[ex.id] || 0;
      const isGood = isGoodMatchup(ex.type, b.type);
      const matchupBadge = isGood ? '<span class="matchup-good">🟢 +50%</span>' : '';
      const unitLabel = ex.unit === 'seconds' ? 'sec' : 'reps';
      return `<div class="exercise-card ${ex.completed ? 'completed' : ''} ${isGood && !ex.completed ? 'good-matchup' : ''}" data-id="${ex.id}"><div class="exercise-icon">${ex.completed ? '✓' : TYPE_ICON[ex.type]}</div><div class="exercise-info"><div class="exercise-name">${ex.name} <span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span> ${matchupBadge}</div><div class="exercise-meta">${ex.completed ? `${ex.sets}×${ex.reps} ${unitLabel}${ex.hasWeight ? ' @ ' + ex.weight + 'kg' : ''} · ${ex.damageDealt} dégâts${ex.recordBeaten ? ' · 🏆' : ''}` : `${ex.baseDamage}${recordBonus ? '+' + recordBonus : ''} dégâts · ${unitLabel}${ex.hasWeight ? ' · 🏋' : ''}`}</div></div><div class="exercise-arrow">${ex.completed ? '' : '›'}</div></div>`;
    })
    .join('');
  list.querySelectorAll('.exercise-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const ex = state.session_current.exercises.find((e) => e.id === id);
      if (!ex || ex.completed) return;
      openExerciseModal(id);
    });
  });
  const actLimitBtn = combatBannerEl.querySelector('#actLimit') || $('actLimit');
  if (actLimitBtn) {
    actLimitBtn.addEventListener('click', () => {
      uiCtx.activateLimit();
    });
  }
  $('actPotion').addEventListener('click', () => {
    if (state.player.potions <= 0) {
      uiCtx.showToast('⚠ Plus de potions');
      return;
    }
    state.player.potions--;
    const before = state.player.stats.hp_current;
    state.player.stats.hp_current = Math.min(state.player.stats.constitution, before + 50);
    const heal = state.player.stats.hp_current - before;
    gameEvents.emit('potion');
    uiCtx.showFloatingDmg(`+${heal}`, 'heal', 'playerHpBar');
    uiCtx.showToast(`🧪 Potion bue : +${heal} PV`);
    uiCtx.saveState();
    renderSessionView();
  });
  document.querySelectorAll('#combatBanner [data-spell-idx]').forEach((btn) => {
    btn.addEventListener('click', () => uiCtx.castSpell(parseInt(btn.dataset.spellIdx, 10)));
  });
  const bannerHost = $('bossPortraitInBanner');
  if (bannerHost) {
    mountBossSprite(bannerHost, getBossSpriteKey(b), 'idle').then((ctl) => {
      uiCtx.bossSpriteCtl = ctl;
      playBossIdleOrFury(ctl, uiCtx.getState().boss.current);
      const row = $('combatBanner')?.querySelector('.combat-boss-row');
      if (row) mountBossSpriteDebugStrip(row, ctl);
    });
  }
}

export function openExerciseModal(exerciseId) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  uiCtx.setCurrentExerciseId(exerciseId);
  const ex = uiCtx.allExercises().find((e) => e.id === exerciseId);
  const b = state.boss.current;
  $('exModalName').textContent = ex.name;
  $('exModalIcon').textContent = TYPE_ICON[ex.type];
  $('exModalDesc').textContent = ex.desc;
  const isGood = isGoodMatchup(ex.type, b.type);
  const isWeak = isWeakMatchup(ex.type, b.type);
  let matchupExtra = '';
  if (isGood) matchupExtra = ' <span class="matchup-good">🟢 Bon matchup +50%</span>';
  else if (isWeak) matchupExtra = ` <span class="matchup-bad">🔴 Désavantage −${MATCHUP_WEAK_PCT_LABEL}%</span>`;
  $('exModalMatchup').innerHTML = `<span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span>${matchupExtra}`;
  $('exSets').value = state.session_current.suggestedSets || 3;
  if (ex.unit === 'seconds') {
    $('exRepsLabel').textContent = 'Secondes';
    $('exReps').value = state.session_current.suggestedSec || 30;
  } else {
    $('exRepsLabel').textContent = 'Répétitions';
    $('exReps').value = state.session_current.suggestedReps || 10;
  }
  $('exWeight').value = state.player.records[exerciseId] || 0;
  $('exWeightContainer').style.display = ex.hasWeight ? '' : 'none';
  updateDamagePreview();
  uiCtx.openModal('exerciseModal');
}

export function updateDamagePreview() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const currentExerciseId = uiCtx.getCurrentExerciseId();
  if (!currentExerciseId) return;
  const ex = uiCtx.allExercises().find((e) => e.id === currentExerciseId);
  const sets = parseInt($('exSets').value) || 0;
  const repsOrSec = parseInt($('exReps').value) || 0;
  const weight = parseFloat($('exWeight').value) || 0;
  const limitBuff = state.session_current && (state.session_current.limitBuffTurns || 0) > 0;
  const dmg = uiCtx.computeExerciseDamage(currentExerciseId, sets, repsOrSec, weight, { skill: limitBuff });
  $('damagePreviewValue').textContent = dmg;
  const isGood = isGoodMatchup(ex.type, state.boss.current.type);
  const isWeak = isWeakMatchup(ex.type, state.boss.current.type);
  let note = '';
  if (isGood) note = '🟢 Bon matchup actif (+50%)';
  else if (isWeak) note = `🔴 Mauvais matchup (−${MATCHUP_WEAK_PCT_LABEL} % sur les dégâts de base)`;
  if (limitBuff) note += (note ? '<br>' : '') + `💥 Limite active ×2 (${state.session_current.limitBuffTurns} exercise${state.session_current.limitBuffTurns > 1 ? 's' : ''} restant${state.session_current.limitBuffTurns > 1 ? 's' : ''})`;
  $('matchupNote').innerHTML = note;
}

export function renderRecoverySession() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  $('combatBanner').innerHTML = `<div style="text-align:center;padding:14px;background:linear-gradient(135deg,rgba(34,197,94,0.15) 0%,var(--bg-mid) 100%);border:2px solid var(--success);border-radius:12px;"><div style="font-family:'Cinzel',serif;font-weight:700;font-size:16px;color:var(--success);margin-bottom:6px;">⚕ Convalescence</div><div style="font-size:12px;color:var(--text-dim);">Termine ces ${state.session_current.exercises.length} exercices pour reprendre la quête à <strong style="color:var(--gold-bright);">50% PV</strong>.</div></div>`;
  const remaining = state.session_current.exercises.filter((e) => !e.completed).length;
  const total = state.session_current.exercises.length;
  $('exerciseCount').textContent = `${total - remaining} / ${total} fait${total - remaining > 1 ? 's' : ''}`;
  const list = $('sessionExerciseList');
  list.innerHTML = state.session_current.exercises
    .map((ex) => {
      const unitLabel = ex.unit === 'seconds' ? 'sec' : 'reps';
      return `<div class="exercise-card ${ex.completed ? 'completed' : ''}" data-id="${ex.id}"><div class="exercise-icon">${ex.completed ? '✓' : TYPE_ICON[ex.type]}</div><div class="exercise-info"><div class="exercise-name">${ex.name} <span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span></div><div class="exercise-meta">${ex.completed ? `${ex.sets}×${ex.reps} ${unitLabel}` : `Récupération douce · ${unitLabel}`}</div></div><div class="exercise-arrow">${ex.completed ? '' : '›'}</div></div>`;
    })
    .join('');
  list.querySelectorAll('.exercise-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const ex = state.session_current.exercises.find((e) => e.id === id);
      if (!ex || ex.completed) return;
      openExerciseModalRecovery(id);
    });
  });
}

export function openExerciseModalRecovery(exerciseId) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  uiCtx.setCurrentExerciseId(exerciseId);
  const ex = uiCtx.allExercises().find((e) => e.id === exerciseId);
  $('exModalName').textContent = ex.name;
  $('exModalIcon').textContent = TYPE_ICON[ex.type];
  $('exModalDesc').textContent = ex.desc;
  $('exModalMatchup').innerHTML = `<span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span> <span style="color:var(--success);font-size:11px;font-weight:700;">\u2695 Convalescence</span>`;
  $('exSets').value = 2;
  if (ex.unit === 'seconds') {
    $('exRepsLabel').textContent = 'Secondes';
    $('exReps').value = 20;
  } else {
    $('exRepsLabel').textContent = 'R\u00e9p\u00e9titions';
    $('exReps').value = 8;
  }
  $('exWeight').value = 0;
  $('exWeightContainer').style.display = ex.hasWeight ? '' : 'none';
  $('damagePreviewValue').textContent = '\u2014';
  $('matchupNote').innerHTML = '<span style="color:var(--success);">Aucun d\u00e9g\u00e2t (r\u00e9cup\u00e9ration)</span>';
  uiCtx.openModal('exerciseModal');
}
