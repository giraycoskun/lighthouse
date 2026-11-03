package config

import (
	"testing"
	"time"
)

func TestFromEnvDefaults(t *testing.T) {
	t.Setenv("LIGHTHOUSE_ADDRESS", "")
	t.Setenv("LIGHTHOUSE_DATABASE_PATH", "")
	t.Setenv("LIGHTHOUSE_SHUTDOWN_TIMEOUT", "")

	cfg, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv() error = %v", err)
	}
	if cfg.Address != defaultAddress {
		t.Fatalf("Address = %q, want %q", cfg.Address, defaultAddress)
	}
	if cfg.DatabasePath != defaultDatabasePath {
		t.Fatalf("DatabasePath = %q, want %q", cfg.DatabasePath, defaultDatabasePath)
	}
	if cfg.ShutdownTimeout != 10*time.Second {
		t.Fatalf("ShutdownTimeout = %s, want 10s", cfg.ShutdownTimeout)
	}
}

func TestFromEnvRejectsInvalidShutdownTimeout(t *testing.T) {
	t.Setenv("LIGHTHOUSE_SHUTDOWN_TIMEOUT", "not-a-duration")

	if _, err := FromEnv(); err == nil {
		t.Fatal("FromEnv() error = nil, want an error")
	}
}
