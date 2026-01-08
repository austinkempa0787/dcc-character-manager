package models

import "encoding/json"

// Map represents a game map with canvas data
type Map struct {
	ID         string          `json:"id"`
	Name       string          `json:"name"`
	GridWidth  int             `json:"gridWidth"`
	GridHeight int             `json:"gridHeight"`
	GridSize   int             `json:"gridSize"`
	GridColor  string          `json:"gridColor"`
	ShowGrid   bool            `json:"showGrid"`
	IsActive   bool            `json:"isActive"`
	Strokes    json.RawMessage `json:"strokes"` // Konva drawing layer JSON
	Icons      []MapIcon       `json:"icons"`
	Background *MapBackground  `json:"background,omitempty"`
}

// MapIcon represents an icon placed on the map
type MapIcon struct {
	ID       string  `json:"id"`
	Filename string  `json:"filename"`
	Category string  `json:"category"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Rotation float64 `json:"rotation"`
	IsActive bool    `json:"isActive"`
}

// MapBackground represents a background image for the map
type MapBackground struct {
	Filename string  `json:"filename"`
	Opacity  float64 `json:"opacity"`
	Scale    float64 `json:"scale"`
	OffsetX  float64 `json:"offsetX"`
	OffsetY  float64 `json:"offsetY"`
}
