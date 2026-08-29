type Product = { id: number; name: string; price: number; description: string; category: string; image_url: string };
type CartItem = Product & { qty: number; line_total: number };
type Cart = { items: CartItem[]; total: number };
type Order = { id: string; total: number; status: string; created_at?: string; items: Array<CartItem & { product_id?: number }> };

const app = document.querySelector<HTMLDivElement>('#app')!;
const categories = ['전체', '잡화', '뷰티', '신발', '식품'];
let cartQuantity = 0;
let currentUser: { name: string; email: string } | null = null;
let authLoaded = false;
type Language = 'ko' | 'zh' | 'en';
const language = (): Language => (localStorage.getItem('shop-language') as Language) || 'ko';
const ui: Record<Language, Record<string, string>> = {
  ko: { products: '상품 목록', cart: '장바구니', product: '상품', all: '전체', count: '개 상품', add: '장바구니 담기', quantity: '수량', empty: '장바구니가 비어 있습니다.', summary: '주문 예상 금액', subtotal: '총 상품 가격', order: '주문하기', done: '주문 완료', orderNo: '주문 번호', total: '총 주문 금액', back: '상품 목록으로 돌아가기', added: '장바구니에 담았습니다.', search: '상품을 검색하세요' },
  zh: { products: '商品列表', cart: '购物车', product: '商品', all: '全部', count: '件商品', add: '加入购物车', quantity: '数量', empty: '购物车为空。', summary: '预计订单金额', subtotal: '商品总价', order: '下单', done: '订单完成', orderNo: '订单号', total: '订单总额', back: '返回商品列表', added: '已加入购物车。', search: '搜索商品' },
  en: { products: 'Products', cart: 'Cart', product: 'Products', all: 'All', count: 'items', add: 'Add to cart', quantity: 'Quantity', empty: 'Your cart is empty.', summary: 'Estimated total', subtotal: 'Product subtotal', order: 'Place order', done: 'Order complete', orderNo: 'Order number', total: 'Order total', back: 'Back to products', added: 'Added to cart.', search: 'Search products' },
};
const productTranslations: Record<number, Record<Language, { name: string; description: string; category: string }>> = {
  1: { ko: { name: '미니멀 토트백', description: '각을 살린 검정 가죽 토트백', category: '잡화' }, zh: { name: '极简托特包', description: '线条利落的黑色皮革托特包', category: '杂货' }, en: { name: 'Minimal Tote Bag', description: 'A structured black leather tote bag', category: 'General' } },
  2: { ko: { name: '클래식 손목시계', description: '흰 문자판에 검정 가죽 밴드', category: '잡화' }, zh: { name: '经典腕表', description: '白色表盘搭配黑色皮革表带', category: '杂货' }, en: { name: 'Classic Wristwatch', description: 'A white dial with a black leather band', category: 'General' } },
  3: { ko: { name: '시트러스 오드뚜왈렛', description: '상쾌한 시트러스 계열 향수', category: '뷰티' }, zh: { name: '柑橘淡香水', description: '清新的柑橘调香水', category: '美妆' }, en: { name: 'Citrus Eau de Toilette', description: 'A refreshing citrus fragrance', category: 'Beauty' } },
  4: { ko: { name: '매트 레드 립스틱', description: '발색이 선명한 매트 타입', category: '뷰티' }, zh: { name: '哑光红色口红', description: '显色鲜明的哑光质地', category: '美妆' }, en: { name: 'Matte Red Lipstick', description: 'A vivid lipstick with a matte finish', category: 'Beauty' } },
  5: { ko: { name: '러닝화 블루', description: '쿠션이 두꺼운 남성 러닝화', category: '신발' }, zh: { name: '蓝色跑鞋', description: '厚实缓震的男士跑鞋', category: '鞋类' }, en: { name: 'Blue Running Shoes', description: "Men's running shoes with thick cushioning", category: 'Shoes' } },
  6: { ko: { name: '러닝화 핑크', description: '같은 모델의 여성 러닝화', category: '신발' }, zh: { name: '粉色跑鞋', description: '同款女士跑鞋', category: '鞋类' }, en: { name: 'Pink Running Shoes', description: 'Women\'s running shoes in the same model', category: 'Shoes' } },
  7: { ko: { name: '레드와인 피노타지', description: '남아프리카산 드라이 레드와인', category: '식품' }, zh: { name: '品乐塔吉红葡萄酒', description: '来自南非的干型红葡萄酒', category: '食品' }, en: { name: 'Pinotage Red Wine', description: 'A dry red wine from South Africa', category: 'Food' } },
  8: { ko: { name: '이탈리아 파스타 면', description: '세몰리나 100% 숏 파스타 450g', category: '식품' }, zh: { name: '意大利短意面', description: '100% 硬质小麦粉短意面 450g', category: '食品' }, en: { name: 'Italian Short Pasta', description: 'Short pasta made from 100% semolina, 450g', category: 'Food' } },
};
const categoryLabels: Record<string, Record<Language, string>> = {
  '잡화': { ko: '잡화', zh: '杂货', en: 'General' },
  '뷰티': { ko: '뷰티', zh: '美妆', en: 'Beauty' },
  '신발': { ko: '신발', zh: '鞋类', en: 'Shoes' },
  '식품': { ko: '식품', zh: '食品', en: 'Food' },
};
const won = (value: number) => `${new Intl.NumberFormat('ko-KR').format(value)}원`;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]!));

function localized(product: Product, lang: Language): { name: string; description: string; category: string } {
  const copy = productTranslations[product.id]?.[lang] ?? { name: product.name, description: product.description, category: product.category };
  // 판매순위 원본의 판매처·리뷰 메타데이터는 상품 하단 설명으로 노출하지 않는다.
  if (copy.description.startsWith('오늘의 판매순위')) return { ...copy, description: '' };
  return copy;
}

function descriptionMarkup(description: string, className: string): string {
  return description ? `<div class="${className}">${escapeHtml(description)}</div>` : '';
}

function languageTabs(lang: Language): string {
  return `<div class="language-tabs" role="tablist" aria-label="Language"><button type="button" data-language="ko" class="${lang === 'ko' ? 'active' : ''}">한국어</button><button type="button" data-language="zh" class="${lang === 'zh' ? 'active' : ''}">中文</button><button type="button" data-language="en" class="${lang === 'en' ? 'active' : ''}">English</button></div>`;
}

async function loadAuth(): Promise<void> {
  if (authLoaded) return;
  try { const data = await request<{ user: { name: string; email: string } }>('/api/auth/me'); currentUser = data.user; } catch { currentUser = null; }
  authLoaded = true;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options?.headers ?? {}) } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? '요청을 처리하지 못했습니다.');
  return body;
}

function shell(active: string, content: string, showSearch = false): string {
  const lang = language(); const text = ui[lang];
  const search = showSearch ? `<form class="search-form" id="search-form" role="search"><input name="q" value="${escapeHtml(new URLSearchParams(location.search).get('q') ?? '')}" placeholder="${text.search}" aria-label="${text.search}" /><button type="submit" aria-label="${text.search}">⌕</button></form>` : '';
  const account = currentUser ? `<button type="button" class="header-action" id="header-logout">로그아웃</button><a href="/mypage" data-route>마이페이지</a>` : `<a href="/login" data-route>로그인</a><a href="/register" data-route>회원가입</a>`;
  const userLabel = currentUser ? `<span class="user-name">${escapeHtml(currentUser.name)}님</span>` : '';
  return `<header class="site-header"><nav class="site-nav" aria-label="${text.products}"><a class="home-link" href="/" data-route ${active === 'home' ? 'aria-current="page"' : ''}>홈</a><a class="cart-link" href="/cart" data-route ${active === 'cart' ? 'aria-current="page"' : ''}>${text.cart} <span class="cart-count" id="cart-count" aria-label="${cartQuantity}">${cartQuantity}</span></a></nav>${search}<div class="header-right"><div class="language-tabs-wrap">${languageTabs(lang)}${userLabel}</div><div class="account-links">${account}</div></div></header>${content}`;
}

function authForm(mode: 'login' | 'register'): string {
  const register = mode === 'register';
  return `<main class="page"><h1 class="page-heading">${register ? '회원가입' : '로그인'}</h1><form class="auth-form" id="auth-form"><label>이메일<input name="email" type="email" required autocomplete="email"></label>${register ? '<label>이름<input name="name" required autocomplete="name"></label>' : ''}<label>비밀번호<input name="password" type="password" minlength="8" required autocomplete="current-password"></label><button class="primary-button" type="submit">${register ? '가입하기' : '로그인'}</button>${!register ? '<a class="back-link" href="/forgot-password" data-route>비밀번호 찾기</a>' : ''}<p id="auth-notice" class="notice" role="status"></p></form></main>`;
}

async function renderAuth(mode: 'login' | 'register'): Promise<void> {
  app.innerHTML = shell('', authForm(mode));
  bindHeaderLogout();
  document.querySelector<HTMLFormElement>('#auth-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const body = Object.fromEntries(new FormData(form).entries()); try { await request(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(body) }); authLoaded = false; await loadAuth(); go('/mypage'); } catch (error) { document.querySelector('#auth-notice')!.textContent = (error as Error).message; } });
}

async function renderForgotPassword(): Promise<void> {
  app.innerHTML = shell('', `<main class="page"><h1 class="page-heading">비밀번호 찾기</h1><p>가입한 이메일을 입력하면 비밀번호 재설정 안내를 보내드립니다.</p><form class="auth-form" id="forgot-form"><label>이메일<input name="email" type="email" required autocomplete="email"></label><button class="primary-button" type="submit">재설정 안내 요청</button><p id="auth-notice" class="notice" role="status"></p></form></main>`);
  document.querySelector<HTMLFormElement>('#forgot-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; try { await request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); document.querySelector('#auth-notice')!.textContent = '입력한 이메일이 가입되어 있다면 재설정 안내를 보내드립니다.'; } catch (error) { document.querySelector('#auth-notice')!.textContent = (error as Error).message; } });
}

function bindHeaderLogout(): void { document.querySelector('#header-logout')?.addEventListener('click', async () => { await request('/api/auth/logout', { method: 'POST', body: '{}' }); currentUser = null; authLoaded = true; go('/'); }); }

async function renderMyPage(): Promise<void> {
  try { const data = await request<{ user: { name: string; email: string } }>('/api/auth/me'); currentUser = data.user; const orders = await request<{ orders: Array<{ id: string; total: number; status: string; created_at: string }> }>('/api/orders'); const orderRows = orders.orders.length ? orders.orders.map((order) => `<a class="order-history-row" href="/orders/${encodeURIComponent(order.id)}" data-route><span>${escapeHtml(order.id)}</span><span>${won(order.total)}</span><span>${escapeHtml(order.created_at)}</span></a>`).join('') : '<p class="cart-empty">주문 내역이 없습니다.</p>'; app.innerHTML = shell('', `<main class="page"><h1 class="page-heading">마이페이지</h1><p>${escapeHtml(data.user.name)} (${escapeHtml(data.user.email)})</p><h2 class="section-heading">주문 내역</h2><section class="order-history">${orderRows}</section></main>`); bindHeaderLogout(); } catch { go('/login'); }
}

async function updateCartCount(): Promise<void> {
  try {
    const cart = await request<Cart>('/api/cart');
    cartQuantity = cart.items.reduce((sum, item) => sum + item.qty, 0);
    const counter = document.querySelector('#cart-count');
    if (counter) { counter.textContent = String(cartQuantity); counter.setAttribute('aria-label', String(cartQuantity)); }
  } catch { /* The page remains usable if the count request is unavailable. */ }
}

function productCard(product: Product, lang: Language, hit: boolean): string {
  const copy = localized(product, lang);
  return `<article class="product-card"><a href="/products/${product.id}" data-route><div class="product-image-frame">${hit ? '<span class="hit-badge">HIT</span>' : ''}<img src="${product.image_url}" alt="${escapeHtml(copy.name)}" /></div><div class="product-category">${escapeHtml(copy.category)}</div><div class="product-name">${escapeHtml(copy.name)}</div><div class="product-price">${won(product.price)}</div>${descriptionMarkup(copy.description, 'product-description')}</a></article>`;
}

function rankingNumber(product: Product): number | null {
  const match = product.description.match(/오늘의 판매순위\s*(\d+)위/);
  return match ? Number(match[1]) : null;
}

function orderAllProducts(products: Product[]): Product[] {
  const hits = products.filter((product) => rankingNumber(product) === 1);
  const rest = products.filter((product) => rankingNumber(product) !== 1);
  // 상품 ID를 기반으로 섞어 새로고침 때마다 순서가 바뀌지 않게 하면서 카테고리 뭉침을 줄인다.
  const shuffled = [...rest].sort((a, b) => {
    const score = (id: number) => (id * 9301 + 49297) % 233280;
    return score(a.id) - score(b.id);
  });
  return [...hits.sort((a, b) => (rankingNumber(a) ?? 99) - (rankingNumber(b) ?? 99)), ...shuffled];
}

async function renderHome(category = new URLSearchParams(location.search).get('category') ?? ''): Promise<void> {
  const lang = language(); const text = ui[lang]; const q = new URLSearchParams(location.search).get('q') ?? '';
  const data = await request<{ products: Product[] }>(`/api/products${category ? `?category=${encodeURIComponent(category)}` : ''}`);
  const firstByCategory = new Set<string>();
  const filtered = data.products.filter((product) => { const copy = localized(product, lang); if (q.trim()) { const haystack = `${product.name} ${product.description} ${product.category} ${copy.name} ${copy.description} ${copy.category}`.toLocaleLowerCase(); if (!haystack.includes(q.trim().toLocaleLowerCase())) return false; } return true; });
  const visible = !category ? orderAllProducts(filtered) : filtered;
  const active = category || text.all;
  const tabs = categories.map((item) => {
    const query = item === '전체' ? '' : `?category=${encodeURIComponent(item)}`;
    const label = item === '전체' ? text.all : categoryLabels[item][lang];
    return `<a href="/${query}${q ? `${query ? '&' : '?'}q=${encodeURIComponent(q)}` : ''}" data-route aria-current="${active === item || active === text.all && item === '전체' ? 'true' : 'false'}">${label}</a>`;
  }).join('');
  app.innerHTML = shell('home', `<main class="page"><div class="breadcrumb">${text.products}</div><h1 class="page-heading">${text.product}</h1><nav class="category-tabs" aria-label="${text.product}">${tabs}</nav><div class="listing-meta">${visible.length}${text.count}</div><section class="product-grid" aria-label="${text.products}">${visible.map((product) => { const isHit = !firstByCategory.has(product.category); firstByCategory.add(product.category); return productCard(product, lang, isHit); }).join('')}</section></main>`, true);
  document.querySelector<HTMLFormElement>('#search-form')?.addEventListener('submit', (event) => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const value = new FormData(form).get('q')?.toString().trim() ?? ''; const params = new URLSearchParams(); if (category) params.set('category', category); if (value) params.set('q', value); go(`/${params.toString() ? `?${params}` : ''}`); });
}

async function renderProduct(id: number): Promise<void> {
  const data = await request<{ product: Product }>(`/api/products/${id}`);
  const lang = language(); const text = ui[lang]; const copy = localized(data.product, lang);
  let qty = 1;
  const detailSection = copy.description ? `<section class="detail-extra"><h2>상품 상세 정보</h2><p>${escapeHtml(copy.description)}</p></section>` : '';
  app.innerHTML = shell('', `<main class="page"><div class="breadcrumb"><a href="/" data-route>${text.products}</a> &gt; ${escapeHtml(copy.category)}</div><div class="detail-layout"><div class="detail-image"><img src="${data.product.image_url}" alt="${escapeHtml(copy.name)}" /></div><section class="detail-info"><div class="detail-category">${escapeHtml(copy.category)}</div><h1 class="detail-title">${escapeHtml(copy.name)}</h1><div class="detail-price">${won(data.product.price)}</div><div class="quantity-row"><span>${text.quantity}</span><div class="quantity-control"><button type="button" data-qty="minus" aria-label="${text.quantity}">−</button><input id="detail-qty" type="number" min="1" max="99" value="1" aria-label="${text.quantity}" /><button type="button" data-qty="plus" aria-label="${text.quantity}">+</button></div></div><button class="primary-button" id="add-to-cart" type="button">${text.add}</button><p id="detail-notice" class="notice" role="status"></p></section></div>${detailSection}</main>`);
  const input = document.querySelector<HTMLInputElement>('#detail-qty')!;
  const setQty = (value: number) => { qty = Math.max(1, Math.min(99, value)); input.value = String(qty); };
  document.querySelector('[data-qty="minus"]')?.addEventListener('click', () => setQty(qty - 1));
  document.querySelector('[data-qty="plus"]')?.addEventListener('click', () => setQty(qty + 1));
  input.addEventListener('change', () => setQty(Number(input.value) || 1));
  document.querySelector<HTMLButtonElement>('#add-to-cart')?.addEventListener('click', async () => {
    const notice = document.querySelector<HTMLParagraphElement>('#detail-notice')!;
    try { await request('/api/cart', { method: 'POST', body: JSON.stringify({ productId: id, qty }) }); notice.textContent = text.added; await updateCartCount(); } catch (error) { notice.textContent = (error as Error).message; }
  });
}

function cartItem(item: CartItem, lang: Language): string {
  const copy = localized(item, lang); const text = ui[lang];
  return `<article class="cart-item"><img class="cart-item-image" src="${item.image_url}" alt="${escapeHtml(copy.name)}" /><div><h2 class="cart-item-name">${escapeHtml(copy.name)}</h2>${descriptionMarkup(copy.description, 'cart-item-description')}<div class="quantity-control"><button type="button" data-action="decrease" data-id="${item.id}" aria-label="${text.quantity}">−</button><input type="number" min="1" max="99" value="${item.qty}" data-action="quantity" data-id="${item.id}" aria-label="${escapeHtml(copy.name)} ${text.quantity}" /><button type="button" data-action="increase" data-id="${item.id}" aria-label="${text.quantity}">+</button></div></div><div class="cart-item-actions"><button class="delete-button" type="button" data-action="delete" data-id="${item.id}">${lang === 'ko' ? '삭제' : lang === 'zh' ? '删除' : 'Remove'}</button><div class="cart-item-price">${won(item.line_total)}</div></div></article>`;
}

async function renderCart(): Promise<void> {
  const cart = await request<Cart>('/api/cart');
  cartQuantity = cart.items.reduce((sum, item) => sum + item.qty, 0);
  const lang = language(); const text = ui[lang];
  app.innerHTML = shell('cart', `<main class="cart-page"><div class="cart-layout"><section class="cart-panel"><div class="cart-title-row"><h1>${text.cart}</h1><div class="stepper"><strong>${text.cart}</strong> &gt; ${text.order}</div></div>${cart.items.length ? cart.items.map((item) => cartItem(item, lang)).join('') : `<div class="cart-empty">${text.empty}</div>`}</section><aside class="summary-panel"><h2>${text.summary}</h2><div class="summary-row"><span>${text.subtotal}</span><span>${won(cart.total)}</span></div><div class="summary-total">${won(cart.total)}</div><button class="primary-button" id="order-button" type="button" ${cart.items.length ? '' : 'disabled'}>${text.order}</button><p id="cart-notice" class="notice" role="status"></p></aside></div></main>`);
  document.querySelectorAll<HTMLButtonElement>('[data-action="delete"]').forEach((button) => button.addEventListener('click', async () => { await request(`/api/cart/${button.dataset.id}`, { method: 'DELETE' }); await renderCart(); }));
  document.querySelectorAll<HTMLInputElement>('[data-action="quantity"]').forEach((input) => input.addEventListener('change', async () => { try { await request(`/api/cart/${input.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ qty: Number(input.value) }) }); await renderCart(); } catch (error) { alert((error as Error).message); await renderCart(); } }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="increase"], [data-action="decrease"]').forEach((button) => button.addEventListener('click', async () => { const item = cart.items.find((entry) => entry.id === Number(button.dataset.id)); if (!item) return; const qty = button.dataset.action === 'increase' ? item.qty + 1 : item.qty - 1; try { await request(`/api/cart/${item.id}`, { method: 'PATCH', body: JSON.stringify({ qty }) }); await renderCart(); } catch (error) { alert((error as Error).message); } }));
  document.querySelector<HTMLButtonElement>('#order-button')?.addEventListener('click', async () => { try { const result = await request<{ order: Order }>('/api/orders', { method: 'POST', body: '{}' }); go(`/orders/${result.order.id}`); } catch (error) { document.querySelector('#cart-notice')!.textContent = (error as Error).message; } });
}

async function renderOrder(id: string): Promise<void> {
  const data = await request<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}`);
  const order = data.order;
  const lang = language(); const text = ui[lang];
  app.innerHTML = shell('', `<main class="order-page"><div class="breadcrumb"><a href="/" data-route>${text.products}</a> &gt; ${text.done}</div><h1>${text.done}</h1><div class="order-number">${text.orderNo}: ${escapeHtml(order.id)}</div><section class="order-items">${order.items.map((item) => { const copy = productTranslations[item.id ?? 0]?.[lang] ?? { name: item.name, description: '', category: '' }; return `<article class="cart-item"><img class="cart-item-image" src="${item.image_url ?? ''}" alt="${escapeHtml(copy.name)}" /><div><h2 class="cart-item-name">${escapeHtml(copy.name)}</h2><div class="cart-item-description">${text.quantity} ${item.qty}</div></div><div class="cart-item-price">${won(item.line_total)}</div></article>`; }).join('')}</section><div class="order-total">${text.total} ${won(order.total)}</div><a class="back-link" href="/" data-route>${text.back}</a></main>`);
}

function go(path: string): void { history.pushState({}, '', path); void render(); }

async function render(): Promise<void> {
  try {
    await loadAuth();
    const path = location.pathname;
    if (path === '/' || path === '') { await renderHome(); await updateCartCount(); return; }
    const productMatch = path.match(/^\/products\/(\d+)$/);
    if (productMatch) { await renderProduct(Number(productMatch[1])); await updateCartCount(); return; }
    if (path === '/cart') return await renderCart();
    if (path === '/login') return await renderAuth('login');
    if (path === '/register') return await renderAuth('register');
    if (path === '/forgot-password') return await renderForgotPassword();
    if (path === '/mypage') return await renderMyPage();
    const orderMatch = path.match(/^\/orders\/([^/]+)$/);
    if (orderMatch) { await renderOrder(orderMatch[1]); await updateCartCount(); return; }
    app.innerHTML = shell('', '<main class="page"><p class="error">페이지를 찾을 수 없습니다.</p></main>');
  } catch (error) { app.innerHTML = shell('', `<main class="page"><p class="error">${escapeHtml((error as Error).message)}</p></main>`); }
}

document.addEventListener('click', (event) => { const logoutButton = (event.target as HTMLElement).closest<HTMLButtonElement>('#header-logout'); if (logoutButton) { void request('/api/auth/logout', { method: 'POST', body: '{}' }).then(() => { currentUser = null; authLoaded = true; go('/'); }); return; } const languageButton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-language]'); if (languageButton) { localStorage.setItem('shop-language', languageButton.dataset.language ?? 'ko'); void render(); return; } const target = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-route]'); if (!target) return; event.preventDefault(); go(target.pathname + target.search); });
window.addEventListener('popstate', () => void render());
void render();
