# JSON Editor — UI/UX spec (bước 1–4, CHỜ DUYỆT)

Mục tiêu: hai ô JSON của `JsonFormatter` có trải nghiệm tương đương hai ô của jsoneditoronline.org (ảnh tham chiếu): thanh công cụ theo từng ô, thanh đường dẫn (breadcrumb), cây sửa trực tiếp, lọc/sắp xếp/tìm kiếm, cột giữa Copy / Transform / So sánh. **Không** làm menu trên cùng (Sign in, Settings, News), không có tài khoản/cloud.

Ghi chú quy trình: skill `frontend-design` báo "Unknown skill" trong phiên này (Design System §2.2 nói đã cài global). Spec dưới đây do mình viết trực tiếp theo Design System; nếu muốn chạy lại qua skill thì cài skill rồi review lại phần §3.

Phạm vi: chỉ `src/features/json-formatter` + phần dùng chung `src/features/data-tools`. XML dùng chung `DualPaneTool` nên mọi tính năng mới phải bật theo khả năng của adapter (`editable`, `query`), XML giữ nguyên hành vi hiện tại.

---

## 1. Hiện trạng so với tham chiếu

| Tính năng tham chiếu | Hiện có | Việc cần làm |
|---|---|---|
| Hai ô độc lập, kéo chia | Có | — |
| Chuyển Text / Tree / Table | Có (thêm Nén) | Giữ Nén |
| Thụt lề, sắp xếp key | Có | Thêm hộp thoại sắp xếp theo đường dẫn |
| Undo / Redo | Có (chỉ text) | Mở rộng cho thao tác sửa ở Cây/Bảng |
| Copy ◀▶, So sánh, nhảy tới khác biệt | Có | Tô khác biệt trong Cây |
| Mở rộng toàn ô | Có | — |
| Mở/Lưu tệp | Chỉ có tải xuống | Thêm Mở tệp, kéo thả tệp |
| Mở rộng / thu gọn tất cả | Không | Thêm (Cây) |
| Breadcrumb đường dẫn | Không | Thêm |
| Tìm kiếm | Không | Thêm (Text và Cây) |
| Lọc / sắp xếp / chọn trường (Query) | Không | Thêm |
| Transform ◀▶ | Có tên "Format ◀▶" | Đổi thành Transform, áp cả Query |
| Cây sửa trực tiếp, menu ngữ cảnh ▾ | Cây chỉ đọc | Thêm |
| Bảng sửa ô, sắp xếp cột | Bảng chỉ đọc | Thêm |

---

## 2. Bố cục

### 2.1. Một ô (desktop)

```text
┌ Panel header ───────────────────────────────────────────────────┐
│ Trái   [Valid]                  📂Mở ▾  💾Lưu ▾  ⧉Copy ▾  ⤢     │  hàng 1: nhãn, trạng thái, thao tác tệp
├─────────────────────────────────────────────────────────────────┤
│ [Text|Nén|Cây|Bảng] │ ⇳ Mở hết  ⇱ Thu hết │ ⇅ Sắp xếp  ⏷ Lọc  🔍 │ ⋮ │ ↶ ↷ │  hàng 2: toolbar (icon + tooltip)
├─────────────────────────────────────────────────────────────────┤
│ ›  sections › 0 › type                                     ✎    │  hàng 3: breadcrumb (chỉ Cây/Bảng/Text hợp lệ)
├─────────────────────────────────────────────────────────────────┤
│ [Query panel] (chỉ khi bật Lọc / Sắp xếp)                       │  hàng 4: tùy chọn, thu gọn mặc định
│ [Search bar]  (chỉ khi bật 🔍)                                  │
├─────────────────────────────────────────────────────────────────┤
│ Vùng nội dung: CodeEditor | TreeView | TableView                │
└─────────────────────────────────────────────────────────────────┘
```

Hàng 1 và 2 đã có trong `Panel` (`actions` và `toolbar`), thêm hàng 3 và 4 bằng slot mới `Panel.subbar`. Chiều cao vùng nội dung vẫn là viewport trừ top nav như hiện tại.

### 2.2. Cột giữa (desktop) và hàng giữa (< lg)

```text
   Copy       Transform     So sánh
  [◀] [▶]      [◀] [▶]      ☐ So sánh
                             [↓ khác biệt kế]  (khi có khác biệt)
```
- `Copy ◀▶`: chép nguyên văn từ ô nguồn sang ô đích (như hiện nay).
- `Transform ◀▶`: format theo thụt lề của ô nguồn, **cộng** Query đang bật của ô nguồn (lọc, sắp xếp, chọn trường), ghi kết quả vào ô đích. Thay cho "Format ◀▶".
- Dưới lg: hàng ngang như hiện tại, icon xoay 90° (đã có).

### 2.3. Responsive

| Breakpoint | Hành vi |
|---|---|
| ≥ lg (1024) | Hai ô cạnh nhau, cột giữa dọc, kéo chia 20–80% |
| sm–lg | Hai ô xếp dọc, cột giữa thành hàng ngang |
| < sm (640) | Toolbar hàng 2 giữ: chế độ xem, Undo/Redo, ⋮; các nút còn lại (Mở/Thu hết, Sắp xếp, Lọc, Tìm) vào menu ⋮. Breadcrumb cuộn ngang, không xuống dòng. Hàng 1: chỉ giữ Copy và ⤢, Mở/Lưu vào ⋮ |

---

## 3. Thành phần

### 3.1. Tái sử dụng
`Panel`, `Segmented`, `IconButton`, `CopyButton`, `StatusBadge`, `Checkbox`, `Button`, `MenuButton`, `CodeEditor`, `TreeView`, `TableView`, `SplitWorkspace`, `ErrorBanner`.

### 3.2. Mới (cần duyệt, ghi §12)

| Component | Vai trò | Ghi chú |
|---|---|---|
| `Breadcrumb` | Đường dẫn tới nút đang chọn; bấm một mục để chọn nút đó; ✎ chuyển sang ô nhập đường dẫn (vd `sections[0].type`) rồi Enter để nhảy tới | `nav` + `aria-label`; mục cuối `aria-current="location"` |
| `SearchBar` | Ô tìm, đếm "3/12", ▲▼, Esc đóng | Text: dùng `@codemirror/search`; Cây: tô và mở các nút khớp; dùng chung một thanh |
| `QueryPanel` | Ba khối: Lọc (đường dẫn · toán tử · giá trị), Sắp xếp (đường dẫn · A→Z/Z→A), Chọn trường (nhiều đường dẫn). Xem trước kết quả ngay; nút Áp dụng (ghi vào chính ô) và nút Hủy | Không thêm thư viện query; tự viết bộ lọc theo đường dẫn đơn giản |
| `NodeMenu` | Nút ▾ hiện ở dòng đang chọn trong Cây: Sửa, Chèn trước/sau, Nhân đôi, Xóa, Đổi kiểu, Sắp xếp con, Trích xuất | Popover + `role="menu"`, phím mũi tên |
| `InlineEdit` | Sửa tên khóa hoặc giá trị tại chỗ (Enter lưu, Esc hủy); chuỗi dùng `input`, số/bool/null có bộ chọn kiểu | Giá trị sai kiểu: viền `danger` + thông báo ngắn, không lưu |

### 3.3. Cây (TreeView) mở rộng
- Dòng được chọn: nền `surface-muted`, viền trái 2px `primary`; một dòng chọn tại một thời điểm.
- Dòng giữ nguyên bố cục hiện tại (mũi tên, khóa, badge đếm, giá trị tô màu theo kiểu bằng token đã có).
- Chuỗi dài: xuống dòng, không cắt.
- Đối tượng/mảng rỗng có dòng "Mục mới" mờ để chèn nhanh.
- Khi So sánh bật: dòng thêm/xóa/đổi dùng cùng ba màu trạng thái với Text (không thêm token).

### 3.4. Bảng (TableView) mở rộng
- Bấm tiêu đề cột để sắp xếp (▲▼, `aria-sort`).
- Nhấp đúp (hoặc Enter) vào ô để sửa, Esc hủy.
- Giới hạn 1.000 dòng giữ nguyên.

---

## 4. Tương tác

### 4.1. Nguồn dữ liệu duy nhất là text
Mọi thao tác sửa ở Cây/Bảng sinh ra text JSON mới (theo thụt lề của ô) rồi **ghi vào CodeMirror như một transaction**. Nhờ vậy Undo/Redo hoạt động chung cho cả ba cách xem, và Text luôn khớp Cây. Cây không giữ state dữ liệu riêng.

Hệ quả cần biết: sửa ở Cây sẽ format lại toàn bộ text (mất cách trình bày cũ của người dùng). Hiển thị ghi chú một lần: "Sửa ở Cây sẽ định dạng lại văn bản".

### 4.2. Phím tắt (trong ô đang focus, kiểm xung đột trình duyệt trước khi chốt)
| Phím | Việc |
|---|---|
| `Ctrl/Cmd+F` | Mở SearchBar của ô (chỉ khi focus trong ô; ngoài ô giữ mặc định trình duyệt) |
| `Enter` / `F2` trên dòng Cây | Sửa giá trị |
| `Delete` | Xóa nút đang chọn |
| `Ctrl/Cmd+D` | Nhân đôi nút (chặn bookmark chỉ trong Cây) |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` | Undo/Redo |
| `←/→` trên Cây | Thu / mở nút; `↑/↓` di chuyển chọn |
| `Ctrl/Cmd+Enter` | Transform ▶ (đã có) |

### 4.3. Mở / Lưu tệp
- Mở: icon 📂 chọn `.json`/`.txt` (giới hạn 25 MB như Color Picker; lớn hơn: lỗi inline nêu lý do, giữ nguyên nội dung); kéo thả tệp vào ô có overlay hướng dẫn.
- Lưu ▾: Tải xuống `.json` (theo định dạng hiện tại) / `.min.json`.
- Copy ▾: Copy (như hiện nay) / Copy bản nén / Copy đường dẫn nút đang chọn.
- Không có tài khoản, không lưu nội dung vào LocalStorage (đúng PRD privacy).

### 4.4. Query và Transform
- Bật Lọc/Sắp xếp mở `QueryPanel` ngay dưới toolbar; kết quả xem trước hiện ở chính ô đó dạng **chỉ-đọc, có nhãn "Kết quả xem trước"**; Áp dụng ghi vào text, Hủy trả lại.
- `Transform ◀▶` dùng Query đang áp dụng của ô nguồn (nếu có) rồi format, ghi sang ô đích. Không có Query: tương đương Format hiện nay.

---

## 5. Trạng thái

| Trạng thái | Hiển thị |
|---|---|
| Rỗng | Placeholder + icon Mẫu (đã có); Cây/Bảng báo "chưa có dữ liệu" |
| Text lỗi cú pháp | Badge Invalid + ErrorBanner có "nhảy tới vị trí" (đã có); Cây/Bảng/Query/Breadcrumb tắt, tooltip nêu lý do |
| Đang sửa dở sai kiểu | Viền `danger` quanh `InlineEdit` + lời nhắc ngắn `role="alert"`, giá trị cũ giữ nguyên |
| Không có kết quả tìm | "0/0" + nền `warning` nhẹ ở SearchBar |
| Query không hợp lệ / rỗng | Thông báo inline trong `QueryPanel`; Áp dụng bị vô hiệu |
| JSON lớn (> 200.000 ký tự) | Giữ như hiện nay; Cây vẫn phân trang 100 nút; Query chạy theo debounce 250ms |
| Đang kéo tệp | Overlay viền đứt nét |

---

## 6. Accessibility
- Cây theo mẫu `role="tree"` / `treeitem` / `aria-expanded` / `aria-selected`; roving tabindex, một tab stop.
- Mọi icon có `aria-label` và tooltip; trạng thái bật dùng `aria-pressed`.
- Breadcrumb là `nav`; thay đổi số khớp tìm báo `aria-live="polite"`.
- Focus-visible nhất quán; trả focus về dòng đang chọn khi đóng menu.
- Không dùng màu duy nhất để báo trạng thái (diff có ký hiệu +/−/~ kèm màu).
- Motion ≤ 200ms, tôn trọng `prefers-reduced-motion`.

## 7. Theme và token
Chỉ dùng token đã có (`surface`, `surface-muted`, `border`, `border-strong`, `primary`, `info-fg`, `success-fg`, `warning-fg`, `danger`, `text`, `text-muted`). Không đổi bảng màu, không bắt chước màu xanh lá hay nền tối của tham chiếu; Light/Dark theo theme của ứng dụng. Icon: Lucide 16px.

## 8. Checklist Design System §2.5
- [x] Token, không giá trị cứng (spec chỉ nêu token)
- [x] Đủ trạng thái (§5)
- [x] Desktop / tablet / mobile (§2.3)
- [x] Light và Dark (token)
- [x] Tái sử dụng, component mới có lý do (§3.2)
- [x] Focus, bàn phím, accessible name (§4.2, §6)
- [x] Motion
- [ ] Ghi §12: **chờ duyệt**

## 9. Đề xuất ghi §12 (sau khi duyệt)
1. Thêm `Breadcrumb`, `SearchBar`, `QueryPanel`, `NodeMenu`, `InlineEdit`, slot `Panel.subbar`.
2. `TreeView` và `TableView` chuyển từ chỉ-đọc sang sửa được (chỉ JSON); mọi sửa đi qua CodeMirror transaction.
3. Đổi nhãn "Format ◀▶" thành "Transform ◀▶", áp cả Query.
4. Thêm Mở tệp / kéo thả / Lưu ▾ / Copy ▾ cho JSON (tiếp §9.1: cùng vị trí trên mọi tool; XML nhận Mở/Lưu ở đợt sau nếu muốn).

## 10. Kế hoạch theo đợt (sau khi duyệt, cập nhật Implementation Plan)

| Đợt | Nội dung | Phụ thuộc mới |
|---|---|---|
| A | Breadcrumb, Mở/Thu hết, SearchBar, Mở/Lưu/Copy ▾ | `@codemirror/search` (kiểm tra đã có sẵn trong gói `codemirror`) |
| B | Cây sửa được, NodeMenu, InlineEdit, Undo/Redo chung | không |
| C | QueryPanel, Transform, sắp xếp theo đường dẫn, Bảng sửa/sắp xếp | không (tự viết) |
| D | Diff trong Cây, kéo thả sắp xếp phần tử | không |

Mỗi đợt có test đơn vị cho lõi (path, query, edit, serialize) và e2e Playwright cho đường chính, giữ `npm run verify` xanh, `check:bundle` không vượt ngân sách.

## 11. Câu hỏi cần bạn chốt
1. Giữ chế độ "Nén" (tham chiếu không có)? Đề xuất: giữ.
2. Chấp nhận việc sửa ở Cây format lại toàn bộ text (§4.1)?
3. Tên tài liệu "New document 1" có sửa được không? Đề xuất: bỏ, giữ nhãn Trái/Phải (không lưu tài liệu nên tên không có tác dụng).
4. Có làm đợt D (kéo thả, diff trong Cây) ngay không, hay để sau?
5. Áp dụng cho XML cùng lúc hay chỉ JSON? Đề xuất: chỉ JSON.
