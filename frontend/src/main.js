import './style.css';

// Import managers
import { CharacterManager } from './managers/CharacterManager';
import { EquipmentManager } from './managers/EquipmentManager';
import { AbilityManager } from './managers/AbilityManager';
import { ClassManager } from './managers/ClassManager';
import { TableManager } from './managers/TableManager';
import { MapManager } from './managers/MapManager';
import { MapEditor } from './managers/MapEditor';
import { WorldNotesManager } from './managers/WorldNotesManager';
import { PartyManager } from './managers/PartyManager';

// Import utilities
import { generateCharacterSheetHTML } from './utils/exportHTML';

// Initialize managers
const characterManager = new CharacterManager();
const equipmentManager = new EquipmentManager(characterManager);
const abilityManager = new AbilityManager(characterManager);
const classManager = new ClassManager(characterManager);
const tableManager = new TableManager(characterManager);
const mapManager = new MapManager();
const mapEditor = new MapEditor(mapManager);
const worldNotesManager = new WorldNotesManager();
const partyManager = new PartyManager();

// Expose managers to window for onclick handlers
window.characterManager = characterManager;
window.equipmentManager = equipmentManager;
window.abilityManager = abilityManager;
window.classManager = classManager;
window.tableManager = tableManager;
window.mapManager = mapManager;
window.mapEditor = mapEditor;
window.worldNotesManager = worldNotesManager;
window.partyManager = partyManager;

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
    // Ensure characters tab is visible and active
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById('characters-tab')?.classList.add('active');
    document.querySelector('[onclick*="characters"]')?.classList.add('active');

    // Show character list view
    characterManager.showCharacterList();
});

// Tab switching
window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`${tabName}-tab`)?.classList.add('active');
    if (event?.target) {
        event.target.classList.add('active');
    }

    if (tabName === 'characters') {
        characterManager.showCharacterList();
    } else if (tabName === 'maps') {
        mapManager.showMapList();
    } else if (tabName === 'world-notes') {
        worldNotesManager.showWorldNotesList();
    } else if (tabName === 'party') {
        partyManager.showPartyList();
    }
};

// ============ CHARACTER GLOBAL FUNCTIONS ============

window.showCharacterList = () => characterManager.showCharacterList();
window.showCreateCharacter = () => characterManager.showCreateCharacter();
window.editCharacter = (id) => characterManager.editCharacter(id);
window.deleteCharacter = () => characterManager.deleteCharacter();
window.restoreCharacter = (id) => characterManager.restoreCharacter(id);
window.toggleDeletedCharacters = () => characterManager.toggleDeletedCharacters();
window.scrollToSection = (sectionId) => characterManager.scrollToSection(sectionId);
window.refreshHistory = () => characterManager.refreshHistory();

// History modal functions
window.showAddNoteModal = function () {
    document.getElementById('add-note-modal').style.display = 'flex';
    document.getElementById('activity-note').value = '';
    setTimeout(() => document.getElementById('activity-note').focus(), 100);
};

window.closeAddNoteModal = function () {
    document.getElementById('add-note-modal').style.display = 'none';
};

window.confirmAddNote = () => characterManager.addHistoryNote();

// HP Change modal functions
window.confirmHPChange = () => characterManager.confirmHPChange();
window.skipHPNote = () => characterManager.skipHPNote();

// Export modal functions
window.showExportModal = function () {
    if (!characterManager.currentCharacter) {
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

window.closeExportModal = function () {
    document.getElementById('export-modal').style.display = 'none';
};

window.confirmExport = async function () {
    const includeFullHistory = document.getElementById('export-full-history').checked;
    const dateFrom = document.getElementById('export-date-from').value;
    const dateTo = document.getElementById('export-date-to').value;

    await generateCharacterSheetHTML(
        characterManager.currentCharacter,
        includeFullHistory,
        dateFrom,
        dateTo
    );
    window.closeExportModal();
};

// ============ EQUIPMENT GLOBAL FUNCTIONS ============

window.addEquipmentItem = () => equipmentManager.addEquipmentItem();
window.removeEquipmentItem = (index) => equipmentManager.removeEquipmentItem(index);
window.restoreEquipmentItem = (index) => equipmentManager.restoreEquipmentItem(index);
window.toggleDeletedEquipment = () => equipmentManager.toggleDeletedEquipment();
window.filterEquipmentByType = () => equipmentManager.filterEquipmentByType();

// ============ ABILITY GLOBAL FUNCTIONS ============

window.addAbilityItem = () => abilityManager.addAbilityItem();
window.removeAbilityItem = (index) => abilityManager.removeAbilityItem(index);
window.restoreAbilityItem = (index) => abilityManager.restoreAbilityItem(index);
window.toggleDeletedAbilities = () => abilityManager.toggleDeletedAbilities();
window.filterAbilitiesByType = () => abilityManager.filterAbilitiesByType();

// ============ CLASS GLOBAL FUNCTIONS ============

window.addClassItem = () => classManager.addClassItem();
window.removeClassItem = (index) => classManager.removeClassItem(index);
window.restoreClassItem = (index) => classManager.restoreClassItem(index);
window.toggleDeletedClasses = () => classManager.toggleDeletedClasses();

// ============ TABLE GLOBAL FUNCTIONS ============

window.addTableItem = () => tableManager.addTableItem();
window.removeTableItem = (index) => tableManager.removeTableItem(index);
window.restoreTableItem = (index) => tableManager.restoreTableItem(index);
window.toggleDeletedTables = () => tableManager.toggleDeletedTables();

// ============ MAP GLOBAL FUNCTIONS ============

window.showMapList = () => mapManager.showMapList();
window.showCreateMap = () => mapManager.showCreateMap();
window.editMap = (id) => mapEditor.editMap(id);
window.deleteMap = () => mapManager.deleteMap(mapEditor.currentMap?.id);
window.restoreMap = (id) => mapManager.restoreMap(id);
window.toggleDeletedMaps = () => mapManager.toggleDeletedMaps();

// Map editor functions
window.selectTool = (tool) => mapEditor.selectTool(tool);
window.selectIcon = (filename) => mapEditor.selectIcon(filename);
window.filterIcons = (category) => mapEditor.filterIcons(category);
window.handleColorChange = () => mapEditor.handleColorChange();
window.handleStrokeWidthChange = () => mapEditor.handleStrokeWidthChange();
window.handleEraserWidthChange = () => mapEditor.handleEraserWidthChange();
window.undoDrawing = () => mapEditor.undoDrawing();
window.redoDrawing = () => mapEditor.redoDrawing();
window.updateGridSize = () => mapEditor.updateGridSize();
window.toggleGrid = () => mapEditor.toggleGrid();
window.clearMapDrawing = () => mapEditor.clearMapDrawing();
window.handleBackgroundUpload = (event) => mapEditor.handleBackgroundUpload(event);
window.removeBackground = () => mapEditor.removeBackground();
window.autoSaveMap = () => mapEditor.autoSaveMap();

// ============ WORLD NOTES GLOBAL FUNCTIONS ============

window.showWorldNotesList = () => worldNotesManager.showWorldNotesList();
window.showCreateWorldNote = () => worldNotesManager.showCreateWorldNote();
window.editWorldNote = (id) => worldNotesManager.editWorldNote(id);
window.saveWorldNote = () => worldNotesManager.saveWorldNote();
window.deleteWorldNote = () => worldNotesManager.deleteWorldNote();
window.restoreWorldNote = (id) => worldNotesManager.restoreWorldNote(id);
window.toggleDeletedWorldNotes = () => worldNotesManager.toggleDeletedWorldNotes();
