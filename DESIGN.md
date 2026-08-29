# Design Goal

참고 화면에서 확인되는 온라인 쇼핑몰의 밀도 높은 상품 탐색·비교·구매 흐름을 따른다. 화면은 넓은 흰 배경 위에 정보가 기능 단위로 정렬되고, 색상·아이콘·작은 텍스트를 사용해 상품 상태와 구매 정보를 빠르게 구분한다. 둥근 카드, 장식성 그래픽, 과도한 그림자나 마케팅용 히어로 구성은 사용하지 않는다.

브랜드 로고, 브랜드명, 고유 상품명·카피·이미지는 참고하지 않는다. 여기의 관찰은 구조와 시각적 위계에 한정한다.

## Reference Screen Analysis

### Screen 01 — Product listing

- 상단에 카테고리 메뉴 영역, 로고, 긴 검색 입력 영역, 계정·장바구니 아이콘 영역, 보조 링크 행, 경로 표시가 순서대로 있다.
- 좌측에는 필터와 카테고리의 세로 사이드바가 있고, 우측 주 콘텐츠에는 페이지 제목, 가로형 상품 관련 이미지, 정렬 행, 상품 그리드가 있다.
- 상품 그리드는 한 행에 여러 상품을 나란히 배치한다. 각 상품은 이미지가 가장 큰 비중을 차지하고, 그 아래에 상품명·할인/정가·현재 가격·배송/도착·리뷰 및 적립 관련 정보가 세로로 이어진다.
- 제품 이미지는 대부분 흰 바탕의 정사각형 영역에 여백을 두고 놓여 있다. 이미지 영역과 정보 영역 사이에 뚜렷한 카드 테두리나 그림자는 보이지 않는다.
- 가격은 상품명보다 시각적으로 강하며, 배송/상태 정보에는 초록색, 강조 가격에는 붉은 계열이 사용된다.
- 정렬과 상품 수 표시는 얇은 구분선으로 구획된 가로 행에 있다.

### Screen 02 — Product detail

- 목록 화면과 같은 성격의 상단 탐색 영역이 있고, 카테고리 버튼을 연 드롭다운 패널이 화면 좌측에 보인다.
- 본문은 큰 상품 이미지 열과 상품 정보·옵션 열의 2열 구성이다. 우측 가장자리에는 미니 장바구니 패널이 세로로 고정되어 보인다.
- 상품 정보는 판매자/브랜드 성격의 작은 텍스트, 상품명, 원산지/안내, 별점/구매 정보, 가격, 배송 및 혜택 정보 순으로 배치된다.
- 상품 옵션은 가로 탭/용량 선택 행과 라디오 버튼이 있는 수량·묶음 선택 목록으로 표현된다. 선택된 항목에는 파란색 선과 파란색 텍스트가 사용된다.
- 항목과 옵션 묶음은 수평 구분선으로 나뉘며, 둥근 외곽 카드보다 선형 레이아웃이 우세하다.
- 찜·공유로 보이는 원형 아이콘 버튼은 존재하지만, 일반 버튼의 상태·호버 동작은 확인할 수 없다.

### Screen 03 — Cart

- 로고만 남긴 간결한 상단과 얇은 수평선 아래에 장바구니 제목, 뒤로가기 모양 아이콘, 진행 단계 표시가 있다.
- 본문은 좌측의 장바구니 상품 목록과 우측의 주문 예상 금액 요약 패널의 2열 구성이다.
- 목록 상단에는 품절임박과 남은 상품 수를 알리는 알림 행이 있다. 각 상품 행에는 체크박스, 썸네일, 상품명, 옵션, 도착/배송 문구, 가격, 삭제 동작, 수량 조절기가 있다.
- 상품 행들은 얇은 테두리와 넓은 수평 구분 영역으로 구획된다. 주문 요약은 테두리로 감싼 별도 패널이다.
- 비활성 주문 버튼은 연한 회색 바탕과 낮은 대비의 텍스트로 표시된다.

## Common Design Language

- 흰색 또는 매우 옅은 회색 배경을 기반으로 한 데스크톱 중심의 고밀도 쇼핑 UI.
- 상단 탐색과 좌측 분류, 본문 정보, 우측 구매 요약처럼 기능별 영역을 명확하게 분리한다.
- 얇은 회색 수평선·테두리로 정보를 나누며, 큰 그림자나 유리 효과는 보이지 않는다.
- 날카롭거나 매우 작은 반경의 사각형 위주이며, 큰 라운드 처리나 pill 형태는 확인되지 않는다.
- 검정에 가까운 본문 텍스트가 기본이고, 파란색은 선택/링크/강조 동작, 붉은 계열은 가격 또는 재고 경고, 초록색은 배송·혜택 성격의 정보에 제한적으로 쓰인다. 정확한 HEX 값은 미정이다.
- 상품 정보는 이미지보다 아래 또는 옆에서 세로 방향으로 누적되며, 가격과 배송/구매 가능 정보가 이름보다 강하게 보인다.
- 아이콘은 탐색, 계정, 장바구니, 체크, 수량 조절처럼 기능을 직접 나타내는 경우에만 사용한다.

## Layout System

- Desktop: 확인 가능.
- Mobile Design: Reference 부족 / 미정.
- 목록 화면: 좌측 사이드바 + 우측 상품 목록 영역.
- 상세 화면: 큰 상품 이미지 + 상품 정보/옵션 + 우측 미니 장바구니.
- 장바구니 화면: 상품 목록 + 주문 요약 패널.
- 콘텐츠는 화면 가장자리까지 확장하지 않고 좌우 여백 안에 정렬된다. 정확한 컨테이너 폭, 여백, 높이: 미정.
- Footer: 참고 화면 범위에서 확인 불가.

## Grid System

- 목록 화면: 하나의 좌측 사이드바와 다열 상품 그리드가 확인된다. 정확한 열 수·열 폭·간격: 미정.
- 상세/장바구니 화면: 2열 중심의 데스크톱 구조가 확인된다. 정확한 각 열 비율: 미정.

## Spacing System

- 관련 정보는 촘촘한 세로 간격으로 묶고, 주요 영역 전환에는 더 큰 여백 또는 구분선을 사용한다.
- 정확한 margin, padding, gap 값: 미정.

## Typography System

| Element | Observed hierarchy | Exact specification |
|---|---|---|
| Display / page title | 굵고 큰 제목으로 페이지 성격을 표시 | Font family, size, weight, line-height: 미정 |
| Section title | 목록의 카테고리/섹션 시작을 굵게 표시 | 미정 |
| Product name | 일반 본문보다 눈에 띄지만 가격보다 약함 | 미정 |
| Brand / seller | 상품명 위의 작은 보조 정보 | 미정 |
| Price | 굵고 크게 강조, 일부 붉은 계열 | 미정 |
| Original price | 현재 가격보다 약한 보조 정보, 취소선이 보이는 사례가 있음 | 미정 |
| Delivery / benefit | 작은 크기, 초록색 또는 파란색 강조 사례 | 미정 |
| Navigation / control | 작고 조밀한 텍스트 | 미정 |
| Button | 중앙 또는 기능에 맞춘 정렬 | 미정 |

- 전체적으로 산세리프 계열로 보인다. 구현 글꼴은 사용자가 확정한 `Malgun Gothic`이다.
- 정확한 letter spacing, 숫자 서식, 텍스트 line-height: 미정.

## Color System

| Token | Observed appearance | HEX |
|---|---|---|
| background | 흰색 또는 매우 옅은 회색 | 미정 |
| surface | 흰색 패널과 이미지 영역 | 미정 |
| text-primary | 검정에 가까운 짙은 색 | 미정 |
| text-secondary | 회색 또는 옅은 남색 계열 | 미정 |
| border | 연한 회색의 얇은 선 | 미정 |
| accent | 선택 상태, 링크, 주요 윤곽에 사용되는 파란색 | 미정 |
| sale | 가격·재고 강조에 쓰이는 붉은 계열 | 미정 |
| disabled | 비활성 주문 버튼의 옅은 회색 | 미정 |

- Hover 색상 및 상태: 확인 불가.

## Image Guidelines

- Product Image: 흰 또는 단색 배경의 상품 중심 이미지가 주로 사용된다.
- 목록 카드 이미지: 정사각형에 가까운 이미지 영역으로 보이며, 상품이 여백을 두고 표현된다. 정확한 aspect ratio와 크기: 미정.
- 상세 이미지: 목록보다 훨씬 크게 표시되며, 상품 자체가 중심이다.
- Editorial / Banner Image: 목록 상단에 가로형 식품 이미지가 확인된다. 다른 화면에 공통 규칙으로 확장하지 않는다.
- 이미지 radius, 정확한 crop 방식: 미정.

## Product Card

- 구조: 상품 이미지 → 상품명 → 할인/정가 정보 → 현재 가격 → 배송/도착 정보 → 리뷰/적립 관련 정보.
- Brand: 일부 상품 정보에서 판매/서비스 성격의 보조 텍스트가 보이나, 공통 브랜드 표시는 미정.
- 카드 표면 배경: 별도 카드 배경이 두드러지지 않는다.
- Border / Shadow: 상품 카드 외곽의 일관된 테두리·그림자는 확인되지 않는다.
- Badge: 일부 상품 이미지 또는 정보에 수량·배송·혜택 성격의 작은 표시가 보인다. 보이지 않는 상품에 공통으로 추가하지 않는다.
- Wishlist: 목록 카드에서는 확인 불가.
- Hover UI: 확인 불가.

## Header

- 목록/상세 화면에 좌측 카테고리 메뉴 버튼, 로고 위치, 긴 검색 영역, 계정·장바구니 기능 영역, 보조 서비스/카테고리 링크 행이 보인다.
- 장바구니 화면은 로고와 상단 구분선 중심의 축소된 헤더다.
- Header 높이, 고정(sticky) 여부, 정확한 아이콘 규격: 확인 불가.

## Navigation

- 목록/상세 화면: 경로 표시와 다수의 보조 탐색 링크가 존재한다.
- 상세 화면: 열려 있는 좌측 카테고리 드롭다운이 보인다. 다른 상태의 메뉴 동작은 확인 불가.
- 장바구니 화면: `옵션선택 → 장바구니 → 주문/결제 → 주문완료` 성격의 진행 단계가 있으며, 현재 단계가 파란색으로 강조된다.

## Search

- 목록/상세 화면에 카테고리 선택 영역과 검색어 입력 영역, 음성/검색 아이콘이 결합된 긴 가로 검색 바가 있다.
- Placeholder 텍스트, 입력 상태, 자동완성, 검색 결과 동작: 확인 불가.

## Category / Product Listing

- 좌측에 필터 체크박스와 카테고리 목록이 세로로 배치된다.
- 본문에는 카테고리 제목, 가로형 이미지, 정렬/상품 수 행, 다열 상품 목록이 순서대로 있다.
- 필터·카테고리 항목의 상세 상태와 실제 데이터 범위: 확인 불가.

## Product Detail

- 큰 상품 이미지, 상품 기본 정보, 가격·혜택, 옵션 탭/목록이 핵심 구조다.
- 옵션 선택은 파란색 선택 표시와 라디오 버튼 사례가 확인된다.
- 우측에 상품 썸네일, 수량 조절, 삭제를 포함한 미니 장바구니 패널이 있다.
- 구매 버튼 및 아래쪽 상세 콘텐츠는 참고 범위에서 확인 불가.

## Cart

- 장바구니 제목과 진행 단계, 재고 알림, 체크 가능한 상품 목록, 주문 예정 금액 요약을 사용한다.
- 상품 행은 체크박스·썸네일·상품 정보·가격·삭제·수량 조절을 가진다.
- 주문 요약에는 상품 가격, 배송비, 합계, 주문 동작이 순서대로 보인다.
- 선택되지 않은 상태에서는 주문 버튼이 비활성으로 표현된다.

## Checkout

- 진행 단계에서 주문/결제와 주문완료 단계의 존재는 확인되지만, 실제 화면 구성은 확인 불가.

## Button

- 가시적으로 확인되는 버튼은 얇은 파란색 외곽선 버튼, 기본 테두리 버튼, 비활성 회색 채움 버튼이다.
- 가격/옵션 관련 선택 상태에는 파란색 선 또는 텍스트가 사용된다.
- 정확한 height, radius, font weight, hover/active/disabled 전체 규칙: 미정.

## Input / Form

- 검색 입력, 필터 체크박스, 옵션 라디오 버튼, 장바구니 체크박스, 수량 조절기가 확인된다.
- 입력 테두리는 얇고 직선적인 형태다.
- 정확한 입력 크기·focus 상태·검증 표시는 미정.

## Modal / Drawer

- 상세 화면 좌측에 카테고리 드롭다운 패널이 보인다.
- 모달, 오버레이, 다른 drawer 동작: 확인 불가.

## Responsive Rules

- Desktop Screenshot: 확인 가능.
- Mobile Design: Reference 부족 / 미정.
- Responsive breakpoints, 모바일 내비게이션, 열 축소 규칙: 미정.

## Interaction

- 정적 화면에서 체크박스, 라디오 버튼, 수량 증감, 삭제, 카테고리 드롭다운의 존재만 확인된다.
- Hover Behavior: 확인 불가.
- Transition Duration: 미정.
- Animation: 미정.
- Sticky Header / 고정 미니 장바구니의 실제 스크롤 동작: 확인 불가.

## Anti-Patterns

- 그라데이션, 글래스모피즘, 네오모피즘, glow, blur 카드 사용 금지.
- 큰 둥근 모서리, pill 버튼, 과도한 box shadow 사용 금지.
- 확인되지 않은 위시리스트, 쿠폰, 리뷰 별점, 추천 상품, 최근 본 상품, 플로팅/채팅 버튼, 뉴스레터, SNS, KPI, testimonial, 마케팅 카드 추가 금지.
- 화면에 없는 장식 일러스트, 추상 도형, 이모지, 과도한 애니메이션·호버 효과 추가 금지.
- 모든 영역을 카드로 감싸거나 화면 대부분을 마케팅 카피로 채우지 않는다.

## Screen-specific Patterns

- Screen 01: 필터·카테고리 사이드바, 가로형 카테고리 이미지, 다열 상품 그리드.
- Screen 02: 상품 옵션 선택 목록과 우측 미니 장바구니.
- Screen 03: 구매 진행 단계와 주문 예상 금액 패널, 품절임박 알림 행.

# Unknown / Undetermined

Reference만으로 정확하게 판단할 수 없는 값:

- Font Family:
- Exact Font Sizes:
- Font Weight:
- Line Height:
- Letter Spacing:
- Exact Color HEX:
- Exact Spacing:
- Container Width / Max Width:
- Exact Grid Dimensions:
- Exact Image Sizes / Aspect Ratios:
- Exact Border Width:
- Exact Border Radius:
- Shadow Values:
- Responsive Breakpoints:
- Mobile Layout:
- Hover Behavior:
- Focus / Active State Details:
- Transition Duration:
- Animation:
- Sticky Behavior:

## Measured Implementation Tokens

The following values are measured or directly sampled from the supplied native
screenshots and are the implementation tokens for this phase.

| Token | Value | Source / status |
|---|---|---|
| Font family | `Malgun Gothic`, sans-serif | User-confirmed |
| Background | `#FFFFFF` | MEASURED, dominant screen surface |
| Cart canvas | `#F0F0F0` | MEASURED, cart screenshot |
| Accent | `#4269F6` | MEASURED, selected controls |
| Border | `#E0E3E7` | MEASURED, separators and panels |
| Text primary | `#232B35` | MEASURED, cart text |
| Text secondary | `#8B8B8B` | MEASURED, secondary labels |
| Sale / price emphasis | `#BA2D1B` | MEASURED, price emphasis |
| Disabled surface | `#F2F4F6` | MEASURED, disabled action |
| Disabled text | `#ACB5BF` | MEASURED, disabled action |
| Reference viewports | `1106×797`, `1270×831`, `1288×847` | MEASURED from `home.png`, `detail.png`, `cart.png` |
| Product image frame | 1:1, `object-fit: contain` | CONFIRMED by SHOP-2.md |

Exact component offsets and gaps are screen-specific measurements from the
native screenshots; values not listed above remain UNKNOWN and must not be
invented as a new design token.

## User-requested Extensions

- Main product-list screen has a long, bordered search field in the upper
  header. Search covers the existing product name, description, and category
  data; no new product records are introduced.
- The upper-right header contains three text tabs: `한국어`, `中文`, and
  `English`. The selected tab uses the measured accent color; translations are
  limited to existing UI and product metadata.
- `HIT` is shown as a compact red label on the first product in each category
  according to the product table's listing order: IDs 1, 3, 5, and 7. This is
  a deterministic display rule requested by the user, not an invented sales
  metric.
- The `HIT` label uses a short brightness/scale sparkle animation and a small
  star mark, as explicitly requested by the user.
- The header cart link displays the sum of quantities currently in the
  server-backed guest cart; it is not the number of distinct product rows.
