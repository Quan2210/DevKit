# DevKit — UI/UX Workflow & Design System

**Tài liệu:** UI/UX Design Workflow + Design System
**Phiên bản:** 1.1 (tách từ `DevKit_Requirements_and_Design_System_v1`)
**Trạng thái:** Draft for design review
**Tài liệu liên quan:** [`01_DevKit_Requirements_v1.1.md`](./01_DevKit_Requirements_v1.1.md)

> Design System là **nguồn sự thật duy nhất** cho giao diện. Mọi UI trong DevKit phải bám tài liệu này. Skill `frontend-design` được dùng để *thiết kế bên trong* các ràng buộc này, không phải để thay thế chúng.

---

# 1. Phạm vi tài liệu

- Quy trình thiết kế UI/UX bắt buộc trước khi implement frontend (§2).
- Nguyên tắc, visual direction, tokens, typography, spacing, component spec, layout, theme (§3–§10).
- Spec UI cho từng nhóm tool, gồm Markdown Preview (§9).
- Cách dùng skill `frontend-design` trong khuôn khổ Design System (§11) và nhật ký sai khác (§12).

---

# 2. UI/UX Design Workflow

## 2.1. Mục tiêu
Đảm bảo UI/UX được hoàn thành và review **trước** khi bắt đầu implement frontend.

## 2.2. Skill bắt buộc
- `frontend-design` (đã cài global tại `~/.claude/skills/frontend-design`): chịu trách nhiệm thiết kế visual frontend, layout, typography, color palette, spacing, responsive, cấu trúc component và interaction pattern.

## 2.3. Quy trình

| Bước | Hành động | Đầu ra |
|---|---|---|
| 1 | Phân tích yêu cầu UI/UX từ Requirement đã duyệt (`01_...`) | Danh sách màn hình, tác vụ chính, trạng thái cần thiết kế |
| 2 | Dùng skill `frontend-design` để xác định UI direction và design specification | Design plan: palette, type, layout concept, nguyên tắc (trong khuôn khổ §4–§8) |
| 3 | Định nghĩa page layout, reusable component, responsive behavior, interaction pattern | Wireframe/ASCII layout, component inventory, bảng breakpoint |
| 4 | Review thiết kế đối chiếu Design System | Checklist §2.5 + nhật ký sai khác §12 |
| 5 | Cập nhật Implementation Plan dựa trên UI/UX đã duyệt | Plan mới (file, component, dependency, risk, test) |
| 6 | Implement frontend theo thiết kế đã duyệt | Code bám design; mọi thay đổi phát sinh quay lại bước 4 |

Người dùng (owner) duyệt ở cuối bước 4 và bước 5. Chưa có duyệt → không viết code UI.

## 2.4. Quy tắc
- UI/UX design phải hoàn thành **trước** khi implement frontend.
- Không implement UI dựa trên quyết định styling tùy ý của AI.
- Tuân thủ Design System nhất quán.
- Tái sử dụng component và design token hiện có bất cứ khi nào có thể.
- Mọi sai khác so với design đã duyệt phải có lý do và được review (ghi vào §12).

## 2.5. Checklist review thiết kế (bước 4)
- [ ] Mọi màu/spacing/radius/font dùng token, không giá trị cứng.
- [ ] Mỗi tool có đủ trạng thái: empty, loading (nếu có), success, error, disabled.
- [ ] Có layout cho desktop, tablet, mobile; không tràn ngang toàn trang.
- [ ] Light và Dark đều được thiết kế; contrast đạt mục tiêu §4.3.
- [ ] Tái sử dụng component có sẵn; component mới có lý do.
- [ ] Focus-visible, keyboard path, accessible name đã được xét.
- [ ] Motion tôn trọng `prefers-reduced-motion`.
- [ ] Đã ghi sai khác (nếu có) vào §12.

## 2.6. Artefact đầu ra của giai đoạn thiết kế
Lưu trong `docs/design/` (tạo khi bắt đầu Phase 0):
- `ui-direction.md` — design plan từ `frontend-design` + kết quả review.
- `layouts.md` — wireframe app shell, tool page, từng tool.
- `components.md` — inventory component (dùng lại / mới).
- `implementation-plan.md` — plan đã cập nhật sau khi duyệt.

---

# 3. Design principles

1. **Developer-focused:** rõ ràng, ít trang trí, ưu tiên nội dung và thao tác.
2. **Clarity over decoration:** phân cấp thị giác rõ, không hiệu ứng thừa.
3. **Consistent patterns:** cùng loại thao tác → cùng cách thể hiện trên mọi tool.
4. **Efficient workflow:** giảm số click cho tác vụ phổ biến.
5. **Readable by default:** typography, spacing, code editor tối ưu cho đọc.
6. **Responsive by design:** mobile không phải desktop thu nhỏ.

## 3.1. Visual direction
- Modern developer utility, tối giản, sạch, chuyên nghiệp.
- Nền trung tính; accent có kiểm soát.
- Card/panel viền nhẹ, shadow hạn chế.
- Code/editor dùng monospace.
- Không gradient trang trí ở cấp layout; gradient chỉ là nội dung chính trong Gradient Generator.
- Không dùng quá nhiều màu trạng thái cùng lúc.
- Không lạm dụng glassmorphism/blur.

---

# 4. Color tokens

## 4.1. Nguyên tắc
Không hard-code màu thuộc hệ thống token trong feature. Màu do người dùng chọn trong Color Tools là **dữ liệu**, lưu riêng, không nhầm với theme token.

## 4.2. Light theme

| Token | Giá trị | Công dụng |
|---|---|---|
| `--color-bg` | `#F8FAFC` | Nền ứng dụng |
| `--color-surface` | `#FFFFFF` | Card/panel |
| `--color-surface-muted` | `#F1F5F9` | Vùng phụ |
| `--color-text` | `#0F172A` | Text chính |
| `--color-text-muted` | `#64748B` | Text phụ |
| `--color-border` | `#E2E8F0` | Border trang trí (card, divider) |
| `--color-border-strong` | `#8391A7` | **Mới.** Viền input/control (đạt 3:1) |
| `--color-primary` | `#4F46E5` | Primary action |
| `--color-primary-hover` | `#4338CA` | Hover |
| `--color-on-primary` | `#FFFFFF` | **Mới.** Text/icon trên primary |
| `--color-success` | `#16A34A` | Success (icon, nền nhạt, viền) |
| `--color-success-fg` | `#15803D` | **Mới.** Success dạng text |
| `--color-warning` | `#D97706` | Warning (icon, viền) |
| `--color-warning-fg` | `#B45309` | **Mới.** Warning dạng text |
| `--color-danger` | `#DC2626` | Error/danger |
| `--color-info` | `#0284C7` | Information (icon, viền) |
| `--color-info-fg` | `#0369A1` | **Mới.** Info dạng text |

## 4.3. Dark theme

| Token | Giá trị | Công dụng |
|---|---|---|
| `--color-bg` | `#0B1120` | Nền ứng dụng |
| `--color-surface` | `#111827` | Card/panel |
| `--color-surface-muted` | `#1F2937` | Vùng phụ |
| `--color-text` | `#F8FAFC` | Text chính |
| `--color-text-muted` | `#94A3B8` | Text phụ |
| `--color-border` | `#334155` | Border trang trí |
| `--color-border-strong` | `#64748B` | **Mới.** Viền input/control |
| `--color-primary` | `#818CF8` | Primary action |
| `--color-primary-hover` | `#A5B4FC` | Hover |
| `--color-on-primary` | `#0B1120` | **Mới.** Text/icon trên primary (tối) |
| `--color-success` / `-fg` | `#4ADE80` | Dùng chung cho nền tối |
| `--color-warning` / `-fg` | `#FBBF24` | |
| `--color-danger` | `#F87171` | |
| `--color-info` / `-fg` | `#38BDF8` | |

## 4.4. Kết quả kiểm tra contrast (tính theo công thức WCAG 2.x)

| Cặp màu | Tỉ lệ | Kết quả | Xử lý |
|---|---|---|---|
| Light: text / bg | 17.06 | ✅ | — |
| Light: text-muted / bg | 4.55 | ✅ sát ngưỡng | Chỉ dùng trên `bg`/`surface`; trên `surface-muted` còn 4.34 ❌ → dùng `--color-text` |
| Light: on-primary / primary | 6.29 | ✅ | — |
| Light: success `#16A34A` / white | 3.30 | ❌ (text) | Text dùng `success-fg` `#15803D` = 5.02 ✅ |
| Light: warning `#D97706` / white | 3.19 | ❌ (text) | Text dùng `warning-fg` `#B45309` = 5.02 ✅ |
| Light: info `#0284C7` / white | 4.10 | ❌ (text) | Text dùng `info-fg` `#0369A1` = 5.93 ✅ |
| Light: danger / white | 4.83 | ✅ | — |
| Light: border `#E2E8F0` / bg | 1.18 | Trang trí | Viền control dùng `border-strong` = 3.05–3.19 ✅ (WCAG 1.4.11) |
| Dark: text / bg | 18.00 | ✅ | — |
| Dark: text-muted / surface (-muted) | 6.92 / 5.72 | ✅ | — |
| Dark: **white** / primary `#818CF8` | 2.98 | ❌ | v1 ngầm định chữ trắng; dùng `on-primary` `#0B1120` = 6.31 ✅ |
| Dark: success, danger, warning, info / surface | 6.4–10.6 | ✅ | — |
| Dark: border-strong / bg, surface | 3.96 / 3.73 | ✅ | — |

Quy tắc: màu trạng thái (success/warning/info) dùng làm **text** phải dùng biến `-fg`; dạng icon/viền/nền nhạt dùng biến gốc. Trạng thái luôn kèm text/icon, không chỉ màu.

> Token là bộ khởi đầu; kiểm tra lại sau khi dựng UI thực tế. Mọi thay đổi token ghi vào §12.

---

# 5. Typography

- UI font: `Inter`, fallback `system-ui, sans-serif`.
- Code font: `JetBrains Mono`, fallback `Consolas, monospace`.
- Body 14–16px; secondary/help 12–14px; page title 24–30px; section title 16–20px; button/input 14px.
- Line-height body ≈ 1.5; code editor 1.5–1.6.
- Font weight: 400, 500, 600, 700.
- Độ dài dòng văn bản đọc (help text, Markdown preview): tối đa ~75 ký tự.
- Self-host font (không tải từ CDN bên thứ ba) để giữ cam kết privacy và hiệu năng; dùng `font-display: swap`.

---

# 6. Spacing, radius, elevation

## 6.1. Spacing (bội số 4px)

| Token | Giá trị | Token | Giá trị |
|---|---|---|---|
| `space-1` | 4px | `space-6` | 24px |
| `space-2` | 8px | `space-8` | 32px |
| `space-3` | 12px | `space-10` | 40px |
| `space-4` | 16px | `space-12` | 48px |
| `space-5` | 20px | | |

Layout: content max-width 1200–1440px; page padding 24px desktop / 16px tablet / 12–16px mobile; card padding 16–24px; section gap 24–32px; input/output gap 16px; không để editor/bảng màu gây horizontal overflow toàn trang.

## 6.2. Radius

| Component | Radius |
|---|---|
| Small control | 6px |
| Input / button | 8px |
| Card / panel | 12px |
| Modal / popover | 12–16px |
| Pill / badge | 999px |

## 6.3. Elevation
Border mặc định 1px; shadow nhẹ chỉ cho dropdown/modal; card ưu tiên border hơn shadow.

## 6.4. Breakpoints

| Tên | Chiều rộng | Hành vi chính |
|---|---|---|
| Mobile | < 640px | Một cột, sidebar thành drawer, Markdown dùng tab Edit/Preview |
| Tablet | 640–1023px | Workspace xếp dọc nếu không đủ rộng, sidebar thu gọn |
| Desktop | ≥ 1024px | Sidebar cố định, workspace hai cột |

---

# 7. Layout

## 7.1. App shell

```text
Desktop (≥1024)                         Mobile (<640)
┌────────────┬─────────────────────┐    ┌─────────────────────┐
│ Sidebar    │ Top bar: search ·   │    │ ☰  DevKit   ◐  ✉    │
│ (groups,   │ theme · feedback    │    ├─────────────────────┤
│  tools)    ├─────────────────────┤    │ Tool page (1 cột)   │
│            │ Tool page           │    │                     │
└────────────┴─────────────────────┘    └─────────────────────┘
```

## 7.2. Tool page template
1. Breadcrumb / link về danh sách tools.
2. Page title (H1 duy nhất) + mô tả ngắn.
3. Toolbar: mode, option, primary action.
4. Workspace: input/output hoặc preview.
5. Inline status / error.
6. Help / tips ngắn.
7. ~~Feedback entry point dùng chung~~ (hoãn cùng Feedback Service, v1 không có).

Nguyên tắc cấu trúc: đường viền, tiêu đề, nhãn chỉ dùng khi mang thông tin (ví dụ nhãn "Input"/"Output"), không dùng làm trang trí.

---

# 8. Component specifications

### Button
Variants: Primary, Secondary, Ghost, Destructive. States: default, hover, active, focus-visible, disabled, loading. Text trên Primary dùng `--color-on-primary`.

### Input & Textarea
Có label rõ ràng (placeholder không thay label); error message cạnh field; clear khi phù hợp; focus ring nhất quán; viền dùng `--color-border-strong`.

### Card & Panel
Nhóm chức năng hoặc input/output; header gồm title + action phụ; không lồng nhiều lớp card.

### Tabs / Segmented control
Chuyển mode liên quan (Encode/Decode, Beautify/Minify, Edit/Preview); mode active rõ; hỗ trợ keyboard (mũi tên, Home/End), `role="tablist"` hoặc radio group đúng ngữ nghĩa.

### Code Editor
Monospace; syntax highlighting theo ngôn ngữ; line number nếu phù hợp; read-only cho output; copy action dễ tìm; mobile: không ép hẹp, scroll nội bộ; theme đồng bộ app theme.

### Color Swatch
Hiển thị màu + mã màu + copy; luôn có mã dạng text; viền cho màu quá sáng.

### Toast / Inline feedback
Success: ngắn sau copy/generate/save. Error: nêu nguyên nhân + cách xử lý. Lỗi validation cần đọc lâu → inline, không toast. Toast dùng `role="status"`/`aria-live`; không quá lâu hoặc dày đặc.

### Dialog / Popover
Cho lựa chọn phụ hoặc xác nhận quan trọng; đóng bằng Escape/click ngoài khi phù hợp; focus trap và trả focus khi đóng.

### Status badge
Kèm icon + text (Valid / Invalid, Expired / Active, Pass / Fail); không chỉ màu.

### Markdown prose *(mới)*
Style cho vùng render Markdown, dùng token, áp dụng trong `.md-prose`:
- Cột đọc tối đa ~75ch ở chế độ "Document width"; line-height 1.6.
- Heading: H1 24–30px, H2 20–24px, H3 16–18px; weight 600–700; khoảng cách trên > khoảng cách dưới.
- Code inline: nền `surface-muted`, radius 6px, font mono.
- Code block: dùng cùng theme với Code Editor, scroll ngang nội bộ, có nút copy từng block.
- Table: viền `--color-border`, header `surface-muted`, scroll ngang nội bộ trên mobile.
- Blockquote: vạch trái 3px `--color-border-strong`, text `--color-text-muted`.
- Task list: checkbox disabled có accessible name.
- Link: màu primary + gạch chân; link ngoài có icon nhỏ + `rel="noopener noreferrer"`.
- Ảnh ngoài bị chặn: placeholder viền đứt, alt text, nút "Tải ảnh ngoài" (xem §9.3).
- Light/Dark dùng token, không có style cứng.

---

# 9. Tool-specific UI specs

## 9.1. Quy tắc chung
Cùng toolbar, cùng vị trí Copy / Clear / Download, cùng cách báo lỗi trên mọi tool. Output hợp lệ trước đó không bị xóa khi thao tác mới lỗi.

## 9.2. Bố cục theo nhóm

| Nhóm | Bố cục đề xuất |
|---|---|
| JSON / XML / Base64 / SQL | Hai cột Input \| Output (dọc trên tablet/mobile); toolbar phía trên |
| JWT | Một ô token ở trên; Header / Payload / Claims dạng thẻ bên dưới; banner cảnh báo "chỉ decode, không verify" |
| UUID | Toolbar (số lượng, generate) + danh sách có copy từng dòng + Copy all |
| Color Picker | Picker + bảng định dạng (HEX/RGB/RGBA/HSL) + Recent Colors |
| Palette | Màu gốc + chọn harmony + dải swatch + export CSS Variables |
| Contrast | Hai màu + preview text + bảng Pass/Fail (AA/AAA) + ratio |
| Gradient | Preview lớn + panel stops + code CSS |
| Markdown Preview | Xem §9.3 |
| Text Compare | Hai bước: Nhập (hai ô cạnh nhau) rồi Kết quả (hai ô canh thẳng, sửa được; Một cột dưới 1024px). Xem `docs/design/text-compare-spec.md` |

## 9.3. Markdown Preview — UI spec

**Desktop (≥1024px) — Split view**
```text
┌ Toolbar: [Edit|Split|Preview]  Sync scroll ☑  Ảnh ngoài ☐  Open  Copy▾  Download▾  Clear ┐
├──────────────────────────────┬──────────────────────────────┤
│ Editor (CodeMirror, Markdown)│ Preview (.md-prose)          │
│ line numbers, mono           │ cuộn độc lập / đồng bộ       │
├──────────────────────────────┴──────────────────────────────┤
│ Status: 1.240 từ · 7.9k ký tự · ~6 phút đọc        [TOC ▸]  │
└──────────────────────────────────────────────────────────────┘
```

**Tablet (640–1023px):** mặc định Split dọc (editor trên, preview dưới) hoặc Tabs, người dùng chọn qua segmented control.
**Mobile (<640px):** segmented control **Edit | Preview**, một vùng hiển thị tại một thời điểm; toolbar thu gọn (nút phụ vào menu "…"); status bar giữ ngắn.

**Các thành phần**
- Segmented control chế độ hiển thị (Edit / Split / Preview); lưu preference hiển thị (không lưu nội dung) trong LocalStorage.
- Copy ▾: Copy Markdown / Copy HTML. Download ▾: `.md` / `.html`.
- Nút Open file + vùng drop; khi kéo file vào editor có overlay rõ ràng và text hướng dẫn.
- TOC: panel trượt/popover liệt kê heading, click cuộn tới vị trí.
- Banner nhỏ (dismissible) lần đầu: "Nội dung chỉ xử lý trên trình duyệt. Ảnh từ URL ngoài bị chặn để tránh gửi request ra ngoài."

**Trạng thái**
- Empty: editor có placeholder + nút "Chèn nội dung mẫu"; preview hiển thị hướng dẫn ngắn.
- Loading: chỉ khi nạp highlighter/ngôn ngữ lần đầu (skeleton nhẹ trong code block).
- Lỗi đọc file: inline error nêu lý do (quá lớn / không phải text); giữ nguyên nội dung hiện có.
- Ảnh bị chặn: placeholder + "Tải ảnh ngoài" (toàn cục, kèm xác nhận ngắn nêu rõ sẽ phát sinh request tới domain ngoài).

**Accessibility**
- Editor và preview có `aria-label`; preview là `region` có label; thay đổi chế độ thông báo qua `aria-live`.
- Phím tắt gợi ý: `Ctrl/Cmd+Shift+P` đổi chế độ xem (kiểm tra xung đột với browser/OS trước khi chốt).
- Không bẫy phím Tab trong editor mà không có lối thoát bằng bàn phím (Esc rồi Tab).

---

# 10. Iconography & Theme

## 10.1. Iconography
Một bộ icon thống nhất (Lucide); kích thước 16px hoặc 20px; icon button có accessible label/tooltip; không trộn phong cách.

## 10.2. Theme behavior
- Light, Dark, System.
- Lưu lựa chọn trong LocalStorage (bọc try/catch).
- Tránh flash theme sai: inline script nhỏ trong `index.html` đặt `data-theme` trước khi render.
- Mọi component dùng semantic tokens.
- Editor theme (CodeMirror, code block Markdown) đồng bộ app theme.
- `color-scheme` được đặt đúng để form control native đổi theo theme.

## 10.3. Motion
Chỉ dùng motion phản hồi hành động (mở/đóng, copy xong, đổi mode), ngắn (≤200ms). Tôn trọng `prefers-reduced-motion`. Không animation vào trang trang trí lặp ở mọi section.

---

# 11. Cách dùng skill `frontend-design` trong dự án

Skill `frontend-design` thiên về thiết kế có cá tính, tránh "mặc định chung chung". DevKit lại là *utility* cần nhất quán và dễ đoán, và Design System đã chốt nhiều quyết định. Hai điều này được cân bằng như sau:

| Phần | Ai quyết định |
|---|---|
| Token màu, font, spacing, radius, component spec, nguyên tắc privacy/a11y | **Design System (tài liệu này)** — cố định |
| Bố cục cụ thể từng màn hình, phân cấp thông tin, cách trình bày trạng thái, interaction pattern, microcopy | **Skill `frontend-design`**, trong ràng buộc ở trên |
| "Điểm nhấn" duy nhất có cá tính (ví dụ Home hero, preview Gradient/Markdown) | Skill đề xuất, **người dùng duyệt** |
| Đổi token, đổi font, thêm accent mới, phá nguyên tắc tối giản | Là *sai khác* → phải ghi §12 và được duyệt |

**Cách gọi khi thiết kế (bước 2 của workflow):**
1. Đưa cho skill: PRD mục liên quan + Design System này + mô tả màn hình.
2. Yêu cầu skill trả về design plan gồm: palette (chính là token hiện có), vai trò type, layout concept kèm ASCII wireframe, nguyên tắc, và **danh sách điểm nó muốn khác Design System** (nếu có).
3. Mọi điểm khác đi vào §12 để duyệt; điểm không được duyệt thì quay về Design System.

**Điểm cần cân nhắc ở design review** (không tự quyết): Inter + indigo là lựa chọn rất phổ biến ("default look"). Design System hiện giữ nguyên; nếu muốn bản sắc riêng cho DevKit, đề xuất thay đổi qua §12 trước khi implement, vì đổi sau khi code sẽ tốn công.

---

# 12. Nhật ký sai khác & thay đổi Design System

| Ngày | Hạng mục | Thay đổi / sai khác | Lý do | Trạng thái |
|---|---|---|---|---|
| 2026-11-01 | Tokens | Thêm `border-strong`, `on-primary`, `success-fg`, `warning-fg`, `info-fg` | Sửa các cặp không đạt AA (§4.4) | Đã duyệt (2026-11-01) |
| 2026-11-01 | Dark primary | Text trên primary đổi từ trắng sang `#0B1120` | Trắng/`#818CF8` chỉ 2.98:1 | Đã duyệt (2026-11-01) |
| 2026-11-01 | Components | Thêm Status badge, Markdown prose | Phục vụ tool mới và quy chuẩn trạng thái | Đã duyệt (2026-11-01) |
| 2026-11-01 | Typography | Self-host font | Tránh request tới CDN bên thứ ba | Đã duyệt (2026-11-01) |
| 2026-11-01 | Components | Thêm `DeviceStatus` (D1) | Điểm nhấn privacy, gắn hành vi thật | Đã duyệt (2026-11-01) |
| 2026-11-01 | Components | Thêm `UndoBar` thay hộp thoại xác nhận Clear (D2) | Giảm click, không mất dữ liệu | Đã duyệt (2026-11-01) |
| 2026-11-01 | Layout | Home dạng `ToolList` thay lưới card (D3) | Quét nhanh, tránh template | Đã duyệt (2026-11-01) |
| 2026-11-01 | Interaction | Phím tắt `/`, `Ctrl/Cmd+Enter`, `Ctrl/Cmd+Shift+C` (D4) | Quy trình nhanh cho dev | Đã duyệt (2026-11-01) |
| 2026-11-01 | Visual | Giữ Inter + indigo (D5) | Đã duyệt trước đó; có thể đổi sau | Đã duyệt |
| 2026-11-01 | Scope | Bỏ Feedback entry point khỏi tool page (Feedback hoãn) | Quyết định Q1 | Đã duyệt |
| 2026-11-01 | Interaction | Bỏ phím tắt `Ctrl/Cmd+Shift+C` (copy output) ở D4 | Trùng phím chọn phần tử của DevTools trên Chrome, Edge, Firefox; thiết kế yêu cầu kiểm xung đột trước khi chốt. Giữ `Ctrl/Cmd+Enter` và `/` | Đã duyệt (2026-11-01) |
| 2026-11-01 | Layout | JWT: ô token là `Textarea` 4 dòng, chưa tô màu 3 phần (layouts.md §4.3) | Đủ dùng và tránh trộn màu với nội dung; tô màu 3 phần để M7 nếu cần | Đã duyệt (2026-11-01) |
| 2026-11-01 | Layout | UUID: không ảo hóa danh sách khi >200 dòng (layouts.md §4.4, plan 3.4) | 1.000 dòng nhẹ, hiệu năng chấp nhận được; sẽ đo ở M7 và thêm ảo hóa nếu cần | Đã duyệt (2026-11-01) |
| 2026-11-01 | Components | Thêm `Checkbox`, `Notice` (cảnh báo/thông tin thường trực), `SplitWorkspace` | `Notice` cho cảnh báo JWT, số mất độ chính xác, tài liệu lớn; `SplitWorkspace` là bố cục Input\|Output dùng chung | Chờ duyệt |
| 2026-11-01 | Behaviour | JSON trên 200.000 ký tự không tự cập nhật; hiện thông báo "bấm Format" và nhãn "Kết quả trước đó" | Tránh đơ UI; làm rõ kết quả đang cũ (review M3) | Chờ duyệt |
| 2026-11-01 | Components | Thêm `MenuButton` (menu Copy, Tải xuống, Mục lục) và `SafeHtml` (điểm duy nhất đặt innerHTML) | Menu thả xuống theo Design System §9.3; `SafeHtml` để dễ kiểm toán ranh giới tin cậy | Chờ duyệt |
| 2026-11-01 | Layout | Markdown Preview: thanh công cụ tự xuống dòng trên mobile, chưa gom nút phụ vào menu "…" (design §9.3) | Giữ đơn giản; tinh chỉnh ở M7 | Chờ duyệt |
| 2026-11-01 | Scope | Markdown Preview: chưa làm đồng bộ cuộn giữa editor và preview | Là hạng mục tách rời, cắt được theo PRD §10; TOC, xuất HTML, chiều rộng tài liệu, banner, copy từng code block đã có | Chờ duyệt |
| 2026-11-01 | Behaviour | Raw HTML trong Markdown bị bỏ hẳn, kèm thông báo "HTML thô đã bị bỏ qua" | Đúng System Design §3.4; minh bạch thay vì bỏ im lặng | Chờ duyệt |
| 2026-11-02 | Component | Color tools: ô chọn màu trong Contrast/Palette/Gradient dùng hộp chọn màu gốc của trình duyệt (không có alpha; alpha nhập bằng chữ), chỉ Color Picker dùng `react-colorful` | Nhẹ, truy cập tốt, tránh nhiều popover; alpha vẫn nhập được ở ô văn bản | Chờ duyệt |
| 2026-11-02 | Component | Color tools: thêm `ColorField` (ô nhập màu có validate + hộp chọn) và `Swatch` (nền caro cho alpha) dùng chung | Tái sử dụng giữa 4 tool; caro dùng token `surface`/`surface-muted` | Chờ duyệt |
| 2026-11-02 | Scope | CSS Gradient: chưa làm kéo-thả stop (đã có nút lên/xuống dùng bằng bàn phím) | Kéo-thả là tùy chọn theo kế hoạch 6.5 | Chờ duyệt |
| 2026-11-02 | Layout | CSS Gradient: bản xem trước dính (sticky) ở đầu trang trên mobile đã làm ở M7 (layouts §4.9) | Đúng thiết kế; ghi lại vì M6 từng chưa có | Đã xử lý |
| 2026-11-02 | Component | `Segmented`: mục chưa chọn dùng `text-text` (không còn `text-text-muted`), hover nền `surface`, mục đang chọn thêm viền `border-strong` | `text-text-muted` trên `surface-muted` đo được dưới 4.5:1 (axe `color-contrast`, giao diện sáng) | Chờ duyệt |
| 2026-11-02 | Component | Placeholder của CodeMirror dùng `--color-text-muted` thay màu xám mặc định của thư viện | Màu mặc định không đạt AA trên `surface` (axe) | Chờ duyệt |
| 2026-11-02 | Asset | Thêm `favicon.svg` (khung `primary` + dấu `<>`) và ảnh OG mặc định 1200×630 (`scripts/gen-og-image.mjs`) | Plan M7 yêu cầu icon/favicon và ảnh OG; thiếu favicon gây 404 ở Home | Chờ duyệt |
| 2026-11-02 | Behaviour | Khi copy thất bại, công cụ chỉ hiện thông báo "Không copy được. Hãy chọn nội dung và nhấn Ctrl+C." mà không tự bôi đen nội dung (components §2.5) | `CopyButton` không biết ô nội dung nguồn; cần truyền ref từng tool. Có test `test.fail()` ghi nhận | Chờ duyệt |
| 2026-11-04 | Layout | Top nav cố định chứa nút ẩn/hiện sidebar, breadcrumb, ô tìm nhanh trang (`Ctrl/Cmd+K`) và ThemeSwitcher; H1 và mô tả tool chỉ còn cho trình đọc màn hình/SEO | Gọn màn hình, nhường chiều cao cho vùng làm việc | Đã duyệt (2026-11-04) |
| 2026-11-04 | Layout | Sidebar từ `sm` là toggle giữa đầy đủ (15rem) và thanh icon (4.5rem), lưu `devkit:v1:sidebar-expanded`; bỏ rail tự mở khi hover và bỏ ô tìm trong sidebar (đã có tìm nhanh ở top nav) | Một hành vi rõ ràng thay cho hover; không trùng chức năng tìm | Đã duyệt (2026-11-04) |
| 2026-11-04 | Component | `SplitWorkspace` thêm cột thao tác giữa hai ô (icon + tooltip; hàng ngang khi xếp chồng) và cao đúng viewport trừ top nav; `Panel` thêm nút mở rộng (Esc để thu nhỏ) phủ vùng nội dung bên phải sidebar | Thao tác nằm giữa input/output, soi nội dung lớn toàn màn hình | Đã duyệt (2026-11-04) |
| 2026-11-04 | Component | `IconButton` thêm `variant` (`primary`), `CopyButton`/`Checkbox` thêm dạng gọn; `DeviceStatus` chỉ còn icon (nhãn là tooltip và sr-only); Hướng dẫn là mục `<details>` thu gọn ở cuối trang | Giảm chữ thừa, nội dung vẫn có trong HTML cho SEO | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | JSON Formatter: cả hai ô đều nhập được (ô phải là kết quả cho đến khi bạn sửa), thêm sắp xếp key theo prop (tắt / A→Z / Z→A, đệ quy) và so sánh có tô dòng khác biệt (thêm/xóa/đổi) với nút nhảy tới khác biệt kế tiếp | Yêu cầu bổ sung; diff tự viết theo cấu trúc, không thêm thư viện | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | Color Picker: thêm panel lấy màu từ ảnh (chọn file, kéo thả, dán Ctrl+V, kính lúp, phím mũi tên) và nút EyeDropper khi trình duyệt hỗ trợ; ảnh chỉ đọc trên canvas cục bộ, giới hạn 25 MB | Yêu cầu bổ sung; không đổi CSP vì dùng `createImageBitmap` thay cho blob URL | Đã duyệt (2026-11-04) |
| 2026-11-04 | Layout | `SplitWorkspace`: khoảng giữa hai ô là tay nắm kéo đổi độ rộng (20-80%, phím mũi tên, `Home` hoặc nhấp đúp để về 50/50), chỉ từ `lg`; Markdown Preview ở chế độ chia đôi dùng chung | Yêu cầu bổ sung; không lưu tỉ lệ | Đã duyệt (2026-11-04) |
| 2026-11-04 | Component | `Panel` thêm `toolbar` (hàng icon + tooltip dưới tiêu đề: cách xem, thụt lề, sắp xếp, Mẫu, Xóa, Undo/Redo); cột giữa của JSON/XML chỉ còn Copy ◀▶, Format ◀▶ và So sánh | Theo ảnh tham chiếu; thao tác theo từng ô nằm trên ô đó | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | JSON/XML: hai ô độc lập, không tự render lẫn nhau; Format/Copy chạy khi bấm nút ◀ ▶; bỏ chế độ "tự cập nhật" và cảnh báo tài liệu lớn; Undo/Redo dùng lịch sử CodeMirror (thêm phụ thuộc trực tiếp `@codemirror/commands`) | Yêu cầu bổ sung; Xóa hoàn tác được bằng Undo nên bỏ `UndoBar` ở hai tool này | Đã duyệt (2026-11-04) |
| 2026-11-04 | Component | Thêm `TreeView` (đếm mục/khóa, đánh chỉ số phần tử, "Hiện thêm" mỗi 100 nút) và `TableView` (mảng object hoặc thẻ XML lặp lại, tối đa 1.000 dòng) cho cách xem Cây/Bảng; cách xem Nén là chỉ-đọc | Yêu cầu bổ sung; chỉ đọc, sửa ở cách xem Văn bản | Đã duyệt (2026-11-04) |
| 2026-11-04 | Component | `QuickSearch` mở ngay khi focus: tối đa 10 dòng gồm cả nhóm cha; nhóm khớp tên kéo theo các tool con. `Checkbox` nhận `shortLabel` là icon | Yêu cầu bổ sung | Đã duyệt (2026-11-04) |
| 2026-11-04 | Layout | Markdown Preview: chuyển cách xem và các tuỳ chọn thành icon, nút Mở tệp/Mẫu/Xóa/Undo/Redo lên đầu ô soạn thảo, menu Copy/Tải xuống/Mục lục lên đầu ô xem trước | Cùng khung với JSON/XML | Đã duyệt (2026-11-04) |

| 2026-11-04 | Component | JSON Editor đợt A: thêm `Breadcrumb` (đường dẫn nút, nhập đường dẫn), `SearchBar`, slot `Panel.subbar`, `MenuButton` dạng icon (`iconOnly`, `alignEnd`) | Theo spec `docs/design/json-editor-spec.md` | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | JSON: ô có Mở tệp (≤ 25 MB, UTF-8, kéo thả), Lưu ▾ (.json / .min.json), Copy ▾ (nội dung / bản nén / đường dẫn nút), Mở hết / Thu hết, tìm kiếm trong Văn bản và Cây | Theo spec; XML giữ nút tải và Copy cũ | Đã duyệt (2026-11-04) |
| 2026-11-04 | Component | `TreeView` đổi sang danh sách phẳng `role="tree"` (một điểm dừng Tab, mũi tên di chuyển, chọn nút); bỏ đường kẻ dọc thụt lề | Cần chọn nút và điều hướng bàn phím; thụt lề dùng khoảng cách thay đường kẻ | Chờ duyệt |
| 2026-11-04 | Behaviour | Tìm kiếm trong Văn bản dùng bộ tô khớp riêng của `CodeEditor`, không dùng `@codemirror/search` | `findNext` của gói đó tự mở panel tìm mặc định (chưa theo token, lấy mất focus); không cần thêm dependency | Chờ duyệt |
| 2026-11-04 | Layout | Toolbar mỗi ô tự xuống dòng khi hẹp, chưa gom nút vào menu ⋮ dưới 640px; breadcrumb chưa có ở cách xem Bảng và Nén | Giữ đơn giản ở đợt A; ⋮ và chọn hàng trong Bảng làm cùng đợt C | Chờ duyệt |

| 2026-11-04 | Component | JSON Editor đợt B: thêm `InlineEdit` (sửa khóa/giá trị tại chỗ: Enter lưu, Esc hủy, rời ô thì lưu nếu hợp lệ) và menu nút `⋯` (dùng `MenuButton` dạng icon) trong `TreeView` | Theo spec; Cây sửa được cho JSON, XML vẫn chỉ đọc | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | Sửa ở Cây ghi lại cả văn bản (parse và định dạng theo thụt lề của ô) qua giao dịch CodeMirror, nên Hoàn tác/Làm lại dùng chung mọi cách xem; có ghi chú một dòng, đóng được. Tắt sửa và hiện cảnh báo khi JSON có số vượt độ chính xác | Quyết định 3 của plan | Đã duyệt (2026-11-04) |
| 2026-11-04 | Interaction | Trong Cây: `Enter`/`F2` sửa, `Delete` xóa, `Ctrl/Cmd+D` nhân đôi nút đang chọn; nhấp đúp vào khóa hoặc giá trị để sửa | Theo spec §4.2 (chỉ bắt khi tiêu điểm đang ở Cây) | Đã duyệt (2026-11-04) |
| 2026-11-04 | Layout | Menu nút dài 11 mục trong ô thấp bị cắt ở đáy và cuộn nội bộ; mục mới chèn vào đối tượng/mảng có giá trị `""` và mở ngay ô sửa; chưa có dòng "Mục mới" ở container rỗng (dùng menu "Thêm phần tử con") | Đủ dùng ở đợt B; gọn menu (nhóm Đổi kiểu) xem lại ở đợt C | Chờ duyệt |

| 2026-11-04 | Component | JSON Editor đợt C: thêm `QueryPanel` (ba ô Filter, Project, Sort viết như MongoDB Compass, có RegExp `/abc/i`, `$regex`, `$gt`, `$in`, `$and`/`$or`...), nút Query trên toolbar, `TableView` sắp xếp theo cột và sửa ô | Theo spec và yêu cầu bổ sung (Compass) | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | Query chạy trên mảng đầu tiên tìm thấy (gốc nếu là mảng) và cho ra **chỉ mảng kết quả**; xem trước thay thế nội dung ô (chỉ đọc), Áp dụng ghi vào văn bản, Hủy bỏ hết. Parser tự viết, không `eval`; RegExp tối đa 200 ký tự, bỏ cờ g/y | Quyết định đợt C; rủi ro ReDoS (R7) do chính người dùng nhập | Chờ duyệt |
| 2026-11-04 | Behaviour | "Format ◀▶" của JSON đổi thành "Transform ◀▶": áp Query đang mở của ô nguồn rồi format; XML giữ nhãn Format | Theo spec §2.2 | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | Bảng: bấm tiêu đề để sắp xếp (chỉ đổi cách xem, không đổi văn bản; chỉ 1.000 dòng đầu), mũi tên di chuyển ô, Enter/F2 hoặc nhấp đúp để sửa; chỉ ô chuỗi, số, boolean sửa được | Theo spec §3.4 | Đã duyệt (2026-11-04) |
| 2026-11-04 | Layout | Bảng giữ `<table>` thường, ô đang chọn là viền, chưa dùng `role=grid` và `aria-activedescendant`; toolbar vẫn tự xuống dòng (chưa có menu ⋮ dưới 640px) | Giữ ngữ nghĩa bảng cho trình đọc màn hình; ⋮ để lại | Chờ duyệt |

| 2026-11-04 | Layout | Hướng dẫn: bỏ mục `<details>` ở cuối trang, thay bằng icon `?` trong thanh trạng thái mở ngăn (`Dialog` `placement="right"`, rộng 32rem, Esc hoặc nhấp nền để đóng). Nội dung vẫn nằm trong HTML (dialog đóng là `display:none`) nên SEO không đổi; áp dụng cho mọi tool có hướng dẫn | Yêu cầu bổ sung: tránh cuộn trang | Đã duyệt (2026-11-04) |
| 2026-11-04 | Layout | `ToolShell` thêm `fill`: từ lg trang cao đúng một màn hình (trừ top nav), vùng làm việc chiếm phần còn lại sau toolbar, thông báo và thanh trạng thái; thông báo lỗi lấy chỗ của ô thay vì đẩy trang dài ra. Dùng cho JSON, XML và Markdown Preview; dưới lg các ô vẫn xếp chồng và trang cuộn như cũ | Yêu cầu bổ sung: mỗi màn chỉ cuộn trong ô dữ liệu | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | Dán (Ctrl+V) khi tiêu điểm ở trong ô và đang ở cách xem Cây, Bảng hoặc Nén: dữ liệu thay nội dung ô và hiện ngay ở cách xem đó (ô nhập, ô sửa, ô tìm giữ cách dán của chính chúng). Trạng thái rỗng có gợi ý Ctrl+V và nút "Dán từ clipboard" | Yêu cầu bổ sung | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | Cách xem Nén (JSON, XML) sửa được: dữ liệu hợp lệ hiện dạng nén, cái gõ trong chính ô này giữ nguyên như đã gõ (không nén lại dưới con trỏ) và ghi vào văn bản | Yêu cầu bổ sung; đổi quyết định "Nén chỉ đọc" cũ | Chờ duyệt |

| 2026-11-04 | Layout | `SplitWorkspace`: cột giữa không còn căn giữa theo chiều dọc; các nút Copy / Transform / So sánh nằm gần đầu cột (cách đỉnh khoảng 12dvh), đường chia vẫn chạy suốt chiều cao nhưng vùng kéo đổi độ rộng chỉ là dải bên dưới các nút | Yêu cầu bổ sung: UI cột giữa | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | So sánh chỉ chạy ở cách xem Cây, theo jsoneditoronline: bấm So sánh đưa cả hai ô sang Cây và tự mở các nút chứa khác biệt; nút khác biệt được tô (thêm / xóa / khác kèm ký hiệu + − ~ và chữ cho trình đọc màn hình), container chứa khác biệt có chấm; có nút đến khác biệt trước/kế tiếp. Rời Cây ở một trong hai ô thì so sánh tắt. Bỏ tô dòng khác biệt ở cách xem Văn bản | Yêu cầu bổ sung (đổi quyết định so sánh trên Text ở đợt trước) | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | Bảng: khi tài liệu là đối tượng, hiện danh sách các mảng bên trong (Mở, Trích xuất, Chuyển sang dạng Cây) thay vì tự lấy mảng đầu tiên; sau khi mở có ô chọn mảng và nút Trích xuất. Trích xuất thay cả tài liệu bằng mảng đó (hoàn tác được). Tài liệu là mảng thì vào bảng ngay | Yêu cầu bổ sung, theo ảnh jsoneditoronline | Đã duyệt (2026-11-04) |

| 2026-11-04 | Layout | `SplitWorkspace`: bỏ đường kẻ chạy suốt chiều cao; đường chia chỉ nằm ở dải bên dưới các nút (cũng là vùng kéo) | Chỉnh theo phản hồi | Đã duyệt (2026-11-04) |
| 2026-11-04 | Behaviour | So sánh khi một trong hai ô chưa ở dạng Cây: hiện cảnh báo "chỉ chạy ở dạng Cây" kèm nút "Chuyển cả hai ô sang Cây", không tự chuyển và không bật so sánh (sửa điều đã làm ở dòng So sánh trước) | Chỉnh theo phản hồi | Đã duyệt (2026-11-04) |
| 2026-11-04 | Component | `TreeView` hiện `{` hoặc `[` sau khóa của đối tượng/mảng (`{}` `[]` khi rỗng, `{…}` `[…]` khi thu gọn) và dòng đóng `}` `]` dưới container đang mở; dòng đóng là phần trang trí, không chọn được và ẩn với trình đọc màn hình. XML không đổi | Phân biệt đối tượng và mảng như jsoneditoronline | Đã duyệt (2026-11-04) |

| 2026-11-05 | Scope | Thêm tool Text Compare (nhóm Writing & Docs) theo `docs/design/text-compare-spec.md` | Yêu cầu bổ sung, tham khảo diffchecker.com/text-compare | Đã duyệt (2026-11-05) |
| 2026-11-05 | Dependency | Thêm `@codemirror/merge` | Hai ô canh thẳng, sửa được, tô trong dòng, gập dòng giống nhau; tự viết trên `CodeEditor` tốn công và dễ lệch khi wrap | Đã duyệt (2026-11-05) |
| 2026-11-05 | Component | Thêm `DiffEditor` (bọc `MergeView` và `unifiedMergeView`, lazy như `CodeEditor`); `CodeEditorImpl` xuất `tokenTheme` để dùng chung | Cùng theme token; không đổi hành vi của `CodeEditor` | Đã duyệt (2026-11-05) |
| 2026-11-05 | Behaviour | Text Compare: Mẫu nằm ở cột giữa (điền cả hai ô), không nằm trong toolbar từng ô; đổi bên có ở cả hai bước | Một thao tác cho cả hai ô | Chờ duyệt |
| 2026-11-05 | Behaviour | Text Compare: "Bỏ qua khoảng trắng" bỏ qua mọi dấu cách/tab (không chỉ hai đầu dòng), xuống dòng vẫn tính | Giống Diffchecker; dễ giải thích | Chờ duyệt |
| 2026-11-05 | Visual | Text Compare: chữ khác nhau được phân biệt bằng gạch ngang (bên xóa) / gạch chân (bên thêm) kèm nền đậm; thanh lề của thư viện chỉ là dải màu. Chưa có ký hiệu `+`/`−`/`~` ở lề như spec §4 | Không cần thêm gutter tự viết; vẫn có tín hiệu ngoài màu ở mức chữ và nhãn đếm bằng chữ | Chờ duyệt |
| 2026-11-05 | Behaviour | Text Compare: đổi tùy chọn so sánh, chế độ xem hoặc wrap dựng lại trình xem nên lịch sử Undo của trình xem bị đặt lại; nội dung giữ nguyên | `@codemirror/merge` không tính lại diff khi đổi cấu hình | Chờ duyệt |
| 2026-11-05 | Behaviour | Text Compare: không có ngưỡng "bấm So sánh lại" cho văn bản lớn; diff đi theo dòng rồi mới theo ký tự, quá giới hạn thì tự chuyển sang gần đúng và hiện Notice | Nhanh hơn và đơn giản hơn spec §5; vẫn báo khi kết quả không chính xác | Chờ duyệt |
| 2026-11-05 | Behaviour | Text Compare: thêm dòng vào cuối văn bản không có xuống dòng cuối thì dòng cuối cũ cũng bị tô (như "no newline at end of file" của git) | Hành vi của `@codemirror/merge` | Chờ duyệt |

| 2026-11-05 | Component | Cột giữa của `SplitWorkspace`: thêm `SplitButton` (icon và chữ trong một khối, rộng bằng cột) cho So sánh, Đổi hai bên, Mẫu (Text Compare), Đổi chiều, Mẫu, Xóa (Base64) và Đến khác biệt trước/kế tiếp (JSON/XML); `Segmented` thêm `stacked` (Base64: Mã hóa/Giải mã xếp dọc, hiện chữ). Nhóm Copy/Transform ◀▶ của JSON/XML giữ nguyên vì đã có tiêu đề chữ | Yêu cầu bổ sung: nút ở cột giữa hiện chữ mô tả cùng icon, dễ dùng hơn tooltip | Chờ duyệt |

| 2026-11-05 | Scope | Thêm tùy chỉnh màu khung giao diện (nền trang, sidebar và top nav, header ô, status bar) theo `docs/design/appearance-spec.md`; nút Giao diện ở top nav trước `ThemeSwitcher` | Yêu cầu bổ sung | Đã duyệt (2026-11-05) |
| 2026-11-05 | Tokens | Thêm token vùng `--color-region-page/nav/panel-header/status` (mặc định trỏ về `--color-bg`/`--color-surface`), biến `--ap-*` do JS đặt, thuộc tính `data-ap-*` trên `<html>` và thuộc tính `data-region` trên các vùng; thêm bản sao `--base-*` của token để popover/dialog trong vùng đổi màu giữ bảng màu thường (`data-region-reset`) | Mỗi vùng tô màu riêng mà không sửa từng component; mặc định không đổi gì | Đã duyệt (2026-11-05) |
| 2026-11-05 | Component | Thêm `AppearanceMenu` (popover từ sm, `Dialog` dưới sm); `Popover` thêm `placement` (above/below) | Theo spec §3 và §8 | Đã duyệt (2026-11-05) |
| 2026-11-05 | Behaviour | Màu gốc được tính trong `src/lib/appearance.ts` (Culori) và lưu ở `devkit:v1:appearance` cùng giá trị đã tính; `public/theme-init.js` chỉ gán các giá trị đó (kiểm tên và giá trị như `parseStored`) | Không nháy màu, không cần Culori ở script, vẫn nằm ngoài hash CSP | Đã duyệt (2026-11-05) |
| 2026-11-05 | Behaviour | Cổng tương phản khác spec §5: giữ nguyên độ đậm tint như thiết kế, và làm đậm hơn thứ nằm trên vùng (chữ phụ, viền control, màu nhấn) cho tới khi đạt 4.5:1/3:1. Spec ban đầu giảm độ đậm tint, nhưng `--color-border-strong` mặc định chỉ hơn 3:1 một chút nên tint thành gần trắng | Tint đủ rõ mà vẫn đạt AA; vùng chỉ bị từ chối khi chữ chính cũng không đọc được | Chờ duyệt |
| 2026-11-05 | Scope | Popover Giao diện chưa có "dải xem trước" thu nhỏ (spec §3.2): trang thật là bản xem trước vì áp dụng ngay | Giảm một thành phần không cần thiết | Chờ duyệt |
| 2026-11-05 | Component | `StatusBadge` success: nền pha 8% thay vì 12% | `success-fg` trên nền 12% chỉ 4.39:1 (axe `color-contrast`) | Chờ duyệt |

| 2026-11-06 | Behaviour | Tùy chỉnh màu: sidebar và top nav là hai màu riêng dù chung một công tắc "Sidebar và top nav" (sidebar đậm hơn, top nav nhạt hơn, nền trang nhạt nhất; kiểu Đậm: top nav sáng hơn sidebar một bậc). Mỗi khối có đường kẻ chia rõ hơn (`--color-border` cục bộ). Token `--color-region-topnav`, thuộc tính `data-ap-topnav`, `data-region="topnav"` | Cùng một màu khiến sidebar và top nav trộn vào nhau khi đổi sang màu tím, xanh (phản hồi người dùng) | Chờ duyệt |

*(Bổ sung dòng mới cho mỗi sai khác trong quá trình thiết kế/implement.)*
