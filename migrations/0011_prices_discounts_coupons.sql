CREATE TABLE IF NOT EXISTS product_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price >= 0),
  starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TEXT
);
INSERT INTO product_price_history (product_id, price) SELECT id, price FROM products WHERE NOT EXISTS (SELECT 1 FROM product_price_history h WHERE h.product_id = products.id);
CREATE INDEX IF NOT EXISTS idx_price_history_active ON product_price_history(product_id, starts_at DESC, ends_at);
CREATE TABLE IF NOT EXISTS discounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed','percent')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_discounts_product_period ON discounts(product_id, starts_at, ends_at, is_active);
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed','percent')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  min_order_amount INTEGER NOT NULL DEFAULT 0,
  max_discount INTEGER,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  usage_limit INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);
CREATE TABLE IF NOT EXISTS user_coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at TEXT,
  order_id TEXT REFERENCES orders(id),
  UNIQUE (coupon_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id, used_at);
