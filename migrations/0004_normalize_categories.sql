PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
INSERT OR IGNORE INTO categories (name) SELECT DISTINCT category FROM products;

CREATE TABLE products_new (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  image_url TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);
INSERT INTO products_new (id, name, price, description, category_id, image_url, is_active)
  SELECT p.id, p.name, p.price, p.description, c.id, p.image_url, p.is_active
  FROM products p JOIN categories c ON c.name = p.category;
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_session_created ON orders(session_id, created_at DESC);
