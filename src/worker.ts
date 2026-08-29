import { compare, hash } from 'bcryptjs';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TOSS_CLIENT_KEY?: string;
  TOSS_SECRET_KEY?: string;
  GEMINI_API_KEY?: string;
}

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string;
  is_active?: number;
  sales_qty?: number;
  rating_avg?: number;
  review_count?: number;
  shipping_policy_id?: number;
};

type CartRow = Product & { qty: number; line_total: number; shoe_size?: number | null };

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

async function listProducts(env: Env, category: string | null, queryText: string | null, sort: string | null): Promise<Response> {
  if (category && !CATEGORIES.includes(category as typeof CATEGORIES[number])) {
    return errorResponse('알 수 없는 분류입니다.', 400);
  }
  const conditions = ['p.is_active = 1'];
  const values: string[] = [];
  if (category) { conditions.push('cat.name = ?'); values.push(category); }
  if (queryText?.trim()) { conditions.push('(p.name LIKE ? OR p.description LIKE ? OR cat.name LIKE ?)'); const term = `%${queryText.trim()}%`; values.push(term, term, term); }
  const order = sort === 'price-low' ? 'p.price ASC, p.id ASC' : sort === 'price-high' ? 'p.price DESC, p.id ASC' : sort === 'popular' ? 'm.sales_qty DESC, p.id ASC' : 'p.id ASC';
  const query = `SELECT p.id, p.name, p.price, p.description, cat.name AS category, p.image_url, m.sales_qty, m.rating_avg, m.review_count FROM products p JOIN categories cat ON cat.id = p.category_id LEFT JOIN product_metrics m ON m.product_id = p.id WHERE ${conditions.join(' AND ')} ORDER BY ${order}`;
  const result = await env.DB.prepare(query).bind(...values).all<Product>();
  return responseJson({ products: result.results });
}

async function productDetailLegacy(env: Env, id: number): Promise<Response> {
  const product = await env.DB.prepare(
    'SELECT p.id, p.name, p.price, p.description, cat.name AS category, p.image_url, p.shipping_policy_id, s.name AS shipping_name, s.fee AS shipping_fee, s.estimated_days FROM products p JOIN categories cat ON cat.id = p.category_id JOIN shipping_policies s ON s.id = p.shipping_policy_id WHERE p.id = ? AND p.is_active = 1',
  ).bind(id).first<Product>();
  return product ? responseJson({ product }) : errorResponse('상품을 찾을 수 없습니다.', 404);
}

async function productDetail(env: Env, id: number): Promise<Response> {
  const product = await env.DB.prepare('SELECT p.id, p.name, p.price, p.description, cat.name AS category, p.image_url, p.shipping_policy_id, s.name AS shipping_name, s.fee AS shipping_fee, s.estimated_days FROM products p JOIN categories cat ON cat.id = p.category_id JOIN shipping_policies s ON s.id = p.shipping_policy_id WHERE p.id = ? AND p.is_active = 1').bind(id).first<Product>();
  if (!product) return errorResponse('Product not found.', 404);
  const reviewRows = await env.DB.prepare('SELECT r.id, r.rating, r.content, r.created_at, u.name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = ? AND r.is_visible = 1 ORDER BY r.created_at DESC').bind(id).all();
  return responseJson({ product, reviews: reviewRows.results });
}

async function englishProductIntro(env: Env, request: Request, id: number): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('Invalid request origin.', 403);
  if (!env.GEMINI_API_KEY) return errorResponse('Gemini API key is not configured.', 503);
  const product = await env.DB.prepare('SELECT name, description FROM products WHERE id = ? AND is_active = 1').bind(id).first<{ name: string; description: string }>();
  if (!product) return errorResponse('Product not found.', 404);
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify({ systemInstruction: { parts: [{ text: 'Write a plain, factual English product introduction in no more than three sentences. Use only the product name and description provided. Do not invent origin, ingredients, certifications, reviews, measurements, or other facts. Do not use bullet points.' }] }, contents: [{ parts: [{ text: `Product name: ${product.name}\nDescription: ${product.description}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 120 } }) });
    if (!response.ok) return errorResponse('English introduction was unavailable.', 502);
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const introduction = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
    if (!introduction) return errorResponse('English introduction was unavailable.', 502);
    return responseJson({ introduction });
  } catch { return errorResponse('English introduction was unavailable.', 502); }
}

async function readCart(env: Env, sessionId: string): Promise<CartRow[]> {
  const result = await env.DB.prepare(`
    SELECT p.id, p.name, p.price, p.description, cat.name AS category, p.image_url, p.is_active,
           c.qty, c.shoe_size, (p.price * c.qty) AS line_total
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
  const body = await jsonBody(request); const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''; const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!/^\S+@\S+\.\S+$/.test(email) || !name) return errorResponse('이메일과 가입자 이름을 입력하세요.', 400);
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND name = ?').bind(email, name).first<{ id: number }>();
  if (!user) return errorResponse('입력한 정보와 일치하는 회원을 찾을 수 없습니다.', 404);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; const bytes = new Uint8Array(12); crypto.getRandomValues(bytes); let temporaryPassword = ''; for (const byte of bytes) temporaryPassword += chars[byte % chars.length];
  await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hash(temporaryPassword, 12), user.id).run();
  return responseJson({ temporaryPassword });
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
  const product = await env.DB.prepare('SELECT p.id, cat.name AS category FROM products p JOIN categories cat ON cat.id = p.category_id WHERE p.id = ? AND p.is_active = 1').bind(productId).first<{ id: number; category: string }>();
  if (!product) return errorResponse('상품을 찾을 수 없습니다.', 404);
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const shoeSize = integer(body?.shoeSize);
  if (product.category === '신발' && (shoeSize === null || shoeSize < 220 || shoeSize > 280)) return errorResponse('신발 사이즈를 선택하세요.', 400);
  const existing = await env.DB.prepare('SELECT qty FROM cart_items WHERE session_id = ? AND product_id = ?').bind(auth.sessionId, productId).first<{ qty: number }>();
  if ((existing?.qty ?? 0) + qty > 99) return errorResponse('상품 수량은 99개를 초과할 수 없습니다.', 409);
  if (existing) {
    await env.DB.prepare('UPDATE cart_items SET qty = qty + ?, shoe_size = ? WHERE session_id = ? AND product_id = ?').bind(qty, shoeSize, auth.sessionId, productId).run();
  } else {
    await env.DB.prepare('INSERT INTO cart_items (session_id, product_id, qty, shoe_size) VALUES (?, ?, ?, ?)').bind(auth.sessionId, productId, qty, shoeSize).run();
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
  const body = await jsonBody(request);
  const recipientName = typeof body?.recipientName === 'string' ? body.recipientName.trim() : '';
  const recipientPhone = typeof body?.recipientPhone === 'string' ? body.recipientPhone.trim() : '';
  const shippingAddress = typeof body?.shippingAddress === 'string' ? body.shippingAddress.trim() : '';
  if (!recipientName || !recipientPhone || !shippingAddress || recipientName.length > 80 || recipientPhone.length > 30 || shippingAddress.length > 300) return errorResponse('배송지 정보를 모두 입력해 주세요.', 400);
  if (!sameOrigin(request)) return errorResponse('허용되지 않은 출처입니다.', 403);
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const items = await readCart(env, auth.sessionId);
  if (!items.length) return errorResponse('장바구니가 비어 있습니다.', 400);
  if (items.some((item) => item.is_active === 0 || item.qty < 1 || item.qty > 99)) return errorResponse('주문할 수 없는 상품이 있습니다.', 409);
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const orderId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('INSERT INTO orders (id, session_id, subtotal, shipping_fee, total, status, recipient_name, recipient_phone, shipping_address) VALUES (?, ?, ?, 0, ?, \'pending\', ?, ?, ?)').bind(orderId, auth.sessionId, total, total, recipientName, recipientPhone, shippingAddress),
    ...items.map((item) => env.DB.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, qty, price, shoe_size) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(orderId, item.id, item.name, item.qty, item.price, item.shoe_size ?? null)),
    env.DB.prepare('DELETE FROM cart_items WHERE session_id = ?').bind(auth.sessionId),
    ...items.map((item) => env.DB.prepare('UPDATE product_metrics SET sales_qty = sales_qty + ?, order_count = order_count + 1, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?').bind(item.qty, item.id)),
  ];
  await env.DB.batch(statements);
  return responseJson({ order: { id: orderId, total, status: 'pending', items } }, 201);
}

async function getOrder(env: Env, request: Request, orderId: string): Promise<Response> {
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const order = await env.DB.prepare(
    'SELECT id, total, status, created_at, recipient_name, recipient_phone, shipping_address FROM orders WHERE id = ? AND session_id = ?',
  ).bind(orderId, auth.sessionId).first<{ id: string; total: number; status: string; created_at: string; recipient_name?: string; recipient_phone?: string; shipping_address?: string }>();
  if (!order) return errorResponse('주문을 찾을 수 없습니다.', 404);
  const items = await env.DB.prepare(`
    SELECT oi.product_id AS id, oi.product_name AS name, oi.price, oi.qty, oi.shoe_size,
           (oi.price * oi.qty) AS line_total, p.image_url
    FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? ORDER BY oi.id
  `).bind(orderId).all();
  const shipping = virtualShipping(order.status, order.created_at);
  return responseJson({ order: { ...order, shipping_status: shipping.status, shipping_label: shipping.label, current_location: shipping.location, items: items.results } });
}

function virtualShipping(paymentStatus: string, createdAt: string): { status: string; label: string; location: string } {
  if (paymentStatus !== 'paid') return { status: 'awaiting_payment', label: '결제 후 배송이 시작됩니다', location: '배송 정보 대기' };
  const stages = [
    { status: 'preparing', label: '배송 준비 중', location: '가상 물류센터' },
    { status: 'in_transit', label: '배송 중', location: '서울 허브 터미널' },
    { status: 'out_for_delivery', label: '배송 중', location: '고객님 지역 배송기사' },
    { status: 'delivered', label: '배송 완료', location: '배송지' },
  ];
  const elapsed = Math.max(0, Date.now() - Date.parse(createdAt));
  return stages[Math.min(stages.length - 1, Math.floor(elapsed / 15000))];
}

async function listOrders(env: Env, request: Request): Promise<Response> {
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const result = await env.DB.prepare('SELECT id, total, status, created_at FROM orders WHERE session_id = ? ORDER BY created_at DESC').bind(auth.sessionId).all<{ id: string; total: number; status: string; created_at: string }>();
  const orders = await Promise.all(result.results.map(async (order) => { const items = await env.DB.prepare('SELECT product_name, qty, shoe_size FROM order_items WHERE order_id = ? ORDER BY id').bind(order.id).all<{ product_name: string; qty: number; shoe_size?: number | null }>(); const shipping = virtualShipping(order.status, order.created_at); return { ...order, shipping_status: shipping.status, shipping_label: shipping.label, current_location: shipping.location, items: items.results }; }));
  return responseJson({ orders });
}

async function paymentConfig(env: Env): Promise<Response> { return responseJson({ clientKey: env.TOSS_CLIENT_KEY ?? '' }); }

async function confirmPayment(env: Env, request: Request): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('Invalid request origin.', 403);
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  if (!env.TOSS_SECRET_KEY) return errorResponse('Payment test secret is not configured.', 503);
  const body = await jsonBody(request); const paymentKey = typeof body?.paymentKey === 'string' ? body.paymentKey : ''; const orderId = typeof body?.orderId === 'string' ? body.orderId : ''; const amount = integer(body?.amount);
  if (!paymentKey || !orderId || amount === null) return errorResponse('Invalid payment confirmation request.', 400);
  const order = await env.DB.prepare('SELECT id, total, status FROM orders WHERE id = ? AND session_id = ?').bind(orderId, auth.sessionId).first<{ id: string; total: number; status: string }>();
  if (!order || order.status === 'paid') return errorResponse('Order is not payable.', 409);
  if (order.total !== amount) return errorResponse('Payment amount mismatch.', 400);
  const encoded = btoa(`${env.TOSS_SECRET_KEY}:`);
  const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', { method: 'POST', headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentKey, orderId, amount }) });
  if (!tossResponse.ok) { const failure = await tossResponse.json().catch(() => ({})); return responseJson({ error: (failure as { message?: string }).message ?? 'Payment approval failed.' }, tossResponse.status); }
  const payment = await tossResponse.json() as { method?: string };
  await env.DB.prepare("UPDATE orders SET status = 'paid', payment_key = ?, payment_method = ?, payment_amount = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ? AND session_id = ? AND status = 'pending'").bind(paymentKey, payment.method ?? null, amount, orderId, auth.sessionId).run();
  return responseJson({ ok: true, orderId, status: 'paid' });
}

async function createReview(env: Env, request: Request, productId: number): Promise<Response> {
  if (!sameOrigin(request)) return errorResponse('Invalid request origin.', 403);
  const auth = await requireAuth(request, env); if (auth instanceof Response) return auth;
  const body = await jsonBody(request); const rating = integer(body?.rating); const content = typeof body?.content === 'string' ? body.content.trim() : ''; let orderItemId = integer(body?.orderItemId);
  if (rating === null || rating < 1 || rating > 5 || !content || content.length > 1000) return errorResponse('Rating and review text are required.', 400);
  if (orderItemId === null) { const latest = await env.DB.prepare('SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = ? AND o.session_id = ? ORDER BY o.created_at DESC LIMIT 1').bind(productId, auth.sessionId).first<{ id: number }>(); orderItemId = latest?.id ?? null; }
  if (orderItemId === null) return errorResponse('You can review purchased products only.', 403);
  const owned = await env.DB.prepare('SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.id = ? AND oi.product_id = ? AND o.session_id = ?').bind(orderItemId, productId, auth.sessionId).first();
  if (!owned) return errorResponse('You can review purchased products only.', 403);
  try { await env.DB.prepare('INSERT INTO reviews (product_id, user_id, order_item_id, rating, content) VALUES (?, ?, ?, ?, ?)').bind(productId, auth.userId, orderItemId, rating, content).run(); } catch { return errorResponse('This order item already has a review.', 409); }
  await env.DB.prepare('UPDATE product_metrics SET rating_avg = (SELECT AVG(rating) FROM reviews WHERE product_id = ? AND is_visible = 1), review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ? AND is_visible = 1), updated_at = CURRENT_TIMESTAMP WHERE product_id = ?').bind(productId, productId, productId).run();
  return responseJson({ ok: true }, 201);
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
  if (parts[1] === 'payment') {
    if (parts.length === 3 && parts[2] === 'config' && request.method === 'GET') return paymentConfig(env);
    if (parts.length === 3 && parts[2] === 'confirm' && request.method === 'POST') return confirmPayment(env, request);
  }
  if (parts[1] === 'products') {
    if (parts.length === 2 && request.method === 'GET') return listProducts(env, url.searchParams.get('category'), url.searchParams.get('q'), url.searchParams.get('sort'));
    if (parts.length === 3 && request.method === 'GET' && /^\d+$/.test(parts[2])) return productDetail(env, Number(parts[2]));
    if (parts.length === 4 && parts[3] === 'english-intro' && request.method === 'POST' && /^\d+$/.test(parts[2])) return englishProductIntro(env, request, Number(parts[2]));
    if (parts.length === 4 && parts[3] === 'reviews' && request.method === 'POST' && /^\d+$/.test(parts[2])) return createReview(env, request, Number(parts[2]));
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
