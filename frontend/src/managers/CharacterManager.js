/**
 * Character Manager - Handles character CRUD operations and state management
 */
import { GetCharacter, GetCharacters, GetDeletedCharacters, SaveCharacter, AddHistoryNote, DeleteCharacter, RestoreCharacter } from '../../wailsjs/go/main/App';
import { updateAttributeModifiers, updateCalculatedValues, collectEquipmentFromForm } from '../utils/calculations';
import { setupAutoResize } from '../utils/autoResize';

export class CharacterManager {
    constructor() {
        this.currentCharacter = null;
        this.previousHP = null;
        this.showDeletedCharacters = false;
        this.autoSaveTimeout = null;
    }

    /**
     * Load character list from backend
     */
    async loadCharacterList() {
        try {
            const characters = this.showDeletedCharacters ? 
                await GetDeletedCharacters() : 
                await GetCharacters();
            
            const listElement = document.getElementById('character-list');
            
            if (!characters || characters.length === 0) {
                listElement.innerHTML = '<p class="empty-state">No characters yet. Create your first character!</p>';
                return;
            }
            
            listElement.innerHTML = characters.map(char => {
                const deletedClass = !char.isActive ? 'deleted' : '';
                const restoreButton = !char.isActive 
                    ? `<button class="btn btn-small btn-restore" onclick="window.characterManager.restoreCharacter('${char.id}'); event.stopPropagation();">Restore</button>` 
                    : '';
                
                return `
                    <div class="character-card ${deletedClass}" onclick="window.characterManager.editCharacter('${char.id}')">
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

    /**
     * Show character list view
     */
    showCharacterList() {
        document.getElementById('character-list-view').style.display = 'block';
        document.getElementById('character-edit-view').style.display = 'none';
        this.loadCharacterList();
    }

    /**
     * Create new character
     */
    async showCreateCharacter() {
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
                classes: [],
                tables: [],
                history: [],
                isActive: true
            };
            
            await SaveCharacter(newCharacter, "Character created");
            this.editCharacter(newCharacter.id);
        } catch (err) {
            console.error('Failed to create character:', err);
            alert('Failed to create character: ' + err);
        }
    }

    /**
     * Edit character
     * @param {string} id - Character ID
     */
    async editCharacter(id) {
        try {
            const char = await GetCharacter(id);
            this.currentCharacter = char;
            
            document.getElementById('character-list-view').style.display = 'none';
            document.getElementById('character-edit-view').style.display = 'block';
            
            // Populate form
            this.populateForm(char);
            
            // Load nested items (will be called from respective managers)
            if (window.equipmentManager) window.equipmentManager.loadEquipment(char);
            if (window.abilityManager) window.abilityManager.loadAbilities(char);
            if (window.classManager) window.classManager.loadClasses(char);
            if (window.tableManager) window.tableManager.loadTables(char);
            
            this.refreshHistory();
            updateAttributeModifiers();
            updateCalculatedValues(this.currentCharacter);
            this.setupAutoSaveListeners();
            
            // Track current HP for change detection
            this.previousHP = char.currentHealth;
            
            // Add special listener for HP changes
            const hpField = document.getElementById('currentHealth');
            hpField.addEventListener('change', (e) => this.handleHPChange(e));
        } catch (err) {
            console.error('Failed to load character:', err);
            alert('Failed to load character: ' + err);
        }
    }

    /**
     * Populate character form
     * @param {Object} char - Character object
     */
    populateForm(char) {
        document.getElementById('character-id').value = char.id;
        document.getElementById('name').value = char.name;
        document.getElementById('level').value = char.level || 0;
        document.getElementById('alignment').value = char.alignment;
        document.getElementById('maxHealth').value = char.maxHealth;
        document.getElementById('currentHealth').value = char.currentHealth;
        document.getElementById('currentExperience').value = char.currentExperience || 0;
        document.getElementById('experienceNeeded').value = char.experienceNeeded || 0;
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
    }

    /**
     * Setup auto-save listeners
     */
    setupAutoSaveListeners() {
        const form = document.getElementById('character-form');
        form.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('change', () => this.scheduleAutoSave());
            el.addEventListener('blur', () => this.scheduleAutoSave());
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
                el.addEventListener('input', () => updateCalculatedValues(this.currentCharacter));
                el.addEventListener('change', () => updateCalculatedValues(this.currentCharacter));
            }
        });
    }

    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => this.autoSaveCharacter(), 1000);
    }

    /**
     * Auto-save character
     */
    async autoSaveCharacter() {
        if (!this.currentCharacter) return;
        
        try {
            const id = document.getElementById('character-id').value;
            const equipment = collectEquipmentFromForm();
            
            // Collect from other managers
            const abilities = window.abilityManager ? window.abilityManager.collectAbilities() : [];
            const classes = window.classManager ? window.classManager.collectClasses() : [];
            const tables = window.tableManager ? window.tableManager.collectTables() : [];
            
            const character = {
                id: id,
                name: document.getElementById('name').value,
                level: parseInt(document.getElementById('level').value) || 0,
                alignment: parseInt(document.getElementById('alignment').value),
                maxHealth: parseInt(document.getElementById('maxHealth').value),
                currentHealth: parseInt(document.getElementById('currentHealth').value),
                currentExperience: parseInt(document.getElementById('currentExperience').value) || 0,
                experienceNeeded: parseInt(document.getElementById('experienceNeeded').value) || 0,
                armorClass: parseInt(document.getElementById('armorClass').value) || 10,
                initiative: parseInt(document.getElementById('initiative').value) || 0,
                isActive: this.currentCharacter.isActive,
                
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
                tables: tables,
                history: this.currentCharacter.history || []
            };
            
            await SaveCharacter(character, "");
            const updated = await GetCharacter(id);
            this.currentCharacter = updated;
            this.refreshHistory();
        } catch (err) {
            console.error('Failed to auto-save character:', err);
        }
    }

    /**
     * Refresh history display
     */
    refreshHistory() {
        const historyLog = document.getElementById('history-log');
        if (this.currentCharacter.history && this.currentCharacter.history.length > 0) {
            const sortedHistory = [...this.currentCharacter.history].sort((a, b) => {
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            
            historyLog.innerHTML = sortedHistory.map(entry => {
                const timestamp = new Date(entry.timestamp).toLocaleString();
                let content = '';
                if (entry.note && entry.note.trim()) {
                    content = `<em>"${entry.note}"</em>`;
                } else if (entry.changes && entry.changes.length > 0) {
                    content = entry.changes.map(change => {
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

    /**
     * Handle HP change
     * @param {Event} event - Change event
     */
    handleHPChange(event) {
        const newHP = parseInt(event.target.value);
        const maxHP = parseInt(document.getElementById('maxHealth').value);
        
        // Only show modal if HP changed (not max HP)
        if (this.previousHP !== null && newHP !== this.previousHP && newHP !== maxHP) {
            const diff = newHP - this.previousHP;
            const message = diff > 0 
                ? `HP increased by ${diff} (${this.previousHP} → ${newHP})`
                : `HP decreased by ${Math.abs(diff)} (${this.previousHP} → ${newHP})`;
            
            document.getElementById('hp-change-message').textContent = message;
            document.getElementById('hp-change-note').value = '';
            document.getElementById('hp-change-modal').style.display = 'flex';
            
            this.previousHP = newHP;
            
            // Focus on textarea after modal appears
            setTimeout(() => document.getElementById('hp-change-note').focus(), 100);
        } else {
            this.previousHP = newHP;
            this.scheduleAutoSave();
        }
    }

    /**
     * Confirm HP change with note
     */
    async confirmHPChange() {
        const note = document.getElementById('hp-change-note').value.trim();
        document.getElementById('hp-change-modal').style.display = 'none';
        
        if (note && this.currentCharacter) {
            try {
                await AddHistoryNote(this.currentCharacter.id, note);
                const updated = await GetCharacter(this.currentCharacter.id);
                this.currentCharacter = updated;
                this.refreshHistory();
            } catch (err) {
                console.error('Failed to add HP change note:', err);
            }
        }
    }

    /**
     * Skip HP note
     */
    skipHPNote() {
        document.getElementById('hp-change-modal').style.display = 'none';
        this.scheduleAutoSave();
    }

    /**
     * Add manual history note
     */
    async addHistoryNote() {
        const note = document.getElementById('activity-note').value.trim();
        if (!note) {
            alert('Please enter a note');
            return;
        }
        
        if (this.currentCharacter) {
            try {
                await AddHistoryNote(this.currentCharacter.id, note);
                const updated = await GetCharacter(this.currentCharacter.id);
                this.currentCharacter = updated;
                this.refreshHistory();
                document.getElementById('add-note-modal').style.display = 'none';
            } catch (err) {
                console.error('Failed to add note:', err);
                alert('Failed to add note: ' + err);
            }
        }
    }

    /**
     * Delete character
     */
    async deleteCharacter() {
        if (!this.currentCharacter) return;
        if (!confirm('Are you sure you want to delete this character?')) return;
        
        try {
            await DeleteCharacter(this.currentCharacter.id);
            this.showCharacterList();
        } catch (err) {
            console.error('Failed to delete character:', err);
            alert('Failed to delete character: ' + err);
        }
    }

    /**
     * Restore character
     * @param {string} id - Character ID
     */
    async restoreCharacter(id) {
        try {
            await RestoreCharacter(id);
            this.loadCharacterList();
        } catch (err) {
            console.error('Failed to restore character:', err);
            alert('Failed to restore character: ' + err);
        }
    }

    /**
     * Toggle deleted characters
     */
    toggleDeletedCharacters() {
        this.showDeletedCharacters = document.getElementById('show-deleted-characters').checked;
        this.loadCharacterList();
    }

    /**
     * Scroll to section
     * @param {string} sectionId - Section ID
     */
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}
