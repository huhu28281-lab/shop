CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_metrics_rating ON product_metrics(rating_avg DESC, review_count DESC);
