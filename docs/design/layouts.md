# DevKit — Layouts (bước 1.5)

**Trạng thái:** Approved (2026-11-01)
Tham chiếu: [`ui-direction.md`](./ui-direction.md), [`components.md`](./components.md), Design System §6 (breakpoint), §7, §9.

---

# 1. Breakpoint và hành vi chung

| | Mobile `<640` | Tablet `640–1023` | Desktop `≥1024` |
|---|---|---|---|
| Sidebar | Ẩn, mở bằng nút ☰ (drawer, focus trap, Esc đóng) | Thu gọn còn icon (72px), mở rộng khi hover/focus hoặc bấm | Cố định 240px |
| Page padding | 12–16px | 16px | 24px |
| Workspace hai cột | Xếp dọc (Input trên, Output dưới) | Xếp dọc nếu <800px vùng nội dung, ngược lại hai cột | Hai cột, gap 16px |
| Toolbar | Một hàng cuộn ngang nếu thiếu chỗ; nút phụ vào menu "…" | Một hàng, nút phụ có thể vào "…" | Một hàng đủ |
| Status bar | Cố định đáy workspace, rút gọn chữ | Như desktop | Như desktop |
| Cao workspace | `min-height: 60dvh` | `min-height: 520px` | Lấp đầy chiều cao còn lại của khung nhìn |

Quy tắc: không horizontal overflow toàn trang; editor, bảng, code block cuộn nội bộ. Touch target ≥ 40×40px trên mobile.

# 2. App shell

```text
Desktop                                      Mobile
┌────────┬──────────────────────────┐        ┌──────────────────────┐
│ DevKit │ [breadcrumb]  [theme ▾]  │        │ ☰  DevKit        ◐   │
│ search ├──────────────────────────┤        ├──────────────────────┤
│ groups │ <Outlet/>                │        │ <Outlet/>            │
└────────┴──────────────────────────┘        └──────────────────────┘
```
- Top bar chỉ có breadcrumb và chọn theme (Light/Dark/System). Không có Feedback (hoãn).
- Skip link "Bỏ qua điều hướng" là phần tử đầu tiên khi Tab.
- Breadcrumb: `Công cụ / Data / JSON Formatter`; mobile chỉ hiện mục cuối + nút quay lại.
- Trang 404: tiêu đề "Không tìm thấy trang", một câu hướng dẫn, link về Home và ô tìm tool.

# 3. Tool page template

Thứ tự (khớp Design System §7.2, bỏ Feedback):
1. Breadcrumb
2. H1 + mô tả một câu
3. Toolbar (mode, option, nút chính, phụ)
4. Workspace
5. Status bar (kết quả, đếm, chỉ báo "Xử lý trên thiết bị")
6. Phần hướng dẫn: Cách dùng, Giới hạn, Câu hỏi thường gặp (nội dung prerender, cũng là nội dung SEO)

Vùng lỗi nằm **giữa toolbar và workspace** (inline, không đẩy workspace nhảy: dành sẵn chiều cao 0 → mở rộng có transition ≤120ms hoặc overlay trong output).

# 4. Layout theo tool

## 4.1. JSON Formatter / XML Formatter / (SQL Formatter ẩn)
Hai cột Input | Output như ui-direction §2.3. Toolbar: `Format` (primary) · `Minify` · Indent `2|4` · `Mẫu` · `Xóa`. XML thêm `Tải .xml`. Status: `✓ Hợp lệ` / `✕ Không hợp lệ` + số ký tự + (JSON) cảnh báo số nguyên lớn. Cảnh báo giới hạn XML (quote/thứ tự attribute) nằm trong phần Giới hạn, không chiếm workspace.

## 4.2. Base64
Segmented `Mã hóa | Giải mã` + checkbox `URL-safe`. Hai vùng đổi nhãn: Mã hóa: `Văn bản` → `Base64`; Giải mã: `Base64` → `Văn bản`. Nút `Đổi chiều` (swap) đưa output thành input mới.

## 4.3. JWT Decoder
```text
┌ Token ───────────────────────────────────────────────┐
│ [ô nhập một dòng, tô màu 3 phần header.payload.sig]  │
├──────────────────────────────────────────────────────┤
│ ⚠ Chỉ giải mã, không xác minh chữ ký. Không dùng để  │
│   kết luận token hợp lệ hay an toàn.                 │
├────────────────────┬─────────────────────────────────┤
│ Header     [Copy]  │ Payload                  [Copy] │
│ { alg, typ }       │ { sub, iat, exp ... }           │
├────────────────────┴─────────────────────────────────┤
│ Thời gian: iat ... · exp ... → Đã hết hạn 3 giờ trước│
└──────────────────────────────────────────────────────┘
```
Cảnh báo luôn hiện (không đóng được), icon + chữ. Mốc thời gian hiển thị cả giờ địa phương và UTC. Màu 3 phần token có kèm nhãn chữ (không chỉ màu).

## 4.4. UUID Generator
Toolbar: `Số lượng` (số, 1–1000) · `Tạo UUID` (primary) · `Copy tất cả`. Danh sách mono, mỗi dòng có nút Copy; số lượng hiển thị `20 UUID`. Danh sách cuộn nội bộ (ảo hóa nếu >200 dòng).

## 4.5. Markdown Preview
Theo Design System §9.3. Bổ sung: toolbar `Chế độ: Soạn | Chia đôi | Xem` · `Mở file` · `Copy ▾` · `Tải ▾` · `Xóa`; checkbox `Tải ảnh ngoài` (tắt sẵn) mở hộp xác nhận. Status: từ · ký tự · phút đọc · chỉ báo thiết bị (chuyển cảnh báo khi bật ảnh ngoài). Mobile: segmented `Soạn | Xem`, toolbar rút gọn, nút phụ vào "…". TOC là popover từ nút `Mục lục`.

## 4.6. Color Picker
```text
┌ Bộ chọn màu (react-colorful) ┐ ┌ Giá trị ──────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓              │ │ HEX   #4F46E5CC        [Copy] │
│ ▒ slider hue / alpha         │ │ RGBA  79, 70, 229, 0.8 [Copy] │
└──────────────────────────────┘ │ HSL   243 75% 59%      [Copy] │
 Preview lớn (ô caro nền cho alpha)└───────────────────────────────┘
 Gần đây: ▪▪▪▪▪▪▪  [Xóa lịch sử]       [Màu ngẫu nhiên]
```
Mỗi định dạng là một ô nhập có validate riêng; lỗi hiển thị cạnh ô. Preview dùng nền caro để thấy alpha.

## 4.7. Color Palette
Màu gốc + `Quy tắc` (Đơn sắc, Tương tự, Bổ túc, Tam giác, Tứ giác) + số lượng + `Ngẫu nhiên`. Dải swatch ngang (mobile: lưới 2 cột), mỗi swatch có mã mono và Copy. Dưới có khối `CSS Variables` (editor read-only) + Copy.

## 4.8. Color Contrast
```text
Chữ [#0F172A ▢]  ⇄ Đổi chỗ  Nền [#F8FAFC ▢]   Nền giả định cho độ trong suốt: (Trắng|Đen|Tùy chọn)
┌ Preview ─────────────────────────────────┐   Tỉ lệ tương phản   17.06 : 1
│ Văn bản thường 16px / Văn bản lớn 24px   │   ┌───────────────┬───────┬───────┐
└──────────────────────────────────────────┘   │               │ AA    │ AAA   │
 Màu hiệu dụng: chữ #..., nền #...             │ Chữ thường    │ ✓ Đạt │ ✓ Đạt │
 Gợi ý màu gần nhất đạt ngưỡng (nếu làm)        │ Chữ lớn       │ ✓ Đạt │ ✓ Đạt │
                                                └───────────────┴───────┴───────┘
```
Đạt/Không đạt luôn có icon + chữ. Ratio cắt (không làm tròn lên) hai chữ số thập phân. Dòng ghi chú hiện khi có alpha: "Nền trong suốt được tính trên nền trắng".

## 4.9. CSS Gradient
Preview lớn phía trên. Panel: `Loại: Linear | Radial`, góc (slider + số), (Radial: hình dạng, vị trí), danh sách color stop (mỗi hàng: ô màu, mã, vị trí %, nút lên/xuống, xóa; kéo-thả là tùy chọn, luôn có nút lên/xuống để dùng bàn phím), `Thêm điểm màu`, preset, khối CSS + Copy. Mobile: preview sticky đầu trang khi chỉnh.

# 5. Thứ tự Tab và điều khiển bằng bàn phím

Skip link → sidebar (tìm → nhóm → tool) → breadcrumb → theme → toolbar (trái sang phải) → Input → Output → status bar (chỉ báo thiết bị) → phần hướng dẫn. Trong CodeMirror: `Esc` rồi `Tab` để rời editor.

# 6. Responsive kiểm tra được

Với mỗi tool, QA kiểm tra tại 375, 768, 1024, 1440px: không cuộn ngang toàn trang; nút chính nhìn thấy không cần cuộn trước khi nhập; touch target ≥ 40px trên mobile; sidebar drawer đóng bằng Esc và trả focus.
