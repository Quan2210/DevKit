# DevKit — Component Inventory (bước 1.5)

**Trạng thái:** Approved (2026-11-01)
Quy tắc: tái sử dụng trước; component mới phải có lý do. "DS" = đã có trong Design System v1.1 §8; "Mới" = cần duyệt (tương ứng đề xuất ở `ui-direction.md` §6).

# 1. Component dùng lại từ Design System

| Component | Dùng ở | Ghi chú thiết kế bổ sung |
|---|---|---|
| Button (Primary, Secondary, Ghost, Destructive) | Mọi tool | Một Primary mỗi màn hình. Nhãn là động từ cụ thể ("Format", "Tạo UUID", "Giải mã"), cùng một tên xuyên suốt luồng |
| Input / Textarea | Token JWT, số lượng UUID, mã màu | Label luôn hiển thị; lỗi ngay dưới field |
| Card / Panel | Vùng Input/Output, panel màu | Viền 1px, không bóng; không lồng card |
| Tabs / Segmented control | Encode/Decode, Soạn/Chia đôi/Xem, Linear/Radial, quy tắc palette | Hỗ trợ mũi tên + Home/End |
| Code Editor | JSON, XML, Base64, JWT, Markdown, CSS output | Read-only cho output; theme đồng bộ app |
| Color Swatch | Palette, Recent colors | Luôn kèm mã chữ; viền cho màu quá sáng |
| Toast / Inline feedback | Copy xong dùng nhãn nút, không toast; Toast chỉ cho thao tác nền (tải file xong) | `role="status"` |
| Dialog / Popover | Xác nhận "Tải ảnh ngoài", giải thích chỉ báo thiết bị | Focus trap, Esc, trả focus |
| Status badge | Hợp lệ/Không hợp lệ, Đạt/Không đạt, Hết hạn/Còn hạn | Icon + chữ + màu `-fg` |
| Markdown prose | Preview Markdown | Theo DS §8 |
| Icon (Lucide 16/20px) | Toàn bộ | Icon-only button có tên truy cập |

# 2. Component mới đề xuất (cần duyệt)

## 2.1. `DeviceStatus` (D1)
- **Mục đích:** nói thật và kiểm chứng được rằng dữ liệu không rời trang.
- **Vị trí:** cuối status bar, bên phải, mọi tool.
- **Props:** `externalRequestsEnabled: boolean`.
- **Trạng thái:** `local` (icon khiên/chip + "Xử lý trên thiết bị", màu `info-fg`), `external` (icon cảnh báo + "Ảnh ngoài đang bật: trang gửi request tới máy chủ khác", màu `warning-fg`).
- **Tương tác:** bấm/Enter mở popover: giải thích 2 câu + cách kiểm chứng ("Mở DevTools → Network"). Không bao giờ tuyên bố vượt quá hành vi thật (không viết "an toàn tuyệt đối").
- **A11y:** là `button` có `aria-describedby`; trạng thái `external` dùng `role="status"` khi thay đổi.

## 2.2. `UndoBar` (D2)
- **Mục đích:** thay hộp thoại xác nhận cho Clear.
- **Hành vi:** sau Clear hiện thanh nhỏ phía dưới workspace "Đã xóa. Hoàn tác" trong 6 giây (tạm dừng khi hover/focus); Hoàn tác khôi phục đúng input (và output nếu có). Hết thời gian thì bỏ vĩnh viễn, không lưu vào storage.
- **A11y:** `role="status"`; phím tắt `Ctrl/Cmd+Z` trong editor vẫn hoạt động riêng.

## 2.3. `ToolList` (D3, dùng ở Home và sidebar)
- Hàng gồm: icon, tên (là link), mô tả một dòng, (Color Tools) ô màu 16px minh họa. Có chế độ lọc theo ô tìm.
- Không phải Card; dùng khoảng cách và đường kẻ mảnh giữa các nhóm.
- Phím `/` focus ô tìm; Enter mở kết quả đầu; mũi tên di chuyển giữa hàng.

## 2.4. `ErrorBanner` (kiểu inline cụ thể của Inline feedback)
- Cấu trúc: icon + tiêu đề lỗi (một câu nêu nguyên nhân) + chi tiết (vị trí dòng/cột là link nhảy tới editor) + cách khắc phục nếu có.
- Không xin lỗi, không mơ hồ ("Có lỗi xảy ra" bị cấm). Ví dụ: "JSON không hợp lệ: thiếu dấu ngoặc đóng ở dòng 12, cột 5."
- `role="alert"` chỉ khi lỗi mới xuất hiện sau thao tác của người dùng.

## 2.5. `CopyButton`
- Biến thể của Button/Ghost; khi bấm đổi nhãn thành "Đã copy" 1,5s (không đổi kích thước, giữ chiều rộng bằng nhãn dài hơn). Nếu clipboard bị từ chối: nhãn "Không copy được. Chọn và nhấn Ctrl+C" kèm chọn sẵn nội dung.

## 2.6. `ToolShell` (khung tool page)
- Gom: breadcrumb, H1, mô tả, slot toolbar, slot workspace, status bar, phần hướng dẫn. Mọi tool bắt buộc dùng để đảm bảo nhất quán (và để prerender nhận metadata từ registry).

# 3. Quy ước microcopy

- Tiếng Việt, câu sentence case, động từ chủ động. Cùng một thao tác dùng cùng một từ trên mọi tool: **Copy**, **Xóa**, **Tải xuống**, **Mẫu** (chèn dữ liệu mẫu), **Đổi chiều**.
- Lỗi nêu nguyên nhân + vị trí + cách sửa; trạng thái rỗng là lời mời hành động ("Dán JSON vào đây hoặc chèn dữ liệu mẫu").
- Thuật ngữ kỹ thuật giữ nguyên tiếng Anh khi dev quen dùng (JSON, JWT, UUID, HEX, claim).
- Không dùng ngôn ngữ quảng cáo ("nhanh nhất", "mạnh mẽ").

# 4. Danh mục trạng thái cần có cho mọi tool (checklist QA/Implement)

| Trạng thái | Yêu cầu |
|---|---|
| Rỗng | Placeholder + nút Mẫu |
| Đang nạp chunk | Skeleton đúng kích thước |
| Thành công | Output + status "Hợp lệ"/tương đương |
| Lỗi nhập | ErrorBanner, giữ output trước đó có nhãn |
| Lỗi hệ thống (lazy-load, storage, clipboard) | Thông báo ngắn kèm cách xử lý |
| Disabled | Nút chính vô hiệu khi input rỗng, có tooltip lý do |
| Dark/Light | Cả hai đều được rà contrast theo Design System §4.4 |
| Reduced motion | Không transition ngoài đổi trạng thái tối thiểu |
