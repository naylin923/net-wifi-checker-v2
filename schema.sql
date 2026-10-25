CREATE TABLE IF NOT EXISTS vouchers (
  code TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',
  period TEXT,
  expired_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);