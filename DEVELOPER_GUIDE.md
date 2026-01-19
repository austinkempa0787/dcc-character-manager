# Quick Reference - New File Structure

## Where to Find Things Now

### Character Features
**File:** `frontend/src/managers/CharacterManager.js`
- Create/Edit/Delete characters
- Character form population
- Auto-save logic
- History tracking
- HP change handling

### Equipment
**File:** `frontend/src/managers/EquipmentManager.js`
- Add/Remove equipment
- Equipment types (weapon, armor, item)
- Weight calculations
- Equipped tracking
- Equipment filters

### Abilities
**File:** `frontend/src/managers/AbilityManager.js`
- Add/Remove abilities
- Ability types (spell, ability, other)
- Page number tracking
- Ability filters

### Character Classes
**File:** `frontend/src/managers/ClassManager.js`
- Add/Remove classes
- Class levels
- Class descriptions

### Tables
**File:** `frontend/src/managers/TableManager.js`
- Add/Remove custom tables
- Table dice configuration

### Maps (List)
**File:** `frontend/src/managers/MapManager.js`
- Create/Delete maps
- Map list display
- Toggle deleted maps

### Maps (Editing)
**File:** `frontend/src/managers/MapEditor.js`
- Canvas editing
- Drawing tools (pen, eraser, shapes)
- Icon placement
- Undo/Redo
- Grid controls
- Keyboard shortcuts

### World Notes
**File:** `frontend/src/managers/WorldNotesManager.js`
- Create/Edit/Delete notes
- Note content management

### Calculations
**File:** `frontend/src/utils/calculations.js`
- DCC modifier calculations
- Attribute modifiers
- Calculated values (AC, saves with bonuses)
- Equipment data collection

### HTML Export
**File:** `frontend/src/utils/exportHTML.js`
- Character sheet HTML generation
- Export with history filtering

### Auto-Resize
**File:** `frontend/src/utils/autoResize.js`
- Text input auto-sizing
- Textarea auto-height

### Backend Change Detection
**File:** `internal/history/change_detector.go`
- Character change comparison
- Equipment change detection
- Ability change detection
- Class change detection

---

## How to Add New Features

### Adding a New Character Field
1. Add to `internal/models/character.go`
2. Add form field to HTML
3. Add to `CharacterManager.populateForm()`
4. Add to `CharacterManager.autoSaveCharacter()`
5. Add change detection to `change_detector.go` if needed

### Adding a New Equipment Type
1. Update type options in `EquipmentManager.addEquipmentItemToDOM()`
2. Add type-specific fields if needed
3. Update `collectEquipment()` to handle new fields

### Adding a New Map Tool
1. Add button to HTML with `onclick="selectTool('newtool')"`
2. Add case in `MapEditor.selectTool()`
3. Add drawing logic to `KonvaMapCanvas.js`

### Adding a New Manager
1. Create file in `frontend/src/managers/`
2. Export class with constructor
3. Import in `main.js`
4. Initialize and expose to window
5. Add global functions as needed

---

## Common Tasks

### Debugging Auto-Save
- Check `CharacterManager.scheduleAutoSave()` - 1 second delay
- Check `CharacterManager.autoSaveCharacter()` - actual save
- Check browser console for errors

### Debugging Change Detection
- Check `internal/history/change_detector.go`
- Check `storage.go` integration
- Look for debug logs in `/tmp/dcc-hp-save-log.txt`

### Debugging Map Issues
- Check `MapEditor.js` for tool logic
- Check `KonvaMapCanvas.js` for canvas operations
- Check browser console for Konva errors

### Adding Debug Logging
JavaScript:
```javascript
console.log('[ManagerName] Message', data);
```

Go:
```go
fmt.Printf("[PackageName] Message: %v\n", data)
```

---

## Pattern to Follow

### Manager Pattern (Frontend)
```javascript
export class NewManager {
    constructor(dependency) {
        this.dependency = dependency;
        this.state = initialState;
    }
    
    async loadData() {
        // Load from backend
    }
    
    addItem() {
        // Add item logic
    }
    
    removeItem(id) {
        // Remove item logic
    }
    
    collectData() {
        // Collect from form
        return data;
    }
}
```

### Using Manager in main.js
```javascript
import { NewManager } from './managers/NewManager';

const newManager = new NewManager(dependency);
window.newManager = newManager;

window.addItem = () => newManager.addItem();
```

---

## File Size Guidelines

- **Manager files:** 100-400 lines (single responsibility)
- **Utility files:** 40-200 lines (focused functions)
- **Main.js:** <300 lines (initialization only)

If a file exceeds these, consider splitting further.

---

## Questions?

Refer to:
- `REFACTORING_PLAN.md` - Full refactoring details
- `REFACTORING_COMPLETE.md` - Testing guide
- `TESTING_GUIDE.md` - This file
- Original backup: `main-original-backup.js`
