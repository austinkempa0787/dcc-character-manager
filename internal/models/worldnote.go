package models

// WorldNote represents a campaign note or entry
type WorldNote struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Content  string `json:"content"`
	Category string `json:"category"` // NPC, Location, Quest, etc.
	IsActive bool   `json:"isActive"`
}
