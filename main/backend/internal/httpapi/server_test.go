package httpapi

import (
	"bytes"
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

func TestCreateAndListApplications(t *testing.T) {
	db, err := database.Open(context.Background(), filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer target.Close()

	handler := New(db, slog.New(slog.NewTextHandler(io.Discard, nil)), "test")
	payload := []byte(`{"name":"Home Assistant","runtime":"docker","internal_address":"` + target.URL + `","external_address":null}`)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/applications", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("create status = %d, want 201; body = %s", recorder.Code, recorder.Body.String())
	}
	var created application
	if err := json.NewDecoder(recorder.Body).Decode(&created); err != nil {
		t.Fatalf("decode created application: %v", err)
	}
	if created.Name != "Home Assistant" || created.Runtime != "docker" {
		t.Fatalf("created application = %#v", created)
	}
	if created.Status.State != "online" || created.Status.ReachableAddress == nil {
		t.Fatalf("created status = %#v, want online", created.Status)
	}

	request = httptest.NewRequest(http.MethodGet, "/api/v1/applications", nil)
	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("list status = %d, want 200; body = %s", recorder.Code, recorder.Body.String())
	}
	var listed struct {
		Applications []application `json:"applications"`
	}
	if err := json.NewDecoder(recorder.Body).Decode(&listed); err != nil {
		t.Fatalf("decode applications: %v", err)
	}
	if len(listed.Applications) != 1 || listed.Applications[0].Status.State != "online" {
		t.Fatalf("listed applications = %#v", listed.Applications)
	}
}

func TestCreateApplicationValidatesInput(t *testing.T) {
	db, err := database.Open(context.Background(), filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("database.Open() error = %v", err)
	}
	defer db.Close()

	handler := New(db, slog.New(slog.NewTextHandler(io.Discard, nil)), "test")
	tests := []struct {
		name    string
		payload string
		code    string
	}{
		{"missing address", `{"name":"Grafana","runtime":"docker"}`, "address_required"},
		{"invalid runtime", `{"name":"Grafana","runtime":"binary","internal_address":"http://grafana.local"}`, "invalid_runtime"},
		{"invalid scheme", `{"name":"Grafana","runtime":"systemd","internal_address":"file:///etc/passwd"}`, "invalid_internal_address"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/v1/applications", strings.NewReader(test.payload))
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, request)
			if recorder.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status = %d, want 422; body = %s", recorder.Code, recorder.Body.String())
			}
			var response struct {
				Error struct {
					Code string `json:"code"`
				} `json:"error"`
			}
			if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if response.Error.Code != test.code {
				t.Fatalf("error code = %q, want %q", response.Error.Code, test.code)
			}
		})
	}
}
