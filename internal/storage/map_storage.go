package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/austinkempa/dcc-character-sheet/internal/models"
)

// Map methods

func (s *Storage) GetMap(id string) (*models.Map, error) {
	filename := filepath.Join(s.baseDir, mapsDir, fmt.Sprintf("%s.json", id))

	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var mapData models.Map
	if err := json.Unmarshal(data, &mapData); err != nil {
		return nil, err
	}

	return &mapData, nil
}

func (s *Storage) GetMaps() ([]*models.Map, error) {
	return s.getMapsFiltered(true)
}

func (s *Storage) GetDeletedMaps() ([]*models.Map, error) {
	return s.getMapsFiltered(false)
}

func (s *Storage) getMapsFiltered(active bool) ([]*models.Map, error) {
	dir := filepath.Join(s.baseDir, mapsDir)

	files, err := os.ReadDir(dir)
	if err != nil {
		return []*models.Map{}, nil
	}

	var maps []*models.Map
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(dir, file.Name()))
		if err != nil {
			continue
		}

		var mapData models.Map
		if err := json.Unmarshal(data, &mapData); err != nil {
			continue
		}

		if mapData.IsActive == active {
			maps = append(maps, &mapData)
		}
	}

	return maps, nil
}

func (s *Storage) SaveMap(mapData *models.Map) error {
	filename := filepath.Join(s.baseDir, mapsDir, fmt.Sprintf("%s.json", mapData.ID))

	data, err := json.MarshalIndent(mapData, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
}

func (s *Storage) DeleteMap(id string) error {
	mapData, err := s.GetMap(id)
	if err != nil {
		return err
	}

	mapData.IsActive = false
	return s.SaveMap(mapData)
}

func (s *Storage) RestoreMap(id string) error {
	mapData, err := s.GetMap(id)
	if err != nil {
		return err
	}

	mapData.IsActive = true
	return s.SaveMap(mapData)
}

func (s *Storage) ClearMap(id string) error {
	mapData, err := s.GetMap(id)
	if err != nil {
		return err
	}

	// Clear the canvas but keep the map
	mapData.Strokes = json.RawMessage(`{}`)
	mapData.Icons = []models.MapIcon{}

	return s.SaveMap(mapData)
}
