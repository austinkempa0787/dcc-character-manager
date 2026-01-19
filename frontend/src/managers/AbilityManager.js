/**
 * Ability Manager - Handles abilities CRUD
 */
import { setupAutoResize } from '../utils/autoResize';

export class AbilityManager {
    constructor(characterManager) {
        this.characterManager = characterManager;
        this.showDeletedAbilities = false;
        this.abilityTypeFilter = 'all';
    }

    /**
     * Load abilities for character
     * @param {Object} char - Character object
     */
    loadAbilities(char) {
        const abilitiesList = document.getElementById('abilities-list');
        abilitiesList.innerHTML = '';

        if (char.abilities && char.abilities.length > 0) {
            char.abilities.forEach((ability, index) => {
                this.addAbilityItemToDOM(ability, index);

                const abilityDiv = abilitiesList.children[abilitiesList.children.length - 1];
                if (abilityDiv) {
                    const abilityType = ability.type || 'spell';
                    const shouldHide = (!ability.isActive && !this.showDeletedAbilities) ||
                        (this.abilityTypeFilter !== 'all' && abilityType !== this.abilityTypeFilter);
                    abilityDiv.style.display = shouldHide ? 'none' : '';
                }
            });
        }
    }

    /**
     * Add new ability
     */
    addAbilityItem() {
        const newId = 'ability-' + Date.now();
        const newItem = {
            id: newId,
            name: '',
            description: '',
            pageNumber: '',
            type: 'spell',
            isActive: true
        };
        const index = document.getElementById('abilities-list').children.length;
        this.addAbilityItemToDOM(newItem, index);
    }

    /**
     * Add ability to DOM
     * @param {Object} ability - Ability object
     * @param {number} index - Index
     */
    addAbilityItemToDOM(ability, index) {
        const abilitiesList = document.getElementById('abilities-list');
        const div = document.createElement('div');
        div.className = 'ability-item' + (!ability.isActive ? ' deleted' : '');
        div.dataset.index = index;
        div.dataset.id = ability.id;
        div.dataset.isActive = ability.isActive ? '1' : '0';
        div.dataset.type = ability.type || 'spell';

        const deleteOrRestoreButton = ability.isActive
            ? `<button type="button" class="btn-icon btn-danger" onclick="window.abilityManager.removeAbilityItem(${index})" title="Delete">🗑️</button>`
            : `<button type="button" class="btn-small btn-restore" onclick="window.abilityManager.restoreAbilityItem(${index})">Restore</button>`;

        const abilityType = ability.type || 'spell';

        div.innerHTML = `
            <div class="ability-header">
                <input type="text" class="ability-name" value="${ability.name}" placeholder="Ability name" required ${!ability.isActive ? 'disabled' : ''}>
                <div class="form-group-inline" style="flex: 0 0 120px;">
                    <label>Type:</label>
                    <select class="ability-type" ${!ability.isActive ? 'disabled' : ''}>
                        <option value="spell" ${abilityType === 'spell' ? 'selected' : ''}>Spell</option>
                        <option value="ability" ${abilityType === 'ability' ? 'selected' : ''}>Ability</option>
                        <option value="other" ${abilityType === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
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

        div.querySelectorAll('input[type="text"], textarea').forEach(el => {
            setupAutoResize(el);
        });

        div.querySelectorAll('input, textarea, select').forEach(el => {
            el.addEventListener('change', () => this.characterManager.scheduleAutoSave());
            el.addEventListener('blur', () => this.characterManager.scheduleAutoSave());
        });

        const typeSelect = div.querySelector('.ability-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                div.dataset.type = typeSelect.value;
                this.characterManager.scheduleAutoSave();
            });
        }
    }

    /**
     * Collect abilities from form
     * @returns {Array} Abilities array
     */
    collectAbilities() {
        const items = [];
        document.querySelectorAll('.ability-item').forEach(div => {
            items.push({
                id: div.dataset.id,
                name: div.querySelector('.ability-name').value,
                description: div.querySelector('.ability-description').value,
                type: div.querySelector('.ability-type')?.value || 'spell',
                pageNumber: div.querySelector('.ability-page')?.value || '',
                isActive: div.dataset.isActive === '1'
            });
        });
        return items;
    }

    /**
     * Remove ability
     * @param {number} index - Index
     */
    removeAbilityItem(index) {
        const items = document.getElementById('abilities-list').children;
        if (items[index]) {
            items[index].dataset.isActive = '0';
            items[index].classList.add('deleted');
            items[index].querySelectorAll('input, textarea, select').forEach(el => el.disabled = true);
            const btn = items[index].querySelector('.btn-danger');
            if (btn) {
                btn.className = 'btn-small btn-restore';
                btn.textContent = 'Restore';
                btn.onclick = () => this.restoreAbilityItem(index);
            }
            if (!this.showDeletedAbilities) items[index].style.display = 'none';
            this.characterManager.scheduleAutoSave();
        }
    }

    /**
     * Restore ability
     * @param {number} index - Index
     */
    restoreAbilityItem(index) {
        const items = document.getElementById('abilities-list').children;
        if (items[index]) {
            items[index].dataset.isActive = '1';
            items[index].classList.remove('deleted');
            items[index].style.display = '';
            items[index].querySelectorAll('input, textarea, select').forEach(el => el.disabled = false);
            const btn = items[index].querySelector('.btn-restore');
            if (btn) {
                btn.className = 'btn-small btn-danger';
                btn.textContent = 'Delete';
                btn.onclick = () => this.removeAbilityItem(index);
            }
            this.characterManager.scheduleAutoSave();
        }
    }

    /**
     * Toggle deleted abilities
     */
    toggleDeletedAbilities() {
        this.showDeletedAbilities = document.getElementById('show-deleted-abilities').checked;
        if (this.characterManager.currentCharacter) {
            const abilitiesList = document.getElementById('abilities-list');
            Array.from(abilitiesList.children).forEach((abilityDiv) => {
                const isActive = abilityDiv.dataset.isActive === '1';
                const abilityType = abilityDiv.dataset.type || 'spell';
                const shouldHide = (!isActive && !this.showDeletedAbilities) ||
                    (this.abilityTypeFilter !== 'all' && abilityType !== this.abilityTypeFilter);
                abilityDiv.style.display = shouldHide ? 'none' : '';
            });
        }
    }

    /**
     * Filter abilities by type
     */
    filterAbilitiesByType() {
        this.abilityTypeFilter = document.getElementById('ability-type-filter').value;
        if (this.characterManager.currentCharacter) {
            const abilitiesList = document.getElementById('abilities-list');
            Array.from(abilitiesList.children).forEach((abilityDiv) => {
                const isActive = abilityDiv.dataset.isActive === '1';
                const abilityType = abilityDiv.dataset.type || 'spell';
                const shouldHide = (!isActive && !this.showDeletedAbilities) ||
                    (this.abilityTypeFilter !== 'all' && abilityType !== this.abilityTypeFilter);
                abilityDiv.style.display = shouldHide ? 'none' : '';
            });
        }
    }
}
