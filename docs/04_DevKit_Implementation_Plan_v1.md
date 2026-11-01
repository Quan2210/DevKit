# DevKit — Implementation Plan

**Phiên bản:** 1.3
**Trạng thái:** v1.3 (M0.1 spike đã chạy, chọn A; xem `docs/design/ssg-spike.md` và Phụ lục B) — đã sửa theo review độc lập lần 1 (REQUEST CHANGES) và re-review lần 2 (APPROVE WITH MINOR FIXES, đã áp dụng; xem Phụ lục A); đã chốt O1–O7; chờ `I APPROVE`. **Chưa có code nào được viết.**
**Nguồn:** [PRD v1.1](./01_DevKit_Requirements_v1.1.md) · [Design System v1.1](./02_DevKit_Design_System_v1.1.md) · [System Design v1](./03_DevKit_System_Design_v1.md) · [UI Direction / Layouts / Components](./design/ui-direction.md)
**Ngày kiểm tra phiên bản thư viện:** 2026-11-01 bằng `npm view` (chỉ kiểm tra metadata/peer, **chưa cài thử**; spike M0 sẽ xác nhận bằng cài thật).

---

# 1. Requirement Summary

Xây DevKit v1: website tĩnh public gồm 10 tool P0/P1 (JSON, JWT, Base64, UUID, XML, Markdown Preview, Color Picker/Palette/Contrast/Gradient), xử lý hoàn toàn trên client, prerender từng route cho SEO, light/dark, responsive, a11y AA. **Không** có Feedback (hoãn), không backend/DB. SQL Formatter (P2) chỉ có khung ẩn khỏi nav, không làm trong plan này.

Hành vi nghiệp vụ chính: dán dữ liệu → thấy kết quả → copy/tải; lỗi rõ và không làm mất dữ liệu; không dữ liệu nào rời trình duyệt.

# 2. Current System

Greenfield. Thư mục `DevKit/` hiện chỉ có `docs/`, `CLAUDE.md`, `.gitignore`, file v1 gốc; đã là git repo (`Quan2210/DevKit`, private). Không có `package.json`, code, CI. Convention do tài liệu đã duyệt đặt ra; plan này không tái sử dụng code có sẵn nào.

## 2.1. Kết quả kiểm tra thư viện làm thay đổi plan so với System Design

| Phát hiện (npm, 2026-11-01) | Hệ quả |
|---|---|
| `vite-react-ssg@0.9.2` chỉ hỗ trợ **`react-router-dom ^6.14`**; README khuyên người dùng React Router v7+ dùng **prerender có sẵn của React Router**. Bản mới nhất là `react-router@8.5.1` (`@react-router/dev@8.5.1`, peer: vite ^7/^8, TS ^5.1/^6/^7) | Phương án SSG ưu tiên đổi từ "vite-react-ssg" sang **React Router framework mode + `ssr:false` + `prerender`** (vẫn thuộc nhóm "SSG tích hợp React Router" của System Design §9.1.A). `vite-react-ssg` + RR 6.30 là dự phòng A', script `<head>` là C. Quyết định cuối bằng spike M0 |
| `typescript@7.0.2` là bản mới nhất nhưng `typescript-eslint@8.72` chỉ hỗ trợ `<6.1` | **Pin TypeScript `~6.0.3`** |
| `eslint-plugin-jsx-a11y@6.10` peer ESLint `≤ 9` (ESLint mới nhất là 10) | **Pin ESLint `^9`** |
| `@vitejs/plugin-react@6` yêu cầu Vite 8 và framework mode dùng plugin `reactRouter()` riêng | Không cài `@vitejs/plugin-react` nếu chọn A; chỉ dùng ở phương án A' |
| `xml-formatter@3.7.0`, `lowlight@3.3.0`, `rehype-sanitize@6.0.0`, `culori@4.0.2`… đều tồn tại | Dùng được; XML vẫn phải qua bộ test (R5) |

Đây là thay đổi **chi tiết công cụ** (không đổi kiến trúc đã duyệt); ghi nhận để reviewer kiểm tra. Nếu bạn muốn ràng buộc chặt hơn, xem câu hỏi O1.

# 3. Requirement Traceability

Trạng thái: ✅ có bước triển khai · 🔶 một phần/phụ thuộc quyết định · ❓ cần làm rõ.

| Requirement / AC | Implementation (module) | Test coverage | Trạng thái |
|---|---|---|---|
| PRD 3.1 JSON (format 2/4, minify, validate, lỗi+vị trí, copy, clear; cảnh báo số lớn) | `features/json-formatter` + `core/json.ts` | Unit `json.test.ts`; e2e J1–J3 | ✅ |
| 3.2 JWT (decode, exp/iat/nbf, lỗi, cảnh báo không verify) | `features/jwt-decoder` + `core/jwt.ts`, `lib/text/base64.ts` | Unit `jwt.test.ts`; e2e; kiểm không verify | ✅ |
| 3.3 Base64 (encode/decode, UTF-8, URL-safe, lỗi) | `features/base64` + `lib/text/base64.ts` | Unit round-trip Unicode; e2e | ✅ |
| 3.4 UUID v4 (1–1000, Web Crypto, copy) | `features/uuid-generator` + `core/uuid.ts` | Unit regex v4, giới hạn, mock crypto thiếu | ✅ |
| 3.5 XML (beautify/minify/validate, bảo toàn nội dung, download) | `features/xml-formatter` + `core/xml.ts` | Unit corpus PRD 9.3; so sánh DOM tương đương; e2e | 🔶 (spike chọn formatter, M5a) |
| 3.6 Color Picker (HEX/RGB(A)/HSL, recent, random) | `features/color-tools/color-picker` + `color-core` + `storage` | Unit convert/round-trip; component recent; e2e storage tắt | ✅ |
| 3.7 Palette (5 harmony, export CSS vars) | `.../palette-generator` + `color-core/harmony` | Unit từng mode, CSS vars hợp lệ | ✅ |
| 3.8 Contrast (WCAG, alpha, ngưỡng, swap) | `.../contrast-checker` + `color-core/contrast` | Unit ví dụ WCAG, 4.499, alpha; a11y e2e | ✅ (gợi ý màu = tùy chọn, cắt đầu tiên) |
| 3.9 Gradient (linear/radial, stops, preset, CSS) | `.../gradient-generator` + `core/gradient.ts` | Unit `toCss`, reorder; e2e copy | ✅ |
| 3.10 Markdown (GFM, highlight, sanitize, ảnh ngoài chặn, file, export, TOC) | `features/markdown-preview` + `core/markdown/*`, worker | Unit pipeline + corpus bảo mật; e2e network | ✅ (TOC/sync-scroll/export HTML tách task, cắt được) |
| §4.1 Performance (lazy, debounce) | Route split tự động; `lib/async/latestWins`; worker >200 KB | Bundle check (SD-11); perf e2e Markdown 1 MB | ✅ (ngưỡng cần đo) |
| §4.2 Privacy/Security (không request ngoài, không eval, Blob revoke, CSP) | `_headers`/meta CSP, `SafeHtml`, `lib/io/download` | e2e network (SD-7); lint cấm `eval`/`dangerouslySetInnerHTML` ngoài `SafeHtml` | ✅ |
| §4.3 A11y AA | Tokens đã sửa, ToolShell, skip link, focus ring | axe e2e mọi route, contrast test token | ✅ |
| §4.4 Responsive | Layout theo `layouts.md` | Playwright 375/768/1024/1440, không overflow | ✅ |
| §5 Routing + 404 + refresh trực tiếp | Registry → `routes.ts`, prerender, `404` | SD-1, SD-3 | ✅ |
| §8 SEO prerender | `meta` từ registry, `scripts/check-seo.mjs`, sitemap/robots | SD-2, SD-3, SD-4 | 🔶 (phụ thuộc spike M0) |
| Design System: tokens, theme không flash, font self-host | `styles/tokens.css`, `theme-init.js`, `@fontsource-variable/*` | SD-5, SD-13; test contrast token | ✅ |
| UI design D1–D4 (DeviceStatus, UndoBar, ToolList, phím tắt) | `components/common/*`, `hooks/useHotkeys` | Component + e2e | ✅ (đã duyệt 2026-11-01) |
| SD-6 Registry mở rộng không sửa nơi khác | `registry/` + test tool giả | Unit/e2e SD-6 | ✅ |
| SD-9/SD-10 storage tắt, error boundary | `lib/storage.ts`, `ErrorBoundary` | Unit + e2e (chặn localStorage) | ✅ |
| Feedback (PRD 6, SD-12) | Không làm | — | ⛔ Hoãn |
| Ngôn ngữ UI: v1 tiếng Việt, hạ tầng i18n sẵn để thêm ngôn ngữ (O2) | `src/i18n/*` (catalog có kiểu, `useT`, format), `<html lang>`, metadata tool qua khóa i18n | Unit: catalog phụ phải đủ khóa; e2e: `lang` đúng | ✅ |

# 4. Proposed Implementation

Quy ước: đường dẫn tương đối gốc `DevKit/`. `appDirectory = "src"`. **Mọi UI bám `docs/design/*` và Design System; không hard-code token.** Mỗi milestone kết thúc ở trạng thái build/typecheck/lint/test xanh (không có bước trung gian hỏng).

## M0 — Spike & scaffold (chặn mọi milestone sau)

### Change 0.1 — Spike SSG (timebox 0,5 ngày)
* Location: nhánh/thư mục tạm `spike/ssg` (xóa sau khi chốt).
* Làm: dựng app tối thiểu 3 route (Home, 1 tool có editor lazy, 404) bằng **A** (`react-router` + `@react-router/dev`, `ssr:false`, `prerender`). Đo các tiêu chí:
  1. `npm run build` ra HTML riêng cho từng route có `<title>`, meta, OG, 1 `<h1>`, nội dung hướng dẫn (đọc bằng `curl`/script, không JS).
  2. Component có `localStorage`/`window` không làm hỏng prerender (dùng `ClientOnly`).
  3. Hydration không cảnh báo; theme-init không flash.
  4. Route refresh trực tiếp chạy ở `vite preview` và ở host tĩnh có/không `base` path (`/DevKit/`).
  5. CodeMirror nằm chunk riêng, không có trong chunk Home.
  6. **(F-1) Hydrate và chạy đủ chức năng dưới CSP production**, cả dạng `<meta>` (GH Pages) và dạng header (Cloudflare), với **0 CSP violation** trong console; `script-src` **không** chứa `'unsafe-inline'`. Cách làm: script hậu build tính SHA-256 mọi `<script>` inline của **mọi** file HTML và dùng **một CSP toàn site gồm hợp (union) mọi hash** (xem Change 1.14b). Nếu không băm được ổn định với A thì A không đạt tiêu chí này. *(Đã xác minh từ mã nguồn `react-router@8.5.1`: `<Scripts/>` ghi script classic `window.__reactRouterContext`, script `type="module"` inline có import chunk, `StreamTransfer`, `ScrollRestoration` inline; nội dung cố định trong file HTML nên băm lúc build được.)*
  7. **(F-3) Build tự tạo `404.html`**: route 404 là **splat (`*`) route**, prerender với **mã 200** (prerender của React Router từ chối phản hồi khác 200), rồi được **sao chép thành `404.html` trước bước `gen-csp`**; có `<title>` "Không tìm thấy trang", đúng 1 `<h1>`, link về Home. Host tĩnh trả đúng mã 404 cho đường dẫn không tồn tại, và `404.html` **hydrate sạch (0 lỗi console/CSP) tại một URL thiếu bất kỳ có base path** (vd. `/DevKit/foo/bar`).
  8. **(F-2) `buildUrl()`** cho canonical/sitemap/og:url ra URL tuyệt đối đúng khi có `base` (xem 1.4b).
* **Kết quả (2026-11-01): đã chạy, chọn A** (tiêu chí 1–7 đạt, 8 chuyển sang unit test `buildUrl`). Chi tiết: `docs/design/ssg-spike.md`.
* Quyết định (gốc): đạt cả 8 ⇒ chọn **A**. Không đạt ⇒ thử **A'** (RR 6.30.6 + vite-react-ssg 0.9.2 + `@vitejs/plugin-react`); không đạt ⇒ **C** (script thay `<head>`; C không phát sinh script hydrate inline của router nên chắc chắn hợp CSP nghiêm). **Mọi phương án đều phải đạt tiêu chí 6**; không chấp nhận nới `script-src` bằng `'unsafe-inline'` vì sẽ vô hiệu hóa lớp bảo vệ XSS cho Markdown (R1). Ghi kết quả vào `docs/design/ssg-spike.md` và báo bạn trước khi tiếp tục.
* Impact: chỉ ảnh hưởng cấu hình build và `root.tsx`/entry; các module `core/` không đổi theo lựa chọn.

### Change 0.2 — Scaffold dự án
* Tạo: `package.json` (npm; `engines.node >=22.22.0`, theo `react-router@8.5.1`), `tsconfig.json` (strict), `vite.config.ts`, `react-router.config.ts`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`, `.env.example` (`VITE_SITE_URL`, `VITE_BASE`), `.nvmrc`.
* Dependencies (pin trong lockfile, dải gợi ý): `react`/`react-dom` `>=19.2.7`, `react-router` + `@react-router/dev` ^8.5, `vite` ^8, `typescript` ~6.0.3, `tailwindcss` + `@tailwindcss/vite` ^4.3, `lucide-react`, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`; dev: `vitest` ^5, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@playwright/test`, `@axe-core/playwright`, `eslint` ^9, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `prettier`.
* Dependency theo milestone (không cài sớm): `codemirror` + `@codemirror/*` (M1), `culori`, `react-colorful` (M6), `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify`, `rehype-slug`, `lowlight` (M4), `xml-formatter` chỉ nếu spike M5a chọn dùng.
* Scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `check:seo`, `check:bundle`.

### Change 0.3 — CI
* `.github/workflows/ci.yml`: `npm ci` → typecheck → lint → test → build → `check:seo` → `check:bundle` → Playwright (cài Chromium). Chạy trên push/PR.

## M1 — Foundation (shell, tokens, registry)

| # | Location | Thay đổi / lý do |
|---|---|---|
| 1.1 | `src/styles/tokens.css` | Toàn bộ token Design System §4–§6 cho light/dark (`:root`, `[data-theme="dark"]`), kể cả token mới `border-strong`, `on-primary`, `*-fg`; `color-scheme` |
| 1.2 | `src/styles/globals.css`, Tailwind theme | Ánh xạ token → Tailwind (`@theme`), focus ring, `prefers-reduced-motion`, font-face từ @fontsource, `font-variant-numeric` tiện ích cho số |
| 1.3 | `public/theme-init.js` + `<script>` đồng bộ trong `root.tsx` | Đặt `data-theme` trước first paint (đọc `devkit:v1:theme` trong try/catch). URL script phải là `import.meta.env.BASE_URL + "theme-init.js"` (đường dẫn tương đối hỏng ở route lồng nhau, đã gặp trong spike). Chọn file **ngoài cùng origin** (không cần hash riêng cho script này). Lưu ý: script inline do chính router sinh ra vẫn cần hash theo trang, xem 1.14b |
| 1.4 | `src/registry/tools.meta.ts` (dữ liệu thuần, không import React) + `registry/index.ts` | Danh sách tool: `id, path, group, title, description, keywords, priority, hidden, routeFile, icon`. Nguồn cho `routes.ts`, prerender list, sidebar, Home, sitemap |
| 1.4b | `src/lib/url.ts` | **(F-2)** `VITE_SITE_URL` = **chỉ origin** (vd. `https://quan2210.github.io`), `VITE_BASE` = base path (vd. `/DevKit/`). `buildUrl(path, locale?)` = origin + base + path, chuẩn hóa dấu `/` (không bao giờ ra `//DevKit//`). Là nguồn duy nhất cho canonical, `og:url`, sitemap, link tuyệt đối. Unit test: có/không base, path gốc `/`, path có `/` thừa |
| 1.5 | `src/routes.ts`, `src/root.tsx`, `src/routes/*` | Khai báo route từ registry; `root.tsx` có `<Meta/>`, `<Links/>`, skip link, ThemeProvider, ErrorBoundary; `meta` mỗi route lấy từ registry (title, description, OG, **Twitter Card**, canonical = `buildUrl(path)`, xem 1.4b) |
| 1.6 | `src/components/layout/*` | `AppShell`, `Sidebar` (drawer mobile, rail tablet), `TopBar` (breadcrumb, ThemeSwitcher), theo `layouts.md` §1–§2 |
| 1.7 | `src/components/layout/ToolShell.tsx` | Khung tool page (breadcrumb, H1, mô tả, slot toolbar/workspace, status bar, phần hướng dẫn). Bắt buộc cho mọi tool |
| 1.8 | `src/components/common/*` | `Button`, `IconButton`, `Input`, `Textarea`, `Segmented`, `Panel`, `StatusBadge`, `CopyButton`, `ErrorBanner`, `UndoBar`, `DeviceStatus`, `Popover`, `Dialog`, `ToolList`, `Skeleton`, `ClientOnly` |
| 1.9 | `src/lib/storage.ts` | `createStorage()`: try/catch, fallback bộ nhớ, tiền tố/version `devkit:v1:*`, validator khi đọc, cờ `persistent` |
| 1.10 | `src/lib/result.ts`, `src/lib/async/latestWins.ts`, `src/hooks/useHotkeys.ts`, `useDebounced.ts`, `useClipboard.ts` | Kiểu `Result<T,ToolError>`; latest-wins; phím tắt D4; copy có fallback |
| 1.11 | `src/lib/io/download.ts` | Blob → objectURL → click → `revokeObjectURL` |
| 1.12 | `src/components/editors/CodeEditor.tsx` | Wrapper CodeMirror 6, lazy + `ClientOnly`; props: `value, onChange, language, readOnly, ariaLabel`; theme theo token; `Esc` rồi `Tab` thoát; chỉ tải language pack được yêu cầu |
| 1.13 | `src/routes/home.tsx`, `404` | Home dạng `ToolList` + ô tìm (phím `/`); 404 |
| 1.13b | `src/i18n/{index.ts,types.ts,locales/vi.ts}`, `useT.ts`, `format.ts` | **Hạ tầng i18n nhẹ, không thêm thư viện** (quyết định O2): catalog `vi` là nguồn kiểu (`MessageKey` suy ra từ đây); `useT()` trả hàm `t(key, params?)`; số nhiều/ngày/số qua `Intl.PluralRules`/`Intl.DateTimeFormat`/`Intl.NumberFormat`; `locale` từ một nơi (mặc định `vi`) đặt `<html lang>`. Mọi chuỗi UI, nội dung hướng dẫn/FAQ và title/description trong registry dùng **khóa** (F-11). Nội dung hướng dẫn là **dữ liệu có cấu trúc** trong catalog (`guide: [{type:'p'|'ul'|'h2', text|items}]`) và một component `GuideContent` render từ đó; **không** viết văn bản thô trong TSX. Lint: `no-restricted-syntax` với selector `JSXText[value=/\S/]` (và `Literal` truyền vào thuộc tính hiển thị) trong `features/` và `components/`, không cần `eslint-plugin-react`. Hàm dịch **không phải hook** `translate(locale, key, params?)` dùng cho `meta` export và script build (hook `useT()` chỉ bọc hàm này). Thêm ngôn ngữ sau = thêm `locales/xx.ts` (kiểu bắt buộc đủ khóa) + quyết định routing (tiền tố `/en/`) + prerender theo locale; **không làm trong v1**, chỉ chừa chỗ: registry lưu khóa thay vì chuỗi, có hàm `buildUrl(path, locale)` |
| 1.14 | `public/robots.txt`, `scripts/gen-sitemap.mjs`, `scripts/check-seo.mjs`, `scripts/check-bundle.mjs` | Sitemap từ registry bằng `buildUrl`; `check:seo` kiểm **từng HTML** (title, description, OG, **Twitter Card**, canonical **bằng đúng URL tuyệt đối mong đợi**, đúng 1 `<h1>`, `lang="vi"`), kiểm **mọi URL trong sitemap** trả 200 trên static server, kiểm `404.html` (title/H1 tĩnh); `check:bundle`: Home không chứa CodeMirror/unified/lowlight, **bundle không chứa `eval(`/`new Function`** (kể cả dependency) và không có chuỗi giống secret |
| 1.14b | `scripts/gen-csp.mjs`, `public/_headers.base` | **(F-1)** Bước **cuối cùng** chạm vào HTML của build (sau prerender, sau khi tạo `404.html`, sau mọi minify/format). Xử lý **mọi** file HTML (`*/index.html`, `404.html`, `__spa-fallback.html`): trích mọi `<script>` inline (classic, `type=module`, `importmap` nếu có), chuẩn hóa xuống dòng về LF, tính `sha256-…`, rồi sinh **một CSP toàn site** có `script-src 'self'` + **hợp của mọi hash** (khoảng vài chục hash; hash chỉ cho phép đúng các script đó nên rủi ro không đáng kể). Chèn CSP đó dưới dạng `<meta http-equiv="Content-Security-Policy">` là **phần tử đầu tiên của `<head>`** (trước mọi `<script>` và `<link rel="modulepreload">`) trong mọi file HTML (dùng cho GH Pages), và ghi cùng chính sách vào **một** quy tắc `/*` duy nhất trong `_headers` (dùng cho Cloudflare, thêm `frame-ancestors 'none'`); **không** đặt CSP ở quy tắc theo trang vì Cloudflare nối các header trùng bằng dấu phẩy (hai chính sách giao nhau sẽ chặn hydrate) và `404.html` phục vụ ở URL tùy ý. Không `'unsafe-inline'` cho `script-src`. **Giới hạn Cloudflare (K11):** nếu dòng `Content-Security-Policy` trong `_headers` vượt giới hạn độ dài dòng của Cloudflare Pages (cần xác nhận ở M8; ước ~35 hash × ~60 ký tự ≈ 2,1 kB), dùng **chỉ `<meta>` CSP** (đã chứng minh chạy ở spike) và thêm `X-Frame-Options: DENY`; không chia CSP thành nhiều dòng header (bị nối lại, giao nhau). Test: E-2b |
| 1.14d | `scripts/stage.mjs` | **(Phát hiện spike)** Khi `VITE_BASE` ≠ `/`: HTML nằm ở `build/client/<base>/…`, còn `assets/` và `public/*` ở `build/client/`. Bước ghép: copy mọi thứ trừ thư mục base và `index.html` fallback vào `stage/`, phủ nội dung `build/client/<base>/` lên gốc, rồi tạo `404.html`. Thứ tự build: `react-router build` → `stage` → `gen-csp` → `check:seo`/`check:bundle`. Khi base là `/` (Cloudflare) bỏ qua ghép. Deploy artifact = `stage/` |
| 1.14c | `src/routes/not-found.tsx`, `react-router.config.ts` (prerender), `scripts/make-404.mjs` | **(F-3)** Route 404 là splat `*`, prerender với mã 200, bản HTML được sao chép thành `build/client/404.html` (title, H1, link Home) **trước** `gen-csp`. Không dùng "SPA fallback" để xử lý URL sai (tránh soft-404). Cloudflare/GH Pages cùng dùng file này. `check:seo` kiểm file tồn tại và nội dung tĩnh |

CSP cơ sở (một hằng số cho phần dùng chung): `default-src 'self'; script-src 'self' <hash theo trang>; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`. `<hash theo trang>` do `gen-csp.mjs` sinh. (`frame-ancestors` chỉ có ở header, không có ở meta.) `style-src 'unsafe-inline'` do CodeMirror — chấp nhận có chủ đích (System Design R4).

Test M1: token contrast (đọc tokens.css, kiểm cặp theo bảng §4.4 Design System); registry (SD-6 với tool giả); storage (tắt/hỏng/sai schema); shell (drawer, skip link, focus); theme không flash (e2e).

## M2 — Shared cores (thuần, test trước UI)

| # | Location | Nội dung |
|---|---|---|
| 2.1 | `src/lib/text/base64.ts` | `encode(text,{urlSafe})`, `decode(b64,{urlSafe})` — `TextEncoder`/`TextDecoder({fatal:true})`; chuẩn hóa padding/whitespace; lỗi phân loại (ký tự sai, độ dài, không phải UTF-8); `base64urlToBase64` dùng chung JWT |
| 2.2 | `src/lib/text/stats.ts` | Đếm từ/ký tự/phút đọc (Unicode-aware: `Intl.Segmenter` nếu có, fallback regex) |
| 2.3 | `tests/fixtures/*` | Corpus: JSON, XML (PRD 9.3), Markdown (cú pháp + bảo mật PRD 9.4), JWT mẫu, màu |

## M3 — Tools P0

| # | Feature | Location chính | Điểm thiết kế cụ thể |
|---|---|---|---|
| 3.1 | JSON | `features/json-formatter/{core/json.ts, JsonFormatter.tsx}` | `parseJson` → `Result`; trích vị trí lỗi từ message V8 (`position N`) và Firefox/Safari (`line L column C`), quy ra dòng/cột; `format(indent)`/`minify`; quét token ngoài chuỗi để phát hiện **số nguyên vượt `MAX_SAFE_INTEGER`** → cảnh báo (R6); key trùng ghi vào mục Giới hạn |
| 3.2 | JWT | `features/jwt-decoder/{core/jwt.ts,…}` | tách 3 phần, decode Base64URL → JSON; `describeTimes(claims, now)` (nhận `now` để test) trả iat/nbf/exp cả giờ địa phương và UTC + trạng thái; cảnh báo cố định; không có mã verify nào trong bundle |
| 3.3 | Base64 | `features/base64/Base64Tool.tsx` | Segmented Encode/Decode, URL-safe, nút Đổi chiều; nhãn hai vùng đổi theo chế độ |
| 3.4 | UUID | `features/uuid-generator/{core/uuid.ts,…}` | `randomUUID` nếu có, fallback `getRandomValues` (set bit version/variant); không có cả hai ⇒ lỗi rõ; `MAX_COUNT=1000`; danh sách ảo hóa khi >200 dòng |

Mỗi tool dùng `ToolShell`, `CodeEditor`/`Input`, `CopyButton`, `ErrorBanner`, `UndoBar`, `DeviceStatus`; có Mẫu, Xóa+Hoàn tác, phím tắt. Nội dung hướng dẫn/giới hạn/FAQ viết thật (SEO), nằm trong catalog `i18n/locales/vi.ts` (dữ liệu có cấu trúc, xem 1.13b).

**Cổng chất lượng 1 (sau M3):** chạy agent `qa-engineer` (skill 5) rồi `tech-lead-reviewer` (skill 6) trên P0 trước khi làm tiếp.

## M4 — Markdown Preview (rủi ro cao, làm sớm)

| # | Location | Nội dung |
|---|---|---|
| 4.1 | `features/markdown-preview/core/pipeline.ts` | `renderMarkdown(src,{allowExternalImages}) → {html, headings, error?}` đúng thứ tự System Design §3.4 |
| 4.2 | `core/sanitize-schema.ts` | Allowlist chặt dựa trên `defaultSchema`: bỏ `script,style,iframe,object,embed,form,input(trừ checkbox disabled của task list),svg,math` và mọi thuộc tính `on*`, `style`; giao thức link `http,https,mailto`; giao thức ảnh `data` (png/jpeg/gif/webp, **không** svg) |
| 4.3 | `core/plugins/{linkPolicy,imagePolicy}.ts` | Link ngoài: `target=_blank`, `rel="noopener noreferrer"`. Ảnh URL ngoài ⇒ phần tử placeholder có `data-blocked-src`, **không có `src`/`srcset`** |
| 4.4 | `core/highlight.ts` | `lowlight` + tập ngôn ngữ con nạp động (`js, ts, json, bash, css, xml/html, python, sql, yaml, md, diff`); chạy **sau** sanitize |
| 4.5 | `core/worker/markdown.worker.ts`, `useMarkdownRender.ts` | Worker chỉ khi input > `WORKER_THRESHOLD=200_000` ký tự; tạo worker lazily phía client; `latestWins`; lỗi/timeout ⇒ báo lỗi, giữ input |
| 4.6 | `components/common/SafeHtml.tsx` | **Nơi duy nhất** dùng `dangerouslySetInnerHTML`; nhận chuỗi từ pipeline; ESLint rule `no-restricted-syntax` chặn nơi khác |
| 4.7 | `features/markdown-preview/MarkdownPreview.tsx` + panels | Chế độ Soạn/Chia đôi/Xem; Mở file (File API, ≤5 MB, drag&drop); Copy MD/HTML; Tải `.md`/`.html`; thống kê; DeviceStatus chuyển cảnh báo khi bật ảnh ngoài (Dialog xác nhận); Mẫu; `md-view` persistence; nội dung **mặc định không lưu**; có tùy chọn **"Nhớ bản nháp trên thiết bị này"** (O5: làm): công tắc tắt sẵn, giải thích rõ lưu ở đâu, nút "Xóa bản nháp", lưu vào `devkit:v1:md-draft` (giới hạn ≤1 MB, vượt thì cảnh báo và không lưu), tắt công tắc = xóa ngay, debounce ghi 500 ms |
| 4.7b | `MarkdownPreview.tsx`, `components/MdProse.tsx` | **(F-7)** Chế độ **"Chiều rộng tài liệu"** (cột đọc ~75ch, PRD 3.10) có công tắc, lưu `md-doc-width`; **banner riêng tư lần đầu** (Design System §9.3) đóng được, lưu `md-banner-dismissed`; **nút Copy trên từng code block** (Design System §8) |
| 4.7c | `features/markdown-preview/useMarkdownRender.ts` | **(F-8) Lộ trình giảm tải preview 1 MB** nếu E-12 không đạt (làm theo thứ tự): (1) debounce **tỉ lệ theo kích thước input**; (2) không render khi preview đang ẩn (Soạn / tab Edit trên mobile); (3) render theo khối và thay DOM từng phần (diff theo block top-level) thay vì gán toàn bộ chuỗi vào `innerHTML`; (4) cắt preview rất dài thành các đoạn nạp dần. **Ngưỡng đạt cố định trước khi đo**: với tài liệu ~1 MB, mỗi lần cập nhật preview sau khi gõ không tạo long task > 100 ms ở p95 trên máy tham chiếu của dự án (ghi cấu hình máy trong báo cáo QA) |
| 4.8 | (tách task, cắt được) TOC popover, sync scroll, export HTML kèm style. **Thứ tự pipeline cho TOC/anchor (F-12):** `rehype-slug` chạy **sau** `rehype-sanitize` với tiền tố id `md-` (id do hệ thống sinh nên an toàn, tránh bị `clobberPrefix` làm sai neo); `id`/`href` của footnote giữ `clobberPrefix` mặc định của sanitize | Làm sau cùng của M4 |

## M5 — XML

* 5a. **Spike formatter (timebox 0,5 ngày):** chạy `xml-formatter@3.7.0` trên corpus PRD 9.3 (namespace, attribute, comment, CDATA, PI, entity, Unicode, empty element, mixed content). Kiểm tra bằng so sánh **DOM chuẩn hóa trước/sau** theo quy tắc tương đương (F-5): (1) text node chỉ gồm whitespace được bỏ **chỉ khi** phần tử cha không có text node khác khoảng trắng *và* không có `xml:space="preserve"` (kế thừa); (2) trong mixed content (`<p>Hello <b>x</b> !</p>`) và dưới `xml:space="preserve"` mọi khoảng trắng là nội dung và phải giữ nguyên, formatter **không được xuống dòng/thụt dòng** ở đó; (3) comment, CDATA, PI, khai báo namespace, giá trị attribute phải giống tuyệt đối; tập attribute so không phụ thuộc thứ tự. Minify theo cùng quy tắc. Đạt ⇒ dùng; không ⇒ viết tokenizer + serializer riêng trong `core/xml/`. Ghi kết quả vào `docs/design/xml-spike.md`.
* 5b. `core/xml.ts`: `validate` (DOMParser, nhận implementation làm tham số để test bằng jsdom; chuẩn hóa `parsererror` giữa Chrome/Firefox/Safari, rút vị trí), `beautify(indent)`, `minify`, **không** sửa XML lỗi; 5c. UI + Tải `.xml`; ghi chú giới hạn serializer.

## M6 — Color Tools

| # | Location | Nội dung |
|---|---|---|
| 6.1 | `features/color-tools/shared/color-core/{parse,format,convert,contrast,harmony,css}.ts` | Dựa trên `culori`: parse HEX 3/4/6/8, `rgb()/rgba()/hsl()/hsla()`; chuẩn hóa về một kiểu `Color` có alpha; `toHex8/toRgbString/toHslString` |
| 6.2 | `color-core/contrast.ts` | Alpha compositing sRGB **bằng số thực, không lượng tử hóa 8-bit trước khi tính ratio** (F-4): `c = α·fg + (1−α)·bg` trên từng kênh; màu hiệu dụng hiển thị là HEX làm tròn từ số thực (chỉ để hiển thị). Ví dụ SD-15 (đã chỉnh): `#000000` α0.5 trên `#FFFFFF` ⇒ kênh 127.5 ⇒ ratio ≈ **3.977** (hiển thị 3.97). Nền trong suốt trộn lên **nền giả định** (mặc định `#FFFFFF`, chọn được) (System Design §3.5); luminance/contrast theo công thức WCAG 2.x; **so ngưỡng trên giá trị chưa làm tròn**, hiển thị cắt (floor) 2 chữ số (R7, SD-14, SD-15) |
| 6.3 | `color-core/harmony.ts` | **(F-6) Quy tắc rõ ràng** (HSL, `h` = hue màu gốc; mọi mode luôn trả đúng `count` màu, màu gốc là phần tử đầu): **Đơn sắc**: giữ `h`,`s`, lightness chia đều từ 20% đến 90% (`count` bước, màu gốc chèn đúng vị trí gần nhất); **Tương tự**: bước góc cố định **30°**, trải đối xứng quanh gốc (`h, h+30, h−30, h+60, …`); **Bổ túc** (cơ sở 2 hue: `h`, `h+180`), **Tam giác** (`h`, `h+120`, `h+240`), **Tứ giác** (`h`, `h+90`, `h+180`, `h+270`): khi `count` > số hue cơ sở thì màu thêm là các biến thể lightness (±12%, ±24%…) của các hue cơ sở theo vòng tròn; khi `count` < số hue cơ sở thì lấy `count` hue đầu. Khoảng `count` cho phép: Đơn sắc/Tương tự 2–10; Bổ túc 2–10; Tam giác 3–10; Tứ giác 4–10 (UI vô hiệu giá trị nhỏ hơn). Test góc hue ở `count` 2, 5, 10 cho từng mode |
| 6.4 | `color-core/css.ts` | `toCssVariables(palette,prefix)` với tên biến hợp lệ; `gradientToCss` |
| 6.5 | `color-picker/`, `palette-generator/`, `contrast-checker/`, `gradient-generator/` | UI theo `layouts.md` §4.6–4.9; `react-colorful` cho picker; Contrast có nút **Copy chữ / Copy nền** (PRD 3.8); Recent colors qua storage (≤20, không trùng); Gradient: stops có `id`, sắp theo `position`, nút lên/xuống (bàn phím) + kéo thả tùy chọn |
| 6.6 | Gợi ý màu đạt ngưỡng (Contrast) | **Tùy chọn, cắt đầu tiên**: tìm nhị phân theo lightness (OKLCH) tới ngưỡng |

## M7 — Polish, tối ưu, QA

* Rà trạng thái đầy đủ mọi tool (checklist `components.md` §4); a11y (axe) toàn bộ route; responsive 375/768/1024/1440; hiệu năng Markdown 1 MB, đo và chỉnh `WORKER_THRESHOLD`; `check:bundle`; hoàn thiện nội dung hướng dẫn/SEO (title/description từng tool); ảnh OG mặc định; icon/favicon; dọn lint/typecheck.
* **Cổng chất lượng 2:** `qa-engineer` toàn bộ → sửa → `tech-lead-reviewer` (skill 6) toàn bộ diff.

## M8 — Triển khai thử

* **Bản thử (quyết định O3):** repo `Quan2210/DevKit` chuyển sang **public** rồi deploy GitHub Pages. `.github/workflows/deploy-pages.yml`: build với `VITE_BASE=/DevKit/`, `VITE_SITE_URL=https://quan2210.github.io` (chỉ origin), upload artifact → deploy Pages; `404.html` do build tạo theo Change 1.14c (không copy SPA fallback). **Trước khi đổi sang public phải rà: không secret, không dữ liệu riêng trong lịch sử git (hiện chỉ có docs). Đổi public là hành động công khai nên sẽ hỏi lại bạn đúng lúc làm.** GitHub Pages không đặt được HTTP header ⇒ CSP bằng `<meta>` đầu `<head>` với tập hash toàn site (Change 1.14b).
* **Production (O3/O4):** khi bản thử ổn mới mua domain, rồi chuyển lên Cloudflare Pages (`_headers` đầy đủ, build command, `VITE_*`, domain). Trước đó canonical/sitemap dùng URL github.io.

# 5. Data / API / Integration Impact

* **Database / API / Messaging / Background jobs:** không có.
* **External systems:** không có trong v1 (Feedback hoãn). Request mạng duy nhất có thể xảy ra là ảnh Markdown do người dùng chủ động bật.
* **Client storage:** 7 khóa (System Design §5 + bổ sung): `theme`, `recent-colors`, `md-view`, `md-doc-width`, `md-banner-dismissed`, `md-draft` (chỉ khi người dùng bật opt-in, O5 = làm), và `md-draft-enabled`. Mọi khóa có tiền tố/version `devkit:v1:`; chỉ `md-draft` chứa nội dung người dùng.
* **Configuration:** `VITE_SITE_URL`, `VITE_BASE`; `react-router.config.ts` (`ssr:false`, `appDirectory:"src"`, `prerender`, `basename`) **và `vite.config.ts` (`base` phải bằng `basename`; thiếu `base` thì build thoát mã 1 không báo lỗi)**; `_headers`; `.env.example`.

# 6. Error / Concurrency / Consistency Handling

| Tình huống | Xử lý trong plan |
|---|---|
| Input sai (JSON/XML/JWT/Base64) | Core trả `Result` lỗi có `kind`+vị trí; UI `ErrorBanner`; giữ input + output hợp lệ trước đó (nhãn "Kết quả trước đó") |
| Kết quả cũ ghi đè mới (debounce/worker) | `latestWins(requestId)` ở mọi chỗ bất đồng bộ (Markdown, JSON lớn nếu có) |
| Worker lỗi/không khởi tạo được | Fallback chạy main thread nếu input nhỏ; nếu lớn ⇒ báo lỗi, không treo |
| Storage/Clipboard/Crypto thiếu | Theo System Design §7.3 (fallback hoặc lỗi rõ; không `Math.random`) |
| Lazy chunk lỗi sau deploy | ErrorBoundary theo route + nút tải lại |
| Đa tab | Bỏ qua ở v1 (ưu tiên thấp, ghi vào backlog) |
| Clear + Hoàn tác | Giữ bản sao trong state tạm 6 giây; hết hạn thì bỏ; không ghi storage |
| Hydration lệch | Mọi giá trị phụ thuộc browser chỉ đọc trong effect; theme qua `theme-init.js` |

Không có khóa/đồng bộ phân tán nào (không có chia sẻ trạng thái giữa người dùng).

# 7. Test Plan

Công cụ: Vitest (core + component, jsdom), Playwright (e2e, Chromium; Firefox/WebKit cho smoke ở M7), axe.

## 7.1. Unit (core) — map tới AC

| Module | Cases chính |
|---|---|
| `json` | hợp lệ giữ cấu trúc; lỗi có dòng/cột (mẫu message V8 và Firefox); minify tương đương; indent 2/4; số nguyên lớn cảnh báo; rỗng; Unicode; mảng lồng sâu |
| `base64` | round-trip Unicode/emoji; URL-safe; thiếu padding; ký tự sai; UTF-8 sai ⇒ lỗi; chuỗi rỗng; xuống dòng/khoảng trắng |
| `jwt` | token hợp lệ; 2 hoặc 4 phần; Base64URL sai; JSON sai; `exp` quá khứ/tương lai/thiếu; `nbf`; không có hàm verify |
| `uuid` | regex v4 (version/variant); đủ 1, 1000; >1000 bị chặn; crypto thiếu ⇒ fallback/lỗi; không trùng trong 1000 |
| `xml` | corpus PRD 9.3 (đủ 9 nhóm); round-trip DOM tương đương; lỗi malformed không tạo output; minify→parse lại |
| `color-core` | HEX 3/4/6/8; biên RGB 0/255; alpha 0/0.5/1; HSL↔RGB sai số làm tròn; từng harmony đúng góc; CSS vars hợp lệ |
| `contrast` | ví dụ WCAG (đen/trắng 21:1…), trắng/trắng 1:1; ngưỡng AA/AAA đúng; **4.499 ≠ Pass 4.5**; alpha (SD-15: `#000000` α0.5 trên `#FFFFFF` ⇒ ≈ 3.977); nền giả định đổi được |
| `gradient` | CSS linear/radial hợp lệ; ≥2 stop; thêm/xóa/reorder; sắp theo vị trí; góc biên |
| `markdown` | CommonMark/GFM đầy đủ (table, task list, footnote, strikethrough, autolink); **bảo mật**: `<script>`, `<img onerror>`, `javascript:` link, `<iframe>`, `<style>`, SVG nhúng, `data:text/html`, clobbering id; ảnh ngoài ⇒ không có `src`; `allowExternalImages=true` ⇒ có `src` http(s); link có `rel`; HTML export không chứa phần tử cấm |
| `storage` | tắt hoàn toàn; JSON hỏng; sai schema; quota đầy; fallback bộ nhớ |
| `registry` | slug duy nhất; mọi tool có meta đủ; tool giả tự có route/nav/sitemap (SD-6) |
| `tokens` | cặp màu chính đạt ngưỡng (khớp bảng §4.4 Design System) |

## 7.2. Component (Testing Library)
Shell/drawer/skip link; CopyButton (thành công, bị từ chối); UndoBar (hoàn tác, hết hạn); ErrorBanner nhảy tới vị trí; DeviceStatus (hai trạng thái); mỗi tool: rỗng → mẫu → kết quả → lỗi.

## 7.3. E2E (Playwright) — map SD-*

| ID | Kịch bản |
|---|---|
| E-1 (SD-1) | Mở trực tiếp + refresh từng route (kể cả với `base=/DevKit/`) |
| E-2 (SD-2,3) | `check:seo` trên `build/client`; sitemap/robots; 404 |
| E-3 (SD-4) | Không cảnh báo hydration/console error nghiêm trọng ở mọi route |
| E-4 (SD-5) | Theme: lưu, System, không flash (kiểm `data-theme` ở frame đầu bằng `addInitScript`/snapshot sớm) |
| E-5 (SD-7) | Theo dõi `page.on('request')`: mọi tool thao tác đầy đủ ⇒ **0 request ra ngoài origin**; Markdown ảnh ngoài ⇒ 0 request tới khi bật |
| E-6 (SD-8) | Markdown corpus bảo mật: `window.__pwned` không bao giờ được set |
| E-7 (SD-9) | Chặn `localStorage` ⇒ tool vẫn chạy, có thông báo |
| E-8 (SD-11) | `check:bundle`: chunk Home không chứa CodeMirror/unified/lowlight |
| E-9 | Copy/Download từng tool (đọc nội dung file tải về, `revoke`) |
| E-10 | A11y axe mọi route Light + Dark; điều hướng chỉ bàn phím; focus drawer/dialog |
| E-11 | Responsive 375/768/1024/1440: không overflow ngang toàn trang |
| E-12 | Hiệu năng: Markdown 1 MB gõ liên tục không đơ (ngưỡng đo, ghi lại số thực) |
| E-13 | Phím tắt D4 và không xung đột với editor |

## 7.4. Regression
Mỗi milestone chạy lại toàn bộ test trước đó (CI). Thay đổi `color-core`/`storage`/`ToolShell` kích hoạt chạy toàn bộ tool.

## 7.5. Test bổ sung sau review (F-1…F-13)

| Mã | Kịch bản | Nguồn |
|---|---|---|
| E-2b | **Dưới CSP production** (meta và header): mọi route hydrate, công cụ hoạt động, 0 CSP violation; script inline được băm đúng | F-1, SD-4 |
| E-2c | Canonical = URL tuyệt đối mong đợi cho mọi trang (có `base`); mọi URL trong sitemap trả 200; `404.html` tồn tại với title/H1 tĩnh; đường dẫn sai trả **mã 404** (static server mô phỏng GH Pages và kiểu Cloudflare); **`404.html` hydrate sạch (0 lỗi console/CSP) tại URL thiếu bất kỳ có base path** | F-2, F-3 |
| U-C1 | Contrast alpha: `#000000` α0.5 trên `#FFFFFF` ⇒ ratio 3.977; ca biên ngưỡng 3.0/4.5 có alpha; nền giả định đen/trắng/tùy chọn | F-4 |
| U-X1 | XML: fixture mixed content, `xml:space="preserve"`, whitespace có nghĩa, cho cả beautify và minify; so sánh theo quy tắc tương đương F-5 | F-5 |
| U-P1 | Palette: hue mong đợi từng mode tại `count` 2, 5, 10; `count` ngoài khoảng bị chặn | F-6 |
| U-M1 | Markdown file: `.md` UTF-8 có/không BOM, file rỗng, >5 MB bị từ chối, file không phải text | PRD 9.4, F-9 |
| U-M2 | Markdown draft opt-in: tắt sẵn; bật mới ghi; tắt = xóa key; >1 MB không lưu và cảnh báo | O5, F-9 |
| E-14 | Markdown: công tắc Chiều rộng tài liệu, banner riêng tư (đóng và nhớ), Copy từng code block | F-7 |
| E-15 | Lỗi parse giữ output hợp lệ trước đó có nhãn; ErrorBoundary cô lập tool lỗi (tool khác vẫn chạy) | SD-10, F-9 |
| E-16 | Contrast: Copy chữ / Copy nền ghi đúng giá trị vào clipboard | PRD 3.8 |
| U-I1 | i18n: mọi khóa của catalog phụ có đủ khóa của `vi`; `translate` dùng được ngoài React; lint chặn văn bản thô trong JSX | F-11 |
| U-U1 | `buildUrl` với/không base, path `/`, dấu `/` thừa | F-2 |

**Ngưỡng E-12 (cố định):** tài liệu ~1 MB, long task do cập nhật preview ≤ 100 ms ở p95 (xem Change 4.7c).

---

# 8. Implementation Order

```
M0 spike SSG + scaffold + CI  ──► [báo bạn kết quả spike, chốt A/A'/C]
M1 foundation (tokens, registry, shell, common, storage, editor, Home/404, scripts)
M2 shared cores + fixtures
M3 P0: JSON → Base64 → JWT → UUID           ──► Cổng QA/Review 1
M4 Markdown (core bảo mật trước, UI sau; TOC/sync/export cuối)
M5 XML (spike formatter → core → UI)
M6 Color: color-core → Picker → Palette → Contrast → Gradient
M7 Polish + a11y + hiệu năng + hướng dẫn/SEO ──► Cổng QA/Review 2 (toàn bộ)
M8 Deploy thử (GH Pages, theo O3) → production (Cloudflare Pages, theo O4)
```
Thứ tự cắt giảm khi thiếu thời gian (đúng PRD §10): SQL Formatter (đã loại) → TOC/sync scroll/export HTML Markdown → gợi ý màu Contrast → kéo-thả stop Gradient → phím tắt D4.

Quy trình mỗi milestone (quyết định O6): tạo nhánh `feat/m<n>-<tên>` từ `main`; skill `4-implement-code` theo plan; commit nhỏ; mở **PR** vào `main` (mô tả liệt kê requirement/AC đã phủ và kết quả build/typecheck/lint/test thật); agent `tech-lead-reviewer` review diff PR ở các cổng QA/Review; **bạn là người merge**. `main` luôn xanh CI. **Không code UI trước khi design được duyệt** (đã đạt).

# 9. Assumptions

| # | Assumption | Nếu sai |
|---|---|---|
| P1 | Node ≥ 22 và npm có trên máy dev/CI (máy hiện có Node 24, npm 11) | Điều chỉnh `engines` và workflow |
| P2 | Bộ phiên bản đã kiểm bằng `npm view` cài và chạy cùng nhau được (chưa cài thử) | M0 phát hiện sớm; pin lại phiên bản hoặc đổi A/A'/C |
| P3 | RR framework mode với `ssr:false` + `prerender` cho phép `basename` và `routes.ts` đọc được registry dữ liệu thuần | Dùng A' hoặc C |
| P4 | `localStorage`, `crypto`, `DOMParser`, `Worker` có ở trình duyệt hiện đại mục tiêu | Có fallback/lỗi rõ như đã thiết kế |
| P5 | Ngưỡng 200 KB cho Worker và mục tiêu hiệu năng là đề xuất | Đo ở M7, chỉnh hằng số |
| P6 | v1 chỉ có tiếng Việt; hạ tầng i18n nhẹ tự viết là đủ (không cần ICU message format phức tạp) | Nếu cần định dạng phức tạp ⇒ chuyển sang `i18next`/FormatJS; vì chuỗi đã theo khóa nên đổi rẻ |
| P7 | Design D1–D4 đã được duyệt (2026-11-01) | — |
| P8 | Chuyển repo sang public là chấp nhận được với toàn bộ nội dung hiện có | Giữ private và dùng Cloudflare Pages sớm hơn |

# 10. Risks

| # | Rủi ro | Kịch bản | Giảm thiểu |
|---|---|---|---|
| K1 | Khóa phiên bản "mới nhất" chưa từng chạy cùng nhau (Vite 8, RR 8, TS 6, Tailwind 4, ESLint 9) | Peer conflict/bug build | Spike M0 + lockfile; dừng báo cáo nếu phải hạ nhiều thư viện |
| K2 | SSG không đạt (hydration lệch, `window` ở top-level, base path) | Mất SEO/preview | Ranh giới `ClientOnly`, phương án A'/C, kiểm `check:seo` trong CI |
| K3 | XSS/rò rỉ trong Markdown | Sai allowlist, plugin lệch thứ tự | Một sanitizer AST, `SafeHtml` duy nhất + lint, corpus bảo mật + e2e network (E-5/E-6), reviewer độc lập |
| K4 | XML formatter làm đổi nội dung | CDATA/mixed content | Spike M5a, so sánh DOM chuẩn hóa, không auto-fix |
| K5 | Khác biệt trình duyệt (message lỗi JSON, `parsererror` XML, Clipboard) | Vị trí lỗi sai/thiếu | Parser lỗi theo nhiều định dạng, test bằng fixture message của V8/Firefox/Safari; hiển thị "vị trí không xác định" khi không đọc được |
| K6 | Phạm vi Week 1 quá lớn (10 tool + shell + SSG + test) | Trễ | Cổng QA sớm (sau P0), danh sách cắt giảm, Markdown nâng cao tách task |
| K7 | CSP `unsafe-inline` cho style và `img-src https:` làm CSP yếu hơn mong muốn | Chấp nhận có chủ đích | Phòng thủ ở tầng ứng dụng (K3); ghi trong tài liệu |
| K8 | GitHub Pages không đặt được HTTP header; repo public lộ lịch sử | CSP chỉ qua `<meta>`; lộ nội dung không định công khai | CSP `<meta>` là phần tử đầu `<head>` với tập hash toàn site (1.14b); rà lịch sử git trước khi public; header đầy đủ khi lên Cloudflare |
| K11 | Giới hạn độ dài dòng header của Cloudflare Pages với CSP chứa nhiều hash (ghi nhớ, chưa kiểm chứng) | Header CSP bị từ chối/cắt | Dùng CSP `<meta>` (đã chứng minh) + `X-Frame-Options`; xác nhận ở M8 |
| K10 | i18n theo khóa làm chậm việc viết UI/nội dung | Mỗi chuỗi phải khai báo khóa | Lint chặn chuỗi cứng; chấp nhận chi phí nhỏ để rẻ khi thêm ngôn ngữ |
| K9 | Phụ thuộc nhiều gói mới chưa được kiểm chứng lâu | Bug/ngừng bảo trì | Dùng lockfile, ưu tiên API trình duyệt; thêm dependency chỉ khi theo milestone |

# 11. Decisions (đã chốt 2026-11-01) và câu hỏi còn mở

| # | Nội dung | Quyết định |
|---|---|---|
| O1 | Pin TypeScript ~6.0.3, ESLint ^9; SSG ưu tiên React Router framework mode (thay `vite-react-ssg`); spike M0 quyết định cuối | **Đồng ý (2026-11-01).** Spike M0 vẫn quyết định cuối giữa A, A' và C |
| O2 | Ngôn ngữ UI | **Chỉ tiếng Việt ở v1, có hạ tầng i18n** để thêm ngôn ngữ sau (Change 1.13b) |
| O3 | Deploy | **Bản thử: public repo + GitHub Pages. Sau khi ổn: Cloudflare Pages** (M8) |
| O4 | Domain | **Mua domain sau khi chạy thử ổn**; trước đó dùng URL github.io |
| O5 | Nhớ bản nháp Markdown (opt-in) | **Làm** (Change 4.7) |
| O6 | Quy trình nhánh | **Nhánh `feat/*` + PR mỗi milestone** |
| O7 | Thiết kế D1–D4 | **Đã duyệt** (Design System §12 đã cập nhật) |

Không còn câu hỏi mở. Khi bắt đầu M8, mình hỏi lại riêng việc đổi repo sang public.

---

# 12. Approval

**Implementation has not started.** Không có file code, cấu hình, dependency hay commit nào được tạo bởi plan này (chỉ tài liệu).

Đã chạy review độc lập lần 1 (REQUEST CHANGES) và re-review lần 2 (APPROVE WITH MINOR FIXES); mọi thay đổi bắt buộc đã áp dụng ở v1.2. Bước tiếp theo: bạn nhắn:

**I APPROVE**


---

# Phụ lục A — Kết quả review độc lập lần 1 (Opus, effort medium) và cách xử lý

Verdict: **REQUEST CHANGES** (1 HIGH, 8 MEDIUM, 4 LOW). Đã xác minh bởi reviewer: các phát biểu thư viện ở §2.1 đúng; các con số contrast của Design System §4.4 khớp khi tính lại.

| # | Mức | Nội dung | Xử lý trong v1.1 |
|---|---|---|---|
| F-1 | HIGH | CSP `script-src 'self'` sẽ chặn script inline hydrate của React Router (độ tin cậy: *Likely*, chưa tải mã nguồn để chứng minh) | Thêm tiêu chí spike 6; Change 1.14b băm SHA-256 từng script inline, CSP theo trang; cấm `'unsafe-inline'`; mọi phương án A/A'/C phải đạt; test E-2b |
| F-2 | MED | Canonical/sitemap lặp base path (`/DevKit//DevKit/`) | `VITE_SITE_URL` chỉ là origin; `buildUrl()` (1.4b); `check:seo` so với URL mong đợi; test E-2c, U-U1 |
| F-3 | MED | `404.html` chỉ tạo trong workflow GH, không prerender; Cloudflare dễ soft-404 | Tiêu chí spike 7; Change 1.14c; `check:seo` kiểm 404; E-2c |
| F-4 | MED | Độ chính xác alpha compositing chưa xác định (3.977 vs 3.949) | Chọn số thực; chỉnh SD-15 ≈ 3.977; U-C1 |
| F-5 | MED | Quy tắc tương đương XML cho mixed content/whitespace chưa xác định | Định nghĩa trong 5a; U-X1 |
| F-6 | MED | Quy tắc palette khi `count` thay đổi chưa xác định | Định nghĩa đầy đủ trong 6.3; U-P1 |
| F-7 | MED | Thiếu Document width, banner riêng tư, Copy từng code block | Change 4.7b; thêm khóa storage; E-14 |
| F-8 | MED | AC 1 MB không đơ chưa tính chi phí `innerHTML` | Change 4.7c: lộ trình giảm tải + ngưỡng cố định |
| F-9 | MED | Thiếu test: file Markdown, giữ output cũ, ErrorBoundary, bundle `eval`, draft opt-in, Copy màu | §7.5 và `check:bundle` mở rộng |
| F-10 | LOW | Mâu thuẫn nội bộ plan; trạng thái "Draft" ở tài liệu đã duyệt | Đã sửa plan; cập nhật trạng thái 03 và design docs |
| F-11 | LOW | i18n: nội dung hướng dẫn trong TSX, cơ chế lint, `meta` không dùng được hook | Nội dung có cấu trúc trong catalog; selector lint; hàm `translate` không hook |
| F-12 | LOW | Twitter Card, Copy fg/bg, About, `rehype-slug` × sanitize | Twitter Card, Copy chữ/nền, thứ tự slug đã thêm; **About không làm ở v1** (PRD 5.1 ghi "tùy layout"; Feedback đã hoãn) |
| F-13 | LOW | `engines`/`react` pin chưa khớp `react-router@8.5.1` | Node `>=22.22.0`, React `>=19.2.7` |


## Re-review lần 2 (Opus, effort medium) — APPROVE WITH MINOR FIXES

Xác minh từ mã nguồn thật `react-router@8.5.1`/`@react-router/dev@8.5.1` (đọc, không chạy script): F-1 **được xác nhận** (script inline do router sinh), chiến lược băm hợp lệ và khả thi. Phát hiện mới đã xử lý trong v1.2:

| Mức | Phát hiện | Xử lý |
|---|---|---|
| MED | Cloudflare `_headers` nối giá trị header trùng bằng dấu phẩy; CSP theo trang tạo hai chính sách giao nhau; `404.html` phục vụ ở URL tùy ý | Dùng **một CSP toàn site chứa hợp mọi hash**, một quy tắc `/*` (1.14b) |
| MED | M8/K8 còn `VITE_SITE_URL` có `/DevKit/`, "copy SPA fallback", "hằng số chung" | Đã sửa M8, K8 |
| MED | Prerender từ chối phản hồi khác 200; `404.html` chỉ hydrate đúng tại URL tùy ý nếu route 404 là splat | Splat route, prerender 200, copy thành `404.html` trước `gen-csp`; thêm kiểm hydrate tại URL thiếu (tiêu chí 7, 1.14c, E-2c) |
| LOW | §7.2 còn 3.95 | Sửa thành 3.977 (đã tính lại: 0.5 alpha đen trên trắng ⇒ 3.9767) |
| LOW | Meta CSP phải là phần tử đầu `<head>` (trước cả `modulepreload`) | Đã sửa 1.14b |

Điều kiện ghi cho spike: `gen-csp` là bước cuối chạm HTML; xử lý cả `*/index.html`, `404.html`, `__spa-fallback.html`; băm trên văn bản LF; spike tiêu chí 3 xác nhận `<meta>` CSP không gây cảnh báo hydration.


---

# Phụ lục B — Kết quả spike M0.1 (2026-11-01)

Chọn **phương án A** (React Router framework mode + prerender). Đã chạy thật trên bộ phiên bản của plan (`react-router@8.5.1`, `vite@8.3.5`, `typescript@6.0.3`); CSP dạng `<meta>` và dạng header đều hydrate sạch, đối chứng âm (không hash) xác nhận F-1. Phát hiện kéo theo: bước ghép `stage` (1.14d), `BASE_URL` cho theme-init, `base`=`basename`, rủi ro K11, ghi chú Git Bash trên Windows. Chi tiết và giới hạn của spike: `docs/design/ssg-spike.md`.
