package storage

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// SaveCharacterImage saves an image file for a character
func (s *Storage) SaveCharacterImage(characterID string, base64Data string) (string, error) {
	// Create images directory if it doesn't exist
	imgDir := filepath.Join(s.baseDir, imagesDir)
	if err := os.MkdirAll(imgDir, 0755); err != nil {
		return "", err
	}

	// Remove data URL prefix if present (e.g., "data:image/png;base64,")
	if idx := strings.Index(base64Data, ","); idx != -1 {
		base64Data = base64Data[idx+1:]
	}

	// Decode base64 data
	imageData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", err
	}

	// Generate unique filename based on character ID
	filename := fmt.Sprintf("%s.png", characterID)
	filepath := filepath.Join(imgDir, filename)

	// Save image file
	if err := os.WriteFile(filepath, imageData, 0644); err != nil {
		return "", err
	}

	return filename, nil
}

// GetCharacterImage reads an image file for a character
func (s *Storage) GetCharacterImage(filename string) (string, error) {
	if filename == "" {
		return "", nil
	}

	filepath := filepath.Join(s.baseDir, imagesDir, filename)
	
	// Check if file exists
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		return "", nil // Return empty string if image doesn't exist
	}

	// Read image file
	imageData, err := os.ReadFile(filepath)
	if err != nil {
		return "", err
	}

	// Encode to base64 with data URL prefix
	base64Data := base64.StdEncoding.EncodeToString(imageData)
	return fmt.Sprintf("data:image/png;base64,%s", base64Data), nil
}

// DeleteCharacterImage deletes an image file for a character
func (s *Storage) DeleteCharacterImage(filename string) error {
	if filename == "" {
		return nil
	}

	filepath := filepath.Join(s.baseDir, imagesDir, filename)
	
	// Check if file exists
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		return nil // Already deleted
	}

	return os.Remove(filepath)
}
