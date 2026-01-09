import Konva from 'konva';

export class KonvaMapCanvas {
    constructor() {
        this.stage = null;
        this.backgroundLayer = null;
        this.gridLayer = null;
        this.drawingLayer = null;
        this.iconLayer = null;
        this.currentMap = null;
        this.currentTool = 'pen';
        this.isDrawing = false;
        this.currentLine = null;
        this.currentShape = null;
        this.strokeColor = '#000000';
        this.strokeWidth = 2;
        this.eraserWidth = 10; // Separate eraser width
        this.onSave = null; // Callback for auto-save
        this.history = []; // Undo history
        this.historyStep = -1; // Current position in history
        this.maxHistorySize = 50; // Max undo steps
        this.isRestoring = false; // Flag to prevent saving during undo/redo
        this.selectedIcon = null; // Track currently selected icon
    }

    initialize(containerId, onSaveCallback) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        // Clear any existing canvas
        container.innerHTML = '';

        // Create Konva stage
        this.stage = new Konva.Stage({
            container: containerId,
            width: 1200,
            height: 900,
            draggable: true, // Enable pan by dragging
        });
        
        // Set white background by default
        this.stage.container().style.backgroundColor = '#ffffff';

        // Create layers (order matters - bottom to top)
        this.backgroundLayer = new Konva.Layer();
        this.gridLayer = new Konva.Layer();
        this.drawingLayer = new Konva.Layer();
        this.iconLayer = new Konva.Layer();

        this.stage.add(this.backgroundLayer);
        this.stage.add(this.gridLayer);
        this.stage.add(this.drawingLayer);
        this.stage.add(this.iconLayer);

        this.onSave = onSaveCallback;

        // Setup event handlers
        this.setupEventHandlers();
        
        // Setup zoom
        this.setupZoom();

        console.log('[KonvaMapCanvas] Initialized');
    }

    setIconPlacementCallback(callback) {
        this.onIconPlacement = callback;
        
        // Update cursor
        if (callback) {
            this.stage.container().style.cursor = 'crosshair';
            this.stage.draggable(false); // Disable dragging while placing icons
        } else {
            this.stage.container().style.cursor = this.getCursorForTool(this.currentTool);
            this.stage.draggable(this.currentTool === 'pan');
        }
    }

    getCursorForTool(tool) {
        switch(tool) {
            case 'eraser': 
                // Circle cursor representing eraser size (scaled to be visible)
                const size = Math.max(16, Math.min(this.eraserWidth * 2, 40)); // Scale to visible size
                return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Ccircle cx='${size/2}' cy='${size/2}' r='${size/2 - 1}' fill='rgba(255,255,255,0.3)' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E") ${size/2} ${size/2}, auto`;
            case 'pan': return 'grab';
            default: return 'crosshair';
        }
    }

    setupZoom() {
        const scaleBy = 1.1;

        this.stage.on('wheel', (e) => {
            e.evt.preventDefault();

            const oldScale = this.stage.scaleX();
            const pointer = this.stage.getPointerPosition();

            const mousePointTo = {
                x: (pointer.x - this.stage.x()) / oldScale,
                y: (pointer.y - this.stage.y()) / oldScale,
            };

            const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

            // Limit zoom (0.25x min for better grid coverage, 5x max)
            const clampedScale = Math.max(0.25, Math.min(5, newScale));

            this.stage.scale({ x: clampedScale, y: clampedScale });

            const newPos = {
                x: pointer.x - mousePointTo.x * clampedScale,
                y: pointer.y - mousePointTo.y * clampedScale,
            };

            this.stage.position(newPos);
            this.stage.batchDraw();
        });
    }

    setupEventHandlers() {
        this.stage.on('mousedown touchstart', (e) => this.handleDrawStart(e));
        this.stage.on('mousemove touchmove', (e) => this.handleDrawMove(e));
        this.stage.on('mouseup touchend', () => this.handleDrawEnd());
        
        // Click on stage to deselect icons
        this.stage.on('click tap', (e) => {
            // Only deselect if clicking on stage background (not on icons or drawing)
            if (e.target === this.stage) {
                if (this.selectedIcon) {
                    this.deselectIcon(this.selectedIcon);
                    this.selectedIcon = null;
                }
            }
        });
    }

    setTool(tool) {
        console.log('[KonvaMapCanvas] Setting tool:', tool);
        this.currentTool = tool;
        this.stage.container().style.cursor = this.getCursorForTool(tool);
        
        // Enable/disable stage dragging based on tool
        this.setPanMode(tool === 'pan');
    }

    setPanMode(enabled) {
        this.stage.draggable(enabled);
        if (enabled) {
            this.stage.container().style.cursor = 'grab';
        }
    }

    setStrokeColor(color) {
        this.strokeColor = color;
    }

    setStrokeWidth(width) {
        this.strokeWidth = width;
    }

    drawGrid(size, color = '#cccccc', show = true) {
        this.gridLayer.destroyChildren();

        if (!show) {
            this.gridLayer.batchDraw();
            return;
        }

        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();

        // Draw grid extending far beyond visible area (for zoom out)
        const gridExtension = 3; // Multiplier for grid size
        const extendedWidth = stageWidth * gridExtension;
        const extendedHeight = stageHeight * gridExtension;
        const offsetX = -(extendedWidth - stageWidth) / 2;
        const offsetY = -(extendedHeight - stageHeight) / 2;

        // Vertical lines
        for (let i = 0; i <= extendedWidth / size; i++) {
            const line = new Konva.Line({
                points: [offsetX + i * size, offsetY, offsetX + i * size, offsetY + extendedHeight],
                stroke: color,
                strokeWidth: 1,
            });
            this.gridLayer.add(line);
        }

        // Horizontal lines
        for (let i = 0; i <= extendedHeight / size; i++) {
            const line = new Konva.Line({
                points: [offsetX, offsetY + i * size, offsetX + extendedWidth, offsetY + i * size],
                stroke: color,
                strokeWidth: 1,
            });
            this.gridLayer.add(line);
        }

        this.gridLayer.batchDraw();
    }

    toggleGrid() {
        const isVisible = this.gridLayer.visible();
        this.gridLayer.visible(!isVisible);
        this.gridLayer.batchDraw();
    }

    setBackgroundImage(image, opacity = 0.5, scale = 1, offsetX = 0, offsetY = 0) {
        this.backgroundLayer.destroyChildren();

        if (!image) {
            this.backgroundLayer.batchDraw();
            return;
        }

        const konvaImage = new Konva.Image({
            image: image,
            x: offsetX,
            y: offsetY,
            scaleX: scale,
            scaleY: scale,
            opacity: opacity,
        });

        this.backgroundLayer.add(konvaImage);
        this.backgroundLayer.batchDraw();
    }

    handleDrawStart(e) {
        // If placing icons, trigger the callback and return
        if (this.onIconPlacement) {
            const pos = this.stage.getPointerPosition();
            const transform = this.stage.getAbsoluteTransform().copy().invert();
            const localPos = transform.point(pos);
            this.onIconPlacement(localPos.x, localPos.y);
            return;
        }
        
        // Don't draw if we're in pan mode
        if (this.currentTool === 'pan') return;

        // If clicking on an icon or shape, don't start drawing
        const target = e.target;
        if (target !== this.stage && target.getLayer() === this.iconLayer) {
            return;
        }

        this.isDrawing = true;
        const pos = this.stage.getPointerPosition();
        const transform = this.stage.getAbsoluteTransform().copy().invert();
        const localPos = transform.point(pos);

        console.log('[KonvaMapCanvas] Draw start:', this.currentTool, 'at', localPos);

        if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
            const width = this.currentTool === 'eraser' ? this.eraserWidth : this.strokeWidth;
            this.currentLine = new Konva.Line({
                stroke: this.currentTool === 'eraser' ? '#ffffff' : this.strokeColor,
                strokeWidth: width,
                globalCompositeOperation: this.currentTool === 'eraser' ? 'destination-out' : 'source-over',
                lineCap: 'round',
                lineJoin: 'round',
                points: [localPos.x, localPos.y],
            });
            this.drawingLayer.add(this.currentLine);
        } else if (this.currentTool === 'select') {
            // Select mode - check if clicking on a shape to delete
            const clickedShape = e.target;
            if (clickedShape !== this.stage && clickedShape.getLayer() === this.drawingLayer) {
                this.saveHistory();
                clickedShape.destroy();
                this.drawingLayer.batchDraw();
                if (this.onSave) this.onSave();
            }
            return;
        } else {
            // For shapes, store start position
            this.shapeStartPos = localPos;
        }
    }

    handleDrawMove(e) {
        if (!this.isDrawing || this.currentTool === 'pan') return;

        const pos = this.stage.getPointerPosition();
        const transform = this.stage.getAbsoluteTransform().copy().invert();
        const localPos = transform.point(pos);

        if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
            const newPoints = this.currentLine.points().concat([localPos.x, localPos.y]);
            this.currentLine.points(newPoints);
            this.drawingLayer.batchDraw();
        } else if (this.shapeStartPos) {
            // Remove previous preview shape
            if (this.currentShape) {
                this.currentShape.destroy();
            }

            const width = localPos.x - this.shapeStartPos.x;
            const height = localPos.y - this.shapeStartPos.y;

            if (this.currentTool === 'rectangle') {
                this.currentShape = new Konva.Rect({
                    x: this.shapeStartPos.x,
                    y: this.shapeStartPos.y,
                    width: width,
                    height: height,
                    stroke: this.strokeColor,
                    strokeWidth: this.strokeWidth,
                });
            } else if (this.currentTool === 'circle') {
                const radius = Math.sqrt(width * width + height * height);
                this.currentShape = new Konva.Circle({
                    x: this.shapeStartPos.x,
                    y: this.shapeStartPos.y,
                    radius: radius,
                    stroke: this.strokeColor,
                    strokeWidth: this.strokeWidth,
                });
            } else if (this.currentTool === 'line') {
                this.currentShape = new Konva.Line({
                    points: [this.shapeStartPos.x, this.shapeStartPos.y, localPos.x, localPos.y],
                    stroke: this.strokeColor,
                    strokeWidth: this.strokeWidth,
                    lineCap: 'round',
                });
            }

            if (this.currentShape) {
                this.drawingLayer.add(this.currentShape);
                this.drawingLayer.batchDraw();
            }
        }
    }

    handleDrawEnd() {
        if (!this.isDrawing) return;

        this.isDrawing = false;
        
        // Save history AFTER completing the stroke/shape
        if (!this.isRestoring) {
            this.saveHistory();
        }
        
        this.currentLine = null;
        this.currentShape = null;
        this.shapeStartPos = null;

        // Trigger auto-save (but not during undo/redo)
        if (this.onSave && !this.isRestoring) {
            this.onSave();
        }
    }

    addIcon(iconImage, x, y, iconData) {
        const gridSize = this.currentMap?.gridSize || 50;
        const iconSize = gridSize * 0.8;

        // Create a group to hold the icon and rotate button
        const iconGroup = new Konva.Group({
            x: x,
            y: y,
            draggable: true,
            id: iconData.id,
        });

        // The icon image
        const konvaImage = new Konva.Image({
            image: iconImage,
            x: 0,
            y: 0,
            width: iconSize,
            height: iconSize,
            offsetX: iconSize / 2,
            offsetY: iconSize / 2,
            rotation: iconData.rotation || 0,
        });

        // Rotate button (small circle with "↻" symbol) - positioned outside top-right
        const rotateButton = new Konva.Group({
            x: iconSize / 2 + 8,
            y: -iconSize / 2 - 8,
            visible: false, // Hidden by default
        });

        const rotateCircle = new Konva.Circle({
            radius: 12,
            fill: '#4a90e2',
            stroke: '#fff',
            strokeWidth: 2,
        });

        const rotateText = new Konva.Text({
            text: '↻',
            fontSize: 16,
            fill: '#fff',
            offsetX: 5,
            offsetY: 8,
        });

        rotateButton.add(rotateCircle);
        rotateButton.add(rotateText);

        // Delete button (small circle with "×" symbol) - positioned outside top-left
        const deleteButton = new Konva.Group({
            x: -iconSize / 2 - 8,
            y: -iconSize / 2 - 8,
            visible: false, // Hidden by default
        });

        const deleteCircle = new Konva.Circle({
            radius: 12,
            fill: '#e74c3c',
            stroke: '#fff',
            strokeWidth: 2,
        });

        const deleteText = new Konva.Text({
            text: '×',
            fontSize: 20,
            fill: '#fff',
            offsetX: 6,
            offsetY: 10,
        });

        deleteButton.add(deleteCircle);
        deleteButton.add(deleteText);

        iconGroup.add(konvaImage);
        iconGroup.add(rotateButton);
        iconGroup.add(deleteButton);

        // Store icon data
        iconGroup.setAttr('iconData', iconData);

        // Selection highlight (hidden by default)
        const selectionRect = new Konva.Rect({
            x: -iconSize / 2 - 4,
            y: -iconSize / 2 - 4,
            width: iconSize + 8,
            height: iconSize + 8,
            stroke: '#4a90e2',
            strokeWidth: 3,
            dash: [5, 5],
            visible: false,
        });
        iconGroup.add(selectionRect);
        iconGroup.moveToTop(); // Move selection to bottom so image is on top

        // Click to select icon
        iconGroup.on('click tap', (e) => {
            e.cancelBubble = true; // Don't trigger stage click
            
            // Deselect previous icon
            if (this.selectedIcon && this.selectedIcon !== iconGroup) {
                this.deselectIcon(this.selectedIcon);
            }
            
            // Select this icon
            this.selectedIcon = iconGroup;
            this.selectIcon(iconGroup);
        });

        // Click rotate button to rotate 90 degrees
        rotateButton.on('click tap', (e) => {
            e.cancelBubble = true; // Don't trigger group drag
            const currentRotation = konvaImage.rotation();
            konvaImage.rotation(currentRotation + 90);
            this.iconLayer.batchDraw();
            if (this.onSave) this.onSave();
        });

        // Click delete button to remove icon
        deleteButton.on('click tap', (e) => {
            e.cancelBubble = true; // Don't trigger group drag
            if (this.selectedIcon === iconGroup) {
                this.selectedIcon = null;
            }
            iconGroup.destroy();
            this.iconLayer.batchDraw();
            if (this.onSave) this.onSave();
        });

        // Drag end - save
        iconGroup.on('dragend', () => {
            if (this.onSave) this.onSave();
        });

        this.iconLayer.add(iconGroup);
        this.iconLayer.batchDraw();

        return iconGroup;
    }

    exportToJSON() {
        console.log('[KonvaMapCanvas] Exporting to JSON');
        
        // Export drawing layer
        const drawingJSON = this.drawingLayer.toJSON();
        console.log('[KonvaMapCanvas] Drawing JSON length:', drawingJSON.length);
        
        // Export icon data
        const icons = [];
        this.iconLayer.children.forEach((iconGroup) => {
            const iconData = iconGroup.getAttr('iconData');
            const konvaImage = iconGroup.children[0]; // First child is the image
            
            icons.push({
                id: iconData.id,
                filename: iconData.filename,
                category: iconData.category,
                x: iconGroup.x(),
                y: iconGroup.y(),
                rotation: konvaImage.rotation(),
                isActive: true,
            });
        });

        console.log('[KonvaMapCanvas] Exported', icons.length, 'icons');
        
        return {
            strokes: drawingJSON,
            icons: icons,
        };
    }

    loadFromJSON(strokesJSON, icons, iconImages) {
        console.log('[KonvaMapCanvas] Loading from JSON');
        console.log('[KonvaMapCanvas] Strokes JSON type:', typeof strokesJSON);
        console.log('[KonvaMapCanvas] Icons count:', icons ? icons.length : 0);
        
        // Clear existing content
        this.drawingLayer.destroyChildren();
        this.iconLayer.destroyChildren();

        // Load strokes
        if (strokesJSON && strokesJSON !== '{}') {
            try {
                const strokeData = typeof strokesJSON === 'string' ? JSON.parse(strokesJSON) : strokesJSON;
                console.log('[KonvaMapCanvas] Parsed stroke data:', strokeData);
                
                if (strokeData && strokeData.children) {
                    strokeData.children.forEach((childData) => {
                        const shape = this.createShapeFromJSON(childData);
                        if (shape) {
                            this.drawingLayer.add(shape);
                        }
                    });
                    console.log('[KonvaMapCanvas] Loaded', strokeData.children.length, 'strokes');
                }
            } catch (err) {
                console.error('[KonvaMapCanvas] Error loading strokes:', err);
            }
        }

        // Load icons
        if (icons && icons.length > 0 && iconImages) {
            icons.forEach((iconData) => {
                if (iconData.isActive && iconImages[iconData.filename]) {
                    this.addIcon(iconImages[iconData.filename], iconData.x, iconData.y, iconData);
                }
            });
            console.log('[KonvaMapCanvas] Loaded', icons.filter(i => i.isActive).length, 'active icons');
        }

        this.drawingLayer.batchDraw();
        this.iconLayer.batchDraw();
    }

    createShapeFromJSON(data) {
        const attrs = data.attrs || {};
        
        // Reconstruct globalCompositeOperation for eraser strokes
        if (attrs.globalCompositeOperation) {
            attrs.globalCompositeOperation = attrs.globalCompositeOperation;
        }
        
        switch (data.className) {
            case 'Line':
                return new Konva.Line(attrs);
            case 'Rect':
                return new Konva.Rect(attrs);
            case 'Circle':
                return new Konva.Circle(attrs);
            default:
                console.warn('[KonvaMapCanvas] Unknown shape type:', data.className);
                return null;
        }
    }

    clearDrawing() {
        this.saveHistory();
        this.drawingLayer.destroyChildren();
        this.drawingLayer.batchDraw();
        if (this.onSave) this.onSave();
    }

    // History management for undo/redo
    saveHistory() {
        // Remove any history after current step (for redo)
        this.history = this.history.slice(0, this.historyStep + 1);
        
        // Save current drawing layer state
        const state = this.drawingLayer.toJSON();
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyStep++;
        }
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreHistory();
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreHistory();
        }
    }

    restoreHistory() {
        if (this.historyStep >= 0 && this.historyStep < this.history.length) {
            this.isRestoring = true;
            
            const state = this.history[this.historyStep];
            
            // Clear current drawing layer
            this.drawingLayer.destroyChildren();
            
            // Restore from JSON - directly parse and add children
            try {
                const parsed = JSON.parse(state);
                if (parsed.children && Array.isArray(parsed.children)) {
                    parsed.children.forEach((childData) => {
                        const child = Konva.Node.create(JSON.stringify(childData));
                        this.drawingLayer.add(child);
                    });
                }
            } catch(e) {
                console.error('Error restoring history:', e);
            }
            
            this.drawingLayer.batchDraw();
            
            // Delay the save slightly to ensure restore is complete
            setTimeout(() => {
                this.isRestoring = false;
                if (this.onSave) this.onSave();
            }, 50);
        }
    }

    // Call this when loading a map to initialize history
    initializeHistory() {
        this.history = [];
        this.historyStep = -1;
        // Save initial state
        this.saveHistory();
    }

    setEraserWidth(width) {
        this.eraserWidth = width;
    }

    selectIcon(iconGroup) {
        // Show selection highlight
        const selectionRect = iconGroup.findOne('Rect');
        if (selectionRect) {
            selectionRect.visible(true);
        }
        
        // Show rotate and delete buttons
        const rotateButton = iconGroup.children[1]; // Second child
        const deleteButton = iconGroup.children[2]; // Third child
        if (rotateButton) rotateButton.visible(true);
        if (deleteButton) deleteButton.visible(true);
        
        // Highlight the icon slightly
        const iconImage = iconGroup.children[0]; // First child
        if (iconImage) iconImage.opacity(0.9);
        
        this.iconLayer.batchDraw();
    }

    deselectIcon(iconGroup) {
        // Hide selection highlight
        const selectionRect = iconGroup.findOne('Rect');
        if (selectionRect) {
            selectionRect.visible(false);
        }
        
        // Hide rotate and delete buttons
        const rotateButton = iconGroup.children[1]; // Second child
        const deleteButton = iconGroup.children[2]; // Third child
        if (rotateButton) rotateButton.visible(false);
        if (deleteButton) deleteButton.visible(false);
        
        // Restore icon opacity
        const iconImage = iconGroup.children[0]; // First child
        if (iconImage) iconImage.opacity(1);
        
        this.iconLayer.batchDraw();
    }

    destroy() {
        if (this.stage) {
            this.stage.destroy();
        }
        this.stage = null;
        this.backgroundLayer = null;
        this.gridLayer = null;
        this.drawingLayer = null;
        this.iconLayer = null;
        this.history = [];
        this.historyStep = -1;
    }
}
