package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/austinkempa/dcc-character-sheet/internal/models"
)

// Party methods

func (s *Storage) GetParty(id string) (*models.Party, error) {
	filename := filepath.Join(s.baseDir, partiesDir, fmt.Sprintf("%s.json", id))

	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var party models.Party
	if err := json.Unmarshal(data, &party); err != nil {
		return nil, err
	}

	return &party, nil
}

func (s *Storage) GetParties() ([]*models.Party, error) {
	return s.getPartiesFiltered(true)
}

func (s *Storage) GetDeletedParties() ([]*models.Party, error) {
	return s.getPartiesFiltered(false)
}

func (s *Storage) getPartiesFiltered(active bool) ([]*models.Party, error) {
	dir := filepath.Join(s.baseDir, partiesDir)

	files, err := os.ReadDir(dir)
	if err != nil {
		return []*models.Party{}, nil
	}

	var parties []*models.Party
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(dir, file.Name()))
		if err != nil {
			continue
		}

		var party models.Party
		if err := json.Unmarshal(data, &party); err != nil {
			continue
		}

		if party.IsActive == active {
			parties = append(parties, &party)
		}
	}

	return parties, nil
}

func (s *Storage) SaveParty(party *models.Party) error {
	filename := filepath.Join(s.baseDir, partiesDir, fmt.Sprintf("%s.json", party.ID))

	data, err := json.MarshalIndent(party, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
}

func (s *Storage) DeleteParty(id string) error {
	party, err := s.GetParty(id)
	if err != nil {
		return err
	}

	party.IsActive = false
	return s.SaveParty(party)
}

func (s *Storage) RestoreParty(id string) error {
	party, err := s.GetParty(id)
	if err != nil {
		return err
	}

	party.IsActive = true
	return s.SaveParty(party)
}

// GetPartyCharacters returns all characters in a party
func (s *Storage) GetPartyCharacters(partyId string) ([]*models.Character, error) {
	party, err := s.GetParty(partyId)
	if err != nil {
		return nil, err
	}

	var characters []*models.Character
	for _, charId := range party.CharacterIDs {
		char, err := s.GetCharacter(charId)
		if err != nil {
			// Skip characters that don't exist or can't be loaded
			continue
		}
		characters = append(characters, char)
	}

	return characters, nil
}
