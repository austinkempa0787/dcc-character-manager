/**
 * Map Editor - Handles map editing, canvas, and tools
 */
import { GetMap, SaveMap } from '../../wailsjs/go/main/App';
import { KonvaMapCanvas } from '../utils/KonvaMapCanvas';

export class MapEditor {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.currentMap = null;
        this.konvaCanvas = null;
        this.iconImages = {};
        this.selectedIconData = null;
        this.spacePressed = false;
        this.originalTool = null;
        
        this.setupKeyboardShortcuts();
    }

    /**
     * Edit a map
     * @param {string} id - Map ID
     */
    async editMap(id) {
        try {
            this.currentMap = await GetMap(id);
            
            document.getElementById('map-list-view').style.display = 'none';
            document.getElementById('map-edit-view').style.display = 'block';
            
            // Populate form
            document.getElementById('map-name').value = this.currentMap.name;
            document.getElementById('grid-size').value = this.currentMap.gridSize || 50;
            document.getElementById('show-grid').checked = this.currentMap.showGrid !== false;
            
            // Initialize Konva canvas
            if (!this.konvaCanvas) {
                this.konvaCanvas = new KonvaMapCanvas();
                this.konvaCanvas.initialize('map-canvas-container', () => this.autoSaveMap());
            }
            
            this.konvaCanvas.currentMap = this.currentMap;
            
            // Set initial tool and update UI
            this.konvaCanvas.setTool('pen');
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[data-tool="pen"]')?.classList.add('active');
            
            // Set initial stroke color
            const colorInput = document.getElementById('stroke-color');
            if (colorInput) {
                colorInput.value = '#000000';
                this.konvaCanvas.setStrokeColor('#000000');
            }
            
            // Draw grid
            this.konvaCanvas.drawGrid(
                this.currentMap.gridSize || 50,
                this.currentMap.gridColor || '#cccccc',
                this.currentMap.showGrid !== false
            );
            
            // Load background if exists
            if (this.currentMap.background) {
                await this.loadBackgroundImage(this.currentMap.background);
            }
            
            // Load icons
            await this.loadIcons();
            
            // Load existing strokes and icons
            if (this.currentMap.strokes && this.currentMap.strokes !== '{}') {
                this.konvaCanvas.loadFromJSON(
                    this.currentMap.strokes,
                    this.currentMap.icons || [],
                    this.iconImages
                );
            } else if (this.currentMap.icons && this.currentMap.icons.length > 0) {
                this.konvaCanvas.loadFromJSON('{}', this.currentMap.icons, this.iconImages);
            }
            
            // Initialize undo/redo history
            this.konvaCanvas.initializeHistory();
            
        } catch (err) {
            console.error('Failed to load map:', err);
            alert('Failed to load map: ' + err);
        }
    }

    /**
     * Load background image
     * @param {*} bgData - Background data
     */
    async loadBackgroundImage(bgData) {
        document.getElementById('background-controls').style.display = 'block';
    }

    /**
     * Load icons
     */
    async loadIcons() {
        this.iconImages = {};
        window.iconCategories = {};
        
        // Dynamically import icon files
        const iconModules = import.meta.glob('/src/assets/icons/dungeon/**/*.png', { eager: true });
        
        for (const path in iconModules) {
            const filename = path.split('/').pop();
            const iconCategory = path.split('/').slice(-2)[0];
            
            const img = new Image();
            img.src = iconModules[path].default;
            await new Promise((resolve) => {
                img.onload = resolve;
            });
            
            this.iconImages[filename] = img;
            window.iconCategories[filename] = iconCategory;
        }
        
        // Populate icon category buttons
        const categoriesEl = document.getElementById('icon-categories');
        if (categoriesEl) {
            const loadedCategories = [...new Set(Object.values(window.iconCategories))];
            
            categoriesEl.innerHTML = `
                <button class="category-btn active" onclick="window.mapEditor.filterIcons('all')">All</button>
                ${loadedCategories.map(cat => 
                    `<button class="category-btn" onclick="window.mapEditor.filterIcons('${cat}')">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>`
                ).join('')}
            `;
        }
        
        // Show all icons initially
        this.filterIcons('all');
    }

    /**
     * Filter icons by category
     * @param {string} category - Category name
     */
    filterIcons(category) {
        const paletteEl = document.getElementById('icon-palette');
        
        // Update active category button
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        if (event?.target) {
            event.target.classList.add('active');
        }
        
        let iconsToShow = Object.entries(this.iconImages);
        
        if (category !== 'all') {
            iconsToShow = iconsToShow.filter(([filename]) => {
                return window.iconCategories[filename] === category;
            });
        }
        
        paletteEl.innerHTML = iconsToShow.map(([filename, img]) => {
            const displayName = filename.replace('.png', '').replace(/([A-Z])/g, ' $1').trim();
            return `
                <div class="icon-item" data-icon="${filename}" onclick="window.mapEditor.selectIcon('${filename}')" title="${displayName}">
                    <img src="${img.src}" alt="${displayName}">
                </div>
            `;
        }).join('');
    }

    /**
     * Select an icon
     * @param {string} filename - Icon filename
     */
    selectIcon(filename) {
        // Remove previous selection
        document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
        
        // Highlight selected icon
        const selectedItem = document.querySelector(`.icon-item[data-icon="${filename}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        this.selectedIconData = {
            id: `icon-${Date.now()}`,
            filename: filename,
            category: window.iconCategories[filename] || 'dungeon',
            rotation: 0,
            isActive: true,
        };
        
        // Enable icon placement mode
        this.konvaCanvas.setIconPlacementCallback((x, y) => {
            if (this.selectedIconData && this.iconImages[filename]) {
                this.konvaCanvas.addIcon(this.iconImages[filename], x, y, this.selectedIconData);
                this.autoSaveMap();
                
                // Remove selection highlight after placing
                document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
            }
            this.konvaCanvas.setIconPlacementCallback(null);
            this.selectedIconData = null;
        });
    }

    /**
     * Select a tool
     * @param {string} tool - Tool name
     */
    selectTool(tool) {
        if (this.konvaCanvas) {
            this.konvaCanvas.setTool(tool);
        }
        
        // Update active button
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        if (event?.target) {
            event.target.classList.add('active');
        }
        
        // Show/hide icon palette
        const iconSection = document.querySelector('.icon-section');
        const colorControl = document.getElementById('color-control');
        const penWidthControl = document.getElementById('pen-width-control');
        const eraserWidthControl = document.getElementById('eraser-width-control');
        const undoRedoControls = document.getElementById('undo-redo-controls');
        
        if (tool === 'icon') {
            if (iconSection) iconSection.style.display = 'block';
            if (colorControl) colorControl.style.display = 'none';
            if (penWidthControl) penWidthControl.style.display = 'none';
            if (eraserWidthControl) eraserWidthControl.style.display = 'none';
            if (undoRedoControls) undoRedoControls.style.display = 'none';
        } else {
            if (iconSection) iconSection.style.display = 'none';
            if (colorControl) colorControl.style.display = 'block';
            if (penWidthControl) penWidthControl.style.display = 'block';
            if (eraserWidthControl) eraserWidthControl.style.display = 'block';
            if (undoRedoControls) undoRedoControls.style.display = 'flex';
        }
    }

    /**
     * Handle color change
     */
    handleColorChange() {
        const color = document.getElementById('stroke-color')?.value;
        if (this.konvaCanvas && color) {
            this.konvaCanvas.setStrokeColor(color);
        }
    }

    /**
     * Handle stroke width change
     */
    handleStrokeWidthChange() {
        const width = document.getElementById('stroke-width')?.value;
        const display = document.getElementById('stroke-width-value');
        if (display) display.textContent = width;
        if (this.konvaCanvas && width) {
            this.konvaCanvas.setStrokeWidth(parseInt(width));
        }
    }

    /**
     * Handle eraser width change
     */
    handleEraserWidthChange() {
        const width = document.getElementById('eraser-width')?.value;
        const display = document.getElementById('eraser-width-value');
        if (display) display.textContent = width;
        if (this.konvaCanvas && width) {
            this.konvaCanvas.setEraserWidth(parseInt(width));
        }
    }

    /**
     * Undo drawing
     */
    undoDrawing() {
        if (this.konvaCanvas) {
            this.konvaCanvas.undo();
        }
    }

    /**
     * Redo drawing
     */
    redoDrawing() {
        if (this.konvaCanvas) {
            this.konvaCanvas.redo();
        }
    }

    /**
     * Update grid size
     */
    updateGridSize() {
        const size = parseInt(document.getElementById('grid-size')?.value);
        if (this.konvaCanvas && this.currentMap && size) {
            this.currentMap.gridSize = size;
            this.konvaCanvas.currentMap = this.currentMap;
            this.konvaCanvas.drawGrid(
                size,
                this.currentMap.gridColor || '#cccccc',
                this.currentMap.showGrid !== false
            );
            this.autoSaveMap();
        }
    }

    /**
     * Toggle grid
     */
    toggleGrid() {
        if (this.konvaCanvas) {
            this.konvaCanvas.toggleGrid();
            if (this.currentMap) {
                this.currentMap.showGrid = !this.currentMap.showGrid;
                this.autoSaveMap();
            }
        }
    }

    /**
     * Clear map drawing
     */
    clearMapDrawing() {
        if (confirm('Clear all drawing? This cannot be undone.')) {
            if (this.konvaCanvas) {
                this.konvaCanvas.clearDrawing();
            }
        }
    }

    /**
     * Handle background upload
     * @param {Event} event - Upload event
     */
    handleBackgroundUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        document.getElementById('background-controls').style.display = 'block';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                if (this.konvaCanvas) {
                    this.konvaCanvas.setBackgroundImage(img, 0.5, 1, 0, 0);
                    this.autoSaveMap();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Remove background
     */
    removeBackground() {
        if (this.konvaCanvas) {
            this.konvaCanvas.setBackgroundImage(null);
            document.getElementById('background-controls').style.display = 'none';
            this.autoSaveMap();
        }
    }

    /**
     * Auto-save map
     */
    async autoSaveMap() {
        if (!this.currentMap) return;
        
        this.currentMap.name = document.getElementById('map-name')?.value || this.currentMap.name;
        
        // Export Konva canvas data
        if (this.konvaCanvas) {
            const exported = this.konvaCanvas.exportToJSON();
            this.currentMap.strokes = exported.strokes;
            this.currentMap.icons = exported.icons;
        }
        
        try {
            await SaveMap(this.currentMap);
            console.log('Map saved');
        } catch (err) {
            console.error('Failed to save map:', err);
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (this.konvaCanvas && this.currentMap) {
                // Undo/Redo
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undoDrawing();
                    return;
                }
                if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    this.redoDrawing();
                    return;
                }
            }
            
            // Spacebar for pan
            if (e.code === 'Space' && !this.spacePressed && this.konvaCanvas && this.currentMap) {
                const activeElement = document.activeElement;
                const isTyping = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable
                );
                
                if (!isTyping) {
                    e.preventDefault();
                    this.spacePressed = true;
                    this.originalTool = this.konvaCanvas.currentTool;
                    this.konvaCanvas.setTool('pan');
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.spacePressed && this.konvaCanvas && this.originalTool) {
                e.preventDefault();
                this.spacePressed = false;
                this.konvaCanvas.setTool(this.originalTool);
                this.originalTool = null;
            }
        });
    }

    /**
     * Destroy editor
     */
    destroy() {
        if (this.konvaCanvas) {
            this.konvaCanvas.destroy();
            this.konvaCanvas = null;
        }
    }
}
