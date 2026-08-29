PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS product_metrics (
  product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  sales_qty INTEGER NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  rating_avg REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO product_metrics (product_id) SELECT id FROM products;
CREATE INDEX IF NOT EXISTS idx_product_metrics_sales ON product_metrics(sales_qty DESC);

CREATE TABLE IF NOT EXISTS shipping_policies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0 CHECK (fee >= 0),
  free_over INTEGER NOT NULL DEFAULT 0 CHECK (free_over >= 0),
  estimated_days TEXT NOT NULL
);
INSERT OR IGNORE INTO shipping_policies (id, name, fee, free_over, estimated_days) VALUES (1, '기본 배송', 0, 0, '영업일 기준 2~5일');
ALTER TABLE products ADD COLUMN shipping_policy_id INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_item_id INTEGER NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, is_visible, created_at DESC);
