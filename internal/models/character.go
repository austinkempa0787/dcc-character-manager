package models

import "time"

// Character represents a DCC character
type Character struct {
	ID                   string           `json:"id"`
	Name                 string           `json:"name"`
	Occupation           string           `json:"occupation"`
	Level                int              `json:"level"`
	Class                string           `json:"class"`
	ClassDescription     string           `json:"classDescription"`
	Alignment            int              `json:"alignment"` // 0=Neutral, 1=Lawful, 2=Chaotic
	MaxHealth            int              `json:"maxHealth"`
	CurrentHealth        int              `json:"currentHealth"`
	CurrentExperience    int              `json:"currentExperience"`
	ExperienceNeeded     int              `json:"experienceNeeded"`
	ArmorClass           int              `json:"armorClass"`
	TotalExperience      int              `json:"totalExperience"`
	Speed                int              `json:"speed"`
	Initiative           int              `json:"initiative"`
	IsActive             bool             `json:"isActive"`
	Strength             Attribute        `json:"strength"`
	Agility              Attribute        `json:"agility"`
	Stamina              Attribute        `json:"stamina"`
	Personality          Attribute        `json:"personality"`
	Intelligence         Attribute        `json:"intelligence"`
	Luck                 Attribute        `json:"luck"`
	Saves                Saves            `json:"saves"`
	Notes                string           `json:"notes"`
	Equipment            []Equipment      `json:"equipment"`
	Abilities            []Ability        `json:"abilities"`
	Classes              []Class          `json:"classes"`
	Tables               []Table          `json:"tables"`
	ActionDice           string           `json:"actionDice"`
	Attack               int              `json:"attack"`
	CritDice             string           `json:"critDice"`
	CritTable            string           `json:"critTable"`
	MeleeAttackBonus     int              `json:"meleeAttackBonus"`
	MeleeDamageBonus     int              `json:"meleeDamageBonus"`
	MissileAttackBonus   int              `json:"missileAttackBonus"`
	MissileDamageBonus   int              `json:"missileDamageBonus"`
	History              []HistoryEntry   `json:"history"`
}

// Attribute represents a character attribute with base and temporary values
type Attribute struct {
	Base      int `json:"base"`
	Temporary int `json:"temporary"`
}

// Saves represents saving throws
type Saves struct {
	Reflex    int `json:"reflex"`
	Fortitude int `json:"fortitude"`
	Willpower int `json:"willpower"`
}

// Equipment represents an equipment item
type Equipment struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Quantity      int     `json:"quantity"`
	Weight        float64 `json:"weight"`
	Value         float64 `json:"value"`
	Category      string  `json:"category"`
	Equipped      bool    `json:"equipped"`
	ACBonus       int     `json:"acBonus"`
	ReflexSave    int     `json:"reflexSave"`
	FortitudeSave int     `json:"fortitudeSave"`
	WillpowerSave int     `json:"willpowerSave"`
	DamageDice    string  `json:"damageDice"`    // For weapons
	AttackBonus   int     `json:"attackBonus"`   // For weapons
	Description   string  `json:"description"`
	IsActive      bool    `json:"isActive"`
}

// Ability represents a character ability or spell
type Ability struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"` // spell, ability, trait, etc.
	PageNumber  string `json:"pageNumber"`
	IsActive    bool   `json:"isActive"`
}

// Class represents a character class
type Class struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Level       int    `json:"level"`
	Description string `json:"description"`
	IsActive    bool   `json:"isActive"`
}

// HistoryEntry represents a change in the character's history
type HistoryEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Changes   []string  `json:"changes"`
	Note      string    `json:"note"`
}

// Table represents a custom table for the character
type Table struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Number      string `json:"number"`
	Dice        string `json:"dice"`
	IsActive    bool   `json:"isActive"`
}
