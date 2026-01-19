/**
 * World Notes Manager - Handles world notes CRUD
 */
import { GetWorldNote, GetWorldNotes, GetDeletedWorldNotes, SaveWorldNote, DeleteWorldNote, RestoreWorldNote } from '../../wailsjs/go/main/App';

export class WorldNotesManager {
    constructor() {
        this.currentWorldNote = null;
        this.showDeletedWorldNotes = false;
    }

    /**
     * Load world notes list
     */
    async loadWorldNotesList() {
        try {
            const notes = this.showDeletedWorldNotes ? 
                await GetDeletedWorldNotes() : 
                await GetWorldNotes();
            
            const listElement = document.getElementById('world-notes-list');
            
            if (!notes || notes.length === 0) {
                listElement.innerHTML = '<p class="empty-state">No world notes yet. Create your first note!</p>';
                return;
            }
            
            listElement.innerHTML = notes.map(note => {
                const deletedClass = !note.isActive ? 'deleted' : '';
                const restoreButton = !note.isActive 
                    ? `<button class="btn btn-small btn-restore" onclick="window.worldNotesManager.restoreWorldNote('${note.id}'); event.stopPropagation();">Restore</button>` 
                    : '';
                
                return `
                    <div class="note-card ${deletedClass}" onclick="window.worldNotesManager.editWorldNote('${note.id}')">
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

    /**
     * Show world notes list view
     */
    showWorldNotesList() {
        document.getElementById('world-notes-list-view').style.display = 'block';
        document.getElementById('world-note-edit-view').style.display = 'none';
        this.loadWorldNotesList();
    }

    /**
     * Create new world note
     */
    async showCreateWorldNote() {
        try {
            const timestamp = Date.now();
            const newNote = {
                id: 'note-' + timestamp,
                title: 'New Note',
                content: '',
                isActive: true
            };
            
            await SaveWorldNote(newNote);
            this.editWorldNote(newNote.id);
        } catch (err) {
            console.error('Failed to create world note:', err);
            alert('Failed to create world note: ' + err);
        }
    }

    /**
     * Edit world note
     * @param {string} id - Note ID
     */
    async editWorldNote(id) {
        try {
            const note = await GetWorldNote(id);
            this.currentWorldNote = note;
            
            document.getElementById('world-notes-list-view').style.display = 'none';
            document.getElementById('world-note-edit-view').style.display = 'block';
            
            document.getElementById('world-note-id').value = note.id;
            document.getElementById('world-note-title').value = note.title;
            document.getElementById('world-note-content').value = note.content || '';
        } catch (err) {
            console.error('Failed to load world note:', err);
            alert('Failed to load world note: ' + err);
        }
    }

    /**
     * Save world note
     */
    async saveWorldNote() {
        if (!this.currentWorldNote) return;
        
        try {
            const id = document.getElementById('world-note-id').value;
            const note = {
                id: id,
                title: document.getElementById('world-note-title').value,
                content: document.getElementById('world-note-content').value,
                isActive: this.currentWorldNote.isActive
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
            
            this.showWorldNotesList();
        } catch (err) {
            console.error('Failed to save world note:', err);
            alert('Failed to save world note: ' + err);
        }
    }

    /**
     * Delete world note
     */
    async deleteWorldNote() {
        if (!this.currentWorldNote) return;
        if (!confirm('Are you sure you want to delete this note?')) return;
        
        try {
            await DeleteWorldNote(this.currentWorldNote.id);
            this.showWorldNotesList();
        } catch (err) {
            console.error('Failed to delete world note:', err);
            alert('Failed to delete world note: ' + err);
        }
    }

    /**
     * Restore world note
     * @param {string} id - Note ID
     */
    async restoreWorldNote(id) {
        try {
            await RestoreWorldNote(id);
            this.loadWorldNotesList();
        } catch (err) {
            console.error('Failed to restore world note:', err);
            alert('Failed to restore world note: ' + err);
        }
    }

    /**
     * Toggle deleted world notes
     */
    toggleDeletedWorldNotes() {
        this.showDeletedWorldNotes = document.getElementById('show-deleted-world-notes').checked;
        this.loadWorldNotesList();
    }
}
