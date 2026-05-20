import { elementMultiplier } from '../data/elements.js';
import { computeEquipmentBonus, getDifficultyTier, applyXp } from '../core/progression.js';
import { resetPresessionDraft } from '../ui/renderSession.js';
import { rollDrops } from '../core/rewards.js';
import { gameEvents } from '../audio/gameEvents.js';
import { bumpQuestCounter } from '../core/questEngine.js';
import { playBossIdleOrFury } from '../ui/renderCombatFx.js';
import { fillLimitBar, triggerLimit, applyLimitEffect, checkLimitUnlocks } from '../core/limitBreak.js';

/** Durée approx. anim. attaque ours (12 img @ 10 ips) avant retour idle / furie. */
const BOSS_SPRITE_POST_ATTACK_MS = 1250;
/** Idem après anim. hit seule (ex. sort). */
const BOSS_SPRITE_POST_HIT_MS = 1250;

/**
 * Flux séance / combat (validation exercices, sorts, fin de combat).
 * @param {object} deps
 */
export function createSessionFlow(deps) {
  const {
    getState,
    catalog,
    $,
    showToast,
    closeModal,
    saveState,
    showView,
    shuffle,
    flashBossPortrait,
    showFloatingDmg,
    shakeScreen,
    renderSessionView,
    showSummaryModal,
    showRecoverySummaryModal,
    showVictoryModal,
    showDefeatModal,
    getCurrentExerciseId,
    getBossSpriteCtl,
    world,
  } = deps;

  const { computeExerciseDamage, computeBossCounterAttack, generateProposedExercises } = world;

  function startRegionalBossEncounter(bossId) {
    const state = getState();
    const bd = catalog.allBosses().find((b) => b.id === bossId);
    if (!bd) return;
    state.boss.current = { ...bd, hp: bd.hp_max, _isRegionalEncounter: true };
    saveState();
    resetPresessionDraft();
    showView('pre-session');
  }

  function startSession(exerciseIds, bossId) {
    const state = getState();
    if (!state.boss.current || state.boss.current.id !== bossId) {
      const bd = catalog.allBosses().find((b) => b.id === bossId);
      state.boss.current = { ...bd, hp: bd.hp_max };
    }
    state.player.stats.hp_current = state.player.stats.constitution;
    const tier = getDifficultyTier(state.boss.current.level);
    // (heroSkillUsed supprimé — remplacé par le système de Limite)
    state.session_current = {
      startedAt: new Date().toISOString(),
      exercises: exerciseIds.map((id) => {
        const ex = catalog.allExercises().find((e) => e.id === id);
        return {
          id,
          name: ex.name,
          type: ex.type,
          baseDamage: ex.baseDamage,
          group: ex.group,
          hasWeight: ex.hasWeight,
          unit: ex.unit || 'reps',
          completed: false,
          sets: 0,
          reps: 0,
          weight: 0,
          damageDealt: 0,
          recordBeaten: false,
        };
      }),
      totalDamage: 0,
      totalReceived: 0,
      xpEarned: 0,
      suggestedSets: tier.sets,
      suggestedReps: tier.reps,
      summonGauge: 0,          // 0.0 → 1.0
      summonsUsedThisFight: [],
      suggestedSec: tier.seconds,
    };
    saveState();
    showView('session');
  }

  function startRecoverySession() {
    const state = getState();
    const pool = catalog.allExercises();
    const proposed = shuffle(pool).slice(0, 3);
    state.session_current = {
      startedAt: new Date().toISOString(),
      isRecovery: true,
      exercises: proposed.map((ex) => ({
        id: ex.id,
        name: ex.name,
        type: ex.type,
        baseDamage: ex.baseDamage,
        group: ex.group,
        hasWeight: ex.hasWeight,
        unit: ex.unit || 'reps',
        completed: false,
        sets: 0,
        reps: 0,
        weight: 0,
        damageDealt: 0,
        recordBeaten: false,
      })),
      totalDamage: 0,
      totalReceived: 0,
      xpEarned: 0,
      suggestedSets: 2,
      suggestedReps: 8,
      suggestedSec: 20,
    };
    saveState();
    showView('session');
    setTimeout(() => showToast('⚕ Séance de récupération. Termine ces exercices pour revenir avec 50% PV.', 4000), 300);
  }

  function victory() {
    const state = getState();
    const b = state.boss.current;
    // Nettoyer les exercices verrouillés à la victoire
    if (b && b.lockedExercises) delete b.lockedExercises;
    const isRegional = !!b.isRegionalBoss;
    const xpFromSession = state.session_current ? state.session_current.xpEarned + 30 : 0;
    const goldMult = isRegional ? 1.5 : 1;
    state.player.gold += Math.round(b.gold * goldMult);
    const totalXp = Math.round((b.xp + xpFromSession) * (isRegional ? 1.5 : 1));
    const levelsGained = applyXp(state, totalXp);
    state.boss.defeated.push({ id: b.id, date: new Date().toISOString() });
    // Compteur de kills boss (pour déblocage Limites de type kill_count)
    if (!state.player.bossKillCounts) state.player.bossKillCounts = {};
    state.player.bossKillCounts[b.id] = (state.player.bossKillCounts[b.id] || 0) + 1;
    state.meta.total_bosses += 1;
    state.meta.total_sessions += 1;
    let unlockedZone = null;
    if (isRegional && !state.player.defeatedRegionalBosses.includes(b.id)) {
      state.player.defeatedRegionalBosses.push(b.id);
      const newZone = catalog.allZones().find((z) => z.requiredRegionalBoss === b.id);
      if (newZone && !state.player.unlockedZones.includes(newZone.id)) {
        state.player.unlockedZones.push(newZone.id);
        unlockedZone = newZone;
      }
    }
    const drops = rollDrops(b);
    if (isRegional) drops.forEach((d) => {
      d.qty = Math.round(d.qty * 1.5);
    });
    drops.forEach((d) => {
      if (d.type === 'material') {
        state.player.materials[d.id] = (state.player.materials[d.id] || 0) + d.qty;
      } else if (d.type === 'ingredient') {
        state.player.ingredients[d.id] = (state.player.ingredients[d.id] || 0) + d.qty;
      } else if (d.type === 'weapon' || d.type === 'accessory') {
        // Instancier l'arme/accessoire depuis le catalogue
        const weaponData = catalog.allEquipment().find((w) => w.id === d.id);
        if (weaponData) {
          const uid = 'i_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
          state.player.weapons.push({ ...weaponData, combLevel: 0, uid });
        }
      }
    });
    state._lastVictory = {
      isRegional,
      unlockedZone,
      goldGain: Math.round(b.gold * goldMult),
      xpGain: totalXp,
    };
    if (state.session_current) {
      const completed = state.session_current.exercises.filter((e) => e.completed);
      state.sessions.push({
        date: state.session_current.startedAt,
        exercises: completed.map((e) => ({
          id: e.id,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          damageDealt: e.damageDealt,
        })),
        totalDamage: state.session_current.totalDamage,
        totalReceived: state.session_current.totalReceived,
        xpEarned: totalXp,
        bossId: b.id,
        bossDefeated: true,
      });
      if (state.sessions.length > 20) state.sessions.shift();
    }
    state.boss.current = null;
    state.session_current = null;
    saveState();
    bumpQuestCounter(state, 'sessions_complete', 1, showToast);
    bumpQuestCounter(state, 'bosses_defeated', 1, showToast);
    // Vérifier si de nouvelles Limites se débloquent après la victoire
    const newLimits = checkLimitUnlocks(state);
    newLimits.forEach((name) => showToast(`🔓 Nouvelle Limite débloquée : <strong>${name}</strong> !`, 4000));
    saveState();
    gameEvents.emit('victory');
    showVictoryModal(b, drops, levelsGained, totalXp);
  }

  function defeat() {
    const state = getState();
    const bossName = state.boss.current ? state.boss.current.name : 'Le boss';
    state.boss.current = null;
    state.session_current = null;
    state.player.stats.hp_current = 0;
    state.player.recovering = true;
    saveState();
    gameEvents.emit('defeat');
    showDefeatModal(bossName);
  }

  function confirmExerciseSubmission() {
    const currentExerciseId = getCurrentExerciseId();
    const state = getState();
    if (!currentExerciseId || !state.session_current) return;

    if (state.session_current.isRecovery) {
      const sets = parseInt($('exSets').value, 10);
      const reps = parseInt($('exReps').value, 10);
      if (!sets || sets < 1 || !reps || reps < 1) {
        showToast('⚠ Indique au moins 1 série et 1 unité');
        return;
      }
      const ex = state.session_current.exercises.find((e) => e.id === currentExerciseId);
      ex.completed = true;
      ex.sets = sets;
      ex.reps = reps;
      closeModal('exerciseModal');
      showToast('⚕ Exercice de récupération validé', 2000);
      saveState();
      if (state.session_current.exercises.every((e) => e.completed)) {
        state.player.recovering = false;
        state.player.stats.hp_current = Math.floor(state.player.stats.constitution * 0.5);
        state.player.stats.mp_current = Math.floor(state.player.stats.mana * 0.5);
        state.session_current = null;
        saveState();
        showRecoverySummaryModal();
        return;
      }
      renderSessionView();
      return;
    }

    const sets = parseInt($('exSets').value, 10);
    const repsOrSec = parseInt($('exReps').value, 10);
    const weight = parseFloat($('exWeight').value) || 0;
    if (!sets || sets < 1 || !repsOrSec || repsOrSec < 1) {
      showToast('⚠ Indique au moins 1 série et 1 unité');
      return;
    }
    const ex = state.session_current.exercises.find((e) => e.id === currentExerciseId);
    const exData = catalog.allExercises().find((e) => e.id === currentExerciseId);

    // ── RECORDS ENRICHIS ──────────────────────────────────────────────────
    // Volume = séries × répétitions (ou séries × secondes)
    const volume = sets * repsOrSec;
    let recordBeaten = false;
    let recordStatLabel = '';

    // Stat gagnée selon type d'exercice
    const statMap = { force: 'force', endurance: 'defense', agility: 'agility' };
    const statKey = statMap[exData.type];
    const statLabel = { force: '💪 Force', endurance: '🛡 Défense', agility: '⚡ Vitesse' }[exData.type] || '';

    if (!state.player.records_vol) state.player.records_vol = {};

    if (exData.hasWeight && weight > 0) {
      // Exercice avec poids : record uniquement si le score composite progresse.
      // score = volume × (1 + poids × 0.05) — empêche de tricher en baissant le poids ou le volume.
      const prevKg  = state.player.records[currentExerciseId]     || 0;
      const prevVol = state.player.records_vol[currentExerciseId] || 0;
      const prevScore = prevVol * (1 + prevKg * 0.05);
      const newScore  = volume  * (1 + weight * 0.05);
      if (newScore > prevScore && weight >= prevKg && volume >= prevVol) {
        // Progrès réel sur les deux axes — on met à jour les deux valeurs
        state.player.records[currentExerciseId]     = weight;
        state.player.records_vol[currentExerciseId] = volume;
        recordBeaten = true;
      } else if (newScore > prevScore) {
        // Score global meilleur mais l'un des axes a régressé — on note le record
        // seulement si le score composite dépasse clairement (+10 %)
        if (newScore >= prevScore * 1.10) {
          state.player.records[currentExerciseId]     = Math.max(weight, prevKg);
          state.player.records_vol[currentExerciseId] = Math.max(volume, prevVol);
          recordBeaten = true;
        }
      }
    } else {
      // Exercice sans poids : record sur le volume uniquement
      const prevVol = state.player.records_vol[currentExerciseId] || 0;
      if (volume > prevVol) {
        state.player.records_vol[currentExerciseId] = volume;
        recordBeaten = true;
      }
    }

    if (recordBeaten && statKey) {
      // +1 à la statistique correspondante
      state.player.stats[statKey] = (state.player.stats[statKey] || 0) + 1;
      state.player.records_bonus[currentExerciseId] = (state.player.records_bonus[currentExerciseId] || 0) + 1;
      recordStatLabel = statLabel;
    }
    // ─────────────────────────────────────────────────────────────────────

    const bonus = computeEquipmentBonus(state.player);
    const totalSpeed = state.player.stats.agility + (bonus.agility || 0);
    const critChance = Math.min(40, 5 + totalSpeed * 0.5) / 100;
    const isCrit = Math.random() < critChance;
    // buff_atk de Limite : les N prochains exercices infligent ×2
    const limitBuff = (state.session_current.limitBuffTurns || 0) > 0;
    let damage = computeExerciseDamage(currentExerciseId, sets, repsOrSec, weight, { skill: limitBuff });
    if (isCrit) {
      const critMult = Math.min(2.5, 1.4 + totalSpeed * 0.005);
      damage = Math.round(damage * critMult);
    }
    ex.completed = true;
    ex.sets = sets;
    ex.reps = repsOrSec;
    ex.weight = weight;
    ex.damageDealt = damage;
    ex.recordBeaten = recordBeaten;
    ex.recordStatLabel = recordStatLabel;
    state.boss.current.hp = Math.max(0, state.boss.current.hp - damage);
    state.session_current.totalDamage += damage;
    state.session_current.xpEarned += 30;
    if (limitBuff) {
      state.session_current.limitBuffTurns = Math.max(0, state.session_current.limitBuffTurns - 1);
    }
    state.session_current.spellUsedThisTurn = false;
    closeModal('exerciseModal');
    flashBossPortrait(isCrit);
    showFloatingDmg(`-${damage}${isCrit ? ' !' : ''}`, isCrit ? 'player-crit' : 'player-dmg');
    let msg = `⚔ ${ex.name} ! <strong>+${damage} dégâts</strong>`;
    if (isCrit) msg += ' <strong>(CRITIQUE)</strong>';
    if (limitBuff) msg += ` <strong>💥 LIMITE ×2 (${state.session_current.limitBuffTurns} restant${state.session_current.limitBuffTurns > 1 ? 's' : ''})</strong>`;
    if (recordBeaten) msg += `<br>🏆 <strong>RECORD BATTU !</strong> +1 ${recordStatLabel}`;
    showToast(msg, 3500);
    gameEvents.emit('combat_hit', { crit: isCrit });
    saveState();
    const hpPct = (state.boss.current.hp / state.boss.current.hp_max) * 100;
    if ($('bossHpBar')) $('bossHpBar').style.width = `${hpPct}%`;
    if ($('bossHpText')) $('bossHpText').textContent = `❤️ ${state.boss.current.hp} / ${state.boss.current.hp_max}`;
    if (state.boss.current.hp <= 0) {
      setTimeout(() => victory(), 800);
      return;
    }
    setTimeout(() => {
      const st = getState();
      const ctl = getBossSpriteCtl && getBossSpriteCtl();
      // ── Étourdissement (Ramuh) : le boss ne contre-attaque pas ──────────
      if ((st.session_current.bossStunnedTurns || 0) > 0) {
        st.session_current.bossStunnedTurns -= 1;
        saveState();
        showToast(`⚡ ${st.boss.current.name} est étourdi et ne peut pas attaquer !`, 2500);
        if (st.session_current.exercises.every((e) => e.completed) && st.boss.current && st.boss.current.hp > 0) {
          regenerateExerciseSet();
        }
        renderSessionView();
        return;
      }
      if (ctl && typeof ctl.play === 'function') ctl.play('attack');
      setTimeout(() => {
        const st2 = getState();
        if (st2.boss.current && st2.boss.current.hp > 0) {
          playBossIdleOrFury(getBossSpriteCtl && getBossSpriteCtl(), st2.boss.current);
        }
      }, BOSS_SPRITE_POST_ATTACK_MS);
      gameEvents.emit('boss_attack');
      let dmg = computeBossCounterAttack(st.boss.current);
      // ── Affaiblissement (Shiva) : dégâts réduits ────────────────────────
      if ((st.session_current.bossWeakenTurns || 0) > 0) {
        const reduction = st.session_current.bossWeakenReduction || 0.5;
        dmg = Math.round(dmg * (1 - reduction));
        st.session_current.bossWeakenTurns -= 1;
      }
      st.player.stats.hp_current = Math.max(0, st.player.stats.hp_current - dmg);
      st.session_current.totalReceived += dmg;
      // Remplir la barre de Limite à chaque coup reçu
      fillLimitBar(st, dmg);
      // Remplir la jauge d'invocation (+25% par coup reçu)
      st.session_current.summonGauge = Math.min(1.0, (st.session_current.summonGauge || 0) + 0.25);
      if (st.session_current.summonGauge >= 1.0) {
        showToast('🌟 Jauge d\'invocation PLEINE ! Déchaînez votre invocation !', 3000);
      }
      saveState();
      shakeScreen();
      showFloatingDmg(`-${dmg}`, 'boss-dmg', 'playerHpBar');
      showToast(`💥 ${st.boss.current.name} riposte ! −${dmg} PV`, 2000);
      const playerHpPct = (st.player.stats.hp_current / st.player.stats.constitution) * 100;
      if ($('playerHpBar')) $('playerHpBar').style.width = `${playerHpPct}%`;
      if ($('playerHpText')) $('playerHpText').textContent = `${st.player.stats.hp_current} / ${st.player.stats.constitution}`;
      if (st.player.stats.hp_current <= 0) {
        setTimeout(() => defeat(), 800);
        return;
      }
      if (
        st.session_current.exercises.every((e) => e.completed) &&
        st.boss.current &&
        st.boss.current.hp > 0
      ) {
        regenerateExerciseSet();
      }
      renderSessionView();
    }, 700);
  }

  function castSpell(slotIdx) {
    const state = getState();
    if (!state.session_current || !state.boss.current) return;
    if (state.session_current.spellUsedThisTurn) {
      showToast('⚠ Sort déjà utilisé ce tour');
      return;
    }
    const spellId = state.player.equippedSpells[slotIdx];
    if (!spellId) return;
    const spell = catalog.getSpellById(spellId);
    if (!spell) {
      showToast('⚠ Sort introuvable');
      return;
    }
    const mp = state.player.stats.mp_current || 0;
    if (mp < spell.manaCost) {
      showToast(`⚠ Manque ${spell.manaCost - mp} MP`);
      return;
    }
    if (!state.boss.current.spellsUsedThisFight) state.boss.current.spellsUsedThisFight = {};
    if (spell.oncePerCombat && state.boss.current.spellsUsedThisFight[spell.id]) {
      showToast('⚠ Sort déjà utilisé ce combat');
      return;
    }
    state.player.stats.mp_current = mp - spell.manaCost;
    state.session_current.spellUsedThisTurn = true;
    if (spell.oncePerCombat) state.boss.current.spellsUsedThisFight[spell.id] = true;
    if (spell.effect === 'damage_flat') {
      let dmg = spell.value || 20;
      if (spell.element && state.boss.current.element) {
        dmg = Math.round(dmg * elementMultiplier(spell.element, state.boss.current.element));
      }
      state.boss.current.hp = Math.max(0, state.boss.current.hp - dmg);
      flashBossPortrait(false);
      setTimeout(() => {
        const st = getState();
        if (st.boss.current && st.boss.current.hp > 0) {
          playBossIdleOrFury(getBossSpriteCtl && getBossSpriteCtl(), st.boss.current);
        }
      }, BOSS_SPRITE_POST_HIT_MS);
      gameEvents.emit('spell_cast');
      showFloatingDmg(`-${dmg}`, 'player-dmg');
      showToast(`✨ ${spell.name} ! <strong>+${dmg} dégâts</strong>`, 3000);
      if (state.boss.current.hp <= 0) {
        saveState();
        setTimeout(() => victory(), 800);
        return;
      }
    } else if (spell.effect === 'heal_flat') {
      const before = state.player.stats.hp_current;
      state.player.stats.hp_current = Math.min(state.player.stats.constitution, before + spell.value);
      const heal = state.player.stats.hp_current - before;
      gameEvents.emit('spell_cast');
      showFloatingDmg(`+${heal}`, 'heal', 'playerHpBar');
      showToast(`✨ ${spell.name} ! <strong>+${heal} PV</strong>`, 3000);
    }
    saveState();
    renderSessionView();
  }

  function activateLimit() {
    const state = getState();
    if (!state.session_current || !state.boss.current) {
      showToast('⚠ Pas de combat en cours');
      return;
    }
    const limit = triggerLimit(state);
    if (!limit) {
      showToast('⚠ La barre de Limite n\'est pas encore pleine');
      return;
    }
    const result = applyLimitEffect(state, limit);
    gameEvents.emit('combat_hit', { crit: true });
    if (result.dmg > 0) {
      flashBossPortrait(true);
      showFloatingDmg(`-${result.dmg}`, 'player-crit');
    }
    if (result.heal > 0) {
      showFloatingDmg(`+${result.heal}`, 'heal', 'playerHpBar');
    }
    showToast(result.msg, 4000);
    // Vérifier déblocages Limites après usage
    const newLimits = checkLimitUnlocks(state);
    newLimits.forEach((name) => showToast(`🔓 Nouvelle Limite débloquée : <strong>${name}</strong> !`, 4000));
    saveState();
    if (state.boss.current && state.boss.current.hp <= 0) {
      setTimeout(() => victory(), 800);
      return;
    }
    renderSessionView();
  }

  function regenerateExerciseSet() {
    const state = getState();
    if (!state.boss.current || !state.session_current) return;
    const proposed = generateProposedExercises(state.boss.current);
    state.session_current.exercises = proposed.map((ex) => ({
      id: ex.id,
      name: ex.name,
      type: ex.type,
      baseDamage: ex.baseDamage,
      group: ex.group,
      hasWeight: ex.hasWeight,
      unit: ex.unit || 'reps',
      completed: false,
      sets: 0,
      reps: 0,
      weight: 0,
      damageDealt: 0,
      recordBeaten: false,
    }));
    saveState();
    showToast("🌀 Nouveau set d'exercices généré ! Le boss tient encore.", 3500);
  }

  function abandonSession() {
    const state = getState();
    if (!state.session_current) return;
    const bossName = state.boss.current ? state.boss.current.name : 'Le boss';
    if (state.boss.current) delete state.boss.current.lockedExercises;
    state.boss.current = null;
    state.session_current = null;
    saveState();
    gameEvents.emit('defeat');
    showToast(`🏃 ${bossName} s'est enfui dans les ténèbres ! Aucune récompense. Vos blessures persistent.`, 4500);
    showView('dashboard');
  }

  function finishSession() {
    const state = getState();
    if (!state.session_current) return;
    const completed = state.session_current.exercises.filter((e) => e.completed);
    if (completed.length === 0) {
      if (!confirm('Aucun exercice complété. Le boss va s\'enfuir sans récompense. Confirmer ?')) return;
      abandonSession();
      return;
    }
    const xpGained = state.session_current.xpEarned + 20;
    const levelsGained = applyXp(state, xpGained);
    bumpQuestCounter(state, 'sessions_complete', 1, showToast);
    state.sessions.push({
      date: state.session_current.startedAt,
      exercises: completed.map((e) => ({
        id: e.id,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        damageDealt: e.damageDealt,
      })),
      totalDamage: state.session_current.totalDamage,
      totalReceived: state.session_current.totalReceived,
      xpEarned: xpGained,
      bossId: state.boss.current.id,
      bossDefeated: false,
    });
    state.meta.total_sessions += 1;
    if (state.sessions.length > 20) state.sessions.shift();
    const remainingBoss = state.boss.current ? { ...state.boss.current } : null;
    const summary = {
      completed: completed.length,
      total: state.session_current.exercises.length,
      totalDamage: state.session_current.totalDamage,
      totalReceived: state.session_current.totalReceived,
      xpGained,
      levelsGained,
      records: completed.filter((e) => e.recordBeaten).map((e) => ({ name: e.name, statLabel: e.recordStatLabel || '' })),
      remainingBoss,
    };
    state.session_current = null;
    saveState();
    showSummaryModal(summary);
  }

  // ════════════════════════════════════════════════════════════════════════
  // INVOCATIONS
  // ════════════════════════════════════════════════════════════════════════
  function activateSummon(summonId) {
    const state = getState();
    if (!state.session_current || !state.boss.current) {
      showToast('⚠ Pas de combat en cours');
      return;
    }
    const sc = state.session_current;
    if ((sc.summonGauge || 0) < 1.0) {
      showToast('⚠ La jauge d\'invocation n\'est pas encore pleine (4 coups reçus nécessaires)');
      return;
    }
    if (!state.player.equippedSummons || !state.player.equippedSummons.includes(summonId)) {
      showToast('⚠ Cette invocation n\'est pas équipée');
      return;
    }
    if (!sc.summonsUsedThisFight) sc.summonsUsedThisFight = [];
    if (sc.summonsUsedThisFight.includes(summonId)) {
      showToast('⚠ Cette invocation a déjà été utilisée ce combat');
      return;
    }
    const summon = catalog.getSummonById(summonId);
    if (!summon) { showToast('⚠ Invocation introuvable'); return; }

    // Consommer la jauge
    sc.summonGauge = 0;
    sc.summonsUsedThisFight.push(summonId);

    const ef = summon.effect;
    let dmgTotal = 0;
    let resultMsg = '';

    if (ef.type === 'damage_force') {
      const force = state.player.stats.force || 10;
      dmgTotal = Math.round(ef.baseDamage + force * (ef.statScale?.mult || 1.5));
      resultMsg = `${summon.icon} <strong>${summon.name}</strong> inflige <strong>${dmgTotal} dégâts</strong> !`;
    } else if (ef.type === 'damage_flat') {
      let dmg = ef.baseDamage;
      if (summon.element && state.boss.current.element) {
        dmg = Math.round(dmg * elementMultiplier(summon.element, state.boss.current.element));
      }
      dmgTotal = dmg;
      resultMsg = `${summon.icon} <strong>${summon.name}</strong> inflige <strong>${dmgTotal} dégâts</strong> !`;
    } else if (ef.type === 'instakill_or_damage') {
      const hpRatio = state.boss.current.hp / state.boss.current.hp_max;
      if (hpRatio < ef.instakillThreshold) {
        dmgTotal = state.boss.current.hp;
        resultMsg = `${summon.icon} <strong>ODINFELL !</strong> ${state.boss.current.name} est tranché d'un seul coup !`;
      } else {
        dmgTotal = ef.baseDamage;
        resultMsg = `${summon.icon} <strong>${summon.name}</strong> inflige <strong>${dmgTotal} dégâts</strong> (boss > 30% PV, exécution impossible)`;
      }
    } else if (ef.type === 'multihit') {
      const hits = ef.hits || 1;
      dmgTotal = hits * ef.baseDamagePerHit;
      resultMsg = `${summon.icon} <strong>${summon.name}</strong> — ${hits} frappes × ${ef.baseDamagePerHit} = <strong>${dmgTotal} dégâts</strong> !`;
    }

    // Appliquer dégâts au boss
    if (dmgTotal > 0) {
      state.boss.current.hp = Math.max(0, state.boss.current.hp - dmgTotal);
      sc.totalDamage += dmgTotal;
      flashBossPortrait(true);
      showFloatingDmg(`-${dmgTotal}`, 'player-crit');
    }

    // Effets secondaires
    if (summon.sideEffect) {
      const se = summon.sideEffect;
      if (se.type === 'boss_weaken') {
        sc.bossWeakenTurns = (sc.bossWeakenTurns || 0) + se.turns;
        sc.bossWeakenReduction = se.reduction;
        resultMsg += `<br>❄️ ${se.label}`;
      } else if (se.type === 'boss_stun') {
        sc.bossStunnedTurns = (sc.bossStunnedTurns || 0) + se.turns;
        resultMsg += `<br>⚡ ${se.label}`;
      } else if (se.type === 'heal_pct') {
        const healAmt = Math.round(state.player.stats.constitution * se.value);
        state.player.stats.hp_current = Math.min(state.player.stats.constitution, state.player.stats.hp_current + healAmt);
        showFloatingDmg(`+${healAmt}`, 'heal', 'playerHpBar');
        resultMsg += `<br>💧 ${se.label}`;
      } else if (se.type === 'restore_mp') {
        state.player.stats.mp_current = Math.min(state.player.stats.mana, (state.player.stats.mp_current || 0) + se.value);
        resultMsg += `<br>✨ ${se.label}`;
      } else if (se.type === 'conditional_heal') {
        const hpRatio = state.player.stats.hp_current / state.player.stats.constitution;
        if (hpRatio < se.hpThreshold) {
          const prevHp = state.player.stats.hp_current;
          const newHp = Math.round(state.player.stats.constitution * se.healTo);
          state.player.stats.hp_current = newHp;
          showFloatingDmg(`+${newHp - prevHp}`, 'heal', 'playerHpBar');
          resultMsg += `<br>🦅 ${se.label}`;
        } else {
          resultMsg += `<br>🦅 Phénix : vos PV > 40%, pas de soin nécessaire.`;
        }
      }
    }

    showToast(resultMsg, 5000);
    gameEvents.emit('combat_hit', { crit: true });
    // Mise à jour HP bars
    const hpPct = (state.boss.current.hp / state.boss.current.hp_max) * 100;
    if ($('bossHpBar')) $('bossHpBar').style.width = `${hpPct}%`;
    if ($('bossHpText')) $('bossHpText').textContent = `❤️ ${state.boss.current.hp} / ${state.boss.current.hp_max}`;
    const phPct = (state.player.stats.hp_current / state.player.stats.constitution) * 100;
    if ($('playerHpBar')) $('playerHpBar').style.width = `${phPct}%`;
    if ($('playerHpText')) $('playerHpText').textContent = `${state.player.stats.hp_current} / ${state.player.stats.constitution}`;
    saveState();
    if (state.boss.current && state.boss.current.hp <= 0) {
      setTimeout(() => victory(), 800);
      return;
    }
    renderSessionView();
  }

  return {
    startRegionalBossEncounter,
    startSession,
    startRecoverySession,
    abandonSession,
    confirmExerciseSubmission,
    castSpell,
    activateLimit,
    activateSummon,
    regenerateExerciseSet,
    finishSession,
    victory,
    defeat,
  };
}
