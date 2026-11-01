# DevKit — Product Requirements (PRD)

**Tài liệu:** Product Requirements Document
**Phiên bản:** 1.1 (tách từ `DevKit_Requirements_and_Design_System_v1`)
**Trạng thái:** Draft for implementation
**Phạm vi:** DevKit v1 — Frontend-only, tích hợp Feedback Service
**Tài liệu liên quan:** [`02_DevKit_Design_System_v1.1.md`](./02_DevKit_Design_System_v1.1.md) (design tokens, component spec, UI/UX workflow)

> PRD này chỉ mô tả **cái gì** cần xây (chức năng, phi chức năng, kiến trúc, kiểm thử, kế hoạch). Mọi quyết định về giao diện, token, component và quy trình thiết kế UI nằm trong Design System.

---

# 1. Tổng quan sản phẩm

## 1.1. Mục tiêu

DevKit là website cung cấp các tiện ích thường dùng trong quá trình phát triển phần mềm. Người dùng truy cập từng công cụ qua URL riêng, nhập dữ liệu, xử lý ngay trên trình duyệt và sao chép hoặc tải kết quả.

- Trải nghiệm đơn giản, nhất quán, tối ưu cho developer.
- Phản hồi nhanh; xử lý dữ liệu trên client.
- Không yêu cầu đăng nhập trong v1.
- Không phụ thuộc backend hoặc database riêng.
- Responsive trên desktop, tablet, mobile.
- Mở rộng thêm tool mà không đổi kiến trúc tổng thể.

## 1.2. Nguyên tắc sản phẩm

1. **Privacy first:** nội dung nhập vào tool được xử lý cục bộ, không gửi lên server (kể cả request ngầm như tải ảnh từ URL trong Markdown — xem 3.10).
2. **Frontend-first:** v1 không có backend/database riêng.
3. **Low operational cost:** ưu tiên static hosting/free tier.
4. **Consistent UX:** mọi tool dùng chung layout, editor, thông báo lỗi và thao tác.
5. **Composable:** mỗi tool là một feature độc lập, tái sử dụng shared components/utilities.
6. **Accessible:** keyboard, focus state, contrast, semantic HTML.
7. **SEO-friendly:** mỗi tool có route, title, description, metadata riêng.

## 1.3. Ngoài phạm vi v1

- Tài khoản, đăng nhập, phân quyền.
- Lưu dữ liệu tool lên cloud / đồng bộ thiết bị.
- Backend/API và database riêng cho DevKit.
- Tính năng AI cần gọi model/API trả phí.
- SQL Formatter nếu không còn thời gian sau P0/P1.

---

# 2. Phạm vi tính năng

## 2.1. Danh sách tools

| Nhóm | Tool | Priority | Phiên bản |
|---|---|---|---|
| Data Tools | JSON Formatter & Validator | P0 | v1 |
| Encoding | JWT Decoder | P0 | v1 |
| Encoding | Base64 Encoder/Decoder | P0 | v1 |
| Generator | UUID Generator | P0 | v1 |
| Data Tools | XML Formatter & Validator | P1 | v1 |
| Writing & Docs | **Markdown Preview** *(mới)* | P1 | v1 |
| Color Tools | Color Picker | P1 | v1 |
| Color Tools | Color Palette Generator | P1 | v1 |
| Color Tools | Color Contrast Checker | P1 | v1 |
| Color Tools | CSS Gradient Generator | P1 | v1 |
| Developer Tools | SQL Formatter | P2 | Nếu còn thời gian |

**Tổng scope:** 10 tools P0/P1 (4 P0 + 6 P1); 11 tools nếu tính SQL Formatter (P2).

## 2.2. Quy chuẩn chung cho mọi tool

Mỗi tool cần có: tên + mô tả ngắn; input area phù hợp; output/preview rõ ràng; nút thao tác chính; copy kết quả; clear/reset; loading state (nếu xử lý bất đồng bộ đáng kể); empty state; error state dễ hiểu; responsive; hướng dẫn ngắn hoặc ví dụ đầu vào.

Không bắt buộc mọi tool phải có đủ hai cột Input/Output; chọn bố cục phù hợp tác vụ và màn hình (chi tiết trong Design System).

---

# 3. Functional Requirements

## 3.1. JSON Formatter & Validator — P0

**Mục tiêu:** format JSON, kiểm tra cú pháp, hiển thị dữ liệu dễ đọc.

**Yêu cầu:**
- Nhập/paste JSON.
- Beautify với indentation 2 hoặc 4 spaces; Minify.
- Validate, hiển thị hợp lệ/không hợp lệ.
- Hiển thị lỗi parse (message, vị trí nếu runtime cung cấp).
- Copy output; Clear input/output.
- Không tự ý sửa hoặc bỏ dữ liệu không hợp lệ.

**Acceptance Criteria:**
- JSON hợp lệ được format đúng, giữ nguyên cấu trúc/giá trị.
- JSON lỗi hiển thị lỗi dễ hiểu, không crash UI.
- Minify tạo JSON hợp lệ, tương đương dữ liệu đầu vào.
- Copy hoạt động; xử lý hoàn toàn trên client.

**Giới hạn cần ghi nhận (bổ sung v1.1):** `JSON.parse` làm mất độ chính xác của số nguyên > 2^53 và gộp key trùng. Nếu muốn "giữ nguyên giá trị" tuyệt đối, cần parser giữ nguyên literal số hoặc hiển thị cảnh báo trong help text.

## 3.2. JWT Decoder — P0

**Mục tiêu:** giải mã header và payload của JWT.

**Yêu cầu:**
- Nhập JWT; decode header + payload; hiển thị claim dạng JSON dễ đọc.
- Nếu có `exp` (và nên có `iat`, `nbf`): hiển thị thời điểm + trạng thái expired/not expired theo giờ thiết bị.
- Copy header, payload hoặc nội dung đã format.
- Báo lỗi khi sai định dạng / Base64URL không hợp lệ.
- Cảnh báo rõ: chỉ decode, **không** xác minh chữ ký, không chứng minh token hợp lệ/an toàn.

**Acceptance Criteria:**
- Decode đúng JWT compact 3 phần phân tách bằng dấu chấm.
- Token sai định dạng có error state.
- Không hiển thị rằng chữ ký đã được xác minh.
- Không gửi token lên server, không ghi vào analytics/log.

## 3.3. Base64 Encoder/Decoder — P0

**Yêu cầu:** chế độ Encode/Decode; hỗ trợ Unicode/UTF-8; validate khi decode; copy; clear; báo lỗi khi Base64 không hợp lệ. *(Bổ sung v1.1: hỗ trợ tùy chọn Base64URL / URL-safe, vì JWT Decoder dùng cùng bộ utility.)*

**Acceptance Criteria:**
- Round-trip giữ nguyên Unicode.
- Decode input lỗi không crash.
- Đổi mode không gây nhầm lẫn input/output.

## 3.4. UUID Generator — P0

**Yêu cầu:** generate một hoặc nhiều UUID v4; chọn số lượng trong giới hạn (đề xuất 1–1000); copy từng item / copy all; generate lại; hiển thị số lượng.

**Acceptance Criteria:**
- Đúng định dạng UUID v4.
- Dùng Web Crypto (`crypto.randomUUID` hoặc `getRandomValues`), không dùng `Math.random()`. Cần fallback/thông báo khi không ở secure context.
- Giới hạn số lượng để không treo UI.
- Copy từng item và copy all hoạt động.

## 3.5. XML Formatter & Validator — P1

**Yêu cầu:** nhập/paste XML; beautify 2/4 spaces; minify; validate; hiển thị parse error; syntax highlighting nếu editor hỗ trợ; copy; download `.xml`; clear.

**Quy tắc xử lý dữ liệu:**
- Không làm mất text node, attribute, namespace, comment, CDATA một cách âm thầm.
- Không tự động sửa XML sai cấu trúc.
- Kiểm thử với namespace, attribute, comment, CDATA, escape, Unicode, processing instruction.
- Nếu serializer đổi quote/thứ tự attribute nhưng không đổi ý nghĩa, ghi nhận trong help text.

**Acceptance Criteria:**
- XML hợp lệ beautify/minify được và parse lại được.
- XML lỗi hiển thị lỗi, không tạo output giả như thành công.
- Không đổi nội dung text/attribute/cấu trúc.
- Download tạo `.xml` đúng nội dung; xử lý trên client.

## 3.6. Color Picker — P1

**Yêu cầu:** chọn màu qua picker UI; nhập HEX; hiển thị/chỉnh RGB, RGBA, HSL; preview realtime; copy từng định dạng; Random Color; Recent Colors (LocalStorage); xóa lịch sử; xử lý input không hợp lệ và alpha rõ ràng.

**Acceptance Criteria:**
- Chuyển đổi HEX/RGB/RGBA/HSL nhất quán trong sai số làm tròn.
- Alpha được giữ khi làm việc với RGBA.
- Recent Colors tồn tại sau reload cùng browser.
- LocalStorage không khả dụng → tool vẫn hoạt động, thông báo không gây gián đoạn.
- Copy đúng định dạng đang chọn.

## 3.7. Color Palette Generator — P1

**Yêu cầu:** chọn/nhập màu gốc; chế độ Monochromatic, Analogous, Complementary, Triadic, Tetradic; chọn số lượng màu; Randomize; preview swatch; copy từng màu / toàn bộ; Export CSS Variables.

**Acceptance Criteria:**
- Mỗi chế độ đúng quy tắc phối màu.
- Màu đầu vào không hợp lệ được validate.
- CSS Variables export hợp lệ.
- Copy từng màu và copy all hoạt động; swatch có label/giá trị rõ.

## 3.8. Color Contrast Checker — P1

**Yêu cầu:** chọn foreground/background; nhập màu theo định dạng hỗ trợ; preview text; tính Contrast Ratio; đánh giá AA Normal 4.5:1, AA Large 3:1, AAA Normal 7:1, AAA Large 4.5:1; đổi foreground/background; gợi ý màu gần nhất đạt ngưỡng (nếu không làm tăng scope đáng kể).

**Acceptance Criteria:**
- Dùng công thức luminance/contrast của WCAG, không dùng khoảng cách RGB.
- Ratio hiển thị nhất quán, làm tròn hợp lý (xem lưu ý: không làm tròn lên để "đậu" ngưỡng, ví dụ 4.499 không được hiển thị 4.5 và Pass).
- Pass/Fail đúng từng ngưỡng; không chỉ dựa vào màu để truyền đạt trạng thái.
- Copy được foreground/background.

## 3.9. CSS Gradient Generator — P1

**Yêu cầu:** Linear + Radial; thêm/xóa/sửa/reorder color stops; chỉnh màu từng stop; góc cho Linear; shape/position cơ bản cho Radial; preview realtime; generate + copy CSS; vài preset cơ bản.

**Acceptance Criteria:**
- CSS hợp lệ; preview đúng cấu hình.
- Thêm/xóa/reorder stop ổn định.
- Copy trả đúng CSS đang preview; không cần backend.

## 3.10. Markdown Preview — P1 *(tính năng mới v1.1)*

**Mục tiêu:** viết/paste Markdown và xem bản render realtime ngay trên trình duyệt, an toàn và không rò rỉ dữ liệu.

**Yêu cầu chức năng:**
- Editor Markdown (CodeMirror, syntax highlight Markdown) + vùng Preview.
- Hỗ trợ CommonMark + GFM: heading, emphasis, list, task list, table, strikethrough, autolink, blockquote, inline code, fenced code block, horizontal rule, footnote (nếu thư viện hỗ trợ ổn định).
- Syntax highlighting cho fenced code block theo ngôn ngữ (lazy-load, chỉ nạp ngôn ngữ cần thiết).
- Layout: Split (editor | preview) trên desktop; Tabs Edit/Preview trên mobile; tùy chọn ẩn một bên.
- Đồng bộ scroll giữa editor và preview (có thể bật/tắt).
- Preview realtime với debounce hợp lý khi input lớn.
- Mở file `.md`/`.markdown`/`.txt` từ máy (đọc cục bộ bằng File API) và drag & drop vào editor.
- Copy Markdown; Copy HTML (đã sanitize); Download `.md`; Download `.html` (đã sanitize, có thể kèm style cơ bản).
- Thống kê: số từ, ký tự, thời gian đọc ước tính.
- Mục lục (TOC) tự sinh từ heading, click để cuộn tới vị trí trong preview (nên có, không bắt buộc).
- Clear input; có nội dung mẫu (sample) cho empty state.
- Preview có chế độ "Document width" (cột đọc hẹp) để xem gần với kết quả thực tế.

**Quy tắc bảo mật & riêng tư (bắt buộc):**
- HTML sinh ra phải qua sanitizer (ví dụ DOMPurify hoặc rehype-sanitize); không dùng `innerHTML` với dữ liệu chưa sanitize.
- **Raw HTML trong Markdown mặc định bị tắt/được sanitize chặt**; không cho phép `<script>`, event handler, `javascript:` URL, `<iframe>`, `<form>`.
- **Ảnh từ URL bên ngoài mặc định bị chặn** (hiển thị placeholder + nút "Tải ảnh ngoài") vì việc tải ảnh gửi request tới server bên thứ ba, vi phạm nguyên tắc Privacy first. Ảnh `data:` URI được phép.
- Link ngoài mở bằng `target="_blank"` kèm `rel="noopener noreferrer"`.
- Không tự lưu nội dung Markdown vào LocalStorage mặc định. Nếu cung cấp "Nhớ bản nháp trên thiết bị này" thì phải là opt-in, có nút xóa, và ghi rõ trong UI.
- Không ghi nội dung vào console/analytics.

**Acceptance Criteria:**
- Các cú pháp CommonMark/GFM liệt kê ở trên render đúng.
- Input chứa `<script>`, `onerror=`, `javascript:` không thực thi và không xuất hiện trong HTML đã copy/download.
- Với ảnh URL ngoài và cài đặt mặc định: không có network request tới domain ngoài (kiểm chứng bằng DevTools Network).
- Copy Markdown/HTML và Download `.md`/`.html` cho đúng nội dung; download dùng Blob URL và revoke sau khi xong.
- Nội dung lớn (~1 MB) không làm đơ UI khi gõ (debounce/xử lý ngoài đường tương tác chính).
- Layout mobile dùng tab Edit/Preview, không tràn ngang toàn trang.
- Hoạt động hoàn toàn trên client.

**Ngoài phạm vi (Markdown Preview v1):** export PDF, hỗ trợ Mermaid/KaTeX, cộng tác realtime, lưu lên cloud. Có thể xem xét ở bản sau.

## 3.11. SQL Formatter — P2

**Tối thiểu nếu triển khai:** nhập SQL; format; chọn indentation; copy; clear; dialect selector nếu thư viện hỗ trợ ổn định.

**Acceptance Criteria:** không đổi ý nghĩa câu SQL trong các trường hợp thư viện hỗ trợ; hiển thị lỗi/giới hạn nếu dialect không hỗ trợ; không chặn tiến độ P0/P1.

---

# 4. Non-functional Requirements

## 4.1. Performance
- Thao tác thông thường phản hồi gần như tức thì.
- Tránh re-render không cần thiết khi nhập liệu; debounce với input lớn.
- Lazy-load editor/library nặng theo route (CodeMirror language packs, highlighter, markdown pipeline).

## 4.2. Security & Privacy
- Không gửi nội dung JSON/XML/JWT/Base64/SQL/Markdown hay dữ liệu màu riêng tư lên server.
- Không ghi input vào analytics, console log, error tracking.
- Không render input người dùng như HTML chưa sanitize.
- JWT Decoder chỉ decode, không verify chữ ký.
- Không dùng `eval` hoặc thực thi nội dung người dùng.
- Download dùng Blob/object URL và revoke sau khi hoàn tất.
- Feedback Service chỉ nhận nội dung feedback + metadata tối thiểu, không đính kèm input/output của tool.
- Áp dụng CSP phù hợp ở static hosting (hạn chế `script-src`, `img-src`, `connect-src`) để hỗ trợ cam kết "không gửi dữ liệu ra ngoài".

## 4.3. Accessibility
- Mọi input/button có label hoặc accessible name.
- Focus state rõ ràng.
- Không dùng màu là phương thức duy nhất truyền đạt trạng thái.
- Contrast text và controls đạt WCAG AA (đã kiểm tra số liệu token trong Design System).
- Thông báo lỗi có text, không chỉ icon/màu.

## 4.4. Responsive
- Desktop: input/output song song khi phù hợp.
- Tablet: layout dọc nếu không đủ chiều rộng.
- Mobile: một cột, controls dễ thao tác, editor không tràn viewport.
- Navigation/sidebar có phương án thu gọn trên màn hình nhỏ.

## 4.5. Browser support
- Chrome, Edge, Firefox, Safari phiên bản hiện đại.
- Clipboard, Web Crypto, LocalStorage, File API cần fallback hoặc thông báo khi không khả dụng.

---

# 5. Information Architecture & Navigation

## 5.1. Điều hướng

- Home / Tools overview
- Data Tools: JSON Formatter, XML Formatter
- Encoding: JWT Decoder, Base64
- Generators: UUID Generator
- **Writing & Docs: Markdown Preview** *(mới)*
- Color Tools: Color Picker, Color Palette, Color Contrast, CSS Gradient
- Developer Tools: SQL Formatter (P2)
- Feedback / About
- 404 page (route không tồn tại, có link về Home).

## 5.2. Routing

| Route | Tool |
|---|---|
| `/tools/json-formatter` | JSON Formatter |
| `/tools/xml-formatter` | XML Formatter |
| `/tools/jwt-decoder` | JWT Decoder |
| `/tools/base64` | Base64 |
| `/tools/uuid-generator` | UUID Generator |
| `/tools/markdown-preview` | **Markdown Preview** *(mới)* |
| `/tools/color-picker` | Color Picker |
| `/tools/color-palette` | Color Palette |
| `/tools/color-contrast` | Color Contrast |
| `/tools/css-gradient` | CSS Gradient |
| `/tools/sql-formatter` | SQL Formatter (P2, ẩn khỏi nav v1) |

Static hosting cần cấu hình SPA fallback để refresh trực tiếp từng route không bị 404.

## 5.3. Tool page layout
Bố cục tool page (breadcrumb, title, toolbar, workspace, status, help, feedback) được định nghĩa trong Design System §7.

---

# 6. Feedback Service Integration

**Mục tiêu:** cho phép người dùng gửi góp ý/báo lỗi.

**Yêu cầu:**
- Entry point dễ tìm nhưng không cản trở thao tác chính.
- Form: loại feedback, nội dung, thông tin bổ sung tùy chọn.
- Validate nội dung bắt buộc + giới hạn độ dài.
- Trạng thái submitting / success / error.
- Không tự đính kèm input/output của tool.
- Tích hợp theo contract/API do Feedback Service hiện có cung cấp.

**Giới hạn:**
- Không xây backend/database feedback mới.
- Không giả định endpoint, authentication, payload khi chưa có contract.
- Nếu service chưa sẵn sàng ở local: endpoint cấu hình được (env), hiển thị lỗi phù hợp, **không giả lập gửi thành công**.

**Acceptance Criteria:**
- Mở được form từ giao diện; validate trước khi submit.
- Gửi đúng contract; success chỉ khi service xác nhận.
- Lỗi mạng/service → thông báo + cho thử lại.
- Không gửi tool payload nhạy cảm ngoài ý muốn.

---

# 7. Technical Architecture

## 7.1. Định hướng (đề xuất, ưu tiên dependency đã có trong repo)

- Frontend: React + TypeScript + Vite.
- Styling: Tailwind CSS + semantic CSS variables (tokens trong Design System).
- Routing: React Router hoặc router hiện có.
- Code editor: CodeMirror.
- Color: Culori (chuyển đổi), react-colorful (picker UI).
- XML: DOMParser; serializer/formatter kiểm thử kỹ.
- **Markdown:** pipeline `unified` (remark-parse + remark-gfm + remark-rehype + rehype-sanitize + rehype-stringify) hoặc `markdown-it` + DOMPurify; highlighter lazy-load (shiki hoặc highlight.js subset). Chọn một phương án, tránh cài song song nhiều thư viện.
- LocalStorage: chỉ cho theme, preference, recent colors (và bản nháp Markdown nếu người dùng opt-in).
- Hosting: static (Cloudflare Pages hoặc tương đương).

## 7.2. Cấu trúc thư mục tham khảo

```text
src/
├── app/ (router, providers)
├── components/ (layout, common, forms, editors)
├── features/
│   ├── json-formatter/  xml-formatter/  jwt-decoder/
│   ├── base64/  uuid-generator/  sql-formatter/
│   ├── markdown-preview/
│   └── color-tools/ (color-picker, palette-generator, contrast-checker, gradient-generator, shared)
├── services/feedback/
├── hooks/  lib/  utils/
└── styles/ (tokens.css, globals.css)
```

Không bắt buộc refactor nếu repo đã có convention phù hợp.

## 7.3. Color shared module
Dùng chung: parsing/validation, conversion, normalization, alpha, contrast/luminance, CSS serialization, shared types. Không để mỗi tool tự viết bộ chuyển đổi riêng.

## 7.4. Shared text utilities
Base64URL decode (dùng chung cho JWT + Base64), download-as-file (Blob + revoke), copy-to-clipboard với fallback, sanitize-HTML wrapper (dùng cho Markdown Preview).

## 7.5. Error handling
- Phân biệt validation / processing / unexpected error.
- Không expose stack trace.
- Giữ input khi xử lý thất bại; không xóa output hợp lệ trước đó khi thao tác mới thất bại (trừ khi behavior được xác định rõ).
- Log kỹ thuật không chứa nội dung người dùng.

---

# 8. SEO & Content

Mỗi tool route: title riêng, meta description, H1 duy nhất, hướng dẫn ngắn hữu ích, Open Graph cơ bản, canonical URL nếu cần, không nhồi từ khóa.

Home giải thích DevKit là gì, liệt kê nhóm tool, dẫn tới từng tool.

**Quyết định (2026-11-01): DevKit sẽ public → bắt buộc prerender/SSG từng route.**

Lý do: với SPA (Vite) thuần, metadata đặt qua JS không được crawler mạng xã hội (Facebook, Zalo, Slack, Discord, X) đọc, và Google index chậm/không đảm bảo.

Yêu cầu:
- Lúc build, mỗi route tool + Home + 404 sinh ra file HTML tĩnh (ví dụ `/tools/json-formatter/index.html`) đã chứa sẵn `<title>`, meta description, Open Graph/Twitter Card, canonical, H1 và đoạn hướng dẫn ngắn, không phụ thuộc JS.
- Người dùng thật vẫn nhận SPA (hydrate) bình thường; vẫn là static hosting, không thêm server/backend.
- Có `sitemap.xml` và `robots.txt`; mỗi route có ảnh OG (có thể dùng chung một ảnh mặc định ở v1).
- Phương án kỹ thuật (ví dụ `vite-react-ssg` hoặc plugin prerender dựa trên headless browser) chọn ở Implementation Plan, ưu tiên cách không đổi stack và không phá lazy-load editor.
- Code chạy lúc prerender không được truy cập `window`/`localStorage` ngoài `useEffect` (tránh lỗi build và lệch hydration, nhất là theme và Recent Colors).

Acceptance: `curl` từng route (không chạy JS) trả về HTML có title/description/OG đúng của tool đó; công cụ kiểm tra preview (Facebook Sharing Debugger, v.v.) hiển thị đúng.

---

# 9. Testing Strategy

## 9.1. Functional
Happy path + invalid input từng tool; copy/download; theme + persistence; Feedback success/failure; Unicode và dữ liệu rỗng.

## 9.2. Color
HEX 3/6/8; RGB/RGBA boundary; alpha 0/0.5/1; trắng/đen và luminance gần nhau; contrast đối chiếu ví dụ WCAG; từng harmony mode; gradient nhiều stop.

## 9.3. XML
Đơn giản; nested; attribute + namespace; comment; CDATA; Unicode + entity; empty element; malformed; processing instruction.

## 9.4. Markdown Preview *(mới)*
- Cú pháp: heading 1–6, nested list, task list, table (căn lề), code fence có/không ngôn ngữ, blockquote lồng, link/autolink, ảnh, footnote, strikethrough, escape ký tự.
- Bảo mật: `<script>`, `<img onerror>`, `[x](javascript:...)`, `<iframe>`, `<style>`, SVG nhúng, `data:text/html`.
- Riêng tư: ảnh URL ngoài không phát sinh request mặc định; bật "Tải ảnh ngoài" mới có request.
- Hiệu năng: tài liệu ~1 MB, nhiều code block; gõ liên tục không giật.
- File: mở `.md` UTF-8 (có/không BOM), file rỗng, file quá lớn (đặt giới hạn, ví dụ 5 MB, và báo lỗi rõ).
- Export: `.md`/`.html` tải về đúng nội dung; HTML tải về không chứa phần tử bị chặn.
- Responsive: split trên desktop, tab trên mobile, không tràn ngang.

## 9.5. Responsive & browser
Desktop/tablet/mobile; Chrome/Edge/Firefox/Safari; keyboard + focus; không horizontal overflow ngoài vùng chủ đích cuộn.

## 9.6. Quality gates
Build thành công; TypeScript sạch; lint/test pass; không lỗi console nghiêm trọng; route tải được khi refresh; không secrets trong bundle; không request gửi tool input/output ra ngoài.

---

# 10. Delivery Plan — Week 1

**Phase 0 — UI/UX Design (mới, bắt buộc trước khi code frontend)**
Thực hiện theo *UI/UX Design Workflow* trong Design System §2: dùng skill `frontend-design`, ra design spec cho app shell, tool page template, các tool, rà soát với Design System, **được duyệt rồi mới cập nhật Implementation Plan**.

**Phase 1 — Foundation:** kiểm tra repo/convention; app shell, routing, responsive; tokens + light/dark; shared components + tool page template.

**Phase 2 — P0 tools:** JSON, JWT, Base64, UUID.

**Phase 3 — P1 tools:** XML, **Markdown Preview**, Color Picker, Palette, Contrast, Gradient.

**Phase 4 — Integration & polish:** Feedback Service; empty/loading/error/success; SEO metadata; responsive + accessibility pass.

**Phase 5 — Validation & deploy:** functional tests; build/lint/typecheck; smoke test route; deploy static.

**P2:** SQL Formatter chỉ khi P0/P1, feedback, testing, deploy đã xong.

> Lưu ý quy mô: thêm Markdown Preview (P1) làm tăng khối lượng Week 1. Nếu bị chặn tiến độ, thứ tự cắt giảm đề xuất: SQL Formatter → các tùy chọn nâng cao của Markdown Preview (TOC, sync scroll, export HTML) → gợi ý màu ở Contrast Checker.

---

# 11. Definition of Done

- [ ] Tất cả tools P0/P1 (10 tool, gồm Markdown Preview) có route riêng và hoạt động đúng.
- [ ] SQL Formatter ghi nhận là P2, không block release.
- [ ] UI/UX design đã được duyệt **trước** khi implement frontend; mọi sai khác so với design đã có lý do và được review.
- [ ] Shared layout và design system nhất quán; không hard-code màu thuộc token.
- [ ] Light/Dark theme hoạt động.
- [ ] Responsive desktop/tablet/mobile.
- [ ] Copy/clear/download hoạt động đúng từng tool.
- [ ] Error/empty/success states được xử lý.
- [ ] Markdown Preview: sanitize đạt các test bảo mật; ảnh ngoài bị chặn mặc định.
- [ ] Feedback Service tích hợp theo contract thật.
- [ ] Không có backend/database riêng; không gửi dữ liệu tool lên server.
- [ ] SEO metadata cơ bản đầy đủ và có trong HTML prerender của từng route (kiểm bằng `curl`, không cần JS); có sitemap.xml, robots.txt.
- [ ] Build, typecheck, lint, test pass.
- [ ] Deploy được và truy cập trực tiếp từng route.

---

# 12. Implementation Notes for AI Coding Agent

1. Đọc repository, package manifest, routes, components, styles, conventions trước.
2. Đọc **cả** Requirements và Design System; áp dụng *UI/UX Design Workflow* (Design System §2). Không code UI trước khi design được duyệt.
3. Không tự ý đổi stack hoặc refactor diện rộng.
4. Đối chiếu requirement với code hiện tại, nêu assumptions/gaps.
5. Đề xuất Implementation Plan theo phase: file thay đổi, dependency mới, risk, test plan — **cập nhật dựa trên UI/UX design đã duyệt**.
6. Chờ người dùng approve plan trước khi code.
7. Triển khai từng phần, minimal diff.
8. Chạy build, typecheck, lint, test phù hợp.
9. Không tự tạo backend/database/dịch vụ trả phí; không giả định contract của Feedback Service.
10. Báo cáo rõ: đã làm, chưa làm, kết quả kiểm thử, rủi ro còn lại.

**Quy tắc quan trọng:** nếu requirement mâu thuẫn với cấu trúc/behavior hiện tại của repo, dừng ở bước phân tích và nêu lựa chọn; không âm thầm quyết định thay đổi lớn.

---

# Phụ lục A — Kết quả review v1 → v1.1

| # | Phát hiện trong v1 | Xử lý ở v1.1 |
|---|---|---|
| 1 | PRD và Design System trộn trong một file | Tách thành 2 file |
| 2 | Chưa có bước thiết kế UI/UX trước implement; quy trình §13 cho phép code ngay sau duyệt plan | Thêm Phase 0 và UI/UX Design Workflow (Design System §2), cập nhật Implementation Notes + DoD |
| 3 | Chưa có Markdown Preview | Thêm §3.10, route, nav, test, DoD |
| 4 | JSON: "giữ nguyên giá trị" mâu thuẫn với `JSON.parse` (mất độ chính xác số lớn, gộp key trùng) | Ghi nhận giới hạn ở §3.1 |
| 5 | Base64 thiếu Base64URL dù JWT cần | Thêm tùy chọn + shared utility |
| 6 | UUID chưa nêu secure context và giới hạn số lượng cụ thể | Bổ sung §3.4 |
| 7 | Contrast Checker: rủi ro làm tròn khiến 4.499 hiển thị 4.5 và Pass | Bổ sung §3.8 |
| 8 | Token màu: nhiều cặp không đạt AA (chi tiết trong Design System §4.3) dù NFR yêu cầu AA | Điều chỉnh token trong Design System |
| 9 | SPA metadata/SEO có thể không được crawler đọc | Đã chốt: bắt buộc prerender/SSG từng route (§8), vì DevKit public |
| 10 | Thiếu trang 404, SPA fallback khi refresh route | Bổ sung §5 |
| 11 | Thiếu CSP hỗ trợ cam kết privacy | Bổ sung §4.2 |
| 12 | Tổng số tool: 9 P0/P1 | Cập nhật 10 P0/P1 (+ SQL P2 = 11) |
