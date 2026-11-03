package database

import (
	"context"
	"path/filepath"
	"testing"
)

func TestOpenAppliesMigrationsIdempotently(t *testing.T) {
	path := filepath.Join(t.TempDir(), "lighthouse.db")
	for range 2 {
		db, err := Open(context.Background(), path)
		if err != nil {
			t.Fatalf("Open() error = %v", err)
		}
		if err := db.Ping(); err != nil {
			t.Fatalf("Ping() error = %v", err)
		}
		db.Close()
	}

	db, err := Open(context.Background(), path)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&count); err != nil {
		t.Fatalf("count migrations: %v", err)
	}
	if count != 2 {
		t.Fatalf("migration count = %d, want 2", count)
	}

	var applicationsTable bool
	if err := db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'applications')
	`).Scan(&applicationsTable); err != nil {
		t.Fatalf("check applications table: %v", err)
	}
	if !applicationsTable {
		t.Fatal("applications table was not created")
	}
}
