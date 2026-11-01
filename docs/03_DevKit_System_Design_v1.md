# DevKit — System Design

**Phiên bản:** 1.0
**Trạng thái:** Approved (2026-11-01); SD-15 chỉnh theo review plan F-4; mục CSP (12.4) được bổ sung bằng băm script inline theo trang, xem Implementation Plan 1.14b
**Nguồn:** [`01_DevKit_Requirements_v1.1.md`](./01_DevKit_Requirements_v1.1.md) (Approved), [`02_DevKit_Design_System_v1.1.md`](./02_DevKit_Design_System_v1.1.md)
**Phạm vi:** kiến trúc kỹ thuật cho DevKit v1. **Không** gồm UI visual (thuộc bước 1.5) và không gồm kế hoạch từng file (thuộc bước 2).

---

# 1. Requirement Understanding

## 1.1. Tóm tắt
DevKit là website public gồm 10 tool P0/P1 (JSON, JWT, Base64, UUID, XML, Markdown Preview, Color Picker/Palette/Contrast/Gradient) + SQL Formatter (P2). Toàn bộ xử lý ở client; không backend/DB riêng; chỉ gọi ra ngoài tới **Feedback Service có sẵn**.

## 1.2. Các ràng buộc quyết định kiến trúc

| # | Ràng buộc | Nguồn |
|---|---|---|
| C1 | Dữ liệu người dùng không rời trình duyệt (kể cả request ngầm như tải ảnh Markdown) | PRD §1.2, §3.10, §4.2 |
| C2 | Không backend/database riêng; static hosting, chi phí thấp | PRD §1.2 |
| C3 | Public + cần SEO/link preview ⇒ **prerender từng route** | PRD §8 |
| C4 | Mỗi tool một route ổn định, refresh trực tiếp phải chạy | PRD §5.2 |
| C5 | Stack đề xuất: React + TypeScript + Vite, Tailwind + CSS variables, CodeMirror | PRD §7.1 |
| C6 | Tokens/Design System là nguồn sự thật cho UI; light/dark không flash | Design System |
| C7 | Feedback Service: không giả định contract; endpoint cấu hình được | PRD §6 |
| C8 | Thêm tool mới không đổi kiến trúc | PRD §1.1 |

## 1.3. Assumptions

| # | Assumption | Vì sao cần | Nếu sai |
|---|---|---|---|
| A1 | Chưa có code; đây là greenfield (thư mục chỉ có docs) | Không có kiến trúc hiện hữu để tái sử dụng | Nếu có repo khác, quay lại Phase 2 và đối chiếu convention |
| A2 | Input thông thường ≤ ~1 MB; trên 5 MB là ngoại lệ được phép từ chối/cảnh báo | Chọn chiến lược hiệu năng | Cần worker cho nhiều tool hơn |
| A3 | Hosting đích là Cloudflare Pages; GitHub Pages dùng cho bản thử | Hỗ trợ custom headers (CSP) và SPA/404 | GitHub Pages không đặt được HTTP header ⇒ CSP chỉ qua `<meta>` (hạn chế hơn) |
| A4 | (Hoãn cùng Feedback) Feedback Service sau này cho phép CORS từ origin DevKit | Gọi trực tiếp từ browser | Nếu không, cần proxy (trái C2) ⇒ bàn lại khi làm Feedback |

## 1.4. Quyết định cho các câu hỏi mở (đã chốt 2026-11-01)

| # | Câu hỏi | Chặn bước nào | Đề xuất mặc định |
|---|---|---|---|
| Q1 | Contract Feedback Service | — | **Quyết định: bỏ qua trong v1.** Feedback Service sẽ làm và tích hợp sau; v1 không có form, entry point hay `FeedbackClient`. Giữ chỗ trong kiến trúc (xem 6.1) |
| Q2 | Contrast Checker có hỗ trợ alpha không? | Phase 3 | **Quyết định: có.** Quy tắc ở 3.5 |
| Q3 | Domain/URL production và base path của bản thử GitHub Pages | Prerender, canonical, sitemap | **Quyết định: đồng ý** — cấu hình `VITE_SITE_URL` và `VITE_BASE` theo môi trường |
| Q4 | Giữ nút "Tải ảnh ngoài" trong Markdown | CSP, Markdown pipeline | **Quyết định: giữ**, mặc định tắt, có xác nhận; xem R4 |
| Q5 | Có thêm test framework | Test plan | **Quyết định: có** — Vitest + Testing Library + Playwright (mục 12) |

---

# 2. Existing Architecture

Không có (A1). Thư mục hiện chỉ có `docs/`, `CLAUDE.md`, file v1 gốc. Vì vậy:
- Không có component để tái sử dụng hoặc sửa; mọi thành phần dưới đây là **mới**.
- Convention sẽ được đặt bởi Design System + tài liệu này. Nếu bước Implement Plan phát hiện repo có sẵn convention khác, convention đó thắng (PRD §12.4).

---

# 3. Proposed Architecture

## 3.1. Tổng quan

```text
                    ┌──────────────── Build time (Node) ────────────────┐
 tools registry ──► │ Vite build ─► SSG/prerender (mỗi route ─► HTML)   │──► dist/ (static)
 (metadata+route)   │ sitemap.xml · robots.txt · 404.html · _headers    │
                    └───────────────────────────────────────────────────┘
                                          │ deploy
                                          ▼
                              Static hosting (Cloudflare Pages / GH Pages)
                                          │
                    ┌──────────────── Runtime (Browser) ───────────────┐
                    │ HTML prerender ─► hydrate SPA                     │
                    │                                                   │
                    │  App Shell ── Router ── Tool Page (lazy chunk)    │
                    │     │                      │                      │
                    │  Theme · Layout        Feature module             │
                    │     │                   ├─ UI (React)             │
                    │     │                   └─ logic (pure TS, no DOM)│
                    │     │                           │                 │
                    │  Shared: editors · storage · text utils · color   │
                    │          core · markdown pipeline · download/copy │
                    │                                                   │
                    │  (Feedback Client: hoãn, thêm sau)                │
                    └───────────────────────────────────────────────────┘
```

v1 **không có đường ra ngoài nào** (Feedback Service được hoãn). Không có analytics gửi nội dung; nếu sau này thêm analytics, chỉ gửi pageview ẩn danh (ngoài scope v1).

## 3.2. Nguyên tắc cấu trúc (quyết định chính)

1. **Tool Registry là nguồn sự thật duy nhất** (một file dữ liệu). Mỗi tool khai báo: `id`, `slug`/route, nhóm, tên, mô tả, priority, SEO (title, description, OG), icon, trạng thái hiển thị (ẩn SQL ở v1), lazy import. Từ đó **sinh ra**: route, sidebar, Home, breadcrumb, sitemap, metadata prerender. Thêm tool = thêm 1 feature module + 1 dòng registry (đáp ứng C8).
2. **Tách logic thuần khỏi UI.** Mỗi feature có `core/` là TypeScript thuần (không React, không DOM global, không `window`), nhận input → trả kết quả/lỗi có kiểu. UI chỉ gọi core. Lợi ích: unit test không cần browser, chạy được ở Node, không lỗi lúc prerender.
3. **Mọi thứ phụ thuộc browser nằm sau ranh giới "client-only"**: `localStorage`, `navigator.clipboard`, `DOMParser`, `crypto`, CodeMirror, File API. Component dùng chúng chỉ chạy trong `useEffect`/event handler; phần prerender chỉ render shell, tiêu đề, mô tả, hướng dẫn và skeleton cho workspace.
4. **Route-level code splitting**; thư viện nặng (CodeMirror language packs, pipeline Markdown, highlighter) nạp khi vào đúng tool.
5. **Không global store.** State cục bộ trong từng tool (hooks); chỉ 2 thứ toàn cục: theme và (tùy chọn) UI preferences, qua context nhỏ. Tránh thêm Redux/Zustand khi chưa có nhu cầu.

## 3.3. Components

| Component | Trách nhiệm | Phụ thuộc | Sở hữu dữ liệu |
|---|---|---|---|
| **Tool Registry** | Metadata + lazy loader của mọi tool; sinh route/nav/sitemap/SEO | — | Metadata tool |
| **App Shell** | Layout (sidebar/topbar/drawer mobile), Outlet, error boundary, 404 | Router, Theme | — |
| **Router** | Route từ registry + Home + 404; tương thích SSG | Registry | — |
| **Theme Provider** | Light/Dark/System, đặt `data-theme` + `color-scheme` | Storage | `devkit:theme` |
| **SEO/Head** | Gắn title/meta/OG/canonical theo route, dùng cả lúc prerender | Registry, env | — |
| **Storage Service** | Bọc `localStorage` an toàn (try/catch, fallback bộ nhớ, validate + versioned) | — | Mọi khóa `devkit:*` |
| **Editor** (wrapper CodeMirror) | Editor read-write/read-only, ngôn ngữ, theme đồng bộ, lazy | CodeMirror | — |
| **Clipboard/Download utils** | Copy có fallback; tải file bằng Blob + revoke URL | — | — |
| **Text core** | Base64/Base64URL, UTF-8, đo thống kê văn bản | — | — |
| **Color core** | Parse/convert/normalize/alpha/contrast/harmony/CSS serialize | Culori | — |
| **Markdown core** | Pipeline parse → sanitize → highlight → HTML (xem 3.4) | unified, … | — |
| **Feature modules** ×10 | UI + core riêng cho từng tool | shared | State cục bộ |
| ~~Feedback Client~~ *(hoãn)* | Không làm trong v1; xem 6.1 | — | — |
| **Build pipeline** | Prerender, sitemap, robots, 404, headers, kiểm tra SEO | Registry | `dist/` |

## 3.4. Markdown pipeline (thành phần rủi ro cao nhất)

Thứ tự bắt buộc, mọi bước là hàm thuần có test:

```text
Markdown text
  → remark-parse (+ remark-gfm)
  → remark-rehype   (raw HTML KHÔNG được chuyển thành node; mặc định bị bỏ)
  → rehype-sanitize (allowlist chặt: không script/style/iframe/form/on*; style attr bị bỏ)
  → plugin "link policy": chỉ http/https/mailto; thêm rel="noopener noreferrer", target="_blank" cho link ngoài
  → plugin "image policy": ảnh data: (png/jpeg/gif/webp, không svg) giữ nguyên;
        ảnh URL ngoài → thay bằng placeholder có data-blocked-src (KHÔNG đặt src) trừ khi allowExternalImages=true
  → highlight code (sau sanitize, trên node đã an toàn; sinh class do thư viện tạo, không đi qua input người dùng)
  → rehype-stringify → chuỗi HTML đã an toàn
```

Quyết định:
- **Sanitize trước, highlight sau**: tránh phải nới allowlist `class` cho đầu vào người dùng.
- **Một sanitizer duy nhất** (rehype-sanitize ở mức AST), không chồng DOMPurify (tránh hai chính sách lệch nhau). Hiển thị bằng `innerHTML` chỉ trên chuỗi đã qua pipeline; ranh giới này gói trong một component duy nhất `SafeHtml` để dễ audit.
- **Ảnh ngoài chặn bằng cấu trúc (không có `src`)**, không chỉ dựa vào CSP ⇒ không phát sinh request kể cả khi CSP bị cấu hình sai.
- Highlight: dùng highlighter dựa trên highlight.js (lowlight) với **tập ngôn ngữ con nạp lazy**; không dùng Shiki (WASM/grammar nặng) ở v1.
- Chế độ Copy HTML / Download `.html` dùng đúng chuỗi này (bản "export" có thể bọc style cơ bản inline, không thêm script).

## 3.5. Quy tắc Contrast với alpha (Q2)

- Foreground có alpha < 1: trộn (alpha compositing, không gian sRGB) lên **màu background hiệu dụng** rồi tính luminance.
- Background có alpha < 1: trộn lên **nền giả định** để có màu đặc. Mặc định là trắng `#FFFFFF` (đơn giản, không phụ thuộc theme của app), hiển thị rõ ghi chú "Nền trong suốt được tính trên nền trắng", và cho người dùng đổi nền giả định (trắng/đen/màu tùy chọn).
- Hiển thị cả màu đã trộn (kết quả hiệu dụng) bên cạnh màu nhập để người dùng thấy tool đã tính gì.
- Ratio dùng giá trị chưa làm tròn để so ngưỡng (R7).
- Đặt toàn bộ trong `color-core` (hàm thuần), có test biên: alpha 0, 0.5, 1; nền trắng/đen.

---

# 4. Data Flow

## 4.1. Luồng tool thông thường (JSON/XML/Base64/UUID/JWT/Color…)

```
Người dùng nhập ──► Editor/Input (UI)
   ──► (debounce nếu input lớn) ──► core.process(input, options)
   ──► Result { ok: true, output } | { ok: false, error{kind,message,position?} }
   ──► UI: output + status | error inline (giữ output hợp lệ trước đó)
   ──► Copy / Download (Blob→objectURL→click→revoke)
```
`error.kind` ∈ `validation | processing | unexpected` (PRD §7.5). Input không bao giờ vào log.

## 4.2. Markdown
```
Gõ ──► debounce ──► markdown core (sync nếu nhỏ; Web Worker nếu lớn) ──► HTML an toàn ──► SafeHtml
Mở file ──► File API (FileReader, giới hạn kích thước) ──► đặt vào editor (không upload)
Toggle "Tải ảnh ngoài" ──► xác nhận ──► render lại với allowExternalImages=true (duy nhất chỗ có thể phát sinh request ảnh)
```

## 4.3. Theme (không flash)
```
HTML prerender có inline script nhỏ (hash-allowlisted trong CSP):
  đọc devkit:theme (try/catch) → đặt <html data-theme>, color-scheme  (trước khi paint)
React hydrate: ThemeProvider đọc cùng nguồn; không render khác nhau theo theme ở server ⇒ không lệch hydration.
```

## 4.4. Feedback — HOÃN khỏi v1 (thiết kế dự kiến khi làm sau)
```
Form ──► validate ──► FeedbackClient.submit(payload tối thiểu) ──► Service
   success: chỉ khi service xác nhận 2xx theo contract → thông báo
   lỗi mạng/timeout/4xx/5xx → thông báo rõ + nút "Thử lại" (do người dùng bấm)
```
Không tự động retry (tránh gửi trùng vì chưa biết service có idempotency hay không).

## 4.5. Build & phát hành
```
registry ──► vite build ──► prerender từng route ──► kiểm tra (mỗi HTML có title/description/OG/H1 duy nhất)
          ──► sitemap.xml, robots.txt, 404.html, _headers (CSP) ──► deploy static
```

---

# 5. Data Model (client-side)

Không có database. Chỉ có `localStorage`, tất cả qua Storage Service; mọi khóa có tiền tố `devkit:` và **version**; đọc phải validate schema, sai/hỏng ⇒ bỏ qua và dùng mặc định.

| Khóa | Nội dung | Ghi chú |
|---|---|---|
| `devkit:v1:theme` | `"light" \| "dark" \| "system"` | Mặc định `system` |
| `devkit:v1:recent-colors` | Mảng ≤ 20 chuỗi màu chuẩn hóa (HEX 8 ký tự), mới nhất trước, không trùng | Người dùng xóa được |
| `devkit:v1:md-view` | `"edit" \| "split" \| "preview"` | Chỉ preference hiển thị |
| `devkit:v1:md-draft` | Nội dung Markdown | **Chỉ khi người dùng bật opt-in**; có nút xóa; mặc định không tồn tại |

Không lưu input của JSON/XML/JWT/Base64/SQL ở bất kỳ nơi nào.

Mô hình dữ liệu trong bộ nhớ (kiểu dùng chung, không phải bảng): `ToolMeta`, `Result<T,E>` với `ToolError{kind, message, position?}`, `Color` (đã chuẩn hóa, có alpha), `GradientStop{id,color,position}`, `MarkdownOptions{allowExternalImages}`.

---

# 6. API / Integration Contract

## 6.1. Feedback Service — HOÃN khỏi v1
- Quyết định Q1: không làm trong v1. Mục này chỉ ghi nguyên tắc để lần tích hợp sau không phá kiến trúc; **không implement**.
- **Chưa có contract** ⇒ không định nghĩa endpoint/payload ở đây.
- Thiết kế ranh giới: interface `FeedbackClient { submit(input: FeedbackInput): Promise<Result<void, FeedbackError>> }`; implementation đọc `VITE_FEEDBACK_ENDPOINT`; khi thiếu cấu hình ⇒ trả lỗi "chưa cấu hình", **không giả lập thành công**.
- Payload chỉ chứa: loại feedback, nội dung, liên hệ tùy chọn, metadata tối thiểu (route, phiên bản app). Không có input/output của tool (kiểm bằng test: serializer chỉ nhận trường whitelist).
- Timeout (đề xuất 10 s), phân loại lỗi: mạng / timeout / 4xx (hiển thị lý do nếu service trả) / 5xx. Không lộ stack.
- Khi làm Feedback: thêm origin của service vào `connect-src` trong CSP (v1: `connect-src 'self'`).

## 6.2. Không có API nội bộ
Không có endpoint của DevKit.

---

# 7. Async / Concurrency / Failure Handling

## 7.1. Xử lý input lớn
- Debounce 150–300 ms cho preview/format tự động; nút thao tác thủ công chạy ngay.
- **Latest-wins**: mỗi lần chạy gắn `requestId`; kết quả cũ đến sau bị bỏ (tránh output cũ ghi đè input mới).
- Markdown: nếu input vượt ngưỡng (đề xuất ban đầu 200 KB, cần đo ở Implement/QA) ⇒ chạy pipeline trong **Web Worker**; dưới ngưỡng chạy trên main thread. Worker chỉ nhận/trả chuỗi (không DOM). Worker lỗi/timeout ⇒ UI báo lỗi, giữ input.
- Giới hạn cứng: file mở/dán > 5 MB (A2) ⇒ từ chối với thông báo rõ, không treo UI.

## 7.2. Đa tab
- Theme và recent colors có thể đổi ở tab khác: lắng nghe `storage` event để đồng bộ (ưu tiên thấp, không bắt buộc v1).

## 7.3. Thất bại và phục hồi

| Lỗi | Phát hiện | Trạng thái sau lỗi | Phục hồi |
|---|---|---|---|
| `localStorage` không dùng được | try/catch ở Storage Service | Fallback bộ nhớ trong phiên; tool vẫn chạy | Thông báo nhẹ một lần |
| Clipboard bị từ chối/không có | promise reject / API thiếu | Giữ output | Fallback `execCommand`/chọn văn bản + hướng dẫn |
| `crypto.randomUUID` không có (không secure context) | feature check | — | Fallback `getRandomValues`; nếu không có cả hai ⇒ báo lỗi rõ, **không** dùng `Math.random` |
| Parse lỗi (JSON/XML/JWT/Base64) | core trả `ok:false` | Giữ input, giữ output hợp lệ trước | Người dùng sửa |
| Chunk lazy-load lỗi (mạng, deploy mới) | `import()` reject | Hiện error boundary theo route | Nút tải lại; không mất state ngoài tool đó |
| Feedback lỗi | 6.1 | Giữ nội dung form | Thử lại thủ công |
| Lỗi render không lường | Error boundary | Chỉ tool đó hỏng | Hiển thị lỗi chung, **không** stack/nội dung input; log kỹ thuật không chứa input |

---

# 8. Scalability / Performance

Workload: tải tĩnh qua CDN, xử lý ở client ⇒ không có bottleneck server. Quan tâm duy nhất là hiệu năng client và kích thước bundle.

- **Mục tiêu đề xuất (cần xác nhận ở Implement/QA, chưa phải yêu cầu đã duyệt):** trang Home và các tool nhẹ không tải CodeMirror/Markdown; chunk CodeMirror/Markdown chỉ tải ở route tương ứng; gõ liên tục trong Markdown 1 MB không làm UI đơ > 100 ms mỗi thao tác (đo bằng Playwright/Performance API).
- Tối ưu có lý do cụ thể: lazy-load (giảm JS ban đầu), Worker (tránh block khi render Markdown lớn), debounce (tránh render thừa). Không thêm cache/batching khác.
- Font self-host, `font-display: swap`, subset nếu cần.
- Asset băm tên file (cache dài hạn); HTML cache ngắn.

---

# 9. Alternatives and Trade-offs

## 9.1. Prerender (quyết định C3)

| Option | Ưu | Nhược |
|---|---|---|
| **A. SSG tích hợp React Router (ví dụ `vite-react-ssg`)** — render ở Node lúc build | HTML có nội dung thật; không cần headless browser; nhanh, ổn định trong CI; đã ở trong stack Vite+React | Code lúc render phải an toàn với Node (không `window`); phụ thuộc phiên bản thư viện/React Router |
| B. Prerender bằng headless browser (plugin dựa Puppeteer/Playwright) | Ít phải sửa code (chạy app thật) | Nặng, chậm, dễ chập chờn trong CI; thêm binary browser; khó kiểm soát |
| C. Script nhân bản `index.html` + chỉ thay `<head>` | Nhẹ nhất; đủ cho link preview và metadata | Body vẫn rỗng cho crawler; H1/hướng dẫn không có trong HTML |
| D. Framework khác (Astro/Next export) | SEO tốt nhất | Đổi stack — PRD cấm đổi tự ý |

**Khuyến nghị: A**, vì chỉ ~12 route tĩnh, nguyên tắc 3.2.(2,3) đã đảm bảo code an toàn với Node, và không thêm hạ tầng. **Phương án dự phòng: C** (đủ cho metadata/OG) nếu A xung đột phiên bản với Router đang chọn — kiểm tra tương thích là việc đầu tiên của Phase 1 trong Implement Plan.

## 9.2. Pipeline Markdown
- **unified (remark/rehype)** ✅ — sanitize ở mức AST, kiểm soát từng bước, tách được chính sách ảnh/link.
- markdown-it + DOMPurify — gọn, nhưng sanitize ở mức DOM (cần `document`, kém hợp với Worker/Node) và khó đặt chính sách ảnh theo cấu trúc.
→ Chọn unified.

## 9.3. Hosting
- **Cloudflare Pages** ✅ cho production: hỗ trợ `_headers` (CSP thật), 404 tùy biến, free tier.
- GitHub Pages: dùng cho bản thử (cần `base` path, không đặt được header ⇒ CSP bằng `<meta>`, không có `frame-ancestors`). Repo private cần gói trả phí.

---

# 10. Risks

| # | Loại | Rủi ro | Kịch bản | Tác động | Giảm thiểu |
|---|---|---|---|---|---|
| R1 | Bảo mật | XSS qua Markdown | Input có `<img onerror>`, `javascript:` link, SVG nhúng | Thực thi script trên origin DevKit | Pipeline 3.4, một sanitizer AST, `SafeHtml` duy nhất, CSP `script-src 'self'`, bộ test bảo mật PRD §9.4 |
| R2 | Privacy | Rò rỉ qua request ngầm | Ảnh/URL ngoài trong Markdown, font/CDN bên thứ ba | Vi phạm C1 | Chặn ảnh ngoài theo cấu trúc; self-host font; Playwright kiểm không có request ra domain ngoài khi không bật toggle |
| R3 | Build | Lỗi prerender/hydration | Code dùng `window` ở top level; theme render khác server | Build fail hoặc giao diện giật | Ranh giới client-only (3.2.3), theme qua inline script, test hydration warning = 0 |
| R4 | Cấu hình | CSP xung đột tính năng | "Tải ảnh ngoài" cần `img-src https:` ⇒ CSP không còn chặn được rò rỉ qua ảnh; CodeMirror cần `style-src 'unsafe-inline'` | CSP yếu hơn mong muốn | Chấp nhận có chủ đích (Q4); chặn ở tầng ứng dụng (R2); `script-src` vẫn chặt; ghi vào tài liệu |
| R5 | Đúng đắn | XML formatter làm mất/đổi nội dung | CDATA, comment, PI, mixed content (khoảng trắng có nghĩa) | Dữ liệu sai âm thầm | Chọn thư viện/thuật toán bằng bộ test PRD §9.3 trước; so sánh parse-lại tương đương; không "sửa" XML lỗi |
| R6 | Đúng đắn | JSON mất độ chính xác số lớn, gộp key trùng | `{"id": 12345678901234567890}` | Output khác input | Phát hiện số nguyên vượt an toàn và cảnh báo; ghi nhận key trùng là giới hạn (PRD §3.1) |
| R7 | Đúng đắn | Contrast làm tròn sai ngưỡng | 4.499 hiển thị 4.5 và Pass | Kết quả sai | So sánh ngưỡng trên giá trị chưa làm tròn; hiển thị cắt (không làm tròn lên) |
| R8 | Phụ thuộc | Feedback Service chưa có contract/CORS | Không gửi được | Đã loại khỏi v1 | Hoãn (Q1); khi làm lại: adapter + cấu hình, không giả lập |
| R9 | Hiệu năng | Markdown/JSON lớn làm đơ UI | Dán 5 MB | UX tệ | Giới hạn, debounce, Worker, latest-wins |
| R10 | Vận hành | Deploy mới làm chunk cũ 404 | Người dùng đang mở bản cũ | Lỗi lazy-load | Error boundary + tải lại; giữ asset cũ một thời gian nếu host hỗ trợ |
| R11 | Phạm vi | Thêm Markdown làm Week 1 nặng | Thiếu thời gian | Trễ | Thứ tự cắt giảm PRD §10; Markdown phần nâng cao (TOC, sync scroll, export HTML) tách task riêng |

Phân loại: R1–R7, R9–R11 là rủi ro thiết kế đã biết; R8 phụ thuộc thông tin bên ngoài (assumption A4/Q1).

---

# 11. Acceptance Criteria (cấp hệ thống, kiểm chứng được)

Bổ sung cho AC từng tool trong PRD; QA sẽ truy vết theo ID.

| ID | Tiêu chí |
|---|---|
| SD-1 | Mỗi tool trong registry (trừ tool ẩn) có route truy cập trực tiếp và refresh không 404, ở cả production và bản thử GH Pages (có base path) |
| SD-2 | `curl` mỗi route (không chạy JS) trả HTML có `<title>`, meta description, OG, canonical, đúng 1 `<h1>` khác nhau cho từng tool |
| SD-3 | `sitemap.xml` liệt kê đúng các route công khai (không có SQL nếu ẩn); `robots.txt` hợp lệ; có `404.html` |
| SD-4 | Build prerender không lỗi; không có cảnh báo hydration mismatch trong console khi tải từng route |
| SD-5 | Light/Dark/System hoạt động; không flash sai theme khi tải lại (kiểm bằng ảnh chụp frame đầu hoặc đo `data-theme` trước first paint) |
| SD-6 | Thêm một tool giả vào registry (test) tự xuất hiện ở nav, Home, route, sitemap mà không sửa nơi khác |
| SD-7 | Với cấu hình mặc định, thao tác trên mọi tool không tạo request mạng ra ngoài origin (Playwright theo dõi network); Markdown có ảnh URL ngoài không phát sinh request cho tới khi bật toggle |
| SD-8 | Bộ test bảo mật Markdown (PRD §9.4) pass: không thực thi script, HTML export không chứa phần tử bị chặn |
| SD-9 | `localStorage` bị tắt/lỗi: toàn bộ tool vẫn chạy, chỉ mất persistence, có thông báo không chặn |
| SD-10 | Lỗi parse không xóa output hợp lệ trước đó và không làm crash; error boundary cô lập lỗi theo tool |
| SD-11 | Chunk CodeMirror/Markdown không nằm trong bundle của Home và các tool không dùng chúng |
| SD-12 | *(Hoãn cùng Feedback)* v1 không có form/entry point Feedback và không có UI nào giả lập gửi thành công |
| SD-13 | Không có secrets trong bundle; không có `eval`/`new Function`; font được phục vụ từ cùng origin |
| SD-14 | Contrast: giá trị 4.499 không được đánh Pass ở ngưỡng 4.5 |
| SD-15 | Contrast có alpha: foreground alpha < 1 được trộn lên background; background alpha < 1 được trộn lên nền trang quy định (3.5); kết quả khớp giá trị tính tay trong test (vd. `#000000` alpha 0.5 trên `#FFFFFF`: trộn bằng số thực ⇒ kênh 127.5, ratio ≈ 3.977 — đã chỉnh sau review plan F-4; không lượng tử hóa 8-bit trước khi tính) |

---

# 12. Implementation Recommendation

## 12.1. Kiến trúc đề xuất
SPA React + TypeScript + Vite, prerender từng route bằng SSG (phương án 9.1.A, dự phòng C), Tool Registry làm trung tâm, feature module tách `core/` thuần và UI, các module dùng chung (storage, editors, text, color, markdown, io), hosting static với CSP.

## 12.2. Thành phần mới (toàn bộ do greenfield)
App shell + router + theme + head/SEO; registry; storage service; editor wrapper; text/color/markdown core; 10 feature module (SQL Formatter chỉ khung ẩn); build pipeline (prerender, sitemap, robots, 404, headers); cấu hình test.

## 12.3. Dependency dự kiến (cần xác nhận phiên bản và tương thích ở Implement Plan)
React, React Router, Vite, TypeScript, Tailwind CSS, CodeMirror 6 (+ ngôn ngữ cần thiết), Culori, react-colorful, lucide-react, unified + remark-parse + remark-gfm + remark-rehype + rehype-sanitize + rehype-stringify, lowlight (highlight lazy), thư viện SSG (vd. `vite-react-ssg`), Vitest + Testing Library, Playwright (+ axe cho a11y). XML formatter: quyết định giữa thư viện và tự viết **sau khi** chạy thử bằng bộ test PRD §9.3 (R5). Không thêm thư viện nếu API trình duyệt/TypeScript đáp ứng đủ.

## 12.4. Cấu hình / hạ tầng
Biến môi trường: `VITE_SITE_URL`, `VITE_BASE` (`VITE_FEEDBACK_ENDPOINT` thêm khi làm Feedback). `_headers` (CSP: `default-src 'self'`; `script-src 'self'` + hash SHA-256 của các script inline theo từng trang (do script hậu build sinh; xem Plan 1.14b), không `'unsafe-inline'`; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: https:`; `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`). CI: build + typecheck + lint + test + kiểm tra SEO của HTML prerender. Workflow deploy GH Pages cho bản thử (sau khi có app).

## 12.5. Ràng buộc cho Implement Plan
- Làm theo thứ tự: tương thích SSG ↔ Router (spike nhỏ) → shell/registry/theme → shared core → P0 → P1 → feedback → polish → deploy.
- Không code UI trước khi bước 1.5 (Frontend Design) được duyệt (CLAUDE.md).
- Không giả định contract Feedback; không thêm backend.
- Mỗi tool phải có test cho `core/` và ít nhất một smoke e2e.
- Không có Feedback trong v1 (Q1).

## 12.6. Test liên quan
Unit (core: JSON, XML, Base64, JWT, UUID, color, markdown, storage); component (shell, theme, tool pages); e2e Playwright (route refresh, network không rò rỉ, theme không flash, hydration sạch, Markdown bảo mật); kiểm tra SEO HTML prerender; a11y (axe) trên template tool page.

---

**DỪNG tại đây.** Chờ bạn xem xét và trả lời Q1–Q5 (hoặc chấp nhận mặc định đã đề xuất). Khi sẵn sàng, trả lời `I APPROVE` để chuyển sang **1.5 Frontend Design** (`frontend-design`) và sau đó **2 Implement Plan**.
