/**
 * Equipment Manager - Handles equipment CRUD and calculations
 */
import { setupAutoResize } from '../utils/autoResize';
import { updateCalculatedValues } from '../utils/calculations';

export class EquipmentManager {
    constructor(characterManager) {
        this.characterManager = characterManager;
        this.showDeletedEquipment = false;
        this.equipmentTypeFilter = 'all';
    }

    /**
     * Load equipment for character
     * @param {Object} char - Character object
     */
    loadEquipment(char) {
        const equipmentList = document.getElementById('equipment-list');
        equipmentList.innerHTML = '';
        
        if (char.equipment && char.equipment.length > 0) {
            char.equipment.forEach((item, index) => {
                if (!item.isActive && !this.showDeletedEquipment) return;
                this.addEquipmentItemToDOM(item, index);
            });
        }
        
        this.updateEquippedWeight();
    }

    /**
     * Add new equipment item
     */
    addEquipmentItem() {
        const newId = 'eq-' + Date.now();
        const newItem = {
            id: newId,
            name: '',
            quantity: 1,
            weight: 0,
            type: 'item',
            description: '',
            equipped: false,
            isActive: true
        };
        const index = document.getElementById('equipment-list').children.length;
        this.addEquipmentItemToDOM(newItem, index);
    }

    /**
     * Add equipment item to DOM
     * @param {Object} item - Equipment item
     * @param {number} index - Item index
     */
    addEquipmentItemToDOM(item, index) {
        const equipmentList = document.getElementById('equipment-list');
        const div = document.createElement('div');
        div.className = 'equipment-item' + (!item.isActive ? ' deleted' : '');
        div.dataset.index = index;
        div.dataset.id = item.id;
        div.dataset.isActive = item.isActive ? '1' : '0';
        
        const deleteOrRestoreButton = item.isActive
            ? `<button type="button" class="btn-icon btn-danger" onclick="window.equipmentManager.removeEquipmentItem(${index})" title="Delete">🗑️</button>`
            : `<button type="button" class="btn-small btn-restore" onclick="window.equipmentManager.restoreEquipmentItem(${index})">Restore</button>`;
        
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
        
        const totalWeight = (item.quantity || 1) * (item.weight || 0);
        
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
                    <label>Weight (each):</label>
                    <input type="number" class="eq-weight" value="${item.weight || 0}" min="0" step="0.1" ${!item.isActive ? 'disabled' : ''}>
                </div>
                <div class="form-group-inline">
                    <label>Total Weight:</label>
                    <input type="number" class="eq-total-weight" value="${totalWeight.toFixed(1)}" disabled readonly style="background: #f0f0f0;">
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
        
        // Setup auto-resize for text inputs and textareas
        div.querySelectorAll('input[type="text"], textarea').forEach(el => {
            setupAutoResize(el);
        });
        
        // Add change listeners
        const quantityInput = div.querySelector('.eq-quantity');
        const weightInput = div.querySelector('.eq-weight');
        const totalWeightInput = div.querySelector('.eq-total-weight');
        const equippedCheckbox = div.querySelector('.eq-equipped');
        
        const updateTotalWeight = () => {
            const qty = parseInt(quantityInput.value) || 1;
            const weight = parseFloat(weightInput.value) || 0;
            totalWeightInput.value = (qty * weight).toFixed(1);
            this.updateEquippedWeight();
            this.characterManager.scheduleAutoSave();
        };
        
        quantityInput.addEventListener('change', updateTotalWeight);
        weightInput.addEventListener('change', updateTotalWeight);
        equippedCheckbox.addEventListener('change', () => {
            this.updateEquippedWeight();
            this.characterManager.scheduleAutoSave();
        });
        
        // Add change listener to type selector
        const typeSelect = div.querySelector('.eq-type');
        typeSelect.addEventListener('change', () => {
            const currentData = {
                id: div.dataset.id,
                name: div.querySelector('.eq-name').value,
                quantity: parseInt(div.querySelector('.eq-quantity').value) || 1,
                type: typeSelect.value,
                category: typeSelect.value,
                weight: parseFloat(div.querySelector('.eq-weight').value) || 0,
                description: div.querySelector('.eq-description').value,
                equipped: div.querySelector('.eq-equipped').checked,
                isActive: div.dataset.isActive === '1'
            };
            div.remove();
            this.addEquipmentItemToDOM(currentData, index);
            this.characterManager.scheduleAutoSave();
        });
        
        div.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.classList.contains('eq-type')) return;
            el.addEventListener('change', () => {
                this.characterManager.scheduleAutoSave();
                updateCalculatedValues(this.characterManager.currentCharacter);
            });
            el.addEventListener('blur', () => {
                this.characterManager.scheduleAutoSave();
                updateCalculatedValues(this.characterManager.currentCharacter);
            });
        });
    }

    /**
     * Collect equipment from form
     * @returns {Array} Equipment array
     */
    collectEquipment() {
        const items = [];
        document.querySelectorAll('.equipment-item').forEach(div => {
            const type = div.querySelector('.eq-type').value;
            const equippedCheckbox = div.querySelector('.eq-equipped');
            const weightInput = div.querySelector('.eq-weight');
            const item = {
                id: div.dataset.id,
                name: div.querySelector('.eq-name').value,
                quantity: parseInt(div.querySelector('.eq-quantity').value) || 1,
                weight: weightInput ? parseFloat(weightInput.value) || 0 : 0,
                category: type,
                description: div.querySelector('.eq-description').value,
                equipped: equippedCheckbox ? equippedCheckbox.checked : false,
                isActive: div.dataset.isActive === '1'
            };
            
            if (type === 'weapon') {
                const damageDice = div.querySelector('.eq-damage-dice');
                const attackBonus = div.querySelector('.eq-attack-bonus');
                if (damageDice) item.damageDice = damageDice.value;
                if (attackBonus) item.attackBonus = parseInt(attackBonus.value) || 0;
            }
            
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

    /**
     * Update equipped weight display
     */
    updateEquippedWeight() {
        let totalWeight = 0;
        let totalCount = 0;
        const items = document.getElementById('equipment-list').children;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const isActive = item.dataset.isActive === '1';
            const equipped = item.querySelector('.eq-equipped')?.checked;
            
            if (isActive && equipped) {
                const qty = parseInt(item.querySelector('.eq-quantity')?.value) || 1;
                const weight = parseFloat(item.querySelector('.eq-weight')?.value) || 0;
                totalWeight += qty * weight;
                totalCount++;
            }
        }
        
        const weightDisplay = document.getElementById('total-equipped-weight');
        const countDisplay = document.getElementById('total-equipped-count');
        
        if (weightDisplay) weightDisplay.textContent = totalWeight.toFixed(1);
        if (countDisplay) countDisplay.textContent = totalCount;
    }

    /**
     * Remove equipment item
     * @param {number} index - Item index
     */
    removeEquipmentItem(index) {
        const items = document.getElementById('equipment-list').children;
        if (items[index]) {
            items[index].dataset.isActive = '0';
            items[index].classList.add('deleted');
            items[index].querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
            const btn = items[index].querySelector('.btn-danger');
            if (btn) {
                btn.className = 'btn-small btn-restore';
                btn.textContent = 'Restore';
                btn.onclick = () => this.restoreEquipmentItem(index);
            }
            if (!this.showDeletedEquipment) {
                items[index].style.display = 'none';
            }
            this.updateEquippedWeight();
            this.characterManager.scheduleAutoSave();
        }
    }

    /**
     * Restore equipment item
     * @param {number} index - Item index
     */
    restoreEquipmentItem(index) {
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
                btn.onclick = () => this.removeEquipmentItem(index);
            }
            this.updateEquippedWeight();
            this.characterManager.scheduleAutoSave();
        }
    }

    /**
     * Toggle deleted equipment
     */
    toggleDeletedEquipment() {
        this.showDeletedEquipment = document.getElementById('show-deleted-equipment').checked;
        this.refreshEquipmentList();
    }

    /**
     * Filter equipment by type
     */
    filterEquipmentByType() {
        this.equipmentTypeFilter = document.getElementById('equipment-type-filter').value;
        this.refreshEquipmentList();
    }

    /**
     * Refresh equipment list
     */
    refreshEquipmentList() {
        if (!this.characterManager.currentCharacter) return;
        
        const equipmentList = document.getElementById('equipment-list');
        equipmentList.innerHTML = '';
        
        if (this.characterManager.currentCharacter.equipment && 
            this.characterManager.currentCharacter.equipment.length > 0) {
            this.characterManager.currentCharacter.equipment.forEach((item, index) => {
                this.addEquipmentItemToDOM(item, index);
                
                const itemDiv = equipmentList.children[equipmentList.children.length - 1];
                const itemType = item.type || item.category;
                const shouldHide = (!item.isActive && !this.showDeletedEquipment) || 
                                   (this.equipmentTypeFilter !== 'all' && itemType !== this.equipmentTypeFilter);
                if (itemDiv) {
                    itemDiv.style.display = shouldHide ? 'none' : '';
                }
            });
        }
        this.updateEquippedWeight();
    }
}
