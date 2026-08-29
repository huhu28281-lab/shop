interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string;
  is_active?: number;
};

type CartRow = Product & { qty: number; line_total: number };

const CATEGORIES = ['잡화', '뷰티', '신발', '식품'] as const;
const SESSION_COOKIE = 'shop_session';

function responseJson(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  responseHeaders.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function errorResponse(message: string, status: number): Response {
  return responseJson({ error: message }, status);
}

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get('cookie') ?? '';
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (!key) continue;
    try { cookies[key] = decodeURIComponent(value.join('=')); } catch { cookies[key] = value.join('='); }
  }
  return cookies;
}

function sessionCookie(id: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(id)}; HttpOnly; Secure; SameSite=Lax; Path=/`;
}

async function ensureSession(request: Request, env: Env): Promise<{ id: string; setCookie?: string }> {
  const existing = parseCookies(request)[SESSION_COOKIE];
  const id = existing && /^[a-zA-Z0-9-]{20,80}$/.test(existing) ? existing : crypto.randomUUID();
  await env.DB.prepare('INSERT OR IGNORE INTO guest_sessions (id) VALUES (?)').bind(id).run();
  return { id, setCookie: existing === id ? undefined : sessionCookie(id) };
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function withCookie(response: Response, cookie?: string): Response {
  if (!cookie) return response;
  const headers = new Headers(response.headers);
  headers.append('set-cookie', cookie);
  return new Response(response.body, { status: response.status, headers });
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

async function jsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function listProducts(env: Env, category: string | null, queryText: string | null): Promise<Response> {
  if (category && !CATEGORIES.includes(category as typeof CATEGORIES[number])) {
    return errorResponse('알 수 없는 분류입니다.', 400);
  }
  const conditions = ['is_active = 1'];
  const values: string[] = [];
  if (category) { conditions.push('category = ?'); values.push(category); }
  if (queryText?.trim()) { conditions.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)'); const term = `%${queryText.trim()}%`; values.push(term, term, term); }
  const query = `SELECT id, name, price, description, category, image_url FROM products WHERE ${conditions.join(' AND ')} ORDER BY id`;
  const result = await env.DB.prepare(query).bind(...values).all<Product>();
  return responseJson({ products: result.results });
}

async function productDetail(env: Env, id: number): Promise<Response> {
  const product = await env.DB.prepare(
    'SELECT id, name, price, description, category, image_url FROM products WHERE id = ? AND is_active = 1',
  ).bind(id).first<Product>();
  return product ? responseJson({ product }) : errorResponse('상품을 찾을 수 없습니다.', 404);
}

async function readCart(env: Env, sessionId: string): Promise<CartRow[]> {
  const result = await env.DB.prepare(`
    SELECT p.id, p.name, p.price, p.description, p.category, p.image_url, p.is_active,
           c.qty, (p.price * c.qty) AS line_total
    FROM cart_items c JOIN products p ON p.id = c.product_id
    WHERE c.session_id = ? ORDER BY c.id
  `).bind(sessionId).all<CartRow>();
  return result.results;
}

async function cartResponse(env: Env, request: Request): Promise<Response> {
  const session = await ensureSession(request, env);
  const items = await readCart(env, session.id);
  const total = items.reduce((sum, item) => sum + item.line_total, 0);
  return withCookie(responseJson({ items, total }), session.setCookie);
}

async function addCart(env: Env, request: Request): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const body = await jsonBody(request);
  const productId = integer(body?.productId);
  const qty = integer(body?.qty);
  if (productId === null || qty === null || qty < 1 || qty > 99) return errorResponse('수량은 1에서 99 사이여야 합니다.', 400);
  const product = await env.DB.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').bind(productId).first<{ id: number }>();
  if (!product) return errorResponse('상품을 찾을 수 없습니다.', 404);
  const session = await ensureSession(request, env);
  const existing = await env.DB.prepare('SELECT qty FROM cart_items WHERE session_id = ? AND product_id = ?').bind(session.id, productId).first<{ qty: number }>();
  if ((existing?.qty ?? 0) + qty > 99) return errorResponse('상품 수량은 99개를 초과할 수 없습니다.', 409);
  if (existing) {
    await env.DB.prepare('UPDATE cart_items SET qty = qty + ? WHERE session_id = ? AND product_id = ?').bind(qty, session.id, productId).run();
  } else {
    await env.DB.prepare('INSERT INTO cart_items (session_id, product_id, qty) VALUES (?, ?, ?)').bind(session.id, productId, qty).run();
  }
  return withCookie(responseJson({ items: await readCart(env, session.id) }), session.setCookie);
}

async function updateCart(env: Env, request: Request, productId: number): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const body = await jsonBody(request);
  const qty = integer(body?.qty);
  if (qty === null || qty < 1 || qty > 99) return errorResponse('수량은 1에서 99 사이여야 합니다.', 400);
  const session = await ensureSession(request, env);
  const result = await env.DB.prepare('UPDATE cart_items SET qty = ? WHERE session_id = ? AND product_id = ?').bind(qty, session.id, productId).run();
  if (!result.meta.changes) return errorResponse('장바구니 항목을 찾을 수 없습니다.', 404);
  return withCookie(responseJson({ items: await readCart(env, session.id) }), session.setCookie);
}

async function deleteCart(env: Env, request: Request, productId: number): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const session = await ensureSession(request, env);
  await env.DB.prepare('DELETE FROM cart_items WHERE session_id = ? AND product_id = ?').bind(session.id, productId).run();
  return withCookie(responseJson({ items: await readCart(env, session.id) }), session.setCookie);
}

async function createOrder(env: Env, request: Request): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const session = await ensureSession(request, env);
  const items = await readCart(env, session.id);
  if (!items.length) return errorResponse('장바구니가 비어 있습니다.', 400);
  if (items.some((item) => item.is_active === 0 || item.qty < 1 || item.qty > 99)) return errorResponse('주문할 수 없는 상품이 있습니다.', 409);
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const orderId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('INSERT INTO orders (id, session_id, total, status) VALUES (?, ?, ?, \'pending\')').bind(orderId, session.id, total),
    ...items.map((item) => env.DB.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, qty, price) VALUES (?, ?, ?, ?, ?)',
    ).bind(orderId, item.id, item.name, item.qty, item.price)),
    env.DB.prepare('DELETE FROM cart_items WHERE session_id = ?').bind(session.id),
  ];
  await env.DB.batch(statements);
  return withCookie(responseJson({ order: { id: orderId, total, status: 'pending', items } }, 201), session.setCookie);
}

async function getOrder(env: Env, request: Request, orderId: string): Promise<Response> {
  const session = await ensureSession(request, env);
  const order = await env.DB.prepare(
    'SELECT id, total, status, created_at FROM orders WHERE id = ? AND session_id = ?',
  ).bind(orderId, session.id).first<{ id: string; total: number; status: string; created_at: string }>();
  if (!order) return errorResponse('주문을 찾을 수 없습니다.', 404);
  const items = await env.DB.prepare(`
    SELECT oi.product_id AS id, oi.product_name AS name, oi.price, oi.qty,
           (oi.price * oi.qty) AS line_total, p.image_url
    FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? ORDER BY oi.id
  `).bind(orderId).all();
  return withCookie(responseJson({ order: { ...order, items: items.results } }), session.setCookie);
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[1] === 'products') {
    if (parts.length === 2 && request.method === 'GET') return listProducts(env, url.searchParams.get('category'), url.searchParams.get('q'));
    if (parts.length === 3 && request.method === 'GET' && /^\d+$/.test(parts[2])) return productDetail(env, Number(parts[2]));
  }
  if (parts[1] === 'cart') {
    if (parts.length === 2 && request.method === 'GET') return cartResponse(env, request);
    if (parts.length === 2 && request.method === 'POST') return addCart(env, request);
    if (parts.length === 3 && /^\d+$/.test(parts[2])) {
      const id = Number(parts[2]);
      if (request.method === 'PATCH') return updateCart(env, request, id);
      if (request.method === 'DELETE') return deleteCart(env, request, id);
    }
  }
  if (parts[1] === 'orders') {
    if (parts.length === 2 && request.method === 'POST') return createOrder(env, request);
    if (parts.length === 3 && request.method === 'GET') return getOrder(env, request, parts[2]);
  }
  return errorResponse('요청을 찾을 수 없습니다.', 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api(request, env);
    return env.ASSETS.fetch(request);
  },
};
