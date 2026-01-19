package history

import (
	"fmt"

	"github.com/austinkempa/dcc-character-sheet/internal/models"
)

// ChangeDetector handles detection of changes between character states
type ChangeDetector struct{}

// NewChangeDetector creates a new change detector
func NewChangeDetector() *ChangeDetector {
	return &ChangeDetector{}
}

// DetectCharacterChanges compares old and new character and returns list of changes
func (cd *ChangeDetector) DetectCharacterChanges(old, new *models.Character) []string {
	var changes []string

	if old.Name != new.Name {
		changes = append(changes, fmt.Sprintf("Name changed from '%s' to '%s'", old.Name, new.Name))
	}

	if old.Level != new.Level {
		changes = append(changes, fmt.Sprintf("Level changed from %d to %d", old.Level, new.Level))
	}

	if old.CurrentHealth != new.CurrentHealth {
		diff := new.CurrentHealth - old.CurrentHealth
		if diff > 0 {
			changes = append(changes, fmt.Sprintf("Health increased by %d (%d → %d)", diff, old.CurrentHealth, new.CurrentHealth))
		} else {
			changes = append(changes, fmt.Sprintf("Health decreased by %d (%d → %d)", -diff, old.CurrentHealth, new.CurrentHealth))
		}
	}

	if old.MaxHealth != new.MaxHealth {
		changes = append(changes, fmt.Sprintf("Max health changed from %d to %d", old.MaxHealth, new.MaxHealth))
	}

	if old.TotalExperience != new.TotalExperience {
		diff := new.TotalExperience - old.TotalExperience
		changes = append(changes, fmt.Sprintf("Experience gained: %d (total: %d)", diff, new.TotalExperience))
	}

	// Attribute changes
	if old.Strength.Base != new.Strength.Base || old.Strength.Temporary != new.Strength.Temporary {
		changes = append(changes, fmt.Sprintf("Strength changed: %d/%d → %d/%d", old.Strength.Base, old.Strength.Temporary, new.Strength.Base, new.Strength.Temporary))
	}

	if old.Agility.Base != new.Agility.Base || old.Agility.Temporary != new.Agility.Temporary {
		changes = append(changes, fmt.Sprintf("Agility changed: %d/%d → %d/%d", old.Agility.Base, old.Agility.Temporary, new.Agility.Base, new.Agility.Temporary))
	}

	if old.Stamina.Base != new.Stamina.Base || old.Stamina.Temporary != new.Stamina.Temporary {
		changes = append(changes, fmt.Sprintf("Stamina changed: %d/%d → %d/%d", old.Stamina.Base, old.Stamina.Temporary, new.Stamina.Base, new.Stamina.Temporary))
	}

	if old.Personality.Base != new.Personality.Base || old.Personality.Temporary != new.Personality.Temporary {
		changes = append(changes, fmt.Sprintf("Personality changed: %d/%d → %d/%d", old.Personality.Base, old.Personality.Temporary, new.Personality.Base, new.Personality.Temporary))
	}

	if old.Intelligence.Base != new.Intelligence.Base || old.Intelligence.Temporary != new.Intelligence.Temporary {
		changes = append(changes, fmt.Sprintf("Intelligence changed: %d/%d → %d/%d", old.Intelligence.Base, old.Intelligence.Temporary, new.Intelligence.Base, new.Intelligence.Temporary))
	}

	if old.Luck.Base != new.Luck.Base || old.Luck.Temporary != new.Luck.Temporary {
		changes = append(changes, fmt.Sprintf("Luck changed: %d/%d → %d/%d", old.Luck.Base, old.Luck.Temporary, new.Luck.Base, new.Luck.Temporary))
	}

	// Equipment changes
	changes = append(changes, cd.DetectEquipmentChanges(old.Equipment, new.Equipment)...)

	// Ability changes
	changes = append(changes, cd.DetectAbilityChanges(old.Abilities, new.Abilities)...)

	// Class changes
	changes = append(changes, cd.DetectClassChanges(old.Classes, new.Classes)...)

	return changes
}

// DetectEquipmentChanges compares equipment lists and returns changes
func (cd *ChangeDetector) DetectEquipmentChanges(old, new []models.Equipment) []string {
	var changes []string

	oldMap := make(map[string]models.Equipment)
	for _, item := range old {
		oldMap[item.ID] = item
	}

	newMap := make(map[string]models.Equipment)
	for _, item := range new {
		newMap[item.ID] = item
	}

	// Check for new or modified items
	for _, newItem := range new {
		oldItem, exists := oldMap[newItem.ID]
		if !exists {
			if newItem.IsActive {
				changes = append(changes, fmt.Sprintf("Added equipment: %s", newItem.Name))
			}
		} else if oldItem.Quantity != newItem.Quantity {
			changes = append(changes, fmt.Sprintf("Equipment '%s' quantity: %d → %d", newItem.Name, oldItem.Quantity, newItem.Quantity))
		} else if oldItem.IsActive != newItem.IsActive {
			if newItem.IsActive {
				changes = append(changes, fmt.Sprintf("Equipment restored: %s", newItem.Name))
			} else {
				changes = append(changes, fmt.Sprintf("Equipment removed: %s", newItem.Name))
			}
		}
	}

	// Check for removed items
	for _, oldItem := range old {
		if _, exists := newMap[oldItem.ID]; !exists && oldItem.IsActive {
			changes = append(changes, fmt.Sprintf("Equipment removed: %s", oldItem.Name))
		}
	}

	return changes
}

// DetectAbilityChanges compares ability lists and returns changes
func (cd *ChangeDetector) DetectAbilityChanges(old, new []models.Ability) []string {
	var changes []string

	oldMap := make(map[string]models.Ability)
	for _, item := range old {
		oldMap[item.ID] = item
	}

	newMap := make(map[string]models.Ability)
	for _, item := range new {
		newMap[item.ID] = item
	}

	// Check for new or modified abilities
	for _, newItem := range new {
		oldItem, exists := oldMap[newItem.ID]
		if !exists {
			if newItem.IsActive {
				changes = append(changes, fmt.Sprintf("Added ability: %s", newItem.Name))
			}
		} else if oldItem.Name != newItem.Name {
			changes = append(changes, fmt.Sprintf("Ability renamed: '%s' → '%s'", oldItem.Name, newItem.Name))
		} else if oldItem.IsActive != newItem.IsActive {
			if newItem.IsActive {
				changes = append(changes, fmt.Sprintf("Ability restored: %s", newItem.Name))
			} else {
				changes = append(changes, fmt.Sprintf("Ability removed: %s", newItem.Name))
			}
		}
	}

	// Check for removed abilities
	for _, oldItem := range old {
		if _, exists := newMap[oldItem.ID]; !exists && oldItem.IsActive {
			changes = append(changes, fmt.Sprintf("Ability removed: %s", oldItem.Name))
		}
	}

	return changes
}

// DetectClassChanges compares class lists and returns changes
func (cd *ChangeDetector) DetectClassChanges(old, new []models.Class) []string {
	var changes []string

	oldMap := make(map[string]models.Class)
	for _, item := range old {
		oldMap[item.ID] = item
	}

	newMap := make(map[string]models.Class)
	for _, item := range new {
		newMap[item.ID] = item
	}

	// Check for new or modified classes
	for _, newItem := range new {
		oldItem, exists := oldMap[newItem.ID]
		if !exists {
			if newItem.IsActive {
				changes = append(changes, fmt.Sprintf("Added class: %s (Level %d)", newItem.Name, newItem.Level))
			}
		} else if oldItem.Name != newItem.Name {
			changes = append(changes, fmt.Sprintf("Class renamed: '%s' → '%s'", oldItem.Name, newItem.Name))
		} else if oldItem.Level != newItem.Level {
			levelDiff := newItem.Level - oldItem.Level
			if levelDiff > 0 {
				changes = append(changes, fmt.Sprintf("Class '%s' level increased by %d (%d → %d)", newItem.Name, levelDiff, oldItem.Level, newItem.Level))
			} else {
				changes = append(changes, fmt.Sprintf("Class '%s' level decreased by %d (%d → %d)", newItem.Name, -levelDiff, oldItem.Level, newItem.Level))
			}
		} else if oldItem.IsActive != newItem.IsActive {
			if newItem.IsActive {
				changes = append(changes, fmt.Sprintf("Class restored: %s", newItem.Name))
			} else {
				changes = append(changes, fmt.Sprintf("Class removed: %s", newItem.Name))
			}
		}
	}

	// Check for removed classes
	for _, oldItem := range old {
		if _, exists := newMap[oldItem.ID]; !exists && oldItem.IsActive {
			changes = append(changes, fmt.Sprintf("Class removed: %s", oldItem.Name))
		}
	}

	return changes
}
