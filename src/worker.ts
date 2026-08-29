import { compare, hash } from 'bcryptjs';

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
const AUTH_COOKIE = 'shop_auth';

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

function authCookie(token: string): string { return `${AUTH_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/`; }

async function authContext(request: Request, env: Env): Promise<{ userId: number; sessionId: string; name: string; email: string } | null> {
  const token = parseCookies(request)[AUTH_COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare(`SELECT a.user_id, a.session_id, u.name, u.email FROM auth_sessions a JOIN users u ON u.id = a.user_id WHERE a.token = ? AND a.expires_at > datetime('now')`).bind(token).first<{ user_id: number; session_id: string; name: string; email: string }>();
  return row ? { userId: row.user_id, sessionId: row.session_id, name: row.name, email: row.email } : null;
}

async function requireAuth(request: Request, env: Env): Promise<{ userId: number; sessionId: string; name: string; email: string } | Response> {
  const auth = await authContext(request, env);
  return auth ?? errorResponse('로그인이 필요합니다.', 401);
}

function clearAuthCookie(): string { return `${AUTH_COOKIE}=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/`; }

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
  const conditions = ['p.is_active = 1'];
  const values: string[] = [];
  if (category) { conditions.push('cat.name = ?'); values.push(category); }
  if (queryText?.trim()) { conditions.push('(p.name LIKE ? OR p.description LIKE ? OR cat.name LIKE ?)'); const term = `%${queryText.trim()}%`; values.push(term, term, term); }
  const query = `SELECT p.id, p.name, p.price, p.description, cat.name AS category, p.image_url FROM products p JOIN categories cat ON cat.id = p.category_id WHERE ${conditions.join(' AND ')} ORDER BY p.id`;
  const result = await env.DB.prepare(query).bind(...values).all<Product>();
  return responseJson({ products: result.results });
}

async function productDetail(env: Env, id: number): Promise<Response> {
  const product = await env.DB.prepare(
    'SELECT p.id, p.name, p.price, p.description, cat.name AS category, p.image_url FROM products p JOIN categories cat ON cat.id = p.category_id WHERE p.id = ? AND p.is_active = 1',
  ).bind(id).first<Product>();
  return product ? responseJson({ product }) : errorResponse('상품을 찾을 수 없습니다.', 404);
}

async function readCart(env: Env, sessionId: string): Promise<CartRow[]> {
  const result = await env.DB.prepare(`
    SELECT p.id, p.name, p.price, p.description, cat.name AS category, p.image_url, p.is_active,
           c.qty, (p.price * c.qty) AS line_total
    FROM cart_items c JOIN products p ON p.id = c.product_id JOIN categories cat ON cat.id = p.category_id
    WHERE c.session_id = ? ORDER BY c.id
  `).bind(sessionId).all<CartRow>();
  return result.results;
}

async function createAuthSession(env: Env, userId: number): Promise<{ token: string; sessionId: string }> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO guest_sessions (id) VALUES (?)').bind(sessionId).run();
  await env.DB.prepare("INSERT INTO auth_sessions (token, user_id, session_id, expires_at) VALUES (?, ?, ?, datetime('now', '+30 days'))").bind(token, userId, sessionId).run();
  return { token, sessionId };
}

async function register(env: Env, request: Request): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('잘못된 요청 출처입니다.', 403);
  const body = await jsonBody(request); const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''; const name = typeof body?.name === 'string' ? body.name.trim() : ''; const password = typeof body?.password === 'string' ? body.password : '';
  if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 8) return errorResponse('이메일, 이름과 8자 이상의 비밀번호를 입력하세요.', 400);
  const passwordHash = await hash(password, 12);
  try { const result = await env.DB.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').bind(email, name, passwordHash).run(); const userId = Number(result.meta.last_row_id); const session = await createAuthSession(env, userId); return responseJson({ user: { email, name } }, 201, { 'set-cookie': authCookie(session.token) }); } catch { return errorResponse('이미 가입된 이메일입니다.', 409); }
}

async function login(env: Env, request: Request): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('잘못된 요청 출처입니다.', 403);
  const body = await jsonBody(request); const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''; const password = typeof body?.password === 'string' ? body.password : '';
  const user = await env.DB.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').bind(email).first<{ id: number; email: string; name: string; password_hash: string }>();
  if (!user || !(await compare(password, user.password_hash))) return errorResponse('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
  const session = await createAuthSession(env, user.id); return responseJson({ user: { email: user.email, name: user.name } }, 200, { 'set-cookie': authCookie(session.token) });
}

async function logout(env: Env, request: Request): Promise<Response> { const token = parseCookies(request)[AUTH_COOKIE]; if (token) await env.DB.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run(); return responseJson({ ok: true }, 200, { 'set-cookie': clearAuthCookie() }); }

async function me(env: Env, request: Request): Promise<Response> { const auth = await requireAuth(request, env); if (auth instanceof Response) return auth; return responseJson({ user: { email: auth.email, name: auth.name } }); }
async function forgotPassword(env: Env, request: Request): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('잘못된 요청 출처입니다.', 403);
  const body = await jsonBody(request); const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^\S+@\S+\.\S+$/.test(email)) return errorResponse('올바른 이메일을 입력하세요.', 400);
  // 토큰 생성·저장은 준비되어 있지만, 이메일 발송 공급자 연결 전에는 재설정 링크를 노출하지 않는다.
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();
  if (user) { const token = crypto.randomUUID() + crypto.randomUUID(); await env.DB.prepare("INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))").bind(token, user.id).run(); }
  return errorResponse('비밀번호 재설정 이메일 발송 서비스가 아직 설정되지 않았습니다.', 503);
}

async function cartResponse(env: Env, request: Request): Promise<Response> {
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const items = await readCart(env, auth.sessionId);
  const total = items.reduce((sum, item) => sum + item.line_total, 0);
  return responseJson({ items, total });
}

async function addCart(env: Env, request: Request): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const body = await jsonBody(request);
  const productId = integer(body?.productId);
  const qty = integer(body?.qty);
  if (productId === null || qty === null || qty < 1 || qty > 99) return errorResponse('수량은 1에서 99 사이여야 합니다.', 400);
  const product = await env.DB.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').bind(productId).first<{ id: number }>();
  if (!product) return errorResponse('상품을 찾을 수 없습니다.', 404);
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const existing = await env.DB.prepare('SELECT qty FROM cart_items WHERE session_id = ? AND product_id = ?').bind(auth.sessionId, productId).first<{ qty: number }>();
  if ((existing?.qty ?? 0) + qty > 99) return errorResponse('상품 수량은 99개를 초과할 수 없습니다.', 409);
  if (existing) {
    await env.DB.prepare('UPDATE cart_items SET qty = qty + ? WHERE session_id = ? AND product_id = ?').bind(qty, auth.sessionId, productId).run();
  } else {
    await env.DB.prepare('INSERT INTO cart_items (session_id, product_id, qty) VALUES (?, ?, ?)').bind(auth.sessionId, productId, qty).run();
  }
  return responseJson({ items: await readCart(env, auth.sessionId) });
}

async function updateCart(env: Env, request: Request, productId: number): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const body = await jsonBody(request);
  const qty = integer(body?.qty);
  if (qty === null || qty < 1 || qty > 99) return errorResponse('수량은 1에서 99 사이여야 합니다.', 400);
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const result = await env.DB.prepare('UPDATE cart_items SET qty = ? WHERE session_id = ? AND product_id = ?').bind(qty, auth.sessionId, productId).run();
  if (!result.meta.changes) return errorResponse('장바구니 항목을 찾을 수 없습니다.', 404);
  return responseJson({ items: await readCart(env, auth.sessionId) });
}

async function deleteCart(env: Env, request: Request, productId: number): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  await env.DB.prepare('DELETE FROM cart_items WHERE session_id = ? AND product_id = ?').bind(auth.sessionId, productId).run();
  return responseJson({ items: await readCart(env, auth.sessionId) });
}

async function createOrder(env: Env, request: Request): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const items = await readCart(env, auth.sessionId);
  if (!items.length) return errorResponse('장바구니가 비어 있습니다.', 400);
  if (items.some((item) => item.is_active === 0 || item.qty < 1 || item.qty > 99)) return errorResponse('주문할 수 없는 상품이 있습니다.', 409);
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const orderId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('INSERT INTO orders (id, session_id, total, status) VALUES (?, ?, ?, \'pending\')').bind(orderId, auth.sessionId, total),
    ...items.map((item) => env.DB.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, qty, price) VALUES (?, ?, ?, ?, ?)',
    ).bind(orderId, item.id, item.name, item.qty, item.price)),
    env.DB.prepare('DELETE FROM cart_items WHERE session_id = ?').bind(auth.sessionId),
  ];
  await env.DB.batch(statements);
  return responseJson({ order: { id: orderId, total, status: 'pending', items } }, 201);
}

async function getOrder(env: Env, request: Request, orderId: string): Promise<Response> {
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const order = await env.DB.prepare(
    'SELECT id, total, status, created_at FROM orders WHERE id = ? AND session_id = ?',
  ).bind(orderId, auth.sessionId).first<{ id: string; total: number; status: string; created_at: string }>();
  if (!order) return errorResponse('주문을 찾을 수 없습니다.', 404);
  const items = await env.DB.prepare(`
    SELECT oi.product_id AS id, oi.product_name AS name, oi.price, oi.qty,
           (oi.price * oi.qty) AS line_total, p.image_url
    FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? ORDER BY oi.id
  `).bind(orderId).all();
  return responseJson({ order: { ...order, items: items.results } });
}

async function listOrders(env: Env, request: Request): Promise<Response> {
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const result = await env.DB.prepare('SELECT id, total, status, created_at FROM orders WHERE session_id = ? ORDER BY created_at DESC').bind(auth.sessionId).all();
  return responseJson({ orders: result.results });
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[1] === 'auth') {
    if (parts[2] === 'register' && request.method === 'POST') return register(env, request);
    if (parts[2] === 'login' && request.method === 'POST') return login(env, request);
    if (parts[2] === 'logout' && request.method === 'POST') return logout(env, request);
    if (parts[2] === 'me' && request.method === 'GET') return me(env, request);
    if (parts[2] === 'forgot-password' && request.method === 'POST') return forgotPassword(env, request);
  }
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
    if (parts.length === 2 && request.method === 'GET') return listOrders(env, request);
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
