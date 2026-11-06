# Text Compare — UI/UX spec (bước 1–4, ĐÃ DUYỆT 2026-11-05)

**Mục tiêu:** tool so sánh hai văn bản thuần theo trải nghiệm của diffchecker.com/text-compare: nhập hai bên, bấm **So sánh**, rồi xem hai ô soạn thảo **canh thẳng hàng**, sửa trực tiếp ở bất kỳ bên nào và sai khác tự tính lại. Tham khảo thêm text-compare.com (hai ô nhập rõ ràng, nút So sánh nổi bật).

**Ngoài phạm vi (cố ý):** lưu diff, chia sẻ link, comment, xuất PDF, tóm tắt AI (cần tài khoản/máy chủ, trái nguyên tắc "không gửi dữ liệu ra ngoài", PRD §4.2). **Hoãn:** rule bỏ qua chuỗi tùy ý (timestamp, build number…), merge từng thay đổi bằng mũi tên.

Ghi chú quy trình: skill `frontend-design` không có trong phiên này (cùng tình trạng với `json-editor-spec.md`), nên spec do mình viết trực tiếp theo Design System. Nếu muốn chạy lại qua skill thì cài skill rồi review lại §3 và §6.

Phụ thuộc mới cần duyệt: `@codemirror/merge` (xem §9). Dùng cùng hệ CodeMirror đã có (`@codemirror/view` 6.43, `@codemirror/state` 6.7), đóng gói lazy cùng chunk route.

---

## 1. Hai trạng thái của trang

```text
 NHẬP  ──[So sánh]/Ctrl+Enter──▶  KẾT QUẢ
   ▲                                │
   └────────[Nhập lại]──────────────┘   (giữ nguyên nội dung hai bên)
```

| Trạng thái | Nội dung | Sửa được |
|---|---|---|
| **Nhập** | Hai ô trống/đã có chữ, chưa tô khác biệt | Có |
| **Kết quả** | Hai ô canh thẳng, tô khác biệt, thanh tóm tắt | Có, bên nào cũng được; sai khác tính lại sau debounce 200 ms |

Vì Kết quả đã sửa được như Nhập, hai trạng thái dùng chung dữ liệu (văn bản trái, văn bản phải). Chỉ khác ở chỗ có/không tô khác biệt và có/không canh thẳng hàng. Quay lại **Nhập** không mất nội dung.

---

## 2. Trạng thái Nhập

```text
┌ Văn bản gốc ───────────────┐   ┌ So sánh ┐   ┌ Văn bản đã sửa ─────────────┐
│ 📂 Mở · ✎ Mẫu · 🗑 Xóa · ↶ ↷ │   │ ▶ So sánh│   │ 📂 Mở · ✎ Mẫu · 🗑 Xóa · ↶ ↷  │
├────────────────────────────┤   │ ⇄ Đổi   │   ├─────────────────────────────┤
│ (CodeEditor, language text)│   └─────────┘   │ (CodeEditor, language text) │
│                            │                 │                             │
└────────────────────────────┘                 └─────────────────────────────┘
```

- Bố cục dùng `SplitWorkspace` (kéo chia 20–80%, xếp dọc dưới lg) và `Panel` như JSON/XML.
- Tiêu đề hai ô: "Văn bản gốc" / "Văn bản đã sửa" (cũng là accessible name của editor).
- Toolbar mỗi ô (icon + tooltip, `Panel.toolbar`): Mở tệp (≤ 25 MB, UTF-8, kéo thả tệp lên ô), Mẫu, Xóa (Undo khôi phục, không dùng `UndoBar`), Undo/Redo.
- Cột giữa (`SplitAction`): **So sánh** (primary, duy nhất một nút primary), **Đổi bên** (hoán đổi nội dung hai ô).
- Khi cả hai ô trống: nút So sánh vẫn bấm được và sang Kết quả với thông báo "Hai văn bản trống". Không khóa nút (tránh trạng thái disabled khó hiểu); nếu chỉ một bên có chữ thì mọi dòng là thêm hoặc xóa.
- Đang có một trong hai ô trống khi vào Kết quả: hiển thị bình thường, không chặn.

## 3. Trạng thái Kết quả

```text
┌ Thanh điều khiển ────────────────────────────────────────────────────────────┐
│ [← Nhập lại]  [Hai cột | Một cột]  ⇄ Đổi bên   Copy ▾          ⤢            │
│ Chi tiết [Smart|Từ|Ký tự]  ☐ Bỏ qua khoảng trắng  ☐ Bỏ qua hoa/thường       │
│ ☐ Ẩn dòng giống nhau  ☐ Xuống dòng                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⊘ 5 khác biệt  (+3 −1 ~1)                              [▲ Trước] [▼ Sau]     │  thanh tóm tắt
├──────────────────────────────────────────────────────────────────────────────┤
│ 1  Hello world           │  1  Hello world                                    │
│ 2  foo          [đỏ]     │  2  food            [xanh, "d" đậm]                │
│ 3  ░░░░░ (dòng bù)       │  3  new line        [xanh]                         │
│ ▸ 12 dòng giống nhau (bấm để mở)                                              │
│ 4  bar                   │  4  bar                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Chế độ xem

- **Hai cột** (mặc định từ lg): hai editor cạnh nhau, canh thẳng bằng dòng bù, cuộn đồng bộ.
- **Một cột** (unified): một editor, dòng xóa và dòng thêm xen kẽ, có ký hiệu `−`/`+` ở lề (không chỉ dùng màu).
- Dưới `lg` (1024px) mặc định **Một cột** vì hai cột quá hẹp; người dùng vẫn chọn lại Hai cột và cuộn ngang trong editor. Không tràn ngang toàn trang.

### 3.2. Điều khiển

| Điều khiển | Hành vi |
|---|---|
| **Nhập lại** | Về trạng thái Nhập, giữ nội dung |
| **Hai cột / Một cột** | `Segmented`; không tính lại diff |
| **Đổi bên** | Hoán đổi hai văn bản, diff tính lại |
| **Copy ▾** (`MenuButton`) | Sao chép văn bản gốc, sao chép văn bản đã sửa |
| **Chi tiết: Smart / Từ / Ký tự** | Mặc định Smart (theo Diffchecker: tự chọn theo từng thay đổi). Đổi không cần bấm So sánh lại |
| **Bỏ qua khoảng trắng** | Chuẩn hóa khóa so sánh (cắt hai đầu, gộp khoảng trắng); nội dung hiển thị giữ nguyên |
| **Bỏ qua hoa/thường** | Chuẩn hóa chữ thường khi so khóa |
| **Ẩn dòng giống nhau** | Gập các đoạn dòng không đổi (giữ vài dòng đệm quanh khác biệt), bấm dải để mở |
| **Xuống dòng** | Bật/tắt wrap dòng dài; tắt sẵn |
| **⤢ Mở rộng** | Mở rộng vùng làm việc (như `Panel.expandable`, Esc để thu nhỏ) |

Các tuỳ chọn là checkbox gọn (`Checkbox` dạng icon + tooltip như hai ô JSON/XML); khi hẹp thì hàng tuỳ chọn tự xuống dòng. Bốn tuỳ chọn thay đổi diff nhớ trong phiên (không lưu storage).

### 3.3. Thanh tóm tắt

- Dạng `StatusBadge` + chữ: `5 khác biệt (+3 −1 ~1)`. Nếu giống nhau: `Hai văn bản giống nhau` (kiểu success, có icon).
- Nút **Trước / Sau** nhảy giữa các khối khác biệt (cuộn tới và đưa caret vào khối). **Không** gán phím tắt (Alt+↑/↓ trùng thao tác di chuyển dòng của CodeMirror, F3 trùng tìm trang của trình duyệt).
- Vùng `aria-live="polite"` đọc số khác biệt khi đổi (debounce để không đọc mỗi lần gõ).

## 4. Màu và nhận diện không chỉ bằng màu

Dùng token có sẵn, không thêm giá trị cứng:

| Loại | Nền dòng | Nền chữ khác (đậm hơn) | Dấu phụ |
|---|---|---|---|
| Xóa / chỉ có ở gốc | `--color-danger` 22% | `--color-danger` 45% | lề `−`, gạch ngang đậm ở bên có dòng |
| Thêm / chỉ có ở sửa | `--color-success` 22% | `--color-success` 45% | lề `+` |
| Đổi (dòng có chữ khác) | `--color-warning` 26% | chữ khác theo hai màu trên | lề `~` |
| Dòng bù canh hàng | `--color-surface-muted` + nét chéo mờ | — | không có số dòng |

Cùng công thức `color-mix` như `.cm-diff-*` trong `CodeEditorImpl`; mức 45% cho chữ đậm phải kiểm contrast AA với `--color-text` ở cả light/dark (axe). Dải "N dòng giống nhau" dùng `--color-text-muted` trên `--color-surface-muted` và phải đạt AA (đo bằng axe như lần trước).

## 5. Trạng thái (checklist §2.5)

| Trạng thái | Thiết kế |
|---|---|
| Empty (Nhập, hai ô trống) | Placeholder trong editor, gợi ý "Dán văn bản vào đây hoặc thả tệp"; nút Mẫu |
| Kết quả, hai bên trống | Thanh tóm tắt: "Hai văn bản trống"; không có diff |
| Giống nhau | Badge success "Hai văn bản giống nhau", không có dòng tô |
| Có khác biệt | Thanh tóm tắt + tô + Trước/Sau |
| Quá lớn (tổng > 200.000 ký tự hoặc diff vượt trần) | `Notice`: "Văn bản lớn: bấm So sánh để tính lại"; diff không tự chạy khi gõ, nhãn "Kết quả trước đó" cho đến khi bấm |
| Dòng cực dài (> 10.000 ký tự) | Bỏ tô trong dòng, chỉ tô cả dòng; có chú thích nhỏ trong `Notice` |
| Lỗi mở tệp (quá 25 MB / không phải UTF-8) | `ErrorBanner` như JSON; giữ nguyên nội dung ô |
| Đang tính (hiếm, diff nặng) | Chỉ báo "Đang so sánh…" trong thanh tóm tắt, không khóa soạn thảo |
| Disabled | Không dùng; thao tác không áp dụng thì ẩn (ví dụ Trước/Sau khi 0 khác biệt thì vô hiệu `aria-disabled` kèm tooltip) |

## 6. Responsive (checklist §2.5)

| Breakpoint | Hành vi |
|---|---|
| ≥ lg (1024) | Nhập: ba cột (ô, thao tác, ô). Kết quả: Hai cột mặc định, thanh điều khiển 2 hàng |
| sm–lg | Nhập: hai ô xếp dọc, thao tác thành hàng ngang (có sẵn trong `SplitWorkspace`). Kết quả: mặc định Một cột |
| < sm (640) | Thanh điều khiển: chỉ giữ Nhập lại, Hai cột/Một cột, Trước/Sau; các tuỳ chọn còn lại vào menu ⋮. Editor cuộn ngang trong chính nó. Không tràn ngang trang, kiểm tra ở 320px |

## 7. Tương tác và bàn phím (checklist §2.5)

- `Ctrl/Cmd+Enter` ở trạng thái Nhập = So sánh (phím tắt đã có trong dự án); ở Kết quả không làm gì (diff tự cập nhật).
- Thứ tự Tab: thanh điều khiển (trái → phải) → thanh tóm tắt (Trước, Sau) → editor trái → editor phải. Trong CodeMirror: `Esc` rồi `Tab` để rời editor (như các tool khác). Tab không thụt lề.
- Icon-only button đều có tên truy cập; trạng thái bật (Wrap, Bỏ qua…) dùng `aria-pressed`/checkbox thật.
- Chuyển trạng thái Nhập ↔ Kết quả: đặt focus vào tiêu đề của vùng mới (hoặc editor trái), không mất focus vào `body`.
- `prefers-reduced-motion`: không dùng hoạt ảnh cuộn mượt khi nhảy tới khác biệt.

## 8. Component

**Dùng lại:** `SplitWorkspace`/`SplitAction`, `Panel`, `IconButton`, `Segmented`, `Checkbox`, `MenuButton`, `CopyButton`, `StatusBadge`, `Notice`, `ErrorBanner`, `CodeEditor` (trạng thái Nhập), `useDebounced`, `useHotkeys`, `readTextFile`.

**Mới (cần duyệt):**
1. `DiffEditor` (`src/components/editors/DiffEditor.tsx`, lazy như `CodeEditor`): bọc `MergeView` (Hai cột) và `unifiedMergeView` (Một cột) của `@codemirror/merge`. Props: `original`, `modified`, `onChange(side, value)`, `view`, `ignoreWhitespace`, `ignoreCase`, `precision`, `collapseUnchanged`, `wrap`, `labels`. Theme theo token (dùng chung thiết lập với `CodeEditorImpl`).
2. `DiffSummary` (feature): thanh tóm tắt (badge + đếm + Trước/Sau).

Feature mới `src/features/text-compare/`: `TextCompare.tsx`, `core/diff.ts` (chuẩn hóa xuống dòng, khóa so sánh theo tuỳ chọn, đếm `+ − ~`; hàm diff truyền vào `@codemirror/merge` qua cấu hình diff), test đi kèm.

## 9. Phụ thuộc mới: `@codemirror/merge` (cần duyệt)

- **Vì sao cần:** hai ô canh thẳng, sửa được, cuộn đồng bộ, tô theo từ/ký tự, gập dòng giống nhau là phần cốt lõi; tự viết trên `CodeEditor` hiện tại (không chèn được dòng bù) tốn công và dễ lệch khi bật wrap.
- **Cách khác nếu không thêm:** tự viết widget dòng bù, tô theo đoạn và đồng bộ cuộn trong `CodeEditorImpl`; rủi ro hồi quy JSON/XML và lệch căn hàng khi wrap.
- **Chi phí:** phiên bản 6.12.3 (cập nhật 2026-10-19), phụ thuộc `@codemirror/view`/`state`/`language`, `@lezer/highlight` và `style-mod` (đã có hoặc nhỏ); khoảng 180 KB unpacked, nằm trong chunk lazy của route. **Việc phải kiểm tra khi làm:** `check:bundle` (Home không tải CodeMirror), tương thích phiên bản `view` 6.43, CSP (thư viện chèn style qua `style-mod`, như CodeMirror hiện tại), a11y của gutter/chunk, hành vi khi bật wrap.
- **Ghi vào Design System §12** khi được duyệt: "Thêm `@codemirror/merge` cho Text Compare" (trạng thái Chờ duyệt → Đã duyệt).

## 10. Đối chiếu checklist §2.5

- [x] Màu/spacing/radius/font dùng token (§4); không giá trị cứng.
- [x] Đủ trạng thái empty/loading/success/error/disabled (§5).
- [x] Layout desktop/tablet/mobile, không tràn ngang trang (§6); kiểm 320px.
- [x] Light và Dark: dùng token có sẵn; kiểm contrast 45% và dải gập bằng axe khi làm.
- [x] Tái sử dụng component; `DiffEditor` và `DiffSummary` có lý do (§8).
- [x] Focus-visible, keyboard path, accessible name (§7).
- [x] `prefers-reduced-motion` (§7).
- [x] Sai khác ghi vào §12 (sẽ thêm sau khi duyệt: nhóm, dependency, hai trạng thái, chế độ Một cột mặc định dưới lg).

## 11. Rủi ro và câu hỏi còn lại

- **Smart/Từ/Ký tự:** `@codemirror/merge` tô trong dòng theo cấu hình diff riêng; Smart (chọn mức theo từng thay đổi) có thể phải tự lập trình. Phương án dự phòng: Smart = từ khi dòng dài/nhiều thay đổi, ký tự khi thay đổi nhỏ; sẽ chốt khi làm lõi và ghi vào §12 nếu khác Diffchecker.
- **Bỏ qua hoa/thường, khoảng trắng:** thư viện không có sẵn; phải đưa hàm diff riêng vào cấu hình. Cần thử với văn bản lớn.
- **Wrap + canh hàng:** cần kiểm thử thật; nếu lệch thì ghi chú giới hạn hoặc khóa wrap ở chế độ Hai cột.
- **Hai cột dưới lg:** đề xuất mặc định Một cột (đã ghi ở §3.1); xác nhận khi duyệt spec.

---

**Trạng thái:** ĐÃ DUYỆT (2026-11-05). Các sai khác khi implement được ghi ở Design System §12.
