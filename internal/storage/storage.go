package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/austinkempa/dcc-character-sheet/internal/history"
	"github.com/austinkempa/dcc-character-sheet/internal/models"
)

const (
	characterDir  = "character-sheets"
	mapsDir       = "maps"
	worldNotesDir = "world-notes"
	partiesDir    = "parties"
)

type Storage struct {
	baseDir         string
	changeDetector  *history.ChangeDetector
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
	os.MkdirAll(filepath.Join(baseDir, partiesDir), 0755)

	return &Storage{
		baseDir:        baseDir,
		changeDetector: history.NewChangeDetector(),
	}
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
	logFile := "/tmp/dcc-hp-save-log.txt"
	f, _ := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if f != nil {
		defer f.Close()
		timestamp := time.Now().Format("2006-01-02 15:04:05.000")
		f.WriteString(fmt.Sprintf("\n%s: SaveCharacter called for %s\n", timestamp, character.ID))
		f.WriteString(fmt.Sprintf("  Incoming HP: %d\n", character.CurrentHealth))
		f.WriteString(fmt.Sprintf("  Note: '%s'\n", note))
	}

	// Load existing character if it exists
	existingChar, err := s.GetCharacter(character.ID)
	if err == nil {
		if f != nil {
			f.WriteString(fmt.Sprintf("  Existing HP from disk: %d\n", existingChar.CurrentHealth))
		}

		// Compare and generate history
		changes := s.changeDetector.DetectCharacterChanges(existingChar, character)

		if f != nil {
			f.WriteString(fmt.Sprintf("  Changes detected: %d\n", len(changes)))
			for i, change := range changes {
				f.WriteString(fmt.Sprintf("    %d: %s\n", i, change))
			}
		}

		if len(changes) > 0 {
			historyEntry := models.HistoryEntry{
				Timestamp: time.Now(),
				Changes:   changes,
				Note:      note,
			}
			character.History = append(existingChar.History, historyEntry)
			if f != nil {
				f.WriteString(fmt.Sprintf("  History entry created! Total history entries: %d\n", len(character.History)))
			}
		} else {
			character.History = existingChar.History
			if f != nil {
				f.WriteString(fmt.Sprintf("  NO CHANGES - history unchanged. Total entries: %d\n", len(character.History)))
			}
		}
	} else {
		if f != nil {
			f.WriteString(fmt.Sprintf("  Error loading existing char: %v\n", err))
		}
	}

	filename := filepath.Join(s.baseDir, characterDir, fmt.Sprintf("%s.json", character.ID))

	data, err := json.MarshalIndent(character, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
}

func (s *Storage) AddHistoryNote(id string, note string) error {
	// Load existing character
	character, err := s.GetCharacter(id)
	if err != nil {
		return err
	}

	// Create a manual history entry with no changes
	historyEntry := models.HistoryEntry{
		Timestamp: time.Now(),
		Changes:   []string{},
		Note:      note,
	}

	character.History = append(character.History, historyEntry)

	// Save the character
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

// Note: Change detection methods have been moved to internal/history/change_detector.go
