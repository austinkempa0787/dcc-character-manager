package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/austinkempa/dcc-character-sheet/internal/models"
)

// WorldNote methods

func (s *Storage) GetWorldNote(id string) (*models.WorldNote, error) {
	filename := filepath.Join(s.baseDir, worldNotesDir, fmt.Sprintf("%s.json", id))
	
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	
	var note models.WorldNote
	if err := json.Unmarshal(data, &note); err != nil {
		return nil, err
	}
	
	return &note, nil
}

func (s *Storage) GetWorldNotes() ([]*models.WorldNote, error) {
	return s.getWorldNotesFiltered(true)
}

func (s *Storage) GetDeletedWorldNotes() ([]*models.WorldNote, error) {
	return s.getWorldNotesFiltered(false)
}

func (s *Storage) getWorldNotesFiltered(active bool) ([]*models.WorldNote, error) {
	dir := filepath.Join(s.baseDir, worldNotesDir)
	
	files, err := os.ReadDir(dir)
	if err != nil {
		return []*models.WorldNote{}, nil
	}
	
	var notes []*models.WorldNote
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".json") {
			continue
		}
		
		data, err := os.ReadFile(filepath.Join(dir, file.Name()))
		if err != nil {
			continue
		}
		
		var note models.WorldNote
		if err := json.Unmarshal(data, &note); err != nil {
			continue
		}
		
		if note.IsActive == active {
			notes = append(notes, &note)
		}
	}
	
	return notes, nil
}

func (s *Storage) SaveWorldNote(note *models.WorldNote) error {
	filename := filepath.Join(s.baseDir, worldNotesDir, fmt.Sprintf("%s.json", note.ID))
	
	data, err := json.MarshalIndent(note, "", "  ")
	if err != nil {
		return err
	}
	
	return os.WriteFile(filename, data, 0644)
}

func (s *Storage) DeleteWorldNote(id string) error {
	note, err := s.GetWorldNote(id)
	if err != nil {
		return err
	}
	
	note.IsActive = false
	return s.SaveWorldNote(note)
}

func (s *Storage) RestoreWorldNote(id string) error {
	note, err := s.GetWorldNote(id)
	if err != nil {
		return err
	}
	
	note.IsActive = true
	return s.SaveWorldNote(note)
}
