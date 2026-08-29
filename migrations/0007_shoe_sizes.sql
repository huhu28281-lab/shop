ALTER TABLE cart_items ADD COLUMN shoe_size INTEGER CHECK (shoe_size IS NULL OR shoe_size BETWEEN 220 AND 280);
ALTER TABLE order_items ADD COLUMN shoe_size INTEGER CHECK (shoe_size IS NULL OR shoe_size BETWEEN 220 AND 280);
