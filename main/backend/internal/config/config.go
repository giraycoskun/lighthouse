package config

import (
	"fmt"
	"os"
	"time"
)

const (
	defaultAddress         = ":8080"
	defaultDatabasePath    = "data/lighthouse.db"
	defaultShutdownTimeout = 10 * time.Second
)

type Config struct {
	Address         string
	DatabasePath    string
	ShutdownTimeout time.Duration
}

func FromEnv() (Config, error) {
	cfg := Config{
		Address:         envOrDefault("LIGHTHOUSE_ADDRESS", defaultAddress),
		DatabasePath:    envOrDefault("LIGHTHOUSE_DATABASE_PATH", defaultDatabasePath),
		ShutdownTimeout: defaultShutdownTimeout,
	}

	if value := os.Getenv("LIGHTHOUSE_SHUTDOWN_TIMEOUT"); value != "" {
		duration, err := time.ParseDuration(value)
		if err != nil || duration <= 0 {
			return Config{}, fmt.Errorf("LIGHTHOUSE_SHUTDOWN_TIMEOUT must be a positive duration: %q", value)
		}
		cfg.ShutdownTimeout = duration
	}

	if cfg.Address == "" {
		return Config{}, fmt.Errorf("LIGHTHOUSE_ADDRESS must not be empty")
	}
	if cfg.DatabasePath == "" {
		return Config{}, fmt.Errorf("LIGHTHOUSE_DATABASE_PATH must not be empty")
	}

	return cfg, nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
