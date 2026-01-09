import './style.css';

// Import Wails runtime
import { GetCharacter, GetCharacters, GetDeletedCharacters, SaveCharacter, AddHistoryNote, DeleteCharacter, RestoreCharacter, ExportHistory, SaveAndOpenHTML } from '../wailsjs/go/main/App';
import { GetMap, GetMaps, GetDeletedMaps, SaveMap, DeleteMap, RestoreMap, CreateMap } from '../wailsjs/go/main/App';
import { GetWorldNote, GetWorldNotes, GetDeletedWorldNotes, SaveWorldNote, DeleteWorldNote, RestoreWorldNote } from '../wailsjs/go/main/App';

// Import map utilities
import { KonvaMapCanvas } from './utils/KonvaMapCanvas';
import { MapList } from './components/Maps/MapList';

// Global state
let currentCharacter = null;
let previousHP = null;
let currentMap = null;
let currentWorldNote = null;
let showDeletedCharacters = false;
let showDeletedMaps = false;
let showDeletedWorldNotes = false;
let showDeletedEquipment = false;
let showDeletedAbilities = false;
let showDeletedClasses = false;
let equipmentTypeFilter = 'all';
let autoSaveTimeout = null;

// Map-specific state
let konvaCanvas = null;
let mapList = null;
let iconImages = {};
let selectedIconData = null;

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
    // Ensure characters tab is visible and active
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById('characters-tab').classList.add('active');
    document.querySelector('[onclick*="characters"]').classList.add('active');
    
    // Show character list view
    showCharacterList();
});

// Tab switching
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event?.target?.classList.add('active');
    
    if (tabName === 'characters') {
        showCharacterList();
    } else if (tabName === 'maps') {
        showMapList();
    } else if (tabName === 'world-notes') {
        showWorldNotesList();
    }
};

// ============ CHARACTER FUNCTIONS ============

async function loadCharacterList() {
    try {
        const characters = showDeletedCharacters ? await GetDeletedCharacters() : await GetCharacters();
        const listElement = document.getElementById('character-list');
        
        if (!characters || characters.length === 0) {
            listElement.innerHTML = '<p class="empty-state">No characters yet. Create your first character!</p>';
            return;
        }
        
        listElement.innerHTML = characters.map(char => {
            const deletedClass = !char.isActive ? 'deleted' : '';
            const restoreButton = !char.isActive 
                ? `<button class="btn btn-small btn-restore" onclick="restoreCharacter('${char.id}'); event.stopPropagation();">Restore</button>` 
                : '';
            
            return `
                <div class="character-card ${deletedClass}" onclick="editCharacter('${char.id}')">
                    <h3>${char.name}</h3>
                    <p>Level ${char.level} | HP: ${char.currentHealth}/${char.maxHealth}</p>
                    ${restoreButton}
    </div>
`;
        }).join('');
    } catch (err) {
        console.error('Failed to load characters:', err);
        alert('Failed to load characters: ' + err);
    }
}

window.showCharacterList = function() {
    document.getElementById('character-list-view').style.display = 'block';
    document.getElementById('character-edit-view').style.display = 'none';
    loadCharacterList();
};

window.showCreateCharacter = async function() {
    try {
        const timestamp = Date.now();
        const newCharacter = {
            id: 'character-' + timestamp,
            name: 'New Character',
            level: 0,
            alignment: 0,
            maxHealth: 10,
            currentHealth: 10,
            armorClass: 10,
            initiative: 0,
            strength: { base: 10, temporary: 0 },
            agility: { base: 10, temporary: 0 },
            stamina: { base: 10, temporary: 0 },
            personality: { base: 10, temporary: 0 },
            intelligence: { base: 10, temporary: 0 },
            luck: { base: 10, temporary: 0 },
            saves: { reflex: 0, fortitude: 0, willpower: 0 },
            meleeAttackBonus: 0,
            meleeDamageBonus: 0,
            missileAttackBonus: 0,
            missileDamageBonus: 0,
            notes: '',
            equipment: [],
            abilities: [],
            history: [],
            isActive: true
        };
        
        await SaveCharacter(newCharacter, "Character created");
        editCharacter(newCharacter.id);
    } catch (err) {
        console.error('Failed to create character:', err);
        alert('Failed to create character: ' + err);
    }
};

window.editCharacter = async function(id) {
    try {
        const char = await GetCharacter(id);
        currentCharacter = char;
        
        document.getElementById('character-list-view').style.display = 'none';
        document.getElementById('character-edit-view').style.display = 'block';
        
        // Populate form
        document.getElementById('character-id').value = char.id;
        document.getElementById('name').value = char.name;
        document.getElementById('level').value = char.level || 0;
        document.getElementById('alignment').value = char.alignment;
        document.getElementById('maxHealth').value = char.maxHealth;
        document.getElementById('currentHealth').value = char.currentHealth;
        document.getElementById('armorClass').value = char.armorClass;
        document.getElementById('initiative').value = char.initiative || 0;
        
        document.getElementById('strength-base').value = char.strength.base;
        document.getElementById('strength-temp').value = char.strength.temporary || 0;
        document.getElementById('agility-base').value = char.agility.base;
        document.getElementById('agility-temp').value = char.agility.temporary || 0;
        document.getElementById('stamina-base').value = char.stamina.base;
        document.getElementById('stamina-temp').value = char.stamina.temporary || 0;
        document.getElementById('personality-base').value = char.personality.base;
        document.getElementById('personality-temp').value = char.personality.temporary || 0;
        document.getElementById('intelligence-base').value = char.intelligence.base;
        document.getElementById('intelligence-temp').value = char.intelligence.temporary || 0;
        document.getElementById('luck-base').value = char.luck.base;
        document.getElementById('luck-temp').value = char.luck.temporary || 0;
        
        document.getElementById('reflex').value = char.saves.reflex;
        document.getElementById('fortitude').value = char.saves.fortitude;
        document.getElementById('willpower').value = char.saves.willpower;
        
        document.getElementById('meleeAttackBonus').value = char.meleeAttackBonus || 0;
        document.getElementById('meleeDamageBonus').value = char.meleeDamageBonus || 0;
        document.getElementById('missileAttackBonus').value = char.missileAttackBonus || 0;
        document.getElementById('missileDamageBonus').value = char.missileDamageBonus || 0;
        
        document.getElementById('notes').value = char.notes || '';
        
        // Load equipment
        const equipmentList = document.getElementById('equipment-list');
        equipmentList.innerHTML = '';
        if (char.equipment && char.equipment.length > 0) {
            char.equipment.forEach((item, index) => {
                if (!item.isActive && !showDeletedEquipment) return;
                addEquipmentItemToDOM(item, index);
            });
        }
        
        // Load abilities
        const abilitiesList = document.getElementById('abilities-list');
        abilitiesList.innerHTML = '';
        if (char.abilities && char.abilities.length > 0) {
            char.abilities.forEach((ability, index) => {
                if (!ability.isActive && !showDeletedAbilities) return;
                addAbilityItemToDOM(ability, index);
            });
        }
        
        // Load classes
        const classesList = document.getElementById('classes-list');
            classesList.innerHTML = '';
            if (char.classes && char.classes.length > 0) {
            char.classes.forEach((classItem, index) => {
                if (!classItem.isActive && !showDeletedClasses) return;
                addClassItemToDOM(classItem, index);
            });
        }
        
        refreshHistory();
        updateAttributeModifiers();
        setupAutoSaveListeners();
        
        // Track current HP for change detection
        previousHP = char.currentHealth;
        
        // Add special listener for HP changes
        const hpField = document.getElementById('currentHealth');
        hpField.addEventListener('change', handleHPChange);
    } catch (err) {
        console.error('Failed to load character:', err);
        alert('Failed to load character: ' + err);
    }
};

function setupAutoSaveListeners() {
    const form = document.getElementById('character-form');
    form.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('change', scheduleAutoSave);
        el.addEventListener('blur', scheduleAutoSave);
    });
    
    // Add listeners to attribute fields to update modifiers
    ['strength', 'agility', 'stamina', 'personality', 'intelligence', 'luck'].forEach(attr => {
        const baseField = document.getElementById(`${attr}-base`);
        const tempField = document.getElementById(`${attr}-temp`);
        if (baseField) {
            baseField.addEventListener('input', updateAttributeModifiers);
            baseField.addEventListener('change', updateAttributeModifiers);
        }
        if (tempField) {
            tempField.addEventListener('input', updateAttributeModifiers);
            tempField.addEventListener('change', updateAttributeModifiers);
        }
    });
    
    // Add listeners to save and AC fields to update calculated values
    ['reflex', 'fortitude', 'willpower', 'armorClass'].forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            el.addEventListener('input', updateCalculatedValues);
            el.addEventListener('change', updateCalculatedValues);
        }
    });
}

function scheduleAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => autoSaveCharacter(), 1000);
}

async function autoSaveCharacter() {
    if (!currentCharacter) return;
    
    try {
        const id = document.getElementById('character-id').value;
        const equipment = collectEquipmentFromForm();
        const abilities = collectAbilitiesFromForm();
        const classes = collectClassesFromForm();
        
        const character = {
            id: id,
            name: document.getElementById('name').value,
            level: parseInt(document.getElementById('level').value) || 0,
            alignment: parseInt(document.getElementById('alignment').value),
            maxHealth: parseInt(document.getElementById('maxHealth').value),
            currentHealth: parseInt(document.getElementById('currentHealth').value),
            armorClass: parseInt(document.getElementById('armorClass').value) || 10,
            initiative: parseInt(document.getElementById('initiative').value) || 0,
            isActive: currentCharacter.isActive,
            
            strength: {
                base: parseInt(document.getElementById('strength-base').value),
                temporary: parseInt(document.getElementById('strength-temp').value) || 0
            },
            agility: {
                base: parseInt(document.getElementById('agility-base').value),
                temporary: parseInt(document.getElementById('agility-temp').value) || 0
            },
            stamina: {
                base: parseInt(document.getElementById('stamina-base').value),
                temporary: parseInt(document.getElementById('stamina-temp').value) || 0
            },
            personality: {
                base: parseInt(document.getElementById('personality-base').value),
                temporary: parseInt(document.getElementById('personality-temp').value) || 0
            },
            intelligence: {
                base: parseInt(document.getElementById('intelligence-base').value),
                temporary: parseInt(document.getElementById('intelligence-temp').value) || 0
            },
            luck: {
                base: parseInt(document.getElementById('luck-base').value),
                temporary: parseInt(document.getElementById('luck-temp').value) || 0
            },
            
            saves: {
                reflex: parseInt(document.getElementById('reflex').value),
                fortitude: parseInt(document.getElementById('fortitude').value),
                willpower: parseInt(document.getElementById('willpower').value)
            },
            
            meleeAttackBonus: parseInt(document.getElementById('meleeAttackBonus').value) || 0,
            meleeDamageBonus: parseInt(document.getElementById('meleeDamageBonus').value) || 0,
            missileAttackBonus: parseInt(document.getElementById('missileAttackBonus').value) || 0,
            missileDamageBonus: parseInt(document.getElementById('missileDamageBonus').value) || 0,
            
            notes: document.getElementById('notes').value,
            equipment: equipment,
            abilities: abilities,
            classes: classes,
            history: currentCharacter.history || []
        };
        
        await SaveCharacter(character, "");
        const updated = await GetCharacter(id);
        currentCharacter = updated;
        refreshHistory();
    } catch (err) {
        console.error('Failed to auto-save character:', err);
    }
}

window.refreshHistory = function() {
    const historyLog = document.getElementById('history-log');
    if (currentCharacter.history && currentCharacter.history.length > 0) {
        const sortedHistory = [...currentCharacter.history].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        historyLog.innerHTML = sortedHistory.map(entry => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            let content = '';
            if (entry.note && entry.note.trim()) {
                // User added note
                content = `<em>"${entry.note}"</em>`;
            } else if (entry.changes && entry.changes.length > 0) {
                // Changes are strings from the backend
                content = entry.changes.map(change => {
                    // change is already a formatted string
                    return typeof change === 'string' ? change : JSON.stringify(change);
                }).join('<br>');
                if (entry.note && entry.note.trim()) {
                    content += `<br><em>"${entry.note}"</em>`;
                }
            }
            return `<div class="history-entry"><small>${timestamp}</small><br>${content}</div>`;
        }).join('');
    } else {
        historyLog.innerHTML = '<p class="empty-state">No activity history yet.</p>';
    }
}

function getDCCModifier(score) {
    // DCC RPG ability score modifier table
    if (score <= 3) return -3;
    if (score <= 5) return -2;
    if (score <= 8) return -1;
    if (score <= 12) return 0;
    if (score <= 15) return +1;
    if (score <= 17) return +2;
    if (score <= 19) return +3;
    if (score <= 21) return +4;
    if (score <= 23) return +5;
    return +6; // 24+
}

function updateAttributeModifiers() {
    ['strength', 'agility', 'stamina', 'personality', 'intelligence', 'luck'].forEach(attr => {
        const base = parseInt(document.getElementById(`${attr}-base`).value) || 10;
        
        // Always calculate modifier from base only, never temporary
        const modifier = getDCCModifier(base);
        
        const modifierEl = document.getElementById(`${attr}-modifier`);
        if (modifierEl) {
            modifierEl.textContent = modifier >= 0 ? `+${modifier}` : modifier;
        }
    });
    
    // Also update calculated saves and AC
    updateCalculatedValues();
}

function updateCalculatedValues() {
    if (!currentCharacter) return;
    
    // Get equipment bonuses
    const equipment = collectEquipmentFromForm();
    let reflexBonus = 0;
    let fortitudeBonus = 0;
    let willpowerBonus = 0;
    let acBonus = 0;
    
    equipment.forEach(item => {
        if (item.isActive && item.equipped && item.category === 'armor') {
            if (item.reflexSave) reflexBonus += item.reflexSave;
            if (item.fortitudeSave) fortitudeBonus += item.fortitudeSave;
            if (item.willpowerSave) willpowerBonus += item.willpowerSave;
            if (item.acBonus) acBonus += item.acBonus;
        }
    });
    
    // Get base save values
    const baseReflex = parseInt(document.getElementById('reflex').value) || 0;
    const baseFortitude = parseInt(document.getElementById('fortitude').value) || 0;
    const baseWillpower = parseInt(document.getElementById('willpower').value) || 0;
    const baseAC = parseInt(document.getElementById('armorClass').value) || 10;
    
    // Calculate agility modifier for AC (always use base, never temporary)
    const agilityBase = parseInt(document.getElementById('agility-base').value) || 10;
    const agilityMod = getDCCModifier(agilityBase);
    
    // Calculate totals
    const totalReflex = baseReflex + reflexBonus;
    const totalFortitude = baseFortitude + fortitudeBonus;
    const totalWillpower = baseWillpower + willpowerBonus;
    const totalAC = baseAC + acBonus + agilityMod;
    
    // Update UI - Always show calculated values with tooltips
    const reflexEl = document.getElementById('reflex-total');
    const fortitudeEl = document.getElementById('fortitude-total');
    const willpowerEl = document.getElementById('willpower-total');
    const acEl = document.getElementById('ac-total');
    
    // Build tooltip for Reflex
    let reflexTooltip = `Base: ${baseReflex}`;
    if (reflexBonus !== 0) {
        reflexTooltip += `\nFrom Armor: ${reflexBonus >= 0 ? '+' : ''}${reflexBonus}`;
    }
    reflexTooltip += `\nTotal: ${totalReflex}`;
    reflexEl.textContent = `(${totalReflex})`;
    reflexEl.title = reflexTooltip;
    reflexEl.style.display = 'inline';
    
    // Build tooltip for Fortitude
    let fortitudeTooltip = `Base: ${baseFortitude}`;
    if (fortitudeBonus !== 0) {
        fortitudeTooltip += `\nFrom Armor: ${fortitudeBonus >= 0 ? '+' : ''}${fortitudeBonus}`;
    }
    fortitudeTooltip += `\nTotal: ${totalFortitude}`;
    fortitudeEl.textContent = `(${totalFortitude})`;
    fortitudeEl.title = fortitudeTooltip;
    fortitudeEl.style.display = 'inline';
    
    // Build tooltip for Willpower
    let willpowerTooltip = `Base: ${baseWillpower}`;
    if (willpowerBonus !== 0) {
        willpowerTooltip += `\nFrom Armor: ${willpowerBonus >= 0 ? '+' : ''}${willpowerBonus}`;
    }
    willpowerTooltip += `\nTotal: ${totalWillpower}`;
    willpowerEl.textContent = `(${totalWillpower})`;
    willpowerEl.title = willpowerTooltip;
    willpowerEl.style.display = 'inline';
    
    // Build tooltip for AC
    let acTooltip = `Base: ${baseAC}`;
    if (agilityMod !== 0) {
        acTooltip += `\nFrom Agility Mod: ${agilityMod >= 0 ? '+' : ''}${agilityMod}`;
    }
    if (acBonus !== 0) {
        acTooltip += `\nFrom Armor: ${acBonus >= 0 ? '+' : ''}${acBonus}`;
    }
    acTooltip += `\nTotal: ${totalAC}`;
    acEl.textContent = `(${totalAC})`;
    acEl.title = acTooltip;
    acEl.style.display = 'inline';
}

// Equipment functions
window.addEquipmentItem = function() {
    const newId = 'eq-' + Date.now();
    const newItem = {
        id: newId,
        name: '',
        quantity: 1,
        weight: 0,
        type: 'item',
        description: '',
        isEquipped: false,
        isActive: true
    };
    const index = document.getElementById('equipment-list').children.length;
    addEquipmentItemToDOM(newItem, index);
};

function addEquipmentItemToDOM(item, index) {
    const equipmentList = document.getElementById('equipment-list');
    const div = document.createElement('div');
    div.className = 'equipment-item' + (!item.isActive ? ' deleted' : '');
    div.dataset.index = index;
    div.dataset.id = item.id;
    div.dataset.isActive = item.isActive ? '1' : '0';
    
    const deleteOrRestoreButton = item.isActive
        ? `<button type="button" class="btn-small btn-danger" onclick="removeEquipmentItem(${index})">Delete</button>`
        : `<button type="button" class="btn-small btn-restore" onclick="restoreEquipmentItem(${index})">Restore</button>`;
    
    // Type-specific fields
    const weaponFields = (item.type === 'weapon' || item.category === 'weapon') ? `
            <div class="form-group-inline">
            <label>Damage Dice:</label>
            <input type="text" class="eq-damage-dice" value="${item.damageDice || ''}" placeholder="e.g. 1d8" ${!item.isActive ? 'disabled' : ''}>
            </div>
            <div class="form-group-inline">
            <label>Attack Bonus:</label>
            <input type="number" class="eq-attack-bonus" value="${item.attackBonus || 0}" ${!item.isActive ? 'disabled' : ''}>
        </div>
    ` : '';
    
    const armorFields = (item.type === 'armor' || item.category === 'armor') ? `
        <div class="equipment-armor-stats">
            <div class="form-group-inline">
                <label>AC Mod:</label>
                <input type="number" class="eq-ac-bonus" value="${item.acBonus || 0}" ${!item.isActive ? 'disabled' : ''}>
            </div>
            <div class="form-group-inline">
                <label>Fortitude:</label>
                <input type="number" class="eq-fortitude" value="${item.fortitudeSave || 0}" ${!item.isActive ? 'disabled' : ''}>
            </div>
            <div class="form-group-inline">
                <label>Reflex:</label>
                <input type="number" class="eq-reflex" value="${item.reflexSave || 0}" ${!item.isActive ? 'disabled' : ''}>
            </div>
            <div class="form-group-inline">
                <label>Willpower:</label>
                <input type="number" class="eq-willpower" value="${item.willpowerSave || 0}" ${!item.isActive ? 'disabled' : ''}>
            </div>
        </div>
    ` : '';
    
    div.innerHTML = `
        <div class="equipment-header">
            <input type="text" class="eq-name" value="${item.name}" placeholder="Item name" required ${!item.isActive ? 'disabled' : ''}>
            <label class="equipped-checkbox">
                <input type="checkbox" class="eq-equipped" ${item.equipped ? 'checked' : ''} ${!item.isActive ? 'disabled' : ''}>
                Equipped
            </label>
            ${deleteOrRestoreButton}
        </div>
        <div class="equipment-details">
            <div class="form-group-inline">
                <label>Quantity:</label>
                <input type="number" class="eq-quantity" value="${item.quantity}" min="1" ${!item.isActive ? 'disabled' : ''}>
            </div>
            <div class="form-group-inline">
                <label>Type:</label>
                <select class="eq-type" ${!item.isActive ? 'disabled' : ''}>
                    <option value="item" ${(item.type || item.category) === 'item' ? 'selected' : ''}>Item</option>
                    <option value="weapon" ${(item.type || item.category) === 'weapon' ? 'selected' : ''}>Weapon</option>
                    <option value="armor" ${(item.type || item.category) === 'armor' ? 'selected' : ''}>Armor</option>
                    <option value="currency" ${(item.type || item.category) === 'currency' ? 'selected' : ''}>Currency</option>
                    <option value="misc" ${(item.type || item.category) === 'misc' ? 'selected' : ''}>Misc</option>
                </select>
        </div>
        ${weaponFields}
        </div>
        ${armorFields}
        <div class="form-group-full">
            <label>Description:</label>
            <textarea class="eq-description" rows="2" ${!item.isActive ? 'disabled' : ''}>${item.description || ''}</textarea>
        </div>
    `;
    equipmentList.appendChild(div);
    
    // Add change listener to type selector to show/hide conditional fields
    const typeSelect = div.querySelector('.eq-type');
    typeSelect.addEventListener('change', function() {
        // Re-render the item with updated fields
        const currentData = {
            id: div.dataset.id,
            name: div.querySelector('.eq-name').value,
            quantity: parseInt(div.querySelector('.eq-quantity').value) || 1,
            type: this.value,
            category: this.value,
            description: div.querySelector('.eq-description').value,
            isActive: div.dataset.isActive === '1'
        };
        div.remove();
        addEquipmentItemToDOM(currentData, index);
            scheduleAutoSave();
    });
    
    div.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.classList.contains('eq-type')) return; // Already handled
        el.addEventListener('change', () => {
            scheduleAutoSave();
            updateCalculatedValues();
        });
        el.addEventListener('blur', () => {
            scheduleAutoSave();
            updateCalculatedValues();
        });
    });
}

function collectEquipmentFromForm() {
    const items = [];
    document.querySelectorAll('.equipment-item').forEach(div => {
        const type = div.querySelector('.eq-type').value;
        const equippedCheckbox = div.querySelector('.eq-equipped');
        const item = {
            id: div.dataset.id,
            name: div.querySelector('.eq-name').value,
            quantity: parseInt(div.querySelector('.eq-quantity').value) || 1,
            weight: 0,
            category: type,
            description: div.querySelector('.eq-description').value,
            equipped: equippedCheckbox ? equippedCheckbox.checked : false,
            isActive: div.dataset.isActive === '1'
        };
        
        // Add weapon-specific fields
        if (type === 'weapon') {
            const damageDice = div.querySelector('.eq-damage-dice');
            const attackBonus = div.querySelector('.eq-attack-bonus');
            if (damageDice) item.damageDice = damageDice.value;
            if (attackBonus) item.attackBonus = parseInt(attackBonus.value) || 0;
        }
        
        // Add armor-specific fields
        if (type === 'armor') {
            const acBonus = div.querySelector('.eq-ac-bonus');
            const fortitude = div.querySelector('.eq-fortitude');
            const reflex = div.querySelector('.eq-reflex');
            const willpower = div.querySelector('.eq-willpower');
            if (acBonus) item.acBonus = parseInt(acBonus.value) || 0;
            if (fortitude) item.fortitudeSave = parseInt(fortitude.value) || 0;
            if (reflex) item.reflexSave = parseInt(reflex.value) || 0;
            if (willpower) item.willpowerSave = parseInt(willpower.value) || 0;
        }
        
        items.push(item);
    });
    return items;
}

window.removeEquipmentItem = function(index) {
    const items = document.getElementById('equipment-list').children;
    if (items[index]) {
        items[index].dataset.isActive = '0';
        items[index].classList.add('deleted');
        items[index].querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        const btn = items[index].querySelector('.btn-danger');
        if (btn) {
            btn.className = 'btn-small btn-restore';
            btn.textContent = 'Restore';
            btn.onclick = () => restoreEquipmentItem(index);
        }
        if (!showDeletedEquipment) items[index].style.display = 'none';
            scheduleAutoSave();
    }
};

window.restoreEquipmentItem = function(index) {
    const items = document.getElementById('equipment-list').children;
    if (items[index]) {
        items[index].dataset.isActive = '1';
        items[index].classList.remove('deleted');
        items[index].style.display = '';
        items[index].querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
        const btn = items[index].querySelector('.btn-restore');
        if (btn) {
            btn.className = 'btn-small btn-danger';
            btn.textContent = 'Delete';
            btn.onclick = () => removeEquipmentItem(index);
        }
                    scheduleAutoSave();
    }
};

window.toggleDeletedEquipment = function() {
    showDeletedEquipment = document.getElementById('show-deleted-equipment').checked;
    refreshEquipmentList();
};

window.filterEquipmentByType = function() {
    equipmentTypeFilter = document.getElementById('equipment-type-filter').value;
    refreshEquipmentList();
};

function refreshEquipmentList() {
    if (!currentCharacter) return;
    const equipmentList = document.getElementById('equipment-list');
    equipmentList.innerHTML = '';
    if (currentCharacter.equipment && currentCharacter.equipment.length > 0) {
        currentCharacter.equipment.forEach((item, index) => {
            if (!item.isActive && !showDeletedEquipment) return;
            if (equipmentTypeFilter !== 'all' && item.type !== equipmentTypeFilter) return;
            addEquipmentItemToDOM(item, index);
        });
    }
}

// Ability functions
window.addAbilityItem = function() {
    const newId = 'ability-' + Date.now();
    const newItem = {
        id: newId,
        name: '',
        description: '',
        page: '',
        isActive: true
    };
    const index = document.getElementById('abilities-list').children.length;
    addAbilityItemToDOM(newItem, index);
};

function addAbilityItemToDOM(ability, index) {
    const abilitiesList = document.getElementById('abilities-list');
    const div = document.createElement('div');
    div.className = 'ability-item' + (!ability.isActive ? ' deleted' : '');
    div.dataset.index = index;
    div.dataset.id = ability.id;
    div.dataset.isActive = ability.isActive ? '1' : '0';
    
    const deleteOrRestoreButton = ability.isActive
        ? `<button type="button" class="btn-small btn-danger" onclick="removeAbilityItem(${index})">Delete</button>`
        : `<button type="button" class="btn-small btn-restore" onclick="restoreAbilityItem(${index})">Restore</button>`;
    
    div.innerHTML = `
        <div class="ability-header">
            <input type="text" class="ability-name" value="${ability.name}" placeholder="Ability name" required ${!ability.isActive ? 'disabled' : ''}>
            <div class="form-group-inline" style="flex: 0 0 120px;">
                <label>Page:</label>
                <input type="text" class="ability-page" value="${ability.pageNumber || ability.page || ''}" placeholder="Page #" ${!ability.isActive ? 'disabled' : ''}>
            </div>
            ${deleteOrRestoreButton}
        </div>
        <div class="form-group-full">
            <label>Description:</label>
            <textarea class="ability-description" rows="2" ${!ability.isActive ? 'disabled' : ''}>${ability.description || ''}</textarea>
        </div>
    `;
    abilitiesList.appendChild(div);
    
    div.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('change', scheduleAutoSave);
        el.addEventListener('blur', scheduleAutoSave);
    });
}

function collectAbilitiesFromForm() {
    const items = [];
    document.querySelectorAll('.ability-item').forEach(div => {
        items.push({
            id: div.dataset.id,
            name: div.querySelector('.ability-name').value,
            description: div.querySelector('.ability-description').value,
            pageNumber: div.querySelector('.ability-page')?.value || '',
            isActive: div.dataset.isActive === '1'
        });
    });
    return items;
}

window.removeAbilityItem = function(index) {
    const items = document.getElementById('abilities-list').children;
    if (items[index]) {
        items[index].dataset.isActive = '0';
        items[index].classList.add('deleted');
        items[index].querySelectorAll('input, textarea').forEach(el => el.disabled = true);
        const btn = items[index].querySelector('.btn-danger');
        if (btn) {
            btn.className = 'btn-small btn-restore';
            btn.textContent = 'Restore';
            btn.onclick = () => restoreAbilityItem(index);
        }
        if (!showDeletedAbilities) items[index].style.display = 'none';
            scheduleAutoSave();
    }
};

window.restoreAbilityItem = function(index) {
    const items = document.getElementById('abilities-list').children;
    if (items[index]) {
        items[index].dataset.isActive = '1';
        items[index].classList.remove('deleted');
        items[index].style.display = '';
        items[index].querySelectorAll('input, textarea').forEach(el => el.disabled = false);
        const btn = items[index].querySelector('.btn-restore');
        if (btn) {
            btn.className = 'btn-small btn-danger';
            btn.textContent = 'Delete';
            btn.onclick = () => removeAbilityItem(index);
        }
            scheduleAutoSave();
    }
};

window.toggleDeletedAbilities = function() {
    showDeletedAbilities = document.getElementById('show-deleted-abilities').checked;
    if (currentCharacter) {
        const abilitiesList = document.getElementById('abilities-list');
        abilitiesList.innerHTML = '';
        if (currentCharacter.abilities && currentCharacter.abilities.length > 0) {
            currentCharacter.abilities.forEach((ability, index) => {
                if (!ability.isActive && !showDeletedAbilities) return;
                addAbilityItemToDOM(ability, index);
            });
        }
    }
};

// Class functions
window.addClassItem = function() {
    const newId = 'class-' + Date.now();
    const newItem = {
        id: newId,
        name: '',
        level: 1,
        description: '',
        isActive: true
    };
    const index = document.getElementById('classes-list').children.length;
    addClassItemToDOM(newItem, index);
};

function addClassItemToDOM(classItem, index) {
    const classesList = document.getElementById('classes-list');
    const div = document.createElement('div');
    div.className = 'class-item' + (!classItem.isActive ? ' deleted' : '');
    div.dataset.index = index;
    div.dataset.id = classItem.id;
    div.dataset.isActive = classItem.isActive ? '1' : '0';
    
    const deleteOrRestoreButton = classItem.isActive
        ? `<button type="button" class="btn-small btn-danger" onclick="removeClassItem(${index})">Delete</button>`
        : `<button type="button" class="btn-small btn-restore" onclick="restoreClassItem(${index})">Restore</button>`;
    
    div.innerHTML = `
        <div class="class-header">
            <div class="form-group-inline" style="flex: 1;">
                <label>Class Name:</label>
                <input type="text" class="class-name" value="${classItem.name}" placeholder="Class name (e.g. Warrior)" required ${!classItem.isActive ? 'disabled' : ''}>
            </div>
            <div class="form-group-inline" style="flex: 0 0 100px;">
                <label>Level:</label>
                <input type="number" class="class-level" value="${classItem.level}" min="1" ${!classItem.isActive ? 'disabled' : ''}>
            </div>
        ${deleteOrRestoreButton}
            </div>
        <div class="form-group-full">
            <label>Class Description/Notes:</label>
            <textarea class="class-description" rows="2" placeholder="Class features, abilities, etc." ${!classItem.isActive ? 'disabled' : ''}>${classItem.description || ''}</textarea>
        </div>
    `;
    classesList.appendChild(div);
    
    div.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('change', scheduleAutoSave);
        el.addEventListener('blur', scheduleAutoSave);
    });
}

function collectClassesFromForm() {
    const items = [];
    document.querySelectorAll('.class-item').forEach(div => {
        items.push({
            id: div.dataset.id,
            name: div.querySelector('.class-name').value,
            level: parseInt(div.querySelector('.class-level').value) || 1,
            description: div.querySelector('.class-description').value,
            isActive: div.dataset.isActive === '1'
        });
    });
    return items;
}

window.removeClassItem = function(index) {
    const items = document.getElementById('classes-list').children;
    if (items[index]) {
        items[index].dataset.isActive = '0';
        items[index].classList.add('deleted');
        items[index].querySelectorAll('input, textarea').forEach(el => el.disabled = true);
        const btn = items[index].querySelector('.btn-danger');
        if (btn) {
            btn.className = 'btn-small btn-restore';
            btn.textContent = 'Restore';
            btn.onclick = () => restoreClassItem(index);
        }
        if (!showDeletedClasses) items[index].style.display = 'none';
        scheduleAutoSave();
    }
};

window.restoreClassItem = function(index) {
    const items = document.getElementById('classes-list').children;
    if (items[index]) {
        items[index].dataset.isActive = '1';
        items[index].classList.remove('deleted');
        items[index].style.display = '';
        items[index].querySelectorAll('input, textarea').forEach(el => el.disabled = false);
        const btn = items[index].querySelector('.btn-restore');
        if (btn) {
            btn.className = 'btn-small btn-danger';
            btn.textContent = 'Delete';
            btn.onclick = () => removeClassItem(index);
        }
        scheduleAutoSave();
    }
};

window.toggleDeletedClasses = function() {
    showDeletedClasses = document.getElementById('show-deleted-classes').checked;
    if (currentCharacter) {
        const classesList = document.getElementById('classes-list');
        classesList.innerHTML = '';
        if (currentCharacter.classes && currentCharacter.classes.length > 0) {
            currentCharacter.classes.forEach((classItem, index) => {
                if (!classItem.isActive && !showDeletedClasses) return;
                addClassItemToDOM(classItem, index);
            });
        }
    }
};

window.deleteCharacter = async function() {
    if (!currentCharacter) return;
    if (!confirm('Are you sure you want to delete this character?')) return;
    
    try {
        await DeleteCharacter(currentCharacter.id);
        showCharacterList();
    } catch (err) {
        console.error('Failed to delete character:', err);
        alert('Failed to delete character: ' + err);
    }
};

window.restoreCharacter = async function(id) {
    try {
        await RestoreCharacter(id);
        loadCharacterList();
    } catch (err) {
        console.error('Failed to restore character:', err);
        alert('Failed to restore character: ' + err);
    }
};

window.toggleDeletedCharacters = function() {
    showDeletedCharacters = document.getElementById('show-deleted-characters').checked;
    loadCharacterList();
};

window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.showAddNoteModal = function() {
    document.getElementById('add-note-modal').style.display = 'flex';
    document.getElementById('activity-note').value = '';
    setTimeout(() => document.getElementById('activity-note').focus(), 100);
};

window.closeAddNoteModal = function() {
    document.getElementById('add-note-modal').style.display = 'none';
};

window.confirmAddNote = async function() {
    const note = document.getElementById('activity-note').value.trim();
    if (!note) {
        alert('Please enter a note');
        return;
    }
    
    if (currentCharacter) {
        try {
            // Use AddHistoryNote to manually add the note
            await AddHistoryNote(currentCharacter.id, note);
            const updated = await GetCharacter(currentCharacter.id);
            currentCharacter = updated;
            window.refreshHistory();
            window.closeAddNoteModal();
        } catch (err) {
            console.error('Failed to add note:', err);
            alert('Failed to add note: ' + err);
        }
    }
};

// HP Change Modal functions
let pendingHPChange = null;

function handleHPChange(event) {
    const newHP = parseInt(event.target.value);
    const maxHP = parseInt(document.getElementById('maxHealth').value);
    
    // Only show modal if HP changed (not max HP)
    if (previousHP !== null && newHP !== previousHP && newHP !== maxHP) {
        const diff = newHP - previousHP;
        const message = diff > 0 
            ? `HP increased by ${diff} (${previousHP} → ${newHP})`
            : `HP decreased by ${Math.abs(diff)} (${previousHP} → ${newHP})`;
        
        document.getElementById('hp-change-message').textContent = message;
        document.getElementById('hp-change-note').value = '';
        document.getElementById('hp-change-modal').style.display = 'flex';
        
        pendingHPChange = {
            oldHP: previousHP,
            newHP: newHP,
            diff: diff
        };
        
        previousHP = newHP;
        
        // Focus on textarea after modal appears
        setTimeout(() => document.getElementById('hp-change-note').focus(), 100);
    } else {
        previousHP = newHP;
        // Just auto-save without note
        scheduleAutoSave();
    }
}

window.confirmHPChange = async function() {
    const note = document.getElementById('hp-change-note').value.trim();
    document.getElementById('hp-change-modal').style.display = 'none';
    
    if (note && currentCharacter) {
        try {
            // Manually add a history note using the Go backend function
            await AddHistoryNote(currentCharacter.id, note);
            
            // Reload to get updated history
            const updated = await GetCharacter(currentCharacter.id);
            currentCharacter = updated;
            window.refreshHistory();
        } catch (err) {
            console.error('Failed to add HP change note:', err);
        }
    }
    
    pendingHPChange = null;
};

window.skipHPNote = function() {
    document.getElementById('hp-change-modal').style.display = 'none';
    pendingHPChange = null;
    // Just auto-save without note
    scheduleAutoSave();
};

window.showExportModal = function() {
    if (!currentCharacter) {
        alert('No character loaded');
        return;
    }
    
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('export-date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('export-date-to').value = today.toISOString().split('T')[0];
    document.getElementById('export-full-history').checked = true;
    
    document.getElementById('export-modal').style.display = 'flex';
};

window.closeExportModal = function() {
    document.getElementById('export-modal').style.display = 'none';
};

window.confirmExport = async function() {
    const includeFullHistory = document.getElementById('export-full-history').checked;
    const dateFrom = document.getElementById('export-date-from').value;
    const dateTo = document.getElementById('export-date-to').value;
    
    await generateCharacterSheetHTML(currentCharacter, includeFullHistory, dateFrom, dateTo);
    window.closeExportModal();
};

async function generateCharacterSheetHTML(character, includeFullHistory, dateFrom, dateTo) {
    // Filter history by date range if not including full history
    let historyToInclude = character.history || [];
    
    if (!includeFullHistory && dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        
        historyToInclude = historyToInclude.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= fromDate && entryDate <= toDate;
        });
    }
    
    // Calculate attribute modifiers
    const calcMod = (base) => {
        const mod = Math.floor((base - 10) / 2);
        return mod >= 0 ? `+${mod}` : mod;
    };
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${character.name} - DCC Character Sheet</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            color: #333;
        }
        h1 {
            text-align: center;
            color: #2c2416;
            border-bottom: 3px solid #8b7355;
            padding-bottom: 10px;
        }
        h2 {
            color: #5a4a3a;
            border-bottom: 2px solid #d4c4b0;
            padding-bottom: 5px;
            margin-top: 25px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        .stat-box {
            border: 2px solid #d4c4b0;
            padding: 10px;
            border-radius: 4px;
        }
        .stat-label {
            font-weight: bold;
            color: #5a4a3a;
            font-size: 0.9em;
        }
        .stat-value {
            font-size: 1.2em;
            margin-top: 5px;
        }
        .attributes-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        .attribute {
            text-align: center;
            border: 2px solid #d4c4b0;
            padding: 10px;
            border-radius: 4px;
        }
        .attribute-name {
            font-weight: bold;
            color: #5a4a3a;
            font-size: 0.85em;
        }
        .attribute-value {
            font-size: 1.5em;
            margin: 5px 0;
        }
        .attribute-mod {
            font-size: 1.1em;
            color: #8b5a3c;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            border: 1px solid #d4c4b0;
            padding: 8px;
            text-align: left;
        }
        th {
            background: #f0e8d8;
            font-weight: bold;
            color: #5a4a3a;
        }
        .history-entry {
            border-left: 3px solid #8b7355;
            padding: 10px;
            margin: 10px 0;
            background: #faf8f3;
        }
        .history-date {
            font-weight: bold;
            color: #5a4a3a;
            margin-bottom: 5px;
        }
        .history-note {
            font-style: italic;
            color: #666;
            margin-top: 5px;
        }
        .export-info {
            text-align: center;
            color: #888;
            font-size: 0.9em;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #d4c4b0;
        }
        @media print {
            body {
                padding: 0;
            }
            .export-info {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <h1>${character.name}</h1>
    
    <div class="stats-grid">
        <div class="stat-box">
            <div class="stat-label">Level</div>
            <div class="stat-value">${character.level || 0}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Alignment</div>
            <div class="stat-value">${['Neutral', 'Lawful', 'Chaotic'][character.alignment] || 'Neutral'}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">HP</div>
            <div class="stat-value">${character.currentHealth} / ${character.maxHealth}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">AC</div>
            <div class="stat-value">${character.armorClass}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Initiative</div>
            <div class="stat-value">${character.initiative || 0}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Speed</div>
            <div class="stat-value">${character.speed || 30}</div>
        </div>
    </div>

    <h2>Attributes</h2>
    <div class="attributes-grid">
        <div class="attribute">
            <div class="attribute-name">STR</div>
            <div class="attribute-value">${character.strength.base}</div>
            ${character.strength.temporary && character.strength.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.strength.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.strength.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">AGI</div>
            <div class="attribute-value">${character.agility.base}</div>
            ${character.agility.temporary && character.agility.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.agility.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.agility.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">STA</div>
            <div class="attribute-value">${character.stamina.base}</div>
            ${character.stamina.temporary && character.stamina.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.stamina.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.stamina.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">PER</div>
            <div class="attribute-value">${character.personality.base}</div>
            ${character.personality.temporary && character.personality.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.personality.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.personality.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">INT</div>
            <div class="attribute-value">${character.intelligence.base}</div>
            ${character.intelligence.temporary && character.intelligence.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.intelligence.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.intelligence.base)}</div>
        </div>
        <div class="attribute">
            <div class="attribute-name">LCK</div>
            <div class="attribute-value">${character.luck.base}</div>
            ${character.luck.temporary && character.luck.temporary !== 0 ? `<div style="font-size: 0.9em;">(${character.luck.temporary})</div>` : ''}
            <div class="attribute-mod">${calcMod(character.luck.base)}</div>
        </div>
    </div>

    <h2>Saving Throws</h2>
    <div class="stats-grid">
        <div class="stat-box">
            <div class="stat-label">Reflex</div>
            <div class="stat-value">${character.saves.reflex}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Fortitude</div>
            <div class="stat-value">${character.saves.fortitude}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Willpower</div>
            <div class="stat-value">${character.saves.willpower}</div>
        </div>
    </div>

    ${character.classes && character.classes.length > 0 ? `
    <h2>Classes</h2>
    <table>
        <tr>
            <th>Class</th>
            <th>Level</th>
            <th>Description</th>
        </tr>
        ${character.classes.filter(c => c.isActive).map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.level}</td>
            <td>${c.description || ''}</td>
        </tr>
        `).join('')}
    </table>
    ` : ''}

    ${character.equipment && character.equipment.filter(e => e.isActive).length > 0 ? `
    <h2>Equipment</h2>
    <table>
        <tr>
            <th>Item</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Equipped</th>
            <th>Details</th>
        </tr>
        ${character.equipment.filter(e => e.isActive).map(e => `
        <tr>
            <td>${e.name}</td>
            <td>${e.category || e.type || 'item'}</td>
            <td>${e.quantity}</td>
            <td>${e.equipped ? '✓' : ''}</td>
            <td>
                ${e.damageDice ? `Damage: ${e.damageDice}` : ''}
                ${e.attackBonus ? ` +${e.attackBonus} to hit` : ''}
                ${e.acBonus ? `AC: ${e.acBonus >= 0 ? '+' : ''}${e.acBonus}` : ''}
                ${e.description || ''}
            </td>
        </tr>
        `).join('')}
    </table>
    ` : ''}

    ${character.abilities && character.abilities.filter(a => a.isActive).length > 0 ? `
    <h2>Abilities & Powers</h2>
    <table>
        <tr>
            <th>Name</th>
            <th>Page</th>
            <th>Description</th>
        </tr>
        ${character.abilities.filter(a => a.isActive).map(a => `
        <tr>
            <td>${a.name}</td>
            <td>${a.pageNumber || ''}</td>
            <td>${a.description || ''}</td>
        </tr>
        `).join('')}
    </table>
    ` : ''}

    ${character.notes ? `
    <h2>Notes</h2>
    <div style="white-space: pre-wrap; padding: 10px; background: #faf8f3; border: 1px solid #d4c4b0; border-radius: 4px;">
${character.notes}
    </div>
    ` : ''}

    ${historyToInclude.length > 0 ? `
    <h2>Activity History${!includeFullHistory && dateFrom && dateTo ? ` (${dateFrom} to ${dateTo})` : ''}</h2>
    ${historyToInclude.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(entry => `
    <div class="history-entry">
        <div class="history-date">${new Date(entry.timestamp).toLocaleString()}</div>
        <div>
            ${entry.changes && entry.changes.length > 0 ? entry.changes.join('<br>') : ''}
        </div>
        ${entry.note ? `<div class="history-note">"${entry.note}"</div>` : ''}
    </div>
    `).join('')}
    ` : ''}

    <div class="export-info">
        Character sheet exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
        DCC Character Sheet Manager
    </div>
</body>
</html>`;
    
    // Save and open the HTML file
    try {
        const filepath = await SaveAndOpenHTML(html, character.name);
        alert(`Character sheet saved to:\n${filepath}\n\nThe file has been opened in your browser. Use Print > Save as PDF to create a PDF.`);
    } catch (err) {
        console.error('Failed to save/open HTML:', err);
        alert('Failed to save character sheet: ' + err);
    }
}

// ============ MAP FUNCTIONS ============

async function loadMapList() {
    if (!mapList) {
        mapList = new MapList();
    }
    await mapList.load(showDeletedMaps);
}

function showMapList() {
        document.getElementById('map-list-view').style.display = 'block';
    document.getElementById('map-edit-view').style.display = 'none';
        loadMapList();
    
    // Clean up Konva canvas if it exists
    if (konvaCanvas) {
        konvaCanvas.destroy();
        konvaCanvas = null;
    }
}

window.showMapList = showMapList;

window.showCreateMap = async function() {
    try {
        // Just create a map with a default name
        const timestamp = Date.now();
        const name = `New Map ${timestamp}`;
        const mapId = await CreateMap(name, 24, 18, 50);
        window.editMap(mapId);
    } catch (err) {
        console.error('Failed to create map:', err);
        alert('Failed to create map: ' + err);
    }
};

window.editMap = async function(id) {
    try {
        currentMap = await GetMap(id);
        
        document.getElementById('map-list-view').style.display = 'none';
        document.getElementById('map-edit-view').style.display = 'block';
        
        // Populate form
        document.getElementById('map-name').value = currentMap.name;
        document.getElementById('grid-size').value = currentMap.gridSize || 50;
        document.getElementById('show-grid').checked = currentMap.showGrid !== false;
        
        // Initialize Konva canvas
        if (!konvaCanvas) {
            konvaCanvas = new KonvaMapCanvas();
            konvaCanvas.initialize('map-canvas-container', autoSaveMap);
        }
        
        konvaCanvas.currentMap = currentMap;
        
        // Set initial tool and update UI
        konvaCanvas.setTool('pen');
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-tool="pen"]').classList.add('active');
        
        // Set initial stroke color from UI and ensure it's visually set to black
        const colorInput = document.getElementById('stroke-color');
        if (colorInput) {
            colorInput.value = '#000000'; // Explicitly set to black
            konvaCanvas.setStrokeColor('#000000');
        }
        
        // Draw grid
        konvaCanvas.drawGrid(currentMap.gridSize || 50, currentMap.gridColor || '#cccccc', currentMap.showGrid !== false);
        
        // Load background if exists
        if (currentMap.background) {
            await loadBackgroundImage(currentMap.background);
        }
        
        // Load icons
        await loadIcons();
        
        // Load existing strokes
        if (currentMap.strokes && currentMap.strokes !== '{}') {
            konvaCanvas.loadFromJSON(currentMap.strokes, currentMap.icons || [], iconImages);
        } else if (currentMap.icons && currentMap.icons.length > 0) {
            konvaCanvas.loadFromJSON('{}', currentMap.icons, iconImages);
        }
        
        // Initialize undo/redo history after loading
        konvaCanvas.initializeHistory();
        
    } catch (err) {
        console.error('Failed to load map:', err);
        alert('Failed to load map: ' + err);
    }
};

async function loadBackgroundImage(bgData) {
    // Implementation would load background image from storage
    // For now, just show the controls
    document.getElementById('background-controls').style.display = 'block';
}

async function loadIcons() {
    // Load all dungeon icons
    const categories = ['doors', 'furniture', 'hazards', 'stairs', 'decorations', 'containers', 'misc'];
    
    iconImages = {};
    window.iconCategories = {}; // Store category info for filtering
    
    // Dynamically import icon files
    const iconModules = import.meta.glob('/src/assets/icons/dungeon/**/*.png', { eager: true });
    
    for (const path in iconModules) {
        const filename = path.split('/').pop();
        const iconCategory = path.split('/').slice(-2)[0]; // Get category from path
        
        const img = new Image();
        img.src = iconModules[path].default;
        await new Promise((resolve) => {
            img.onload = resolve;
        });
        
        iconImages[filename] = img;
        window.iconCategories[filename] = iconCategory; // Store category
    }
    
    // Populate icon category buttons
    const categoriesEl = document.getElementById('icon-categories');
    if (categoriesEl) {
        // Get unique categories from loaded icons
        const loadedCategories = [...new Set(Object.values(window.iconCategories))];
        
        categoriesEl.innerHTML = `
            <button class="category-btn active" onclick="filterIcons('all')">All</button>
            ${loadedCategories.map(cat => 
                `<button class="category-btn" onclick="filterIcons('${cat}')">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>`
            ).join('')}
        `;
    }
    
    // Show all icons initially
    filterIcons('all');
}

window.filterIcons = function(category) {
    const paletteEl = document.getElementById('icon-palette');
    
    // Update active category button
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    
    let iconsToShow = Object.entries(iconImages);
    
    if (category !== 'all') {
        iconsToShow = iconsToShow.filter(([filename]) => {
            return window.iconCategories[filename] === category;
        });
    }
    
    paletteEl.innerHTML = iconsToShow.map(([filename, img]) => {
        const displayName = filename.replace('.png', '').replace(/([A-Z])/g, ' $1').trim();
        return `
            <div class="icon-item" data-icon="${filename}" onclick="selectIcon('${filename}')" title="${displayName}">
                <img src="${img.src}" alt="${displayName}">
            </div>
        `;
    }).join('');
};

window.selectIcon = function(filename) {
    // Remove previous selection
    document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
    
    // Highlight selected icon
    const selectedItem = document.querySelector(`.icon-item[data-icon="${filename}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    selectedIconData = {
        id: `icon-${Date.now()}`,
        filename: filename,
        category: window.iconCategories[filename] || 'dungeon',
        rotation: 0,
        isActive: true,
    };
    
    // Enable icon placement mode
    konvaCanvas.setIconPlacementCallback((x, y) => {
        if (selectedIconData && iconImages[filename]) {
            konvaCanvas.addIcon(iconImages[filename], x, y, selectedIconData);
            autoSaveMap();
            
            // Remove selection highlight after placing
            document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
        }
        konvaCanvas.setIconPlacementCallback(null);
        selectedIconData = null;
    });
};

window.selectTool = function(tool) {
    if (konvaCanvas) {
        konvaCanvas.setTool(tool);
    }
    
    // Update active button
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    
    // Show/hide icon palette
    const iconSection = document.querySelector('.icon-section');
    const colorControl = document.getElementById('color-control');
    const penWidthControl = document.getElementById('pen-width-control');
    const eraserWidthControl = document.getElementById('eraser-width-control');
    const undoRedoControls = document.getElementById('undo-redo-controls');
    
    if (tool === 'icon') {
        // Show icon palette, hide drawing controls
        iconSection.style.display = 'block';
        if (colorControl) colorControl.style.display = 'none';
        if (penWidthControl) penWidthControl.style.display = 'none';
        if (eraserWidthControl) eraserWidthControl.style.display = 'none';
        if (undoRedoControls) undoRedoControls.style.display = 'none';
    } else {
        // Hide icon palette, show relevant drawing controls
        iconSection.style.display = 'none';
        if (colorControl) colorControl.style.display = 'block';
        if (penWidthControl) penWidthControl.style.display = 'block';
        if (eraserWidthControl) eraserWidthControl.style.display = 'block';
        if (undoRedoControls) undoRedoControls.style.display = 'flex';
    }
    
    // Update cursor hint
    const canvas = konvaCanvas?.stage?.container();
    if (canvas) {
        if (tool === 'select') {
            canvas.title = 'Click on a line or shape to delete it';
        } else {
            canvas.title = '';
        }
    }
};

window.handleColorChange = function() {
    const color = document.getElementById('stroke-color').value;
    if (konvaCanvas) {
        konvaCanvas.setStrokeColor(color);
    }
};

window.handleStrokeWidthChange = function() {
    const width = document.getElementById('stroke-width').value;
    document.getElementById('stroke-width-value').textContent = width;
    if (konvaCanvas) {
        konvaCanvas.setStrokeWidth(parseInt(width));
    }
};

window.handleEraserWidthChange = function() {
    const width = document.getElementById('eraser-width').value;
    document.getElementById('eraser-width-value').textContent = width;
    if (konvaCanvas) {
        konvaCanvas.setEraserWidth(parseInt(width));
    }
};

window.undoDrawing = function() {
    if (konvaCanvas) {
        konvaCanvas.undo();
    }
};

window.redoDrawing = function() {
    if (konvaCanvas) {
        konvaCanvas.redo();
    }
};

window.updateGridSize = function() {
    const size = parseInt(document.getElementById('grid-size').value);
    if (konvaCanvas && currentMap) {
        currentMap.gridSize = size;
        konvaCanvas.currentMap = currentMap;
        konvaCanvas.drawGrid(size, currentMap.gridColor || '#cccccc', currentMap.showGrid !== false);
        autoSaveMap();
    }
};

window.toggleGrid = function() {
    if (konvaCanvas) {
        konvaCanvas.toggleGrid();
        if (currentMap) {
            currentMap.showGrid = !currentMap.showGrid;
            autoSaveMap();
        }
    }
};

window.clearMapDrawing = function() {
    if (confirm('Clear all drawing? This cannot be undone.')) {
        if (konvaCanvas) {
            konvaCanvas.clearDrawing();
        }
    }
};

window.handleBackgroundUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // For now, just show controls
    document.getElementById('background-controls').style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            if (konvaCanvas) {
                konvaCanvas.setBackgroundImage(img, 0.5, 1, 0, 0);
                autoSaveMap();
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.updateBackgroundOpacity = function() {
    const opacity = document.getElementById('bg-opacity').value / 100;
    document.getElementById('bg-opacity-value').textContent = Math.round(opacity * 100);
    // Update background opacity in Konva
};

window.updateBackgroundScale = function() {
    const scale = document.getElementById('bg-scale').value / 100;
    document.getElementById('bg-scale-value').textContent = Math.round(scale * 100);
    // Update background scale in Konva
};

window.removeBackground = function() {
    if (konvaCanvas) {
        konvaCanvas.setBackgroundImage(null);
        document.getElementById('background-controls').style.display = 'none';
        autoSaveMap();
}
};

async function autoSaveMap() {
    if (!currentMap) return;
    
    // Get current form values
        currentMap.name = document.getElementById('map-name').value;
    
    // Export Konva canvas data
    if (konvaCanvas) {
        const exported = konvaCanvas.exportToJSON();
        currentMap.strokes = exported.strokes;
        currentMap.icons = exported.icons;
    }
    
    try {
        await SaveMap(currentMap);
        console.log('Map saved');
    } catch (err) {
        console.error('Failed to save map:', err);
    }
}

window.deleteMap = async function() {
    if (!currentMap) return;
    
    if (confirm(`Delete map "${currentMap.name}"?`)) {
        try {
            await DeleteMap(currentMap.id);
            showMapList();
    } catch (err) {
            console.error('Failed to delete map:', err);
            alert('Failed to delete map: ' + err);
        }
    }
};

window.restoreMap = async function(id) {
    try {
        await RestoreMap(id);
        loadMapList();
    } catch (err) {
        console.error('Failed to restore map:', err);
        alert('Failed to restore map: ' + err);
    }
};

window.toggleDeletedMaps = function() {
    showDeletedMaps = document.getElementById('show-deleted-maps').checked;
    loadMapList();
};

// Add spacebar pan shortcut
let spacePressed = false;
let originalTool = null;

window.addEventListener('keydown', (e) => {
    // Undo/Redo shortcuts (only when map is open)
    if (konvaCanvas && currentMap) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoDrawing();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            redoDrawing();
            return;
        }
    }
    
    // Spacebar for pan
    if (e.code === 'Space' && !spacePressed && konvaCanvas && currentMap) {
        e.preventDefault();
        spacePressed = true;
        originalTool = konvaCanvas.currentTool;
        konvaCanvas.setTool('pan');
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spacePressed && konvaCanvas && originalTool) {
        e.preventDefault();
        spacePressed = false;
        konvaCanvas.setTool(originalTool);
        originalTool = null;
    }
});

// ============ WORLD NOTES FUNCTIONS ============

async function loadWorldNotesList() {
    try {
        const notes = showDeletedWorldNotes ? await GetDeletedWorldNotes() : await GetWorldNotes();
        const listElement = document.getElementById('world-notes-list');
        
        if (!notes || notes.length === 0) {
            listElement.innerHTML = '<p class="empty-state">No world notes yet. Create your first note!</p>';
            return;
        }
        
        listElement.innerHTML = notes.map(note => {
            const deletedClass = !note.isActive ? 'deleted' : '';
            const restoreButton = !note.isActive 
                ? `<button class="btn btn-small btn-restore" onclick="restoreWorldNote('${note.id}'); event.stopPropagation();">Restore</button>` 
                : '';
            
            return `
                <div class="note-card ${deletedClass}" onclick="editWorldNote('${note.id}')">
                    <h3>${note.title}</h3>
                    <p>${note.content.substring(0, 100)}...</p>
                    ${restoreButton}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load world notes:', err);
        alert('Failed to load world notes: ' + err);
    }
}

window.showWorldNotesList = function() {
    document.getElementById('world-notes-list-view').style.display = 'block';
    document.getElementById('world-note-edit-view').style.display = 'none';
    loadWorldNotesList();
};

window.showCreateWorldNote = async function() {
    try {
        const timestamp = Date.now();
        const newNote = {
            id: 'note-' + timestamp,
            title: 'New Note',
        content: '',
            isActive: true
        };
        
        await SaveWorldNote(newNote);
        editWorldNote(newNote.id);
    } catch (err) {
        console.error('Failed to create world note:', err);
        alert('Failed to create world note: ' + err);
    }
};

window.editWorldNote = async function(id) {
    try {
        const note = await GetWorldNote(id);
        currentWorldNote = note;
        
        document.getElementById('world-notes-list-view').style.display = 'none';
        document.getElementById('world-note-edit-view').style.display = 'block';
        
        document.getElementById('world-note-id').value = note.id;
        document.getElementById('world-note-title').value = note.title;
        document.getElementById('world-note-content').value = note.content || '';
    } catch (err) {
        console.error('Failed to load world note:', err);
        alert('Failed to load world note: ' + err);
    }
};

window.saveWorldNote = async function() {
    if (!currentWorldNote) return;
    
    try {
        const id = document.getElementById('world-note-id').value;
        const note = {
            id: id,
            title: document.getElementById('world-note-title').value,
            content: document.getElementById('world-note-content').value,
            isActive: currentWorldNote.isActive
        };
        
        await SaveWorldNote(note);
        
        // Show temporary success message
        const btn = event?.target;
        const originalText = btn?.textContent || '';
        if (btn) {
            btn.textContent = '✓ Saved!';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        }
        
        showWorldNotesList();
    } catch (err) {
        console.error('Failed to save world note:', err);
        alert('Failed to save world note: ' + err);
    }
};

window.deleteWorldNote = async function() {
    if (!currentWorldNote) return;
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
        await DeleteWorldNote(currentWorldNote.id);
        showWorldNotesList();
    } catch (err) {
        console.error('Failed to delete world note:', err);
        alert('Failed to delete world note: ' + err);
    }
};

window.restoreWorldNote = async function(id) {
    try {
        await RestoreWorldNote(id);
        loadWorldNotesList();
    } catch (err) {
        console.error('Failed to restore world note:', err);
        alert('Failed to restore world note: ' + err);
    }
};

window.toggleDeletedWorldNotes = function() {
    showDeletedWorldNotes = document.getElementById('show-deleted-world-notes').checked;
    loadWorldNotesList();
};

