import {
  RARITY_COLORS,
  FALLBACK_BOSS,
  FALLBACK_WEAPON,
  TYPE_ICON,
  TYPE_LABEL,
  TYPE_CSS,
} from '../data/constants.js';
import { elementTag } from '../data/elements.js';
import { ZONE_SVG } from '../data/zones.js';
import { computeEquipmentBonus, getEffectiveStats, xpForNextLevel } from '../core/progression.js';
import { registerZoneVisit } from '../core/questEngine.js';
import { uiCtx } from './renderContext.js';
import { startGpsTravel } from '../native/gpsTracker.js';

/* GPS tracker handle — kept outside functions so stop() is accessible */
let _gpsTracker = null;

/* Listen for cancel signal from app.js */
document.addEventListener('gps-travel-cancel', () => {
  if (_gpsTracker) { _gpsTracker.stop(); _gpsTracker = null; }
});

export function renderZoneBanner() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const zone = uiCtx.getCurrentZone();
  const banner = $('zoneBanner');
  if (!banner) return;
  document.documentElement.style.setProperty('--zone-accent', zone.accent || '#D4AF37');
  document.documentElement.style.setProperty('--zone-glow', (zone.themeColor || '#D4AF37') + '33');
  const customBg = zone.bgImage;
  const svg = ZONE_SVG[zone.svgKey] || ZONE_SVG.default;
  const bgHtml = customBg
    ? `<img src="${customBg}" alt="" onerror="this.parentNode.innerHTML='${svg.replace(/"/g, '&quot;').replace(/\n/g, '')}'">`
    : svg;
  const particleCount = 8;
  let particles = '';
  for (let i = 0; i < particleCount; i++) {
    const left = Math.floor(Math.random() * 95);
    const dur = 4 + Math.random() * 4;
    const delay = Math.random() * 4;
    const size = 2 + Math.random() * 3;
    particles += `<div class="zone-particle" style="left:${left}%;width:${size}px;height:${size}px;background:${zone.accent};opacity:0.6;animation-duration:${dur}s;animation-delay:-${delay}s;"></div>`;
  }
  const elTag = zone.element ? elementTag(zone.element) : '';
  banner.innerHTML = `<div class="zone-banner-bg">${bgHtml}</div><div class="zone-banner-overlay"></div><div class="zone-particles">${particles}</div><div class="zone-banner-content"><div class="zone-banner-row"><div><div class="zone-banner-title">${zone.name}</div><div class="zone-banner-meta">Niveau ${zone.levelMin}-${zone.levelMax} · ${state.player.unlockedZones.length}/${uiCtx.allZones().length} zones ${elTag}</div></div><button class="zone-banner-action" id="btnTravel">🗺 Voyager</button></div></div>`;
  $('btnTravel').addEventListener('click', openZoneTravel);
}

/** Returns true if level + boss conditions are met for a zone (regardless of unlock/GPS) */
function zoneConditionsMet(z, state) {
  if (state.player.level < z.requiredLevel) return false;
  if (z.requiredRegionalBoss && !state.player.defeatedRegionalBosses.includes(z.requiredRegionalBoss)) return false;
  return true;
}

export function openZoneTravel() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const list = $('zoneTravelList');
  list.innerHTML = uiCtx
    .allZones()
    .map((z) => {
      const isActive = z.id === state.player.currentZone;
      const isUnlocked = state.player.unlockedZones.includes(z.id);
      const conditionsMet = !isUnlocked && zoneConditionsMet(z, state);
      const travelKm = z.travelKm ?? 0;

      const svg = ZONE_SVG[z.svgKey] || ZONE_SVG.default;
      const bgHtml = z.bgImage
        ? `<img src="${z.bgImage}" alt="" onerror="this.parentNode.innerHTML='${svg.replace(/"/g, '&quot;').replace(/\n/g, '')}'">`
        : svg;

      let statusLabel, cls, extraHtml;

      if (isActive) {
        statusLabel = '⭐ Zone actuelle';
        cls = 'active';
        extraHtml = '';
      } else if (isUnlocked) {
        statusLabel = '✓ Débloquée';
        cls = 'unlocked';
        extraHtml = '';
      } else if (conditionsMet && travelKm > 0) {
        // Conditions met → show GPS travel button
        statusLabel = '🏃 Voyage requis';
        cls = 'travel-ready';
        extraHtml = `<button class="btn btn-gps-travel" data-gps-zone="${z.id}" data-gps-km="${travelKm}">🏃 Faire le voyage · ${travelKm} km</button>`;
      } else {
        // Locked — show missing requirements
        statusLabel = '🔒 Verrouillée';
        cls = 'locked';
        const issues = [];
        if (state.player.level < z.requiredLevel)
          issues.push(`niveau ${z.requiredLevel} requis (vous : ${state.player.level})`);
        if (z.requiredRegionalBoss && !state.player.defeatedRegionalBosses.includes(z.requiredRegionalBoss)) {
          const rb = uiCtx.allBosses().find((b) => b.id === z.requiredRegionalBoss);
          issues.push(`vaincre ${rb ? rb.name : 'le boss régional précédent'}`);
        }
        extraHtml = issues.length
          ? `<div class="req">⚠ ${issues.join(' · ')}</div>`
          : '';
      }

      return `<div class="zone-list-item ${cls}" data-zone="${z.id}">
        <div class="zone-mini">${bgHtml}<div class="zone-mini-overlay"></div><div class="zone-mini-name">${z.name}</div></div>
        <div class="status">${statusLabel}</div>
        <div class="desc">« ${z.desc} »</div>
        <div class="req" style="font-size:11px;color:var(--text-faint);">Niveau monstres : ${z.levelMin}-${z.levelMax}</div>
        ${extraHtml}
      </div>`;
    })
    .join('');

  // Travel to already-unlocked zones
  list.querySelectorAll('.zone-list-item.unlocked, .zone-list-item.active').forEach((div) => {
    div.addEventListener('click', () => {
      const zid = div.dataset.zone;
      if (zid === state.player.currentZone) {
        uiCtx.showToast('⭐ Vous êtes déjà ici');
        return;
      }
      travelToZone(zid);
    });
  });

  // GPS travel buttons
  list.querySelectorAll('.btn-gps-travel').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const zid = btn.dataset.gpsZone;
      const km = parseFloat(btn.dataset.gpsKm);
      uiCtx.closeModal('zoneTravelModal');
      launchGpsTravel(zid, km);
    });
  });

  uiCtx.openModal('zoneTravelModal');
}

export function travelToZone(zid) {
  const state = uiCtx.getState();
  state.player.currentZone = zid;
  state.boss.current = null;
  registerZoneVisit(state, zid, uiCtx.showToast);
  uiCtx.saveState();
  uiCtx.closeModal('zoneTravelModal');
  uiCtx.refreshDashboard();
  const z = uiCtx.getZoneById(zid);
  uiCtx.showToast(`🗺 Vous voyagez vers ${z.name}`);
}

/** Open the GPS tracking modal and start tracking */
export function launchGpsTravel(zoneId, targetKm) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const zone = uiCtx.getZoneById(zoneId);

  // Stop any ongoing tracker
  if (_gpsTracker) { _gpsTracker.stop(); _gpsTracker = null; }

  // Populate modal
  $('gpsTravelZoneName').textContent = zone.name;
  $('gpsTravelTarget').textContent = targetKm.toFixed(1);
  $('gpsTravelDone').textContent = '0.00';
  $('gpsTravelBar').style.width = '0%';
  $('gpsTravelStatus').textContent = '📡 Acquisition du signal GPS…';
  $('gpsTravelStatus').style.color = 'var(--text-dim)';

  uiCtx.openModal('gpsTravelModal');

  _gpsTracker = startGpsTravel({
    targetKm,
    onProgress(done, target) {
      const pct = Math.min(100, (done / target) * 100);
      $('gpsTravelDone').textContent = done.toFixed(2);
      $('gpsTravelBar').style.width = `${pct.toFixed(1)}%`;
      $('gpsTravelStatus').textContent = `🏃 En cours… ${(target - done).toFixed(2)} km restants`;
      $('gpsTravelStatus').style.color = 'var(--text)';
    },
    onComplete() {
      _gpsTracker = null;
      $('gpsTravelStatus').textContent = '✅ Objectif atteint ! Zone débloquée !';
      $('gpsTravelStatus').style.color = 'var(--success)';
      $('gpsTravelBar').style.width = '100%';
      // Unlock zone and travel
      if (!state.player.unlockedZones.includes(zoneId)) {
        state.player.unlockedZones.push(zoneId);
      }
      setTimeout(() => {
        uiCtx.closeModal('gpsTravelModal');
        travelToZone(zoneId);
        uiCtx.showToast(`🗺 ${zone.name} débloquée ! Bon voyage !`, 4000);
      }, 1500);
    },
    onError(msg) {
      _gpsTracker = null;
      $('gpsTravelStatus').textContent = `⚠ ${msg}`;
      $('gpsTravelStatus').style.color = 'var(--blood-bright)';
    },
  });
}

export function renderRegionalBoss() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const container = $('regionalBossSlot');
  if (!container) return;
  if (state.player.recovering) {
    container.innerHTML = `<div class="regional-boss-card" style="border-color:var(--success);box-shadow:0 0 25px rgba(34,197,94,0.3);"><div class="title" style="color:var(--success);">⚕ Convalescence</div><div class="desc">Vous êtes affaibli après votre dernière défaite. Lancez une séance pour effectuer vos exercices de récupération et revenir avec 50% PV.</div></div>`;
    return;
  }
  const rb = uiCtx.getRegionalBossOfCurrentZone();
  if (!rb || state.player.level < rb.level - 3) {
    container.innerHTML = '';
    return;
  }
  const color = RARITY_COLORS[rb.rarity] || RARITY_COLORS.legendary;
  container.innerHTML = `<div class="regional-boss-card"><div class="title">⭐ Boss régional ⭐</div><div class="name" style="color:${color}">${rb.name}</div><div class="meta">Niveau ${rb.level} · PV ${rb.hp_max} · Att ${rb.attack} · Déf ${rb.defense}</div><div class="desc">« ${rb.desc} »</div><button class="action" id="btnFightRegional">⚔ Affronter le boss régional</button></div>`;
  $('btnFightRegional').addEventListener('click', () => {
    if (
      !confirm(
        `Affronter ${rb.name} (niveau ${rb.level}) ? C'est un combat unique. Vainqueur, vous débloquerez la zone suivante.`
      )
    )
      return;
    uiCtx.startRegionalBossEncounter(rb.id);
  });
}

export function renderHero() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  $('heroName').textContent = (state.player.name || 'Champion').toUpperCase();
  $('heroLevel').textContent = state.player.level;
  const hpMax = state.player.stats.constitution,
    hp = state.player.stats.hp_current;
  $('hpText').textContent = `${hp} / ${hpMax}`;
  $('hpBar').style.width = `${Math.max(0, Math.min(100, (hp / hpMax) * 100))}%`;
  const xpNeeded = xpForNextLevel(state.player.level);
  $('xpText').textContent = `${state.player.xp} / ${xpNeeded}`;
  $('xpBar').style.width = `${Math.max(0, Math.min(100, (state.player.xp / xpNeeded) * 100))}%`;
  if ($('mpText')) {
    const mpMax = state.player.stats.mana || 100;
    const mp = state.player.stats.mp_current || 0;
    $('mpText').textContent = `${mp} / ${mpMax}`;
    $('mpBar').style.width = `${Math.max(0, Math.min(100, (mp / mpMax) * 100))}%`;
  }
  if ($('dashPotionCount')) $('dashPotionCount').textContent = state.player.potions;
  if ($('dashEtherCount')) $('dashEtherCount').textContent = state.player.ethers;
  if ($('dashStepBalance')) $('dashStepBalance').textContent = state.player.stepBalance ?? 0;
  const btnStart = $('btnStartSession');
  if (btnStart) {
    if (state.player.recovering) btnStart.textContent = '⚕ Récupérer';
    else btnStart.textContent = 'Commencer';
  }
  if ($('btnDrinkPotionDash')) {
    const noPotion = state.player.potions <= 0;
    const fullHp = state.player.stats.hp_current >= state.player.stats.constitution;
    $('btnDrinkPotionDash').disabled = noPotion || fullHp;
    $('btnDrinkPotionDash').style.opacity = noPotion || fullHp ? '0.4' : '1';
  }
  if ($('btnDrinkEtherDash')) {
    const noEther = state.player.ethers <= 0;
    const fullMp = state.player.stats.mp_current >= state.player.stats.mana;
    $('btnDrinkEtherDash').disabled = noEther || fullMp;
    $('btnDrinkEtherDash').style.opacity = noEther || fullMp ? '0.4' : '1';
  }
}

export function renderStats() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const bonus = computeEquipmentBonus(state.player);
  $('statForce').innerHTML = `${state.player.stats.force}${bonus.force ? ` <span class="stat-bonus">+${bonus.force}</span>` : ''}`;
  $('statDefense').innerHTML = `${state.player.stats.defense}${bonus.defense ? ` <span class="stat-bonus">+${bonus.defense}</span>` : ''}`;
  $('statAgility').innerHTML = `${state.player.stats.agility}${bonus.agility ? ` <span class="stat-bonus">+${bonus.agility}</span>` : ''}`;
  $('statGold').textContent = state.player.gold;
}

export function renderEquipment() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const grid = $('equipmentGrid');
  grid.innerHTML = '';
  uiCtx.EQUIP_SLOTS.forEach((slot) => {
    const item = state.player.equipment[slot.key];
    const div = document.createElement('div');
    div.className = 'equip-slot';
    div.style.cursor = 'pointer';
    div.dataset.slot = slot.key;
    if (item) {
      div.classList.add('filled', `rarity-${item.rarity || 'common'}`);
      const color = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
      const fallback = FALLBACK_WEAPON[item.id] || FALLBACK_WEAPON.default;
      const iconHtml = item.icon
        ? uiCtx.buildIconImg(item.icon, color, 'equip-img', fallback)
        : `<span class="equip-icon-emoji">${slot.icon}</span>`;
      div.innerHTML = `${iconHtml}<div class="equip-name">${item.name}${item.combLevel ? ' +' + item.combLevel : ''}</div>`;
    } else {
      div.innerHTML = `<div class="equip-empty-icon">${slot.icon}</div><div class="equip-empty-label">${slot.label}</div>`;
    }
    div.addEventListener('click', () => openEquipPicker(slot.key));
    grid.appendChild(div);
  });
}

export function openEquipPicker(slotKey) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const slot = uiCtx.EQUIP_SLOTS.find((s) => s.key === slotKey);
  $('equipPickerTitle').textContent = `Équiper : ${slot.label}`;
  $('equipPickerIcon').textContent = slot.icon;
  $('equipPickerSubtitle').textContent = `Choisis l'arme à placer dans ce slot.`;
  const cur = state.player.equipment[slotKey];
  if (cur) {
    const color = RARITY_COLORS[cur.rarity];
    const fb = FALLBACK_WEAPON[cur.id] || FALLBACK_WEAPON.default;
    const iconHtml = `<img src="${uiCtx.iconUrl(cur.icon, color)}" style="width:36px;height:36px;" alt="" onerror="this.outerHTML='<span style=&quot;font-size:30px;&quot;>${fb}</span>'">`;
    const eff = getEffectiveStats(cur);
    const stats = Object.entries(eff)
      .map(([k, v]) => `+${v} ${({ force: 'F', defense: 'D', agility: 'A', constitution: 'PV' })[k] || k}`)
      .join(' · ');
    $('equipPickerCurrent').innerHTML = `<div class="section-label"><span>Actuellement équipé</span></div><div class="shop-item"><div class="shop-icon" style="border:2px solid ${color}">${iconHtml}</div><div class="shop-info"><div class="shop-name" style="color:${color}">${cur.name}${cur.combLevel ? ' +' + cur.combLevel : ''}</div><div class="shop-desc">${stats}</div></div><button class="shop-buy" id="equipPickerUnequip" style="background:rgba(196,30,58,0.2);color:var(--blood-bright);border:1px solid var(--blood-bright);">📤 Retirer</button></div>`;
    setTimeout(() => {
      $('equipPickerUnequip').addEventListener('click', () => {
        uiCtx.unequipItem(slotKey);
        uiCtx.closeModal('equipPickerModal');
        uiCtx.refreshDashboard();
        uiCtx.showToast('📤 Objet déséquipé');
      });
    }, 0);
  } else {
    $('equipPickerCurrent').innerHTML = `<div class="empty-state" style="padding:14px;font-size:12px;">Aucun objet équipé sur ce slot.</div>`;
  }
  const compatible = state.player.weapons.filter((w) => w.slot === slotKey);
  if (compatible.length === 0) {
    $('equipPickerList').innerHTML = `<div class="empty-state" style="padding:14px;font-size:12px;">Aucune arme compatible dans ton sac.<br><small>Visite le ⚒ Forgeron pour en forger.</small></div>`;
  } else {
    $('equipPickerList').innerHTML = compatible
      .map((w) => {
        const color = RARITY_COLORS[w.rarity];
        const fb = FALLBACK_WEAPON[w.id] || FALLBACK_WEAPON.default;
        const iconHtml = `<img src="${uiCtx.iconUrl(w.icon, color)}" style="width:36px;height:36px;" alt="" onerror="this.outerHTML='<span style=&quot;font-size:30px;&quot;>${fb}</span>'">`;
        const eff = getEffectiveStats(w);
        const stats = Object.entries(eff)
          .map(([k, v]) => `+${v} ${({ force: 'F', defense: 'D', agility: 'A', constitution: 'PV' })[k] || k}`)
          .join(' · ');
        return `<div class="shop-item" data-pick-uid="${w.uid}"><div class="shop-icon" style="border:2px solid ${color}">${iconHtml}</div><div class="shop-info"><div class="shop-name" style="color:${color}">${w.name}${w.combLevel ? ' +' + w.combLevel : ''}</div><div class="shop-desc">${stats}</div></div><button class="shop-buy">⚔ Équiper</button></div>`;
      })
      .join('');
    $('equipPickerList').querySelectorAll('[data-pick-uid]').forEach((div) => {
      div.addEventListener('click', () => {
        uiCtx.equipItem(div.dataset.pickUid);
        uiCtx.closeModal('equipPickerModal');
        uiCtx.refreshDashboard();
        uiCtx.showToast('⚔ Objet équipé');
      });
    });
  }
  uiCtx.openModal('equipPickerModal');
}

export function renderRecords() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const container = $('recordsContainer');
  const records = state.player.records || {};
  const recordsVol = state.player.records_vol || {};
  const recordsBonus = state.player.records_bonus || {};
  const allEx = uiCtx.allExercises();

  // Groupes par type
  const GROUPS = [
    { type: 'force',     icon: '💪', label: 'Force',     statKey: 'force',   statIcon: '💪' },
    { type: 'endurance', icon: '🛡', label: 'Endurance', statKey: 'defense', statIcon: '🛡' },
    { type: 'agility',   icon: '⚡', label: 'Vitesse',   statKey: 'agility', statIcon: '⚡' },
  ];

  // Vérifie s'il y a au moins un record quelque part
  const hasAny = allEx.some((e) => records[e.id] || recordsVol[e.id]);
  if (!hasAny) {
    container.innerHTML = `<div class="empty-state"><span class="icon">🏆</span>Aucun record encore.<br><small>Battez vos limites pour gagner +1 statistique permanente !</small></div>`;
    return;
  }

  // Détermine si une section est ouverte (persisté en mémoire vive)
  if (!renderRecords._open) renderRecords._open = { force: true, endurance: true, agility: true };

  container.innerHTML = GROUPS.map(({ type, icon, label, statKey, statIcon }) => {
    const exercises = allEx.filter((e) => e.type === type);
    // Total stat gagnée pour ce groupe
    const totalBonus = exercises.reduce((sum, e) => sum + (recordsBonus[e.id] || 0), 0);
    const totalLabel = totalBonus > 0 ? `+${totalBonus} ${statIcon}` : '—';
    const isOpen = renderRecords._open[type];

    const rows = exercises.map((e) => {
      const kg = records[e.id] || 0;
      const vol = recordsVol[e.id] || 0;
      const bonus = recordsBonus[e.id] || 0;
      const hasRecord = kg > 0 || vol > 0;
      const unit = e.unit === 'seconds' ? 'sec' : 'reps';
      const parts = [];
      if (kg > 0) parts.push(`${kg} kg`);
      if (vol > 0) parts.push(`${vol} ${unit}`);
      const recStr = hasRecord ? parts.join(' · ') : '–';
      const bonusStr = bonus > 0 ? `<span class="rec-ex-bonus">+${bonus} ${statIcon}</span>` : '';
      return `<div class="rec-ex-row ${hasRecord ? '' : 'rec-ex-row--empty'}">
        <span class="rec-ex-name">${e.name}${bonusStr}</span>
        <span class="rec-ex-val ${hasRecord ? 'rec-ex-val--set' : ''}">${recStr}</span>
      </div>`;
    }).join('');

    return `<div class="rec-group" data-rec-type="${type}">
      <div class="rec-group-header" data-rec-toggle="${type}">
        <span class="rec-group-title">${icon} ${label}</span>
        <span class="rec-group-total">${totalLabel}</span>
        <span class="rec-group-chevron">${isOpen ? '▲' : '▼'}</span>
      </div>
      <div class="rec-group-body" style="display:${isOpen ? 'block' : 'none'};">${rows}</div>
    </div>`;
  }).join('');

  // Listeners toggle
  container.querySelectorAll('[data-rec-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.recToggle;
      renderRecords._open[t] = !renderRecords._open[t];
      renderRecords();
    });
  });
}

export function renderBoss() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const container = $('bossContainer');
  if (!state.boss.current) {
    container.innerHTML = `<div class="empty-state"><span class="icon">🐉</span>Aucun adversaire à l'horizon.<br><small>Lancez une séance pour faire émerger un boss.</small></div>`;
    return;
  }
  const b = state.boss.current;
  const hpPct = Math.max(0, Math.min(100, (b.hp / b.hp_max) * 100));
  const color = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
  const fallback = FALLBACK_BOSS[b.id] || FALLBACK_BOSS.default;
  const iconHtml = uiCtx.buildIconImg(b.icon, color, 'boss-img', fallback);
  const damageNote =
    b.hp < b.hp_max
      ? `<div style="font-size:11px;color:var(--blood-bright);margin-top:6px;">⚔ Déjà blessé (${b.hp_max - b.hp} dégâts encaissés)</div>`
      : '';
  const typeTag = `<span class="type-tag ${TYPE_CSS[b.type]} cycle-trigger specialty-cycle-trigger" data-cycle-kind="specialty" title="Voir le cadran des spécialités">${TYPE_ICON[b.type]} ${TYPE_LABEL[b.type]}</span>`;
  container.innerHTML = `<div class="boss-display"><div class="boss-portrait rarity-${b.rarity}">${iconHtml}</div><div class="boss-name rarity-${b.rarity}">${b.name}</div><div class="boss-meta">Niveau ${b.level} · <span class="rarity-tag" style="color:${color}">${uiCtx.rarityLabel(b.rarity)}</span> · ${typeTag} ${b.element ? elementTag(b.element, { interactive: true }) : ''}</div><div class="boss-hp"><div class="bar-label" style="justify-content:center;gap:8px;"><span>❤️ ${b.hp} / ${b.hp_max}</span></div><div class="bar"><div class="bar-fill hp" style="width:${hpPct}%"></div></div></div><div class="boss-desc">« ${b.desc} »</div>${damageNote}<div class="boss-rewards"><span class="reward">⚔️ ${b.attack}</span><span class="reward">🛡 ${b.defense}</span><span class="reward">💰 ${b.gold}</span><span class="reward">✨ ${b.xp} XP</span></div></div>`;
}

export function renderDashboardAll() {
  uiCtx.tryUnlockZones();
  renderZoneBanner();
  renderRegionalBoss();
  renderHero();
  renderStats();
  renderEquipment();
  renderRecords();
  renderBoss();
}
