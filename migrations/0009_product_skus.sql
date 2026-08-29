CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  price_override INTEGER CHECK (price_override IS NULL OR price_override >= 0),
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);
CREATE TABLE IF NOT EXISTS variant_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE (variant_id, name)
);
ALTER TABLE cart_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id, is_active);
INSERT OR IGNORE INTO product_variants (product_id, sku, price_override, stock_qty) SELECT id, 'SKU-' || id, NULL, 999999 FROM products;
