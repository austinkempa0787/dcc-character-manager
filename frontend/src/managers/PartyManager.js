/**
 * Party Manager - Handles party/group management
 */
import { GetParty, GetParties, GetDeletedParties, CreateParty, SaveParty, DeleteParty, RestoreParty, GetPartyCharacters, GetCharacters } from '../../wailsjs/go/main/App';
import { getDCCModifier } from '../utils/calculations';

export class PartyManager {
    constructor() {
        this.currentParty = null;
        this.showDeletedParties = false;
    }

    /**
     * Calculate equipped AC with agility modifier and armor bonuses
     */
    calculateEquippedAC(char) {
        const baseAC = char.armorClass || 10;
        const agilityMod = getDCCModifier(char.agility.base);
        
        // Get AC bonus from equipped armor
        let armorBonus = 0;
        if (char.equipment) {
            char.equipment.forEach(item => {
                if (item.isActive && item.equipped && item.category === 'armor' && item.acBonus) {
                    armorBonus += item.acBonus;
                }
            });
        }
        
        return baseAC + agilityMod + armorBonus;
    }

    /**
     * Calculate total saves with equipment bonuses and ability modifiers (DCC rules)
     */
    calculateTotalSaves(char) {
        let reflexBonus = 0;
        let fortitudeBonus = 0;
        let willpowerBonus = 0;
        
        if (char.equipment) {
            char.equipment.forEach(item => {
                if (item.isActive && item.equipped && item.category === 'armor') {
                    if (item.reflexSave) reflexBonus += item.reflexSave;
                    if (item.fortitudeSave) fortitudeBonus += item.fortitudeSave;
                    if (item.willpowerSave) willpowerBonus += item.willpowerSave;
                }
            });
        }
        
        // DCC rules: Agility affects Reflex, Stamina affects Fortitude, Personality affects Willpower
        const agilityMod = getDCCModifier(char.agility.base);
        const staminaMod = getDCCModifier(char.stamina.base);
        const personalityMod = getDCCModifier(char.personality.base);
        
        return {
            reflex: (char.saves.reflex || 0) + reflexBonus + agilityMod,
            fortitude: (char.saves.fortitude || 0) + fortitudeBonus + staminaMod,
            willpower: (char.saves.willpower || 0) + willpowerBonus + personalityMod
        };
    }

    /**
     * Get equipped weapons info
     */
    getEquippedWeapons(char) {
        const weapons = [];
        if (char.equipment) {
            char.equipment.forEach(item => {
                if (item.isActive && item.equipped && item.category === 'weapon') {
                    weapons.push({
                        name: item.name,
                        damage: item.damageDice || '1d4',
                        attackBonus: item.attackBonus || 0
                    });
                }
            });
        }
        return weapons;
    }

    /**
     * Load party list
     */
    async loadPartyList() {
        try {
            const parties = this.showDeletedParties ? 
                await GetDeletedParties() : 
                await GetParties();
            
            const listElement = document.getElementById('party-list');
            
            if (!parties || parties.length === 0) {
                listElement.innerHTML = '<p class="empty-state">No parties yet. Create your first party!</p>';
                return;
            }
            
            listElement.innerHTML = parties.map(party => {
                const deletedClass = !party.isActive ? 'deleted' : '';
                const restoreButton = !party.isActive 
                    ? `<button class="btn btn-small btn-restore" onclick="window.partyManager.restoreParty('${party.id}'); event.stopPropagation();">Restore</button>` 
                    : '';
                
                const memberCount = party.characterIds ? party.characterIds.length : 0;
                
                return `
                    <div class="party-card ${deletedClass}" onclick="window.partyManager.viewParty('${party.id}')">
                        <h3>${party.name}</h3>
                        <p>${party.description || 'No description'}</p>
                        <p class="party-member-count">${memberCount} member${memberCount !== 1 ? 's' : ''}</p>
                        ${restoreButton}
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Failed to load parties:', err);
            alert('Failed to load parties: ' + err);
        }
    }

    /**
     * Show party list view
     */
    showPartyList() {
        document.getElementById('party-list-view').style.display = 'block';
        document.getElementById('party-detail-view').style.display = 'none';
        this.loadPartyList();
    }

    /**
     * Show create party modal
     */
    async showCreateParty() {
        try {
            const characters = await GetCharacters();
            
            if (!characters || characters.length === 0) {
                alert('No characters available. Create some characters first!');
                return;
            }
            
            // Populate character selection
            const selectionList = document.getElementById('character-selection-list');
            selectionList.innerHTML = characters.map(char => `
                <label class="character-checkbox">
                    <input type="checkbox" value="${char.id}" class="char-select-checkbox">
                    <span>${char.name} (Level ${char.level})</span>
                </label>
            `).join('');
            
            // Clear form
            document.getElementById('party-name-input').value = '';
            document.getElementById('party-description-input').value = '';
            
            // Show modal
            document.getElementById('party-modal').style.display = 'flex';
        } catch (err) {
            console.error('Failed to load characters:', err);
            alert('Failed to load characters: ' + err);
        }
    }

    /**
     * Confirm create party
     */
    async confirmCreateParty() {
        const name = document.getElementById('party-name-input').value.trim();
        const description = document.getElementById('party-description-input').value.trim();
        
        if (!name) {
            alert('Please enter a party name');
            return;
        }
        
        // Get selected character IDs
        const checkboxes = document.querySelectorAll('.char-select-checkbox:checked');
        const characterIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (characterIds.length === 0) {
            alert('Please select at least one character');
            return;
        }
        
        try {
            const partyId = await CreateParty(name, description, characterIds);
            this.closePartyModal();
            this.viewParty(partyId);
        } catch (err) {
            console.error('Failed to create party:', err);
            alert('Failed to create party: ' + err);
        }
    }

    /**
     * Close party modal
     */
    closePartyModal() {
        document.getElementById('party-modal').style.display = 'none';
    }

    /**
     * View party details
     */
    async viewParty(id) {
        try {
            const party = await GetParty(id);
            const characters = await GetPartyCharacters(id);
            
            this.currentParty = party;
            
            document.getElementById('party-list-view').style.display = 'none';
            document.getElementById('party-detail-view').style.display = 'block';
            
            document.getElementById('party-name').textContent = party.name;
            document.getElementById('party-description').textContent = party.description || 'No description';
            
            // Render character cards
            const grid = document.getElementById('party-character-grid');
            grid.innerHTML = characters.map(char => this.renderCharacterCard(char)).join('');
            
        } catch (err) {
            console.error('Failed to load party:', err);
            alert('Failed to load party: ' + err);
        }
    }

    /**
     * Render character preview card
     */
    renderCharacterCard(char) {
        const initial = char.name.charAt(0).toUpperCase();
        const classInfo = char.classes && char.classes.length > 0 
            ? char.classes[0].name 
            : 'Adventurer';
        
        // Calculate values
        const formatMod = (mod) => mod >= 0 ? `+${mod}` : mod;
        
        const strMod = getDCCModifier(char.strength.base);
        const agiMod = getDCCModifier(char.agility.base);
        const staMod = getDCCModifier(char.stamina.base);
        const perMod = getDCCModifier(char.personality.base);
        const intMod = getDCCModifier(char.intelligence.base);
        const lckMod = getDCCModifier(char.luck.base);
        
        // Calculate equipped AC and total saves
        const equippedAC = this.calculateEquippedAC(char);
        const totalSaves = this.calculateTotalSaves(char);
        const weapons = this.getEquippedWeapons(char);
        
        // Weapon display
        let weaponDisplay = '';
        if (weapons.length > 0) {
            weaponDisplay = weapons.map(w => {
                const totalAttack = (w.attackBonus || 0) + strMod + (char.level || 0);
                return `
                    <div class="weapon-mini">
                        <div class="weapon-name">${w.name}</div>
                        <div class="weapon-stats"><i class="fas fa-sword"></i> ${formatMod(totalAttack)} / ${w.damage}</div>
                    </div>
                `;
            }).join('');
        }
        
        return `
            <div class="party-character-card" onclick="window.partyManager.openCharacter('${char.id}'); event.stopPropagation();">
                <div class="card-header">
                    <div class="character-avatar">${initial}</div>
                    <div class="character-name-level">
                        <h3>${char.name}</h3>
                        <p>Level ${char.level} ${classInfo}</p>
                    </div>
                </div>
                
                <div class="card-stats">
                    <div class="stat-row">
                        <span class="stat-label">HP</span>
                        <span class="stat-value ${char.currentHealth < char.maxHealth * 0.3 ? 'stat-low' : ''}">${char.currentHealth}/${char.maxHealth}</span>
                    </div>
                    <div class="stat-row" title="Base AC: ${char.armorClass}\nAgility Mod: ${formatMod(agiMod)}\nArmor Bonus: ${formatMod(equippedAC - char.armorClass - agiMod)}">
                        <span class="stat-label">AC</span>
                        <span class="stat-value">${equippedAC}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Init</span>
                        <span class="stat-value">${formatMod(char.initiative || 0)}</span>
                    </div>
                </div>
                
                <div class="card-saves" title="Reflex: ${formatMod(totalSaves.reflex)}\nFortitude: ${formatMod(totalSaves.fortitude)}\nWillpower: ${formatMod(totalSaves.willpower)}">
                    <div class="save-chip">REF ${formatMod(totalSaves.reflex)}</div>
                    <div class="save-chip">FORT ${formatMod(totalSaves.fortitude)}</div>
                    <div class="save-chip">WILL ${formatMod(totalSaves.willpower)}</div>
                </div>
                
                ${weaponDisplay ? `<div class="card-weapons">${weaponDisplay}</div>` : ''}
                
                <div class="card-attributes">
                    <div class="attr-mini" title="Strength: ${char.strength.base}">
                        <div class="attr-label">STR</div>
                        <div class="attr-value">${char.strength.base}</div>
                        <div class="attr-mod">${formatMod(strMod)}</div>
                    </div>
                    <div class="attr-mini" title="Agility: ${char.agility.base}">
                        <div class="attr-label">AGI</div>
                        <div class="attr-value">${char.agility.base}</div>
                        <div class="attr-mod">${formatMod(agiMod)}</div>
                    </div>
                    <div class="attr-mini" title="Stamina: ${char.stamina.base}">
                        <div class="attr-label">STA</div>
                        <div class="attr-value">${char.stamina.base}</div>
                        <div class="attr-mod">${formatMod(staMod)}</div>
                    </div>
                    <div class="attr-mini" title="Personality: ${char.personality.base}">
                        <div class="attr-label">PER</div>
                        <div class="attr-value">${char.personality.base}</div>
                        <div class="attr-mod">${formatMod(perMod)}</div>
                    </div>
                    <div class="attr-mini" title="Intelligence: ${char.intelligence.base}">
                        <div class="attr-label">INT</div>
                        <div class="attr-value">${char.intelligence.base}</div>
                        <div class="attr-mod">${formatMod(intMod)}</div>
                    </div>
                    <div class="attr-mini" title="Luck: ${char.luck.base}">
                        <div class="attr-label">LCK</div>
                        <div class="attr-value">${char.luck.base}</div>
                        <div class="attr-mod">${formatMod(lckMod)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Open character from party view
     */
    openCharacter(id) {
        // Switch to characters tab and edit character
        window.switchTab('characters');
        window.editCharacter(id);
    }

    /**
     * Edit party members
     */
    async editPartyMembers() {
        if (!this.currentParty) return;
        
        try {
            const characters = await GetCharacters();
            
            const selectionList = document.getElementById('character-selection-list');
            selectionList.innerHTML = characters.map(char => {
                const isSelected = this.currentParty.characterIds.includes(char.id);
                return `
                    <label class="character-checkbox">
                        <input type="checkbox" value="${char.id}" class="char-select-checkbox" ${isSelected ? 'checked' : ''}>
                        <span>${char.name} (Level ${char.level})</span>
                    </label>
                `;
            }).join('');
            
            document.getElementById('party-name-input').value = this.currentParty.name;
            document.getElementById('party-description-input').value = this.currentParty.description || '';
            document.getElementById('party-modal-title').textContent = 'Edit Party';
            document.getElementById('party-modal').style.display = 'flex';
            
            // Change button to "Save"
            const confirmBtn = document.querySelector('#party-modal .modal-confirm-btn');
            if (confirmBtn) {
                confirmBtn.textContent = 'Save Changes';
                confirmBtn.onclick = () => this.confirmEditParty();
            }
        } catch (err) {
            console.error('Failed to load characters:', err);
            alert('Failed to load characters: ' + err);
        }
    }

    /**
     * Confirm edit party
     */
    async confirmEditParty() {
        const name = document.getElementById('party-name-input').value.trim();
        const description = document.getElementById('party-description-input').value.trim();
        
        const checkboxes = document.querySelectorAll('.char-select-checkbox:checked');
        const characterIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (!name || characterIds.length === 0) {
            alert('Please enter a name and select at least one character');
            return;
        }
        
        try {
            this.currentParty.name = name;
            this.currentParty.description = description;
            this.currentParty.characterIds = characterIds;
            
            await SaveParty(this.currentParty);
            this.closePartyModal();
            this.viewParty(this.currentParty.id);
        } catch (err) {
            console.error('Failed to update party:', err);
            alert('Failed to update party: ' + err);
        }
    }

    /**
     * Delete party
     */
    async deleteParty() {
        if (!this.currentParty) return;
        if (!confirm('Are you sure you want to delete this party?')) return;
        
        try {
            await DeleteParty(this.currentParty.id);
            this.showPartyList();
        } catch (err) {
            console.error('Failed to delete party:', err);
            alert('Failed to delete party: ' + err);
        }
    }

    /**
     * Restore party
     */
    async restoreParty(id) {
        try {
            await RestoreParty(id);
            this.loadPartyList();
        } catch (err) {
            console.error('Failed to restore party:', err);
            alert('Failed to restore party: ' + err);
        }
    }

    /**
     * Toggle deleted parties
     */
    toggleDeletedParties() {
        this.showDeletedParties = document.getElementById('show-deleted-parties').checked;
        this.loadPartyList();
    }
}
