import { createGameCatalog } from './data/gameCatalog.js';
import { createWorldBindings } from './game/worldBindings.js';
import { createSessionFlow } from './game/sessionFlow.js';
import { defaultState } from './core/state.js';
import { createAudioBus } from './audio/audioBus.js';
import { gameEvents } from './audio/gameEvents.js';
import { reconcileQuestState, recheckStepsQuests } from './core/questEngine.js';
import { syncStepBalance, refreshStepsFromDevice } from './native/steps.js';
import { createAdminForms } from './ui/adminForms.js';
import { createAdminActions } from './ui/adminActions.js';
import { createBindAdminListeners } from './ui/adminPanel.js';
import { createInventoryActions } from './ui/inventoryActions.js';
import { iconUrl, buildIconImg } from './ui/gameIcons.js';
import { createAppShell } from './ui/appShell.js';
import { EQUIP_SLOTS, rarityLabel } from './ui/uiConfig.js';
import { loadGame, saveGame, resetGame, replaceStoredSave } from './core/storage.js';
import { shuffle } from './core/utils.js';
import { $ } from './ui/dom.js';
import { showToast } from './ui/toast.js';
import { bindUi, uiCtx } from './ui/renderContext.js';
import { renderDashboardAll, renderHero } from './ui/renderDashboard.js';
import {
  renderInventoryView,
  renderInventoryGrid,
  renderBlacksmith,
  renderWitch,
  renderMerchant,
} from './ui/renderInventory.js';
import {
  renderPreSessionView,
  renderSessionView,
  updateDamagePreview,
  resetPresessionDraft,
  handlePresessionAction,
  handlePresessionLaunchInteraction,
} from './ui/renderSession.js';
import { renderAdminPanel } from './ui/renderAdmin.js';
import { renderQuestsView, updateQuestBadge } from './ui/renderQuests.js';
import { showFloatingDmg, flashBossPortrait, shakeScreen } from './ui/renderCombatFx.js';
import { showSummaryModal, showRecoverySummaryModal, showVictoryModal, showDefeatModal } from './ui/renderModals.js';
import { openEnemyStatsModal } from './ui/enemyStatsPanel.js';

const audioBus = createAudioBus();

document.addEventListener(
  'click',
  (e) => {
    if (
      e.target.closest(
        'button, .action-btn, .btn, .session-back, .exercise-card, .zone-banner-action, .equip-slot, .presession-launch-pill, .presession-stats-trigger, .cycle-trigger',
      )
    ) {
      gameEvents.emit('ui_click');
    }
  },
  true,
);
document.addEventListener('touchend', () => audioBus.unlockAudio(), { passive: true });

function bindAppAudioLifecycle() {
  const pauseAudio = () => audioBus.pauseAll();
  const resumeAudio = () => audioBus.resumeAppAudio();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAudio();
    else resumeAudio();
  });
  window.addEventListener('pagehide', pauseAudio);
  window.addEventListener('blur', pauseAudio);
  window.addEventListener('focus', resumeAudio);
}

bindAppAudioLifecycle();

/* STATE */
let state=null;
const catalog=createGameCatalog(()=>state);
let currentExerciseId=null;
const inventoryUi={activeInvTab:'inventory',activeMerchantTab:'buy',invTypeFilter:'all'};

function saveState(){
  saveGame(state,{onPersistError:()=>showToast('⚠ Erreur de sauvegarde')});
}
function resetState(){
  resetGame();
  state=null;
}
function getAppVolume(){
  return Math.round(((state?.settings?.audio?.masterVolume ?? 1) * 100));
}
function renderAppVolumeSetting(){
  const volume = getAppVolume();
  $('appVolumeSlider').value = String(volume);
  $('appVolumeValue').textContent = `${volume}%`;
}
function applyAppVolume(volumePercent, { persist = false } = {}){
  const volume = Math.min(100, Math.max(0, Number(volumePercent) || 0));
  if (!state.settings) state.settings = {};
  if (!state.settings.audio) state.settings.audio = {};
  state.settings.audio.masterVolume = volume / 100;
  audioBus.setMasterVolume(state.settings.audio.masterVolume);
  renderAppVolumeSetting();
  if (persist) saveState();
}

const world=createWorldBindings({getState:()=>state,catalog});

function renderAll(){ renderDashboardAll(); updateQuestBadge(state); }

const { openModal, closeModal, showView } = createAppShell({
  $,
  renderAll,
  renderPreSessionView,
  renderSessionView,
  renderInventoryView,
  renderQuestsView,
  getRenderAdmin: () => renderAdmin,
  onSceneChange: (name) => {
    const key = name === 'pre-session' ? 'pre-session' : name;
    audioBus.playSceneBgm(key);
  },
});

const session=createSessionFlow({
  getState:()=>state,
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
  getCurrentExerciseId:()=>currentExerciseId,
  getBossSpriteCtl:()=>uiCtx.bossSpriteCtl,
  world,
});

const{
  startRegionalBossEncounter,
  startSession,
  startRecoverySession,
  abandonSession,
  confirmExerciseSubmission,
  castSpell,
  activateLimit,
  regenerateExerciseSet,
  finishSession,
}=session;

const{
  equipItem,
  unequipItem,
  sellItem,
  findCombineCandidate,
  combineWeapons,
  drinkPotionOOC,
  drinkEtherOOC,
  upgradeItem,
  forgeWeapon,
  brewPotion,
}=createInventoryActions({
  getState:()=>state,
  saveState,
  catalog,
  showToast,
  $,
  renderInventoryView,
  renderHero,
});

/* ============ PHASE 6B : ADMIN PANEL ============ */
const adminUi={activeTab:'zones'};

const adminActions=createAdminActions({
  getState:()=>state,
  saveState,
});

function renderAdmin(){
  renderAdminPanel();
  bindAdminListeners();
}

const adminForms=createAdminForms({
  $,
  getState:()=>state,
  showToast,
  openModal,
  closeModal,
  saveState,
  renderAdmin,
  rarityLabel,
  catalog,
});

const bindAdminListeners=createBindAdminListeners({
  $,
  getState:()=>state,
  showToast,
  saveState,
  resetState,
  replaceStoredSave,
  adminForms,
  adminActions,
  getRenderAdmin:()=>renderAdmin,
});

document.querySelectorAll('.admin-tab').forEach(t=>{
  t.addEventListener('click',()=>{adminUi.activeTab=t.dataset.admintab;renderAdmin();});
});
$('adminEditCancel').addEventListener('click',()=>{closeModal('adminEditModal');adminForms.clearAdminEditCtx();});
$('adminEditSave').addEventListener('click',()=>adminForms.handleAdminEditSave());
$('adminEditModal').addEventListener('click',(e)=>{if(e.target.id==='adminEditModal')closeModal('adminEditModal');});

/* BOOT */
function boot(){
  state=loadGame();
  if(!state||!state.player||!state.player.name){
    state=defaultState();state.meta.created_at=new Date().toISOString();
    audioBus.setMasterVolume(state.settings.audio.masterVolume);
    openModal('welcomeModal');setTimeout(()=>$('nameInput').focus(),300);
  }else{
    audioBus.setMasterVolume(state.settings.audio.masterVolume);
    reconcileQuestState(state, null);
    updateQuestBadge(state);
    if(state.session_current)showView('session');else showView('dashboard');
  }
}

/* LISTENERS */
$('confirmName').addEventListener('click',()=>{
  const name=$('nameInput').value.trim();
  if(name.length<2){showToast('⚠ Au moins 2 caractères');return;}
  state.player.name=name;reconcileQuestState(state,null);saveState();closeModal('welcomeModal');showView('dashboard');
  showToast(`⚔ Bienvenue, ${name} !`);
});
$('nameInput').addEventListener('keydown',(e)=>{if(e.key==='Enter')$('confirmName').click();});
$('settingsBtn').addEventListener('click',()=>{$('renameInput').value=state.player.name;renderAppVolumeSetting();openModal('settingsModal');});
$('cancelSettings').addEventListener('click',()=>closeModal('settingsModal'));
$('appVolumeSlider').addEventListener('input',(e)=>applyAppVolume(e.target.value,{persist:true}));
$('saveSettings').addEventListener('click',()=>{
  const newName=$('renameInput').value.trim();
  if(newName.length<2){showToast('⚠ Au moins 2 caractères');return;}
  state.player.name=newName;saveState();renderHero();closeModal('settingsModal');
  showToast('✓ Modifications enregistrées');
});
$('resetGame').addEventListener('click',()=>{if(confirm('Êtes-vous sûr ? Toute votre progression sera perdue.')){resetState();location.reload();}});
$('btnStartSession').addEventListener('click',()=>{
  if(state.player.recovering){startRecoverySession();return;}
  resetPresessionDraft();
  showView('pre-session');
});

$('btnInventory').addEventListener('click',()=>showView('inventory'));
$('btnQuests').addEventListener('click',()=>showView('quests'));
$('btnAdmin').addEventListener('click',()=>{closeModal('settingsModal');showView('admin');});
$('btnSyncSteps').addEventListener('click',async ()=>{
  if(!state?.player)return;
  const { platform } = await refreshStepsFromDevice();
  const bonus = platform === 'web' ? 800 : 0;
  const added = await syncStepBalance(state, { mockBonus: bonus });
  recheckStepsQuests(state, showToast);
  saveState();
  renderAll();
  showToast(added > 0 ? `🚶 +${added} pas synchronisés` : '🚶 Solde pas mis à jour (branchez un plugin santé sur mobile)', 3000);
});

document.querySelectorAll('.session-back').forEach(b=>{
  b.addEventListener('click',()=>{
    const action=b.dataset.back;
    if(action==='abandon'){
      if(state.session_current&&state.session_current.exercises.some(e=>e.completed)){
        if(!confirm('Abandonner la séance ? Vous perdez vos PV restants mais conservez les dégâts infligés au boss.'))return;
      }
      state.session_current=null;saveState();
    }
    showView('dashboard');
  });
});

$('viewPreSession').addEventListener('click',(e)=>{
  if(e.target.closest('.presession-stats-trigger')){
    e.preventDefault();
    openEnemyStatsModal(state.boss?.current);
    return;
  }
  const actBtn=e.target.closest('[data-presession-action]');
  if(actBtn){handlePresessionAction(actBtn.dataset.presessionAction);return;}
  const launch=e.target.closest('#btnLaunchSession');
  if(!launch)return;
  e.preventDefault();
  const proposed=JSON.parse(launch.dataset.proposed||'[]');
  const bossId=launch.dataset.bossId;
  if(proposed.length===0){showToast('⚠ Aucun exercice proposé');return;}
  handlePresessionLaunchInteraction(launch,{onCommit:()=>startSession(proposed,bossId)});
});

['exSets','exReps','exWeight'].forEach(id=>$(id).addEventListener('input',updateDamagePreview));
$('cancelExercise').addEventListener('click',()=>closeModal('exerciseModal'));
$('confirmExercise').addEventListener('click',confirmExerciseSubmission);
$('btnFinishSession').addEventListener('click',finishSession);
$('btnAbandonSession').addEventListener('click',()=>{
  if(confirm('Fuir le combat ? Le boss s\'enfuira sans récompense et vos blessures resteront.')) abandonSession();
});
$('btnReturnDashboard').addEventListener('click',()=>{closeModal('summaryModal');showView('dashboard');});
$('btnVictoryReturn').addEventListener('click',()=>{closeModal('victoryModal');showView('dashboard');});
$('btnDefeatReturn').addEventListener('click',()=>{closeModal('defeatModal');showView('dashboard');});

document.querySelectorAll('#viewInventory .tab[data-tab]').forEach(t=>{
  t.addEventListener('click',()=>{inventoryUi.activeInvTab=t.dataset.tab;renderInventoryView();});
});
document.querySelectorAll('#invTypeFilters .filter-pill').forEach(p=>{
  p.addEventListener('click',()=>{
    document.querySelectorAll('#invTypeFilters .filter-pill').forEach(x=>x.classList.remove('active'));
    p.classList.add('active');inventoryUi.invTypeFilter=p.dataset.filter;renderInventoryGrid();
  });
});
$('itemDetailModal').addEventListener('click',(e)=>{if(e.target.id==='itemDetailModal')closeModal('itemDetailModal');});
$('settingsModal').addEventListener('click',(e)=>{if(e.target.id==='settingsModal')closeModal('settingsModal');});
document.addEventListener('click',(e)=>{
  const trigger=e.target.closest('.cycle-trigger');
  if(!trigger)return;
  e.preventDefault();
  e.stopPropagation();
  openEnemyStatsModal(state.boss?.current, trigger.dataset.cycleKind === 'element' ? 'element' : 'specialty');
});

/* Boire potion hors combat */
$('btnDrinkPotionDash').addEventListener('click',drinkPotionOOC);
$('btnDrinkPotionHub').addEventListener('click',drinkPotionOOC);
$('btnDrinkEtherDash').addEventListener('click',drinkEtherOOC);

/* Onglets Marchand */
document.querySelectorAll('[data-merchant]').forEach(b=>{
  b.addEventListener('click',()=>{inventoryUi.activeMerchantTab=b.dataset.merchant;renderMerchant();});
});

/* Voyager modal close */
$('zoneTravelClose').addEventListener('click',()=>closeModal('zoneTravelModal'));
$('zoneTravelModal').addEventListener('click',(e)=>{if(e.target.id==='zoneTravelModal')closeModal('zoneTravelModal');});
/* GPS Travel modal — cancel stops the tracker */
$('gpsTravelCancel').addEventListener('click',()=>{
  // Import is already done in renderDashboard; we just need to close. The tracker stops on its own when the module reference is cleared.
  // Actually we need to call stop — use a custom event approach.
  document.dispatchEvent(new CustomEvent('gps-travel-cancel'));
  closeModal('gpsTravelModal');
});
$('equipPickerClose').addEventListener('click',()=>closeModal('equipPickerModal'));
$('equipPickerModal').addEventListener('click',(e)=>{if(e.target.id==='equipPickerModal')closeModal('equipPickerModal');});
$('enemyStatsClose').addEventListener('click',()=>closeModal('enemyStatsModal'));
$('enemyStatsModal').addEventListener('click',(e)=>{if(e.target.id==='enemyStatsModal')closeModal('enemyStatsModal');});

bindUi({
  getState: () => state,
  $,
  showToast,
  openModal,
  closeModal,
  saveState,
  showView,
  getCurrentZone: world.getCurrentZone,
  allZones:catalog.allZones,
  allBosses:catalog.allBosses,
  allExercises:catalog.allExercises,
  allSpells:catalog.allSpells,
  isZoneUnlocked: world.isZoneUnlocked,
  getRegionalBossOfCurrentZone: world.getRegionalBossOfCurrentZone,
  getZoneById: world.getZoneById,
  tryUnlockZones: world.tryUnlockZones,
  refreshDashboard: renderAll,
  EQUIP_SLOTS,
  buildIconImg,
  iconUrl,
  rarityLabel,
  equipItem,
  unequipItem,
  startRegionalBossEncounter,
  inventoryUi,
  adminUi,
  allMaterials:catalog.allMaterials,
  allIngredients:catalog.allIngredients,
  allEquipment:catalog.allEquipment,
  allBlacksmithRecipes:catalog.allBlacksmithRecipes,
  allWitchRecipes:catalog.allWitchRecipes,
  findCombineCandidate,
  sellItem,
  upgradeItem,
  combineWeapons,
  forgeWeapon,
  brewPotion,
  getSpellById:catalog.getSpellById,
  castSpell,
  activateLimit,
  showFloatingDmg,
  computeExerciseDamage: world.computeExerciseDamage,
  setCurrentExerciseId: (id) => {
    currentExerciseId = id;
  },
  getCurrentExerciseId: () => currentExerciseId,
  pickBossForLevel: world.pickBossForLevel,
  generateProposedExercises: world.generateProposedExercises,
  isBuiltIn:catalog.isBuiltIn,
  isEntryDisabled:catalog.isEntryDisabled,
  bossSpriteCtl: null,
  bossSpritePreCtl: null,
  openEnemyStatsModal,
});

boot();
