package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/austinkempa/dcc-character-sheet/internal/models"
	"github.com/austinkempa/dcc-character-sheet/internal/storage"
)

// App struct
type App struct {
	ctx     context.Context
	storage *storage.Storage
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.storage = storage.NewStorage()
}

// domReady is called after front-end resources have been loaded
func (a App) domReady(ctx context.Context) {
	// Add your action here
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here
}

// Character management methods

func (a *App) GetCharacter(id string) (*models.Character, error) {
	return a.storage.GetCharacter(id)
}

func (a *App) GetCharacters() ([]*models.Character, error) {
	return a.storage.GetCharacters()
}

func (a *App) GetDeletedCharacters() ([]*models.Character, error) {
	return a.storage.GetDeletedCharacters()
}

func (a *App) SaveCharacter(character *models.Character, note string) error {
	return a.storage.SaveCharacter(character, note)
}

func (a *App) AddHistoryNote(id string, note string) error {
	return a.storage.AddHistoryNote(id, note)
}

func (a *App) DeleteCharacter(id string) error {
	return a.storage.DeleteCharacter(id)
}

func (a *App) RestoreCharacter(id string) error {
	return a.storage.RestoreCharacter(id)
}

func (a *App) ExportHistory(id string) (string, error) {
	character, err := a.storage.GetCharacter(id)
	if err != nil {
		return "", err
	}

	filename, err := a.storage.ExportHistory(character)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("History exported to: %s", filename), nil
}

// Map management methods

func (a *App) CreateMap(name string, gridWidth, gridHeight, gridSize int) (string, error) {
	id := fmt.Sprintf("map-%d", time.Now().Unix())

	mapData := &models.Map{
		ID:         id,
		Name:       name,
		GridWidth:  gridWidth,
		GridHeight: gridHeight,
		GridSize:   gridSize,
		GridColor:  "#cccccc",
		ShowGrid:   true,
		IsActive:   true,
		Strokes:    json.RawMessage(`{}`),
		Icons:      []models.MapIcon{},
		Background: nil,
	}

	if err := a.storage.SaveMap(mapData); err != nil {
		return "", err
	}

	return id, nil
}

func (a *App) GetMap(id string) (*models.Map, error) {
	return a.storage.GetMap(id)
}

func (a *App) GetMaps() ([]*models.Map, error) {
	return a.storage.GetMaps()
}

func (a *App) GetDeletedMaps() ([]*models.Map, error) {
	return a.storage.GetDeletedMaps()
}

func (a *App) SaveMap(mapData *models.Map) error {
	return a.storage.SaveMap(mapData)
}

func (a *App) DeleteMap(id string) error {
	return a.storage.DeleteMap(id)
}

func (a *App) RestoreMap(id string) error {
	return a.storage.RestoreMap(id)
}

func (a *App) ClearMap(id string) error {
	return a.storage.ClearMap(id)
}

// World notes management methods

func (a *App) GetWorldNote(id string) (*models.WorldNote, error) {
	return a.storage.GetWorldNote(id)
}

func (a *App) GetWorldNotes() ([]*models.WorldNote, error) {
	return a.storage.GetWorldNotes()
}

func (a *App) GetDeletedWorldNotes() ([]*models.WorldNote, error) {
	return a.storage.GetDeletedWorldNotes()
}

func (a *App) SaveWorldNote(note *models.WorldNote) error {
	return a.storage.SaveWorldNote(note)
}

func (a *App) DeleteWorldNote(id string) error {
	return a.storage.DeleteWorldNote(id)
}

func (a *App) RestoreWorldNote(id string) error {
	return a.storage.RestoreWorldNote(id)
}

// Party management methods

func (a *App) CreateParty(name string, description string, characterIds []string) (string, error) {
	id := fmt.Sprintf("party-%d", time.Now().Unix())

	party := &models.Party{
		ID:           id,
		Name:         name,
		Description:  description,
		CharacterIDs: characterIds,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := a.storage.SaveParty(party); err != nil {
		return "", err
	}

	return id, nil
}

func (a *App) GetParty(id string) (*models.Party, error) {
	return a.storage.GetParty(id)
}

func (a *App) GetParties() ([]*models.Party, error) {
	return a.storage.GetParties()
}

func (a *App) GetDeletedParties() ([]*models.Party, error) {
	return a.storage.GetDeletedParties()
}

func (a *App) SaveParty(party *models.Party) error {
	party.UpdatedAt = time.Now()
	return a.storage.SaveParty(party)
}

func (a *App) DeleteParty(id string) error {
	return a.storage.DeleteParty(id)
}

func (a *App) RestoreParty(id string) error {
	return a.storage.RestoreParty(id)
}

func (a *App) GetPartyCharacters(partyId string) ([]*models.Character, error) {
	return a.storage.GetPartyCharacters(partyId)
}

// Debug logging method
func (a *App) WriteDebugLog(message string) error {
	logFile := "/tmp/dcc-undo-log.txt"
	f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	timestamp := time.Now().Format("2006-01-02 15:04:05.000")
	_, err = f.WriteString(fmt.Sprintf("%s: %s\n", timestamp, message))
	return err
}

// SaveAndOpenHTML saves an HTML file and opens it in the default browser
func (a *App) SaveAndOpenHTML(html string, characterName string) (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Create exports directory
	exportsDir := filepath.Join(homeDir, "Documents", "DCC-Character-Exports")
	if err := os.MkdirAll(exportsDir, 0755); err != nil {
		return "", err
	}

	// Create filename with timestamp
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	safeName := strings.ReplaceAll(characterName, " ", "_")
	safeName = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			return r
		}
		return -1
	}, safeName)

	filename := fmt.Sprintf("%s_%s.html", safeName, timestamp)
	filepath := filepath.Join(exportsDir, filename)

	// Write the HTML file
	if err := os.WriteFile(filepath, []byte(html), 0644); err != nil {
		return "", err
	}

	// Open the file in default browser
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", filepath)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", filepath)
	case "linux":
		cmd = exec.Command("xdg-open", filepath)
	default:
		return filepath, fmt.Errorf("unsupported platform")
	}

	if err := cmd.Start(); err != nil {
		return filepath, err
	}

	return filepath, nil
}
