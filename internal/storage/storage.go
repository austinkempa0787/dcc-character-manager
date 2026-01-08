package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/austinkempa/dcc-character-sheet/internal/models"
)

const (
	characterDir  = "character-sheets"
	mapsDir       = "maps"
	worldNotesDir = "world-notes"
)

type Storage struct {
	baseDir string
}

func NewStorage() *Storage {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	baseDir := filepath.Join(homeDir, "dcc-character-sheet")

	// Create directories if they don't exist
	os.MkdirAll(filepath.Join(baseDir, characterDir), 0755)
	os.MkdirAll(filepath.Join(baseDir, mapsDir), 0755)
	os.MkdirAll(filepath.Join(baseDir, worldNotesDir), 0755)

	return &Storage{baseDir: baseDir}
}

// Character methods

func (s *Storage) GetCharacter(id string) (*models.Character, error) {
	filename := filepath.Join(s.baseDir, characterDir, fmt.Sprintf("%s.json", id))

	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var character models.Character
	if err := json.Unmarshal(data, &character); err != nil {
		return nil, err
	}

	return &character, nil
}

func (s *Storage) GetCharacters() ([]*models.Character, error) {
	return s.getCharactersFiltered(true)
}

func (s *Storage) GetDeletedCharacters() ([]*models.Character, error) {
	return s.getCharactersFiltered(false)
}

func (s *Storage) getCharactersFiltered(active bool) ([]*models.Character, error) {
	dir := filepath.Join(s.baseDir, characterDir)

	files, err := os.ReadDir(dir)
	if err != nil {
		return []*models.Character{}, nil
	}

	var characters []*models.Character
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(dir, file.Name()))
		if err != nil {
			continue
		}

		var character models.Character
		if err := json.Unmarshal(data, &character); err != nil {
			continue
		}

		if character.IsActive == active {
			characters = append(characters, &character)
		}
	}

	return characters, nil
}

func (s *Storage) SaveCharacter(character *models.Character, note string) error {
	// Load existing character if it exists
	existingChar, err := s.GetCharacter(character.ID)
	if err == nil {
		// Compare and generate history
		changes := s.detectCharacterChanges(existingChar, character)
		if len(changes) > 0 {
			historyEntry := models.HistoryEntry{
				Timestamp: time.Now(),
				Changes:   changes,
				Note:      note,
			}
			character.History = append(existingChar.History, historyEntry)
		} else {
			character.History = existingChar.History
		}
	}

	filename := filepath.Join(s.baseDir, characterDir, fmt.Sprintf("%s.json", character.ID))

	data, err := json.MarshalIndent(character, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
}

func (s *Storage) DeleteCharacter(id string) error {
	character, err := s.GetCharacter(id)
	if err != nil {
		return err
	}

	character.IsActive = false
	return s.SaveCharacter(character, "Character deleted")
}

func (s *Storage) RestoreCharacter(id string) error {
	character, err := s.GetCharacter(id)
	if err != nil {
		return err
	}

	character.IsActive = true
	return s.SaveCharacter(character, "Character restored")
}

func (s *Storage) ExportHistory(character *models.Character) (string, error) {
	var builder strings.Builder

	builder.WriteString(fmt.Sprintf("Character History: %s\n", character.Name))
	builder.WriteString(strings.Repeat("=", 80) + "\n\n")

	for _, entry := range character.History {
		builder.WriteString(fmt.Sprintf("[%s]\n", entry.Timestamp.Format("2006-01-02 15:04:05")))
		for _, change := range entry.Changes {
			builder.WriteString(fmt.Sprintf("  - %s\n", change))
		}
		if entry.Note != "" {
			builder.WriteString(fmt.Sprintf("  Note: %s\n", entry.Note))
		}
		builder.WriteString("\n")
	}

	filename := filepath.Join(s.baseDir, characterDir, fmt.Sprintf("%s-history.txt", character.ID))
	err := os.WriteFile(filename, []byte(builder.String()), 0644)

	return filename, err
}

func (s *Storage) detectCharacterChanges(old, new *models.Character) []string {
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
	changes = append(changes, s.detectEquipmentChanges(old.Equipment, new.Equipment)...)

	// Ability changes
	changes = append(changes, s.detectAbilityChanges(old.Abilities, new.Abilities)...)

	// Class changes
	changes = append(changes, s.detectClassChanges(old.Classes, new.Classes)...)

	return changes
}

func (s *Storage) detectEquipmentChanges(old, new []models.Equipment) []string {
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

func (s *Storage) detectAbilityChanges(old, new []models.Ability) []string {
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

func (s *Storage) detectClassChanges(old, new []models.Class) []string {
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
