CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS visitor_total (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
);
INSERT OR IGNORE INTO visitor_total (id, total) VALUES (1, 0);
CREATE TRIGGER IF NOT EXISTS count_new_visitor AFTER INSERT ON visitors
BEGIN
  UPDATE visitor_total SET total = total + 1 WHERE id = 1;
END;
