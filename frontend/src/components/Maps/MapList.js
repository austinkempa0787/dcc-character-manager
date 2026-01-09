export class MapList {
    constructor() {
        this.maps = [];
        this.showDeleted = false;
    }

    async load(showDeleted = false) {
        this.showDeleted = showDeleted;
        const { GetMaps, GetDeletedMaps } = await import('../../../wailsjs/go/main/App');
        
        try {
            this.maps = showDeleted ? await GetDeletedMaps() : await GetMaps();
            this.render();
        } catch (err) {
            console.error('Failed to load maps:', err);
        }
    }

    render() {
        const container = document.getElementById('map-list');
        if (!container) return;

        if (!this.maps || this.maps.length === 0) {
            container.innerHTML = '<p class="empty-state">No maps yet. Create your first map!</p>';
            return;
        }

        container.innerHTML = this.maps.map(map => this.renderMapCard(map)).join('');
    }

    renderMapCard(map) {
        const deletedClass = map.isActive ? '' : 'deleted';
        const restoreButton = !map.isActive 
            ? `<button class="btn btn-small" onclick="window.restoreMap('${map.id}')">Restore</button>`
            : '';

        return `
            <div class="character-card ${deletedClass}" onclick="window.editMap('${map.id}')">
                <h3>${map.name}</h3>
                <div class="character-stats">
                    <span>Grid: ${map.gridWidth}x${map.gridHeight}</span>
                    <span>Icons: ${map.icons ? map.icons.filter(i => i.isActive).length : 0}</span>
                </div>
                ${restoreButton}
            </div>
        `;
    }

    async restore(id) {
        const { RestoreMap } = await import('../../../wailsjs/go/main/App');
        
        try {
            await RestoreMap(id);
            this.load(this.showDeleted);
        } catch (err) {
            console.error('Failed to restore map:', err);
            alert('Failed to restore map: ' + err);
        }
    }
}


