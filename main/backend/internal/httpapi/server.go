package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"runtime/debug"
	"strings"
	"time"

	"github.com/giraycoskun/lighthouse/main/backend/internal/apidocs"
	"github.com/swaggest/swgui/v5emb"
)

type api struct {
	db        *sql.DB
	logger    *slog.Logger
	version   string
	startedAt time.Time
	client    *http.Client
}

type application struct {
	ID              int64             `json:"id"`
	Name            string            `json:"name"`
	Runtime         string            `json:"runtime"`
	InternalAddress *string           `json:"internal_address"`
	ExternalAddress *string           `json:"external_address"`
	CreatedAt       string            `json:"created_at"`
	Status          applicationStatus `json:"status"`
}

type applicationStatus struct {
	State            string  `json:"state"`
	CheckedAt        string  `json:"checked_at"`
	ReachableAddress *string `json:"reachable_address"`
}

type createApplicationRequest struct {
	Name            string  `json:"name"`
	Runtime         string  `json:"runtime"`
	InternalAddress *string `json:"internal_address"`
	ExternalAddress *string `json:"external_address"`
}

func New(db *sql.DB, logger *slog.Logger, version string) http.Handler {
	a := &api{
		db:        db,
		logger:    logger,
		version:   version,
		startedAt: time.Now().UTC(),
		client:    &http.Client{Timeout: 3 * time.Second},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health/live", a.liveness)
	mux.HandleFunc("GET /api/v1/health/ready", a.readiness)
	mux.HandleFunc("GET /api/v1/status", a.status)
	mux.HandleFunc("GET /api/v1/applications", a.listApplications)
	mux.HandleFunc("POST /api/v1/applications", a.createApplication)
	mux.HandleFunc("GET /openapi.yaml", openAPI)
	mux.Handle("GET /docs/", v5emb.New("Lighthouse API", "/openapi.yaml", "/docs/"))
	mux.HandleFunc("GET /docs", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/docs/", http.StatusPermanentRedirect)
	})
	mux.HandleFunc("/", notFound)

	return a.recoverPanics(a.securityHeaders(a.logRequests(mux)))
}

func (a *api) listApplications(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT id, name, runtime, internal_address, external_address, created_at
		FROM applications
		ORDER BY name COLLATE NOCASE, id
	`)
	if err != nil {
		a.logger.Error("list applications", "error", err)
		writeError(w, http.StatusInternalServerError, "database_error", "applications could not be loaded")
		return
	}
	defer rows.Close()

	applications := make([]application, 0)
	for rows.Next() {
		app, err := scanApplication(rows)
		if err != nil {
			a.logger.Error("scan application", "error", err)
			writeError(w, http.StatusInternalServerError, "database_error", "applications could not be loaded")
			return
		}
		applications = append(applications, app)
	}
	if err := rows.Err(); err != nil {
		a.logger.Error("iterate applications", "error", err)
		writeError(w, http.StatusInternalServerError, "database_error", "applications could not be loaded")
		return
	}

	for index := range applications {
		applications[index].Status = a.checkApplication(r.Context(), applications[index])
	}
	writeJSON(w, http.StatusOK, map[string]any{"applications": applications})
}

func (a *api) createApplication(w http.ResponseWriter, r *http.Request) {
	var input createApplicationRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "request body must be valid JSON")
		return
	}
	if err := ensureSingleJSONValue(decoder); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "request body must contain one JSON object")
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Runtime = strings.ToLower(strings.TrimSpace(input.Runtime))
	if input.Name == "" || len(input.Name) > 120 {
		writeError(w, http.StatusUnprocessableEntity, "invalid_name", "name must contain between 1 and 120 characters")
		return
	}
	if input.Runtime != "docker" && input.Runtime != "systemd" {
		writeError(w, http.StatusUnprocessableEntity, "invalid_runtime", "runtime must be docker or systemd")
		return
	}

	var err error
	if input.InternalAddress, err = normalizeAddress(input.InternalAddress); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid_internal_address", err.Error())
		return
	}
	if input.ExternalAddress, err = normalizeAddress(input.ExternalAddress); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid_external_address", err.Error())
		return
	}
	if input.InternalAddress == nil && input.ExternalAddress == nil {
		writeError(w, http.StatusUnprocessableEntity, "address_required", "provide an internal address, an external address, or both")
		return
	}

	var app application
	err = a.db.QueryRowContext(r.Context(), `
		INSERT INTO applications (name, runtime, internal_address, external_address)
		VALUES (?, ?, ?, ?)
		RETURNING id, name, runtime, internal_address, external_address, created_at
	`, input.Name, input.Runtime, input.InternalAddress, input.ExternalAddress).Scan(
		&app.ID, &app.Name, &app.Runtime, &app.InternalAddress, &app.ExternalAddress, &app.CreatedAt,
	)
	if err != nil {
		a.logger.Error("create application", "error", err)
		writeError(w, http.StatusInternalServerError, "database_error", "application could not be created")
		return
	}

	app.Status = a.checkApplication(r.Context(), app)
	writeJSON(w, http.StatusCreated, app)
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanApplication(row rowScanner) (application, error) {
	var app application
	err := row.Scan(&app.ID, &app.Name, &app.Runtime, &app.InternalAddress, &app.ExternalAddress, &app.CreatedAt)
	return app, err
}

func normalizeAddress(value *string) (*string, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	address := strings.TrimSpace(*value)
	parsed, err := url.ParseRequestURI(address)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.User != nil {
		return nil, errors.New("address must be a valid HTTP or HTTPS URL without embedded credentials")
	}
	if parsed.Fragment != "" {
		return nil, errors.New("address must not contain a URL fragment")
	}
	return &address, nil
}

func ensureSingleJSONValue(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		if err == nil {
			return errors.New("unexpected JSON value")
		}
		return err
	}
	return nil
}

func (a *api) checkApplication(ctx context.Context, app application) applicationStatus {
	status := applicationStatus{State: "offline", CheckedAt: time.Now().UTC().Format(time.RFC3339Nano)}
	for _, address := range []*string{app.InternalAddress, app.ExternalAddress} {
		if address == nil {
			continue
		}
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, *address, nil)
		if err != nil {
			continue
		}
		request.Header.Set("User-Agent", "Lighthouse/1.0 status-check")
		response, err := a.client.Do(request)
		if err != nil {
			continue
		}
		response.Body.Close()
		if response.StatusCode < http.StatusInternalServerError {
			status.State = "online"
			status.ReachableAddress = address
			return status
		}
	}
	return status
}

func (a *api) liveness(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *api) readiness(w http.ResponseWriter, r *http.Request) {
	if err := a.db.PingContext(r.Context()); err != nil {
		a.logger.Error("readiness check failed", "error", err)
		writeError(w, http.StatusServiceUnavailable, "not_ready", "a required dependency is unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"checks": map[string]string{"database": "ok"},
	})
}

func (a *api) status(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"service":      "lighthouse",
		"version":      a.version,
		"status":       "ok",
		"started_at":   a.startedAt,
		"current_time": time.Now().UTC(),
	})
}

func openAPI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(apidocs.OpenAPI)
}

func notFound(w http.ResponseWriter, _ *http.Request) {
	writeError(w, http.StatusNotFound, "not_found", "the requested resource was not found")
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}

func (a *api) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		next.ServeHTTP(w, r)
	})
}

func (a *api) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r)
		a.logger.Info("request", "method", r.Method, "path", r.URL.Path, "duration", time.Since(started))
	})
}

func (a *api) recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				a.logger.Error("request panic", "panic", recovered, "stack", string(debug.Stack()))
				writeError(w, http.StatusInternalServerError, "internal_error", "an internal error occurred")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
