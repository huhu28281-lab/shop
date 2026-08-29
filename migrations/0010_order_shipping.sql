ALTER TABLE orders ADD COLUMN subtotal INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0);
ALTER TABLE orders ADD COLUMN shipping_fee INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0);
ALTER TABLE orders ADD COLUMN recipient_name TEXT;
ALTER TABLE orders ADD COLUMN recipient_phone TEXT;
ALTER TABLE orders ADD COLUMN shipping_address TEXT;
UPDATE orders SET subtotal = total WHERE subtotal = 0;
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
