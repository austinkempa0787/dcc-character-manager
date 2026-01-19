/**
 * Table Manager - Handles custom tables CRUD
 */
import { setupAutoResize } from '../utils/autoResize';

export class TableManager {
    constructor(characterManager) {
        this.characterManager = characterManager;
        this.showDeletedTables = false;
    }

    /**
     * Load tables for character
     * @param {Object} char - Character object
     */
    loadTables(char) {
        const tablesList = document.getElementById('tables-list');
        tablesList.innerHTML = '';
        
        if (char.tables && char.tables.length > 0) {
            char.tables.forEach((table, index) => {
                this.addTableItemToDOM(table, index);
                
                const tableDiv = tablesList.children[tablesList.children.length - 1];
                if (!table.isActive && !this.showDeletedTables && tableDiv) {
                    tableDiv.style.display = 'none';
                }
            });
        }
    }

    /**
     * Add new table
     */
    addTableItem() {
        const newId = 'table-' + Date.now();
        const newItem = {
            id: newId,
            name: '',
            number: '',
            dice: '',
            isActive: true
        };
        const index = document.getElementById('tables-list').children.length;
        this.addTableItemToDOM(newItem, index);
    }

    /**
     * Add table to DOM
     * @param {Object} table - Table object
     * @param {number} index - Index
     */
    addTableItemToDOM(table, index) {
        const tablesList = document.getElementById('tables-list');
        const div = document.createElement('div');
        div.className = 'table-item' + (!table.isActive ? ' deleted' : '');
        div.dataset.index = index;
        div.dataset.id = table.id;
        div.dataset.isActive = table.isActive ? '1' : '0';
        
        const deleteOrRestoreButton = table.isActive
            ? `<button type="button" class="btn-icon btn-danger" onclick="window.tableManager.removeTableItem(${index})" title="Delete">🗑️</button>`
            : `<button type="button" class="btn-small btn-restore" onclick="window.tableManager.restoreTableItem(${index})">Restore</button>`;
        
        div.innerHTML = `
            <div class="table-header">
                <div class="form-group-inline" style="flex: 1;">
                    <label>Table Name:</label>
                    <input type="text" class="table-name" value="${table.name}" placeholder="Table name (e.g., Corruption)" required ${!table.isActive ? 'disabled' : ''}>
                </div>
                <div class="form-group-inline" style="flex: 0 0 150px;">
                    <label>Number:</label>
                    <input type="text" class="table-number" value="${table.number}" placeholder="e.g., 5-4" ${!table.isActive ? 'disabled' : ''}>
                </div>
                <div class="form-group-inline" style="flex: 0 0 120px;">
                    <label>Dice:</label>
                    <input type="text" class="table-dice" value="${table.dice}" placeholder="e.g., 1d8" ${!table.isActive ? 'disabled' : ''}>
                </div>
                ${deleteOrRestoreButton}
            </div>
        `;
        tablesList.appendChild(div);
        
        div.querySelectorAll('input[type="text"]').forEach(el => {
            setupAutoResize(el);
        });
        
        div.querySelectorAll('input').forEach(el => {
            el.addEventListener('change', () => this.characterManager.scheduleAutoSave());
            el.addEventListener('blur', () => this.characterManager.scheduleAutoSave());
        });
    }

    /**
     * Collect tables from form
     * @returns {Array} Tables array
     */
    collectTables() {
        const items = [];
        document.querySelectorAll('.table-item').forEach(div => {
            items.push({
                id: div.dataset.id,
                name: div.querySelector('.table-name').value,
                number: div.querySelector('.table-number').value,
                dice: div.querySelector('.table-dice').value,
                isActive: div.dataset.isActive === '1'
            });
        });
        return items;
    }

    /**
     * Remove table
     * @param {number} index - Index
     */
    removeTableItem(index) {
        const items = document.getElementById('tables-list').children;
        if (items[index]) {
            items[index].dataset.isActive = '0';
            items[index].classList.add('deleted');
            items[index].querySelectorAll('input').forEach(el => el.disabled = true);
            const btn = items[index].querySelector('.btn-danger');
            if (btn) {
                btn.className = 'btn-small btn-restore';
                btn.textContent = 'Restore';
                btn.onclick = () => this.restoreTableItem(index);
            }
            if (!this.showDeletedTables) items[index].style.display = 'none';
            this.characterManager.scheduleAutoSave();
        }
    }

    /**
     * Restore table
     * @param {number} index - Index
     */
    restoreTableItem(index) {
        const items = document.getElementById('tables-list').children;
        if (items[index]) {
            items[index].dataset.isActive = '1';
            items[index].classList.remove('deleted');
            items[index].style.display = '';
            items[index].querySelectorAll('input').forEach(el => el.disabled = false);
            const btn = items[index].querySelector('.btn-restore');
            if (btn) {
                btn.className = 'btn-small btn-danger';
                btn.textContent = 'Delete';
                btn.onclick = () => this.removeTableItem(index);
            }
            this.characterManager.scheduleAutoSave();
        }
    }

    /**
     * Toggle deleted tables
     */
    toggleDeletedTables() {
        this.showDeletedTables = document.getElementById('show-deleted-tables').checked;
        if (this.characterManager.currentCharacter) {
            const tablesList = document.getElementById('tables-list');
            Array.from(tablesList.children).forEach((tableDiv) => {
                const isActive = tableDiv.dataset.isActive === '1';
                if (!isActive) {
                    tableDiv.style.display = this.showDeletedTables ? '' : 'none';
                }
            });
        }
    }
}
