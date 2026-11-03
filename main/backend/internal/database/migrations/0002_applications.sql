CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    runtime TEXT NOT NULL CHECK (runtime IN ('docker', 'systemd')),
    internal_address TEXT,
    external_address TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (internal_address IS NOT NULL OR external_address IS NOT NULL)
);

CREATE INDEX applications_name_idx ON applications (name);
