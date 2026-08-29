PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('잡화', '뷰티', '신발', '식품')),
  image_url TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS guest_sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES guest_sessions(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99),
  UNIQUE (session_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES guest_sessions(id),
  total INTEGER NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99),
  price INTEGER NOT NULL CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);

INSERT OR IGNORE INTO products (id, name, price, description, category, image_url, is_active) VALUES
  (1, '미니멀 토트백', 89000, '각을 살린 검정 가죽 토트백', '잡화', '/products/bag.jpg', 1),
  (2, '클래식 손목시계', 145000, '흰 문자판에 검정 가죽 밴드', '잡화', '/products/watch.jpg', 1),
  (3, '시트러스 오드뚜왈렛', 78000, '상쾌한 시트러스 계열 향수', '뷰티', '/products/perfume.jpg', 1),
  (4, '매트 레드 립스틱', 32000, '발색이 선명한 매트 타입', '뷰티', '/products/lipstick.jpg', 1),
  (5, '러닝화 블루', 112000, '쿠션이 두꺼운 남성 러닝화', '신발', '/products/shoe.jpg', 1),
  (6, '러닝화 핑크', 112000, '같은 모델의 여성 러닝화', '신발', '/products/shoe2.jpg', 1),
  (7, '레드와인 피노타지', 42000, '남아프리카산 드라이 레드와인', '식품', '/products/wine.jpg', 1),
  (8, '이탈리아 파스타 면', 6500, '세몰리나 100% 숏 파스타 450g', '식품', '/products/pasta.jpg', 1);
