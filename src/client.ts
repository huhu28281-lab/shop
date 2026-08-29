type Product = { id: number; name: string; price: number; description: string; category: string; image_url: string };
type CartItem = Product & { qty: number; line_total: number };
type Cart = { items: CartItem[]; total: number };
type Order = { id: string; total: number; status: string; created_at?: string; items: Array<CartItem & { product_id?: number }> };

const app = document.querySelector<HTMLDivElement>('#app')!;
const categories = ['전체', '잡화', '뷰티', '신발', '식품'];
const won = (value: number) => `${new Intl.NumberFormat('ko-KR').format(value)}원`;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]!));

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options?.headers ?? {}) } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? '요청을 처리하지 못했습니다.');
  return body;
}

function shell(active: string, content: string): string {
  return `<header class="site-header"><nav class="site-nav" aria-label="주요 메뉴"><a href="/" data-route ${active === 'home' ? 'aria-current="page"' : ''}>상품 목록</a><a class="cart-link" href="/cart" data-route ${active === 'cart' ? 'aria-current="page"' : ''}>장바구니</a></nav></header>${content}`;
}

function productCard(product: Product): string {
  return `<article class="product-card"><a href="/products/${product.id}" data-route><div class="product-image-frame"><img src="${product.image_url}" alt="${escapeHtml(product.name)}" /></div><div class="product-category">${escapeHtml(product.category)}</div><div class="product-name">${escapeHtml(product.name)}</div><div class="product-price">${won(product.price)}</div><div class="product-description">${escapeHtml(product.description)}</div></a></article>`;
}

async function renderHome(category = new URLSearchParams(location.search).get('category') ?? ''): Promise<void> {
  const data = await request<{ products: Product[] }>(`/api/products${category ? `?category=${encodeURIComponent(category)}` : ''}`);
  const active = category || '전체';
  const tabs = categories.map((item) => {
    const query = item === '전체' ? '' : `?category=${encodeURIComponent(item)}`;
    return `<a href="/${query}" data-route aria-current="${active === item ? 'true' : 'false'}">${item}</a>`;
  }).join('');
  app.innerHTML = shell('home', `<main class="page"><div class="breadcrumb">상품 목록</div><h1 class="page-heading">상품</h1><nav class="category-tabs" aria-label="상품 분류">${tabs}</nav><div class="listing-meta">${data.products.length}개 상품</div><section class="product-grid" aria-label="상품 목록">${data.products.map(productCard).join('')}</section></main>`);
}

async function renderProduct(id: number): Promise<void> {
  const data = await request<{ product: Product }>(`/api/products/${id}`);
  let qty = 1;
  app.innerHTML = shell('', `<main class="page"><div class="breadcrumb"><a href="/" data-route>상품 목록</a> &gt; ${escapeHtml(data.product.category)}</div><div class="detail-layout"><div class="detail-image"><img src="${data.product.image_url}" alt="${escapeHtml(data.product.name)}" /></div><section class="detail-info"><div class="detail-category">${escapeHtml(data.product.category)}</div><h1 class="detail-title">${escapeHtml(data.product.name)}</h1><p class="detail-description">${escapeHtml(data.product.description)}</p><div class="detail-price">${won(data.product.price)}</div><div class="quantity-row"><span>수량</span><div class="quantity-control"><button type="button" data-qty="minus" aria-label="수량 줄이기">−</button><input id="detail-qty" type="number" min="1" max="99" value="1" aria-label="수량" /><button type="button" data-qty="plus" aria-label="수량 늘리기">+</button></div></div><button class="primary-button" id="add-to-cart" type="button">장바구니 담기</button><p id="detail-notice" class="notice" role="status"></p></section></div></main>`);
  const input = document.querySelector<HTMLInputElement>('#detail-qty')!;
  const setQty = (value: number) => { qty = Math.max(1, Math.min(99, value)); input.value = String(qty); };
  document.querySelector('[data-qty="minus"]')?.addEventListener('click', () => setQty(qty - 1));
  document.querySelector('[data-qty="plus"]')?.addEventListener('click', () => setQty(qty + 1));
  input.addEventListener('change', () => setQty(Number(input.value) || 1));
  document.querySelector<HTMLButtonElement>('#add-to-cart')?.addEventListener('click', async () => {
    const notice = document.querySelector<HTMLParagraphElement>('#detail-notice')!;
    try { await request('/api/cart', { method: 'POST', body: JSON.stringify({ productId: id, qty }) }); notice.textContent = '장바구니에 담았습니다.'; } catch (error) { notice.textContent = (error as Error).message; }
  });
}

function cartItem(item: CartItem): string {
  return `<article class="cart-item"><img class="cart-item-image" src="${item.image_url}" alt="${escapeHtml(item.name)}" /><div><h2 class="cart-item-name">${escapeHtml(item.name)}</h2><div class="cart-item-description">${escapeHtml(item.description)}</div><div class="quantity-control"><button type="button" data-action="decrease" data-id="${item.id}" aria-label="수량 줄이기">−</button><input type="number" min="1" max="99" value="${item.qty}" data-action="quantity" data-id="${item.id}" aria-label="${escapeHtml(item.name)} 수량" /><button type="button" data-action="increase" data-id="${item.id}" aria-label="수량 늘리기">+</button></div></div><div class="cart-item-actions"><button class="delete-button" type="button" data-action="delete" data-id="${item.id}">삭제</button><div class="cart-item-price">${won(item.line_total)}</div></div></article>`;
}

async function renderCart(): Promise<void> {
  const cart = await request<Cart>('/api/cart');
  app.innerHTML = shell('cart', `<main class="cart-page"><div class="cart-layout"><section class="cart-panel"><div class="cart-title-row"><h1>장바구니</h1><div class="stepper"><strong>장바구니</strong> &gt; 주문</div></div>${cart.items.length ? cart.items.map(cartItem).join('') : '<div class="cart-empty">장바구니가 비어 있습니다.</div>'}</section><aside class="summary-panel"><h2>주문 예상 금액</h2><div class="summary-row"><span>총 상품 가격</span><span>${won(cart.total)}</span></div><div class="summary-total">${won(cart.total)}</div><button class="primary-button" id="order-button" type="button" ${cart.items.length ? '' : 'disabled'}>주문하기</button><p id="cart-notice" class="notice" role="status"></p></aside></div></main>`);
  document.querySelectorAll<HTMLButtonElement>('[data-action="delete"]').forEach((button) => button.addEventListener('click', async () => { await request(`/api/cart/${button.dataset.id}`, { method: 'DELETE' }); await renderCart(); }));
  document.querySelectorAll<HTMLInputElement>('[data-action="quantity"]').forEach((input) => input.addEventListener('change', async () => { try { await request(`/api/cart/${input.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ qty: Number(input.value) }) }); await renderCart(); } catch (error) { alert((error as Error).message); await renderCart(); } }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="increase"], [data-action="decrease"]').forEach((button) => button.addEventListener('click', async () => { const item = cart.items.find((entry) => entry.id === Number(button.dataset.id)); if (!item) return; const qty = button.dataset.action === 'increase' ? item.qty + 1 : item.qty - 1; try { await request(`/api/cart/${item.id}`, { method: 'PATCH', body: JSON.stringify({ qty }) }); await renderCart(); } catch (error) { alert((error as Error).message); } }));
  document.querySelector<HTMLButtonElement>('#order-button')?.addEventListener('click', async () => { try { const result = await request<{ order: Order }>('/api/orders', { method: 'POST', body: '{}' }); go(`/orders/${result.order.id}`); } catch (error) { document.querySelector('#cart-notice')!.textContent = (error as Error).message; } });
}

async function renderOrder(id: string): Promise<void> {
  const data = await request<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}`);
  const order = data.order;
  app.innerHTML = shell('', `<main class="order-page"><div class="breadcrumb"><a href="/" data-route>상품 목록</a> &gt; 주문 완료</div><h1>주문 완료</h1><div class="order-number">주문 번호: ${escapeHtml(order.id)}</div><section class="order-items">${order.items.map((item) => `<article class="cart-item"><img class="cart-item-image" src="${item.image_url ?? ''}" alt="${escapeHtml(item.name)}" /><div><h2 class="cart-item-name">${escapeHtml(item.name)}</h2><div class="cart-item-description">수량 ${item.qty}</div></div><div class="cart-item-price">${won(item.line_total)}</div></article>`).join('')}</section><div class="order-total">총 주문 금액 ${won(order.total)}</div><a class="back-link" href="/" data-route>상품 목록으로 돌아가기</a></main>`);
}

function go(path: string): void { history.pushState({}, '', path); void render(); }

async function render(): Promise<void> {
  try {
    const path = location.pathname;
    if (path === '/' || path === '') return await renderHome();
    const productMatch = path.match(/^\/products\/(\d+)$/);
    if (productMatch) return await renderProduct(Number(productMatch[1]));
    if (path === '/cart') return await renderCart();
    const orderMatch = path.match(/^\/orders\/([^/]+)$/);
    if (orderMatch) return await renderOrder(orderMatch[1]);
    app.innerHTML = shell('', '<main class="page"><p class="error">페이지를 찾을 수 없습니다.</p></main>');
  } catch (error) { app.innerHTML = shell('', `<main class="page"><p class="error">${escapeHtml((error as Error).message)}</p></main>`); }
}

document.addEventListener('click', (event) => { const target = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-route]'); if (!target) return; event.preventDefault(); go(target.pathname + target.search); });
window.addEventListener('popstate', () => void render());
void render();
