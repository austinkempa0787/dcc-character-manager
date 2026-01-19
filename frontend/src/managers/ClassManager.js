/**
 * Class Manager - Handles character classes CRUD
 */
import { setupAutoResize } from '../utils/autoResize';

export class ClassManager {
    constructor(characterManager) {
        this.characterManager = characterManager;
        this.showDeletedClasses = false;
    }

    /**
     * Load classes for character
     * @param {Object} char - Character object
     */
    loadClasses(char) {
        const classesList = document.getElementById('classes-list');
        classesList.innerHTML = '';
        
        if (char.classes && char.classes.length > 0) {
            char.classes.forEach((classItem, index) => {
                if (!classItem.isActive && !this.showDeletedClasses) return;
                this.addClassItemToDOM(classItem, index);
            });
        }
    }

    /**
     * Add new class
     */
    addClassItem() {
        const newId = 'class-' + Date.now();
        const newItem = {
            id: newId,
            name: '',
            level: 1,
            description: '',
            isActive: true
        };
        const index = document.getElementById('classes-list').children.length;
        this.addClassItemToDOM(newItem, index);
    }

    /**
     * Add class to DOM
     * @param {Object} classItem - Class object
     * @param {number} index - Index
     */
    addClassItemToDOM(classItem, index) {
        const classesList = document.getElementById('classes-list');
        const div = document.createElement('div');
        div.className = 'class-item' + (!classItem.isActive ? ' deleted' : '');
        div.dataset.index = index;
        div.dataset.id = classItem.id;
        div.dataset.isActive = classItem.isActive ? '1' : '0';
        
        const deleteOrRestoreButton = classItem.isActive
            ? `<button type="button" class="btn-icon btn-danger" onclick="window.classManager.removeClassItem(${index})" title="Delete">🗑️</button>`
            : `<button type="button" class="btn-small btn-restore" onclick="window.classManager.restoreClassItem(${index})">Restore</button>`;
        
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
        
        div.querySelectorAll('input[type="text"], textarea').forEach(el => {
            setupAutoResize(el);
        });
        
        div.querySelectorAll('input, textarea').forEach(el => {
            el.addEventListener('change', () => this.characterManager.scheduleAutoSave());
            el.addEventListener('blur', () => this.characterManager.scheduleAutoSave());
        });
    }

    /**
     * Collect classes from form
     * @returns {Array} Classes array
     */
    collectClasses() {
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

    /**
     * Remove class
     * @param {number} index - Index
     */
    removeClassItem(index) {
        const items = document.getElementById('classes-list').children;
        if (items[index]) {
            items[index].dataset.isActive = '0';
            items[index].classList.add('deleted');
            items[index].querySelectorAll('input, textarea').forEach(el => el.disabled = true);
            const btn = items[index].querySelector('.btn-danger');
            if (btn) {
                btn.className = 'btn-small btn-restore';
                btn.textContent = 'Restore';
                btn.onclick = () => this.restoreClassItem(index);
            }
            if (!this.showDeletedClasses) items[index].style.display = 'none';
            this.characterManager.scheduleAutoSave();
        }
    }

    /**
     * Restore class
     * @param {number} index - Index
     */
    restoreClassItem(index) {
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
                btn.onclick = () => this.removeClassItem(index);
            }
            this.characterManager.scheduleAutoSave();
        }
    }

    /**
     * Toggle deleted classes
     */
    toggleDeletedClasses() {
        this.showDeletedClasses = document.getElementById('show-deleted-classes').checked;
        if (this.characterManager.currentCharacter) {
            const classesList = document.getElementById('classes-list');
            classesList.innerHTML = '';
            if (this.characterManager.currentCharacter.classes && 
                this.characterManager.currentCharacter.classes.length > 0) {
                this.characterManager.currentCharacter.classes.forEach((classItem, index) => {
                    if (!classItem.isActive && !this.showDeletedClasses) return;
                    this.addClassItemToDOM(classItem, index);
                });
            }
        }
    }
}
