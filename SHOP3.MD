# SHOP3 구현 정리

## 프로젝트 개요

Vanilla TypeScript와 Cloudflare Workers, D1을 사용하는 쇼핑몰 1단계 구현입니다.

회원가입·로그인 사용자만 장바구니와 주문을 사용할 수 있으며, 결제는 Toss Payments V2 테스트 위젯을 사용합니다.

## 구현된 화면

- `/` 상품 목록
  - 4열 상품 그리드
  - 카테고리 탭: 전체·잡화·뷰티·신발·식품
  - 상품 검색
  - 카테고리별 첫 상품 HIT 표시 및 반짝임 효과
  - 장바구니 상품 수량 표시
  - 한국어·중국어·영어 언어 탭
- `/products/:id` 상품 상세
  - 상품 이미지, 설명, 가격, 수량
  - 신발 상품 사이즈 선택(220~280)
  - 장바구니 담기
  - 상품 리뷰 작성 및 리뷰 목록
  - `English` 버튼으로 Workers AI 영어 소개 생성
- `/cart` 장바구니
  - 수량 변경·상품 삭제·합계
  - 배송지 입력
  - 다음 우편번호 검색 레이어
  - 주문 생성
- `/checkout/:id` 결제 화면
  - Toss Payments V2 테스트 결제 위젯
- `/orders/:id` 주문 상세
  - 주문 상품·수량·사이즈·결제 금액
  - 배송지
  - 가상 배송 단계와 위치
  - 배송 중·배송 완료 단계에서 지도 팝업
- `/login`, `/register`, `/forgot-password`, `/mypage`
  - 회원가입·로그인·로그아웃·임시 비밀번호 발급
  - 마이페이지 주문 상품 내역
  - 배송 조회 메뉴

## 인증 및 보안

- 비밀번호는 `bcryptjs` 해시 기능 사용
- 인증 세션은 HttpOnly·Secure·SameSite=Lax 쿠키 사용
- 장바구니·주문·마이페이지는 로그인 사용자 세션으로 제한
- 다른 사용자의 주문 ID를 직접 입력해도 조회할 수 없음
- 변경 요청은 동일 출처 검증
- Toss secret key는 코드에 넣지 않고 Wrangler secret으로 관리

## 상품·주문 데이터

- 상품 정보는 D1 `products`에 저장
- 상품 분류는 `categories` 외래키로 연결
- 구매 당시 상품명·가격·수량·신발 사이즈는 `order_items`에 스냅샷 저장
- 주문 생성 시 서버가 현재 상품 가격으로 합계를 재계산
- 주문 생성 후 장바구니 비우기
- 배송지는 `orders.recipient_name`, `recipient_phone`, `shipping_address`에 저장

## 주요 API

- `GET /api/products?category=&q=&sort=`
- `GET /api/products/:id`
- `POST /api/products/:id/reviews`
- `GET /api/cart`
- `POST /api/cart`
- `PATCH /api/cart/:productId`
- `DELETE /api/cart/:productId`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/payment/confirm`
- `GET /api/payment/config`
- `POST /api/products/:id/english-intro`

## 배송 기능

현재 배송은 실제 택배사 연동이 아닌 테스트용 가상 상태입니다.

결제 완료 후 주문 생성 시각을 기준으로 서버와 화면이 같은 단계로 계산합니다.

1. 배송 준비 중 — 가상 물류센터
2. 배송 중 — 서울 허브 터미널
3. 배송 중 — 고객님 지역 배송기사
4. 배송 완료 — 배송지

배송 중 또는 배송 완료 버튼을 누르면 OpenStreetMap 기반 지도 팝업이 표시됩니다. 실제 GPS나 운송장 위치는 제공하지 않습니다.

## 우편번호 검색

다음 우편번호 검색 API를 사용합니다.

- 페이지 내 검색 레이어 방식
- 검색 결과에서 우편번호·기본 주소 자동 입력
- 상세 주소만 직접 입력
- 외부 스크립트가 늦게 로드되면 클릭 시 재로드 시도

## Workers AI 영어 소개

Cloudflare Wrangler 설정에 `AI` 바인딩을 추가했습니다.

- 모델: `@cf/meta/llama-3.1-8b-instruct-fast`
- 별도 API 키 불필요
- 상품명과 기존 설명만 프롬프트에 전달
- 최대 3문장
- 원산지·성분·인증 등 상품 데이터에 없는 사실 생성 금지
- 실패 시 기존 상세 화면 유지

## 디자인 기준

`DESIGN.md`의 색상·글꼴·간격 값을 사용합니다.

- 기본 글꼴: Malgun Gothic
- 배경: `#FFFFFF`
- 장바구니 캔버스: `#F0F0F0`
- 강조색: `#4269F6`
- 테두리: `#E0E3E7`
- 주요 텍스트: `#232B35`
- 가격 강조: `#BA2D1B`
- 비활성 배경: `#F2F4F6`

로고·브랜드 이름, 데이터가 없는 필터 사이드바·메가메뉴·배너·별점·리뷰 외 마케팅 배지 등은 명세에 따라 추가하지 않았습니다.

## 데이터베이스 마이그레이션

현재 마이그레이션은 `migrations/0001_initial.sql`부터 `0013_toss_payments.sql`까지 적용되어 있습니다.

주요 테이블:

- `users`
- `auth_sessions`
- `categories`
- `products`
- `product_metrics`
- `product_skus`
- `guest_sessions`
- `cart_items`
- `orders`
- `order_items`
- `shipping_policies`
- `reviews`
- `price_history`
- `discount_rules`
- `coupons`

## 검증 및 배포

- TypeScript 검사: `npm.cmd run check` 통과
- 클라이언트 빌드: `npm.cmd run build` 통과
- GitHub 저장소: `https://github.com/huhu28281-lab/shop.git`
- 기본 브랜치: `main`
- Worker 이름: `shop`
- D1 이름: `shop-db`
- 공개 주소: `https://shop.huhu28281.workers.dev`

Cloudflare 배포는 Wrangler CLI로 진행합니다.

## 현재 제한 사항

- 배송 위치는 가상 데이터이며 실제 택배사·GPS와 연결되지 않음
- OpenStreetMap 지도는 가상 위치를 표시
- Toss Payments는 테스트 키·테스트 결제만 사용
- Workers AI 응답은 모델 상태와 네트워크에 따라 실패할 수 있음
- 회원가입·로그인·결제 외 본인인증, 환불, 실제 배송 추적은 미구현
