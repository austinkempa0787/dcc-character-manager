/**
 * Map Manager - Handles map list and basic map operations
 */
import { GetMaps, GetDeletedMaps, CreateMap, DeleteMap, RestoreMap } from '../../wailsjs/go/main/App';
import { MapList } from '../components/Maps/MapList';

export class MapManager {
    constructor() {
        this.showDeletedMaps = false;
        this.mapList = null;
    }

    /**
     * Load map list
     */
    async loadMapList() {
        if (!this.mapList) {
            this.mapList = new MapList();
        }
        await this.mapList.load(this.showDeletedMaps);
    }

    /**
     * Show map list view
     */
    showMapList() {
        document.getElementById('map-list-view').style.display = 'block';
        document.getElementById('map-edit-view').style.display = 'none';
        this.loadMapList();
        
        // Clean up Konva canvas if it exists
        if (window.konvaCanvas) {
            window.konvaCanvas.destroy();
            window.konvaCanvas = null;
        }
    }

    /**
     * Create new map
     */
    async showCreateMap() {
        try {
            const timestamp = Date.now();
            const name = `New Map ${timestamp}`;
            const mapId = await CreateMap(name, 24, 18, 50);
            if (window.editMap) {
                window.editMap(mapId);
            }
        } catch (err) {
            console.error('Failed to create map:', err);
            alert('Failed to create map: ' + err);
        }
    }

    /**
     * Delete map
     * @param {string} id - Map ID
     */
    async deleteMap(id) {
        try {
            await DeleteMap(id);
            if (window.konvaCanvas) {
                window.konvaCanvas.destroy();
                window.konvaCanvas = null;
            }
            this.showMapList();
        } catch (err) {
            console.error('Failed to delete map:', err);
            alert('Failed to delete map: ' + err);
        }
    }

    /**
     * Restore map
     * @param {string} id - Map ID
     */
    async restoreMap(id) {
        try {
            await RestoreMap(id);
            this.loadMapList();
        } catch (err) {
            console.error('Failed to restore map:', err);
            alert('Failed to restore map: ' + err);
        }
    }

    /**
     * Toggle deleted maps
     */
    toggleDeletedMaps() {
        this.showDeletedMaps = document.getElementById('show-deleted-maps').checked;
        this.loadMapList();
    }
}
