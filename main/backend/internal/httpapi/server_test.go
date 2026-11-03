package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/giraycoskun/lighthouse/main/backend/internal/database"
)

func TestPublicEndpoints(t *testing.T) {
	db, err := database.Open(context.Background(), filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	server := httptest.NewServer(New(db, slog.New(slog.NewTextHandler(io.Discard, nil)), "test-version"))
	defer server.Close()

	tests := []struct {
		path        string
		contentType string
		contains    string
	}{
		{"/api/v1/health/live", "application/json", `"status":"ok"`},
		{"/api/v1/health/ready", "application/json", `"database":"ok"`},
		{"/api/v1/status", "application/json", `"version":"test-version"`},
		{"/openapi.yaml", "application/yaml", "openapi: 3.1.0"},
		{"/docs/", "text/html", "Lighthouse API"},
	}

	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			response, err := http.Get(server.URL + test.path)
			if err != nil {
				t.Fatalf("GET %s: %v", test.path, err)
			}
			defer response.Body.Close()
			body, _ := io.ReadAll(response.Body)
			if response.StatusCode != http.StatusOK {
				t.Fatalf("status = %d, want 200; body = %s", response.StatusCode, body)
			}
			if !strings.HasPrefix(response.Header.Get("Content-Type"), test.contentType) {
				t.Fatalf("Content-Type = %q, want prefix %q", response.Header.Get("Content-Type"), test.contentType)
			}
			if !strings.Contains(string(body), test.contains) {
				t.Fatalf("body does not contain %q: %s", test.contains, body)
			}
		})
	}
}

func TestNotFoundUsesErrorEnvelope(t *testing.T) {
	db, err := database.Open(context.Background(), filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	request := httptest.NewRequest(http.MethodGet, "/missing", nil)
	recorder := httptest.NewRecorder()
	New(db, slog.New(slog.NewTextHandler(io.Discard, nil)), "test").ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", recorder.Code)
	}
	var response struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Error.Code != "not_found" {
		t.Fatalf("error code = %q, want not_found", response.Error.Code)
	}
}
