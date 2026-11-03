package httpapi

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/giraycoskun/lighthouse/main/backend/internal/apidocs"
	"github.com/swaggest/swgui/v5emb"
)

type api struct {
	db        *sql.DB
	logger    *slog.Logger
	version   string
	startedAt time.Time
}

func New(db *sql.DB, logger *slog.Logger, version string) http.Handler {
	a := &api{
		db:        db,
		logger:    logger,
		version:   version,
		startedAt: time.Now().UTC(),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health/live", a.liveness)
	mux.HandleFunc("GET /api/v1/health/ready", a.readiness)
	mux.HandleFunc("GET /api/v1/status", a.status)
	mux.HandleFunc("GET /openapi.yaml", openAPI)
	mux.Handle("GET /docs/", v5emb.New("Lighthouse API", "/openapi.yaml", "/docs/"))
	mux.HandleFunc("GET /docs", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/docs/", http.StatusPermanentRedirect)
	})
	mux.HandleFunc("/", notFound)

	return a.recoverPanics(a.securityHeaders(a.logRequests(mux)))
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
