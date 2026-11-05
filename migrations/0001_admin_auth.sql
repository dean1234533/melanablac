-- Additive security migration. Apply before deploying the updated admin.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expires ON auth_rate_limits(expires);
-- Require a fresh sign-in rather than retaining the old 14-day sessions.
DELETE FROM sessions;
