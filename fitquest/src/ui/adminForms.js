import { SLOT_LABEL } from '../data/constants.js';
import { ELEMENT_OPTIONS } from '../data/elements.js';

/**
 * Formulaires admin (création / édition contenu custom + recettes).
 * @param {object} deps
 */
export function createAdminForms(deps) {
  const { $, getState, showToast, openModal, closeModal, saveState, renderAdmin, rarityLabel, catalog } = deps;

  let adminEditCtx = null;

  function getFormHtml(type, item) {
    item = item || {};
    const txt = (label, key, val, opts = {}) =>
      `<div class="form-row"><label>${label}</label><input type="${opts.type || 'text'}" id="f_${key}" value="${val !== undefined ? val : ''}"${opts.min !== undefined ? ' min="' + opts.min + '"' : ''}${opts.max !== undefined ? ' max="' + opts.max + '"' : ''}${opts.step ? ' step="' + opts.step + '"' : ''}></div>`;
    const sel = (label, key, val, options) =>
      `<div class="form-row"><label>${label}</label><select id="f_${key}">${options.map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
    const ta = (label, key, val) => `<div class="form-row"><label>${label}</label><textarea id="f_${key}">${val || ''}</textarea></div>`;
    const rarities = [
      ['common', 'Commun'],
      ['rare', 'Rare'],
      ['epic', 'Épique'],
      ['legendary', 'Légendaire'],
    ];
    const types = [
      ['force', 'Force'],
      ['agility', 'Agilité'],
      ['endurance', 'Endurance'],
    ];
    const slots = [
      ['weapon_main', 'Arme principale'],
      ['weapon_secondary', 'Arme secondaire'],
      ['armor', 'Plastron'],
      ['helmet', 'Casque'],
      ['legs', 'Jambières'],
      ['cape', 'Cape'],
      ['accessory_1', 'Accessoire'],
    ];
    if (type === 'zones') {
      const bossOptions = [['', '—']].concat(catalog.allBosses().map((b) => [b.id, b.name + ' (niv ' + b.level + ')']));
      return (
        txt('ID (sans espace)', 'id', item.id, {}) +
        txt('Nom', 'name', item.name) +
        sel('Élément de la zone', 'element', item.element || '', ELEMENT_OPTIONS) +
        `<div class="form-grid-2">${txt('Niveau min', 'levelMin', item.levelMin || 1, { type: 'number', min: 1 })}${txt('Niveau max', 'levelMax', item.levelMax || 10, { type: 'number', min: 1 })}</div>` +
        txt('Niveau requis joueur', 'requiredLevel', item.requiredLevel || 1, { type: 'number', min: 1 }) +
        sel('Boss régional précédent requis', 'requiredRegionalBoss', item.requiredRegionalBoss || '', bossOptions) +
        sel('Boss régional de cette zone', 'regionalBossId', item.regionalBossId || '', bossOptions) +
        txt('Couleur thème (#hex)', 'themeColor', item.themeColor || '#22c55e') +
        txt('Couleur accent (#hex)', 'accent', item.accent || '#86efac') +
        txt('Image dashboard', 'bgImage', item.bgImage || '') +
        txt('Image combat', 'combatBgImage', item.combatBgImage || '') +
        txt('Image pré-combat', 'preSessionBgImage', item.preSessionBgImage || '') +
        sel('Paysage SVG par défaut', 'svgKey', item.svgKey || 'forest', [
          ['forest', 'Forêt'],
          ['swamp', 'Marais'],
          ['crystal', 'Caverne'],
          ['default', 'Sombre'],
        ]) +
        ta('Description', 'desc', item.desc)
      );
    }
    if (type === 'exercises') {
      return (
        txt('ID', 'id', item.id) +
        txt('Nom', 'name', item.name) +
        sel('Type', 'type', item.type || 'force', types) +
        sel('Groupe', 'group', item.group || 'haut', [
          ['haut', 'Haut du corps'],
          ['bas', 'Bas'],
          ['full', 'Full body'],
        ]) +
        sel('Unité', 'unit', item.unit || 'reps', [
          ['reps', 'Répétitions'],
          ['seconds', 'Secondes'],
        ]) +
        txt('Dégâts de base', 'baseDamage', item.baseDamage || 10, { type: 'number', min: 1, max: 100 }) +
        sel('Avec poids ?', 'hasWeight', item.hasWeight ? '1' : '0', [
          ['0', 'Non'],
          ['1', 'Oui'],
        ]) +
        txt('URL image custom (optionnel)', 'customImage', item.customImage || '') +
        ta('Description', 'desc', item.desc)
      );
    }
    if (type === 'bosses') {
      const zoneOptions = catalog.allZones().map((z) => [z.id, z.name]);
      return (
        txt('ID', 'id', item.id) +
        txt('Nom', 'name', item.name) +
        `<div class="form-grid-2">${sel('Rareté', 'rarity', item.rarity || 'common', rarities)}${sel('Type', 'type', item.type || 'force', types)}</div>` +
        `<div class="form-grid-2">${txt('Niveau', 'level', item.level || 1, { type: 'number', min: 1, max: 120 })}${txt('PV max', 'hp_max', item.hp_max || 100, { type: 'number', min: 1 })}</div>` +
        `<div class="form-grid-2">${txt('Attaque', 'attack', item.attack || 10, { type: 'number', min: 1 })}${txt('Défense', 'defense', item.defense || 5, { type: 'number', min: 0 })}</div>` +
        `<div class="form-grid-2">${txt('Or', 'gold', item.gold || 30, { type: 'number', min: 0 })}${txt('XP', 'xp', item.xp || 80, { type: 'number', min: 0 })}</div>` +
        sel('Élément', 'element', item.element || '', ELEMENT_OPTIONS) +
        txt('Icône Game-icons', 'icon', item.icon || 'goblin-head') +
        txt('URL image custom (optionnel)', 'customImage', item.customImage || '') +
        sel('Zone', 'region', item.region || (zoneOptions[0] || ['', ''])[0], zoneOptions) +
        sel('Boss régional ?', 'isRegionalBoss', item.isRegionalBoss ? '1' : '0', [
          ['0', 'Non'],
          ['1', 'Oui'],
        ]) +
        ta('Description', 'desc', item.desc) +
        ta('Drops (JSON: [{type,id,chance,qty:[min,max]}])', 'drops', JSON.stringify(item.drops || []))
      );
    }
    if (type === 'equipment') {
      return (
        txt('ID', 'id', item.id) +
        txt('Nom', 'name', item.name) +
        `<div class="form-grid-2">${sel('Rareté', 'rarity', item.rarity || 'common', rarities)}${sel('Slot', 'slot', item.slot || 'weapon_main', slots)}</div>` +
        sel('Élément (offensif)', 'element', item.element || '', ELEMENT_OPTIONS) +
        sel('Résistance élémentaire (défensive)', 'elementResist', item.elementResist || '', ELEMENT_OPTIONS) +
        txt('Icône Game-icons', 'icon', item.icon || 'broadsword') +
        txt('URL image custom (optionnel)', 'customImage', item.customImage || '') +
        `<div class="form-grid-2">${txt('+Force', 'sForce', (item.stats || {}).force || 0, { type: 'number', min: 0 })}${txt('+Défense', 'sDefense', (item.stats || {}).defense || 0, { type: 'number', min: 0 })}</div>` +
        `<div class="form-grid-2">${txt('+Vitesse', 'sAgility', (item.stats || {}).agility || 0, { type: 'number', min: 0 })}${txt('+PV max', 'sConstitution', (item.stats || {}).constitution || 0, { type: 'number', min: 0 })}</div>` +
        ta('Description', 'desc', item.desc)
      );
    }
    if (type === 'materials' || type === 'ingredients') {
      return (
        txt('ID', 'id', item.id) +
        txt('Nom', 'name', item.name) +
        sel('Rareté', 'rarity', item.rarity || 'common', rarities) +
        txt('Icône Game-icons', 'icon', item.icon || (type === 'materials' ? 'wood-pile' : 'three-leaves')) +
        txt('URL image custom (optionnel)', 'customImage', item.customImage || '') +
        ta('Description', 'desc', item.desc)
      );
    }
    if (type === 'spells') {
      const effects = [
        ['damage_flat', 'Dégâts directs (valeur fixe)'],
        ['heal_flat', 'Soin direct (valeur fixe)'],
      ];
      return (
        txt('ID', 'id', item.id) +
        txt('Nom', 'name', item.name) +
        sel('Élément', 'element', item.element || '', ELEMENT_OPTIONS) +
        txt('Coût en Mana', 'manaCost', item.manaCost || 10, { type: 'number', min: 0, max: 200 }) +
        sel('Effet', 'effect', item.effect || 'damage_flat', effects) +
        txt("Valeur de l'effet", 'value', item.value || 20, { type: 'number', min: 1 }) +
        sel('Une fois par combat ?', 'oncePerCombat', item.oncePerCombat ? '1' : '0', [
          ['0', 'Non'],
          ['1', 'Oui'],
        ]) +
        txt('Icône Game-icons', 'icon', item.icon || 'fire-ball') +
        txt('URL image custom (optionnel)', 'customImage', item.customImage || '') +
        ta('Description', 'desc', item.desc)
      );
    }
    return '';
  }

  function openAdminEdit(type, id) {
    adminEditCtx = { type, id };
    let item = null;
    const isBuiltin = id && catalog.isBuiltIn(id, type);
    if (id) {
      const list =
        type === 'zones'
          ? catalog.allZones()
          : type === 'exercises'
            ? catalog.allExercises()
            : type === 'bosses'
              ? catalog.allBosses()
              : type === 'equipment'
                ? catalog.allEquipment()
                : type === 'materials'
                  ? catalog.allMaterials()
                  : type === 'ingredients'
                    ? catalog.allIngredients()
                    : catalog.allSpells();
      item = list.find((x) => x.id === id);
    }
    const typeLabel = { zones: 'zone', exercises: 'exercice', bosses: 'boss', equipment: 'équipement', materials: 'matériau', ingredients: 'ingrédient', spells: 'sort' }[type];
    $('adminEditTitle').textContent = (id ? 'Modifier ' : 'Créer ') + typeLabel + (isBuiltin ? ' (base)' : '');
    $('adminEditFields').innerHTML = getFormHtml(type, item);
    // ID non modifiable pour les built-ins
    if (isBuiltin) {
      const fId = $('f_id');
      if (fId) { fId.readOnly = true; fId.style.opacity = '0.5'; fId.title = 'L\'ID ne peut pas être modifié sur un élément de base'; }
    }
    openModal('adminEditModal');
  }

  function saveAdminEdit() {
    if (!adminEditCtx) return;
    const state = getState();
    const { type, id } = adminEditCtx;
    const v = (k) => {
      const el = $('f_' + k);
      return el ? el.value : '';
    };
    let obj = {};
    if (type === 'zones') {
      obj = {
        id: v('id'),
        name: v('name'),
        element: v('element') || null,
        levelMin: parseInt(v('levelMin')) || 1,
        levelMax: parseInt(v('levelMax')) || 10,
        requiredLevel: parseInt(v('requiredLevel')) || 1,
        requiredRegionalBoss: v('requiredRegionalBoss') || null,
        regionalBossId: v('regionalBossId') || null,
        themeColor: v('themeColor'),
        accent: v('accent'),
        bgImage: v('bgImage') || null,
        combatBgImage: v('combatBgImage') || null,
        preSessionBgImage: v('preSessionBgImage') || null,
        svgKey: v('svgKey'),
        desc: v('desc'),
      };
    } else if (type === 'exercises') {
      obj = {
        id: v('id'),
        name: v('name'),
        type: v('type'),
        group: v('group'),
        unit: v('unit'),
        baseDamage: parseInt(v('baseDamage')) || 10,
        hasWeight: v('hasWeight') === '1',
        customImage: v('customImage') || null,
        desc: v('desc'),
      };
    } else if (type === 'bosses') {
      let drops = [];
      try {
        drops = JSON.parse(v('drops') || '[]');
      } catch (e) {
        showToast('⚠ Drops JSON invalide');
        return;
      }
      obj = {
        id: v('id'),
        name: v('name'),
        rarity: v('rarity'),
        type: v('type'),
        element: v('element') || null,
        level: parseInt(v('level')) || 1,
        hp_max: parseInt(v('hp_max')) || 100,
        attack: parseInt(v('attack')) || 10,
        defense: parseInt(v('defense')) || 5,
        gold: parseInt(v('gold')) || 30,
        xp: parseInt(v('xp')) || 80,
        icon: v('icon'),
        customImage: v('customImage') || null,
        region: v('region'),
        isRegionalBoss: v('isRegionalBoss') === '1',
        desc: v('desc'),
        drops,
      };
    } else if (type === 'equipment') {
      const stats = {};
      if (parseInt(v('sForce'))) stats.force = parseInt(v('sForce'));
      if (parseInt(v('sDefense'))) stats.defense = parseInt(v('sDefense'));
      if (parseInt(v('sAgility'))) stats.agility = parseInt(v('sAgility'));
      if (parseInt(v('sConstitution'))) stats.constitution = parseInt(v('sConstitution'));
      obj = {
        id: v('id'),
        name: v('name'),
        rarity: v('rarity'),
        slot: v('slot'),
        element: v('element') || null,
        elementResist: v('elementResist') || null,
        icon: v('icon'),
        customImage: v('customImage') || null,
        stats,
        desc: v('desc'),
      };
    } else if (type === 'materials' || type === 'ingredients') {
      obj = {
        id: v('id'),
        name: v('name'),
        rarity: v('rarity'),
        icon: v('icon'),
        customImage: v('customImage') || null,
        desc: v('desc'),
      };
    } else if (type === 'spells') {
      obj = {
        id: v('id'),
        name: v('name'),
        element: v('element') || null,
        manaCost: parseInt(v('manaCost')) || 10,
        effect: v('effect'),
        value: parseInt(v('value')) || 20,
        oncePerCombat: v('oncePerCombat') === '1',
        icon: v('icon'),
        customImage: v('customImage') || null,
        desc: v('desc'),
      };
    }
    if (!obj.id || !obj.name) {
      showToast('⚠ ID et Nom requis');
      return;
    }

    const isBuiltin = id && catalog.isBuiltIn(id, type);

    if (isBuiltin) {
      // Élément de base : on stocke les modifications dans custom.overrides
      if (!state.player.custom.overrides) state.player.custom.overrides = {};
      // On ne stocke que les champs modifiables (pas l'ID)
      const { id: _id, ...fields } = obj;
      state.player.custom.overrides[id] = fields;
    } else {
      // Élément custom : mise à jour ou création dans le tableau correspondant
      const arr = state.player.custom[type];
      if (id) {
        const idx = arr.findIndex((x) => x.id === id);
        if (idx >= 0) arr[idx] = obj;
        else arr.push(obj);
      } else {
        if (arr.some((x) => x.id === obj.id) || catalog.isBuiltIn(obj.id, type)) {
          showToast('⚠ ID déjà utilisé');
          return;
        }
        arr.push(obj);
      }
    }

    saveState();
    closeModal('adminEditModal');
    renderAdmin();
    showToast('✓ Enregistré');
  }

  function openRecipeEdit(rtype) {
    const isB = rtype === 'blacksmith';
    $('adminEditTitle').textContent = 'Nouvelle recette ' + (isB ? 'Forgeron' : 'Sorcière');
    let html = '';
    if (isB) {
      const items = catalog.allEquipment();
      const itemOpt = items.map((w) => `<option value="${w.id}">${w.name} (${rarityLabel(w.rarity)} · ${SLOT_LABEL[w.slot] || '?'})</option>`).join('');
      html = `
      <div class="form-row"><label>Équipement à forger</label><select id="f_weaponId">${itemOpt}</select></div>
      <div class="form-row"><label>Or requis</label><input type="number" id="f_gold" value="50" min="0"></div>
      <div class="form-row"><label>Matériaux requis</label><div id="recipeMatList"></div><button type="button" class="admin-add-btn" id="btnAddMat" style="margin-top:6px;padding:8px;font-size:11px;">+ Ajouter un matériau</button></div>`;
    } else {
      html = `
      <div class="form-row"><label>ID (sans espace, unique)</label><input type="text" id="f_id" placeholder="potion_force"></div>
      <div class="form-row"><label>Nom</label><input type="text" id="f_name" placeholder="Potion de Force"></div>
      <div class="form-row"><label>Description</label><textarea id="f_desc"></textarea></div>
      <div class="form-row"><label>Effet</label><select id="f_effect"><option value="heal">Soigne 50 PV</option><option value="strength">+30% dégâts (1 séance)</option><option value="xp">×2 XP (1 séance)</option><option value="gold">+50 or instantané</option><option value="mana">Restaure 50 MP</option></select></div>
      <div class="form-row"><label>Or requis</label><input type="number" id="f_gold" value="0" min="0"></div>
      <div class="form-row"><label>Ingrédients requis</label><div id="recipeIngList"></div><button type="button" class="admin-add-btn" id="btnAddIng" style="margin-top:6px;padding:8px;font-size:11px;">+ Ajouter un ingrédient</button></div>`;
    }
    $('adminEditFields').innerHTML = html;
    adminEditCtx = { type: '_recipe_' + rtype, rows: [] };
    if (isB) {
      $('btnAddMat').addEventListener('click', () => addRecipeMatRow());
      addRecipeMatRow();
    } else {
      $('btnAddIng').addEventListener('click', () => addRecipeIngRow());
      addRecipeIngRow();
    }
    openModal('adminEditModal');
  }

  function addRecipeMatRow() {
    const list = $('recipeMatList');
    const mats = catalog.allMaterials();
    const opt = mats.map((m) => `<option value="${m.id}">${m.name} (${rarityLabel(m.rarity)})</option>`).join('');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
    div.innerHTML = `<select data-mat-id style="flex:1;background:rgba(0,0,0,0.5);border:1px solid var(--border-strong);border-radius:6px;padding:8px;color:var(--text);font-size:12px;">${opt}</select><input type="number" data-mat-qty min="1" value="1" style="width:60px;background:rgba(0,0,0,0.5);border:1px solid var(--border-strong);border-radius:6px;padding:8px;color:var(--text);font-size:12px;text-align:center;"><button type="button" data-rm style="background:rgba(196,30,58,0.2);color:var(--blood-bright);border:1px solid rgba(196,30,58,0.4);padding:8px;border-radius:6px;cursor:pointer;">×</button>`;
    list.appendChild(div);
    div.querySelector('[data-rm]').addEventListener('click', () => div.remove());
  }

  function addRecipeIngRow() {
    const list = $('recipeIngList');
    const ings = catalog.allIngredients();
    const opt = ings.map((m) => `<option value="${m.id}">${m.name} (${rarityLabel(m.rarity)})</option>`).join('');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
    div.innerHTML = `<select data-ing-id style="flex:1;background:rgba(0,0,0,0.5);border:1px solid var(--border-strong);border-radius:6px;padding:8px;color:var(--text);font-size:12px;">${opt}</select><input type="number" data-ing-qty min="1" value="1" style="width:60px;background:rgba(0,0,0,0.5);border:1px solid var(--border-strong);border-radius:6px;padding:8px;color:var(--text);font-size:12px;text-align:center;"><button type="button" data-rm style="background:rgba(196,30,58,0.2);color:var(--blood-bright);border:1px solid rgba(196,30,58,0.4);padding:8px;border-radius:6px;cursor:pointer;">×</button>`;
    list.appendChild(div);
    div.querySelector('[data-rm]').addEventListener('click', () => div.remove());
  }

  function saveRecipeEdit(rtype) {
    const state = getState();
    const v = (k) => {
      const el = $('f_' + k);
      return el ? el.value : '';
    };
    if (rtype === 'blacksmith') {
      const mats = [];
      document.querySelectorAll('#recipeMatList > div').forEach((row) => {
        const id = row.querySelector('[data-mat-id]').value;
        const qty = parseInt(row.querySelector('[data-mat-qty]').value) || 1;
        if (id) mats.push({ id, qty });
      });
      if (!v('weaponId') || mats.length === 0) {
        showToast('⚠ Sélectionne un équipement et au moins 1 matériau');
        return;
      }
      state.player.custom.blacksmith.push({
        weaponId: v('weaponId'),
        gold: parseInt(v('gold')) || 0,
        materials: mats,
      });
    } else {
      const ings = [];
      document.querySelectorAll('#recipeIngList > div').forEach((row) => {
        const id = row.querySelector('[data-ing-id]').value;
        const qty = parseInt(row.querySelector('[data-ing-qty]').value) || 1;
        if (id) ings.push({ id, qty });
      });
      if (!v('id') || !v('name') || ings.length === 0) {
        showToast('⚠ ID, nom et au moins 1 ingrédient requis');
        return;
      }
      state.player.custom.witch.push({
        id: v('id'),
        name: v('name'),
        desc: v('desc'),
        effect: v('effect'),
        gold: parseInt(v('gold')) || 0,
        ingredients: ings,
        icon: 'standing-potion',
        rarity: 'common',
      });
    }
    saveState();
    closeModal('adminEditModal');
    renderAdmin();
    showToast('✓ Recette ajoutée');
  }

  function handleAdminEditSave() {
    if (!adminEditCtx) return;
    if (adminEditCtx.type === '_recipe_blacksmith') saveRecipeEdit('blacksmith');
    else if (adminEditCtx.type === '_recipe_witch') saveRecipeEdit('witch');
    else saveAdminEdit();
  }

  function clearAdminEditCtx() {
    adminEditCtx = null;
  }

  return {
    openAdminEdit,
    openRecipeEdit,
    handleAdminEditSave,
    clearAdminEditCtx,
  };
}
