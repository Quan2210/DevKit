# DevKit — UI Direction (bước 1.5 Frontend Design)

**Trạng thái:** Approved (2026-11-01)
**Nguồn:** PRD v1.1 (Approved), System Design v1 (Approved), Design System v1.1 (tokens đã duyệt)
**Skill dùng:** `frontend-design`, trong khuôn khổ Design System §11 (token/font/spacing/radius cố định; skill quyết định bố cục, phân cấp, trạng thái, tương tác, microcopy)
**Tài liệu kèm:** [`layouts.md`](./layouts.md), [`components.md`](./components.md)

---

# 1. Brief

| | |
|---|---|
| **Sản phẩm** | DevKit: bộ công cụ nhỏ cho developer, xử lý hoàn toàn trong trình duyệt |
| **Người dùng** | Developer đang làm dở việc khác: dán một đoạn dữ liệu, cần kết quả trong vài giây, rồi quay lại |
| **Việc chính** | Dán → thấy kết quả → copy. Mọi thứ khác phục vụ việc này |
| **Điều làm DevKit khác** | Không gửi dữ liệu đi đâu. Đây là lý do người ta chọn nó thay vì các trang format online khác |

Từ brief rút ra ba hệ quả thiết kế:
1. **Nhanh hơn đẹp**: ô nhập là thứ đầu tiên và to nhất; không có hero quảng cáo.
2. **Tin tưởng bằng bằng chứng, không bằng khẩu hiệu**: tính riêng tư được thể hiện bằng một chỉ báo trạng thái thật, không bằng đoạn văn tự khen.
3. **Giống nhau giữa các tool**: dev chuyển tool liên tục, nên vị trí Copy/Clear/Download và cách báo lỗi không được đổi.

---

# 2. Design plan (lượt 1)

## 2.1. Color (từ token đã duyệt, không thêm màu mới)

| Vai trò | Light | Dark |
|---|---|---|
| Nền ứng dụng `--color-bg` | `#F8FAFC` | `#0B1120` |
| Bề mặt `--color-surface` | `#FFFFFF` | `#111827` |
| Vùng phụ `--color-surface-muted` | `#F1F5F9` | `#1F2937` |
| Text `--color-text` / muted | `#0F172A` / `#64748B` | `#F8FAFC` / `#94A3B8` |
| Accent (hành động chính) `--color-primary` | `#4F46E5` | `#818CF8` |
| Trạng thái | success/warning/danger/info + biến `-fg` cho text | như Design System §4 |

Quy tắc dùng accent: **chỉ** cho nút chính của mỗi tool (1 nút/màn hình), link, focus ring, tab đang chọn. Không tô nền section, không dùng làm trang trí.

## 2.2. Type (Inter + JetBrains Mono, đã chốt)

| Vai trò | Font | Cỡ / weight / line-height |
|---|---|---|
| Tiêu đề trang (H1) | Inter | 28px desktop, 24px mobile / 600 / 1.25 |
| Tiêu đề section (H2) | Inter | 18px / 600 / 1.3 |
| Thân, mô tả | Inter | 15px / 400 / 1.55 (tối đa ~70ch) |
| Nhãn control, nút | Inter | 14px / 500 / 1.2 |
| Help, trạng thái | Inter | 13px / 400 / 1.45 |
| Code, giá trị màu, UUID | JetBrains Mono | 13.5px / 400 / 1.6 |

Chi tiết tay nghề:
- **Số dùng `font-variant-numeric: tabular-nums`** ở ratio contrast, đếm từ/ký tự, số lượng UUID, góc gradient (số không nhảy khi đổi).
- Chữ **sentence case**, không viết hoa toàn bộ, không nhãn "eyebrow" phía trên tiêu đề.
- JetBrains Mono chỉ dành cho *dữ liệu* (code, mã màu, UUID, token), không dùng cho nhãn UI.
- Bật ligature code **tắt** mặc định (tránh `=>`/`!=` bị biến dạng khi dev copy lại).

## 2.3. Layout concept

**Ý tưởng:** "Bàn làm việc" thay vì "trang web". Mỗi tool là một workspace chiếm gần hết chiều cao khung nhìn, thanh trạng thái cố định ở đáy workspace; phần mô tả và hướng dẫn nằm dưới workspace (đọc khi cần, không đẩy workspace xuống).

```text
Desktop (≥1024)
┌───────────┬───────────────────────────────────────────────────────┐
│ DevKit    │ JSON Formatter                         [Light|Dark|Sys]│
│ ▢ Tìm tool│ Format, minify và kiểm tra cú pháp JSON.               │
│           ├───────────────────────────────────────────────────────┤
│ Data      │ [Format] [Minify]  Indent: (2|4)           Mẫu  Xóa    │ ← toolbar
│  JSON  ●  ├──────────────────────────┬────────────────────────────┤
│  XML      │ Input                    │ Output              [Copy] │
│ Encoding  │ ┌──────────────────────┐ │ ┌────────────────────────┐ │
│  JWT      │ │ editor               │ │ │ editor (read-only)     │ │
│  Base64   │ │                      │ │ │                        │ │
│ Generator │ └──────────────────────┘ │ └────────────────────────┘ │
│ ...       ├──────────────────────────┴────────────────────────────┤
│           │ ✓ JSON hợp lệ · 1.240 ký tự      ◉ Xử lý trên thiết bị │ ← status bar
│           ├───────────────────────────────────────────────────────┤
│           │ Cách dùng · Giới hạn · Câu hỏi thường gặp (cuộn xuống) │
└───────────┴───────────────────────────────────────────────────────┘
```

Căn chỉnh: nội dung **căn trái**; không căn giữa trừ trạng thái rỗng của Home. Sidebar cố định 240px; workspace tối đa 1440px.

## 2.4. Điểm nhấn duy nhất ("spend boldness in one place")

**Chỉ báo "Xử lý trên thiết bị" ở status bar mỗi tool** — một component có trạng thái thật:

| Trạng thái | Hiển thị | Khi nào |
|---|---|---|
| Mặc định | `◉ Xử lý trên thiết bị` (màu `info-fg`, icon + chữ) | Mọi tool, mọi lúc không có request ra ngoài |
| Cảnh báo | `⚠ Ảnh ngoài đang bật: trang sẽ gửi request tới máy chủ khác` (màu `warning-fg`) | Markdown Preview khi bật "Tải ảnh ngoài" |
| Bấm vào | Popover giải thích ngắn: dữ liệu ở lại trình duyệt, mọi lib được đóng gói cùng trang, cách tự kiểm chứng (mở tab Network) | Luôn có |

Lý do: đây là lý do người dùng tin DevKit; nó gắn trực tiếp với hành vi thật của sản phẩm (Markdown toggle) nên không thành khẩu hiệu rỗng. Mọi chỗ khác giữ yên lặng.

## 2.5. Nguyên tắc

1. Ô nhập là trung tâm; chrome nhỏ và ít.
2. Cấu trúc thể hiện thông tin: đường viền/tiêu đề chỉ xuất hiện khi chia vùng có nghĩa (Input | Output), không để trang trí.
3. Một nút chính mỗi màn hình, các nút còn lại là secondary/ghost.
4. Trạng thái luôn có chữ (Hợp lệ / Không hợp lệ), không chỉ màu.
5. Chuyển động chỉ để trả lời hành động của người dùng.

---

# 3. Review lượt 1 so với các "mặc định" (và chỉnh sửa)

| Mặc định hay gặp | Plan lượt 1 có rơi vào không? | Xử lý |
|---|---|---|
| Hero lớn + số liệu + gradient trên Home | Ban đầu định làm hero giới thiệu | **Đổi:** Home là launcher (ô tìm + danh sách nhóm), không hero quảng cáo |
| Lưới card giống hệt nhau cho mọi thứ | Home dễ thành lưới card đồng nhất | **Đổi:** Home dùng danh sách có hàng (tên, mô tả một dòng, ví dụ dữ liệu vào → ra), nhóm theo Data/Encoding/...; chỉ Color Tools có thumbnail màu vì nội dung vốn là màu |
| Nhãn ALL-CAPS tracking rộng, eyebrow trên mỗi tiêu đề | Có trong nhãn nhóm sidebar | **Bỏ:** nhãn nhóm sentence case, cỡ 13px/600, màu muted |
| Monospace cho mọi nhãn nhỏ | Định dùng cho badge | **Bỏ:** mono chỉ cho dữ liệu |
| Mũi tên `→` gắn vào mọi link/nút | Không | Giữ không dùng |
| Dải gradient trang trí, shadow xám giống nhau | Không | Giữ: card viền 1px, shadow chỉ cho popover/menu |
| Indigo + Inter (look phổ biến) | Có, nhưng đã chốt trong Design System | **Giữ** vì đã được duyệt; bù bằng điểm nhấn 2.4 và tay nghề chữ 2.2; ghi nhận ở mục 6 để người dùng có thể đổi sau |

Kết quả: bản sắc DevKit đến từ **hành vi** (chỉ báo thiết bị, mẫu dữ liệu thật, thanh trạng thái, mã hóa trạng thái bằng chữ) hơn là từ màu/font.

---

# 4. Home (launcher)

```text
┌───────────┬───────────────────────────────────────────────────────┐
│ sidebar   │ Công cụ cho developer, chạy trong trình duyệt.         │
│           │ Dữ liệu của bạn không rời khỏi trang này.              │
│           │ ┌─────────────────────────────────────────────┐        │
│           │ │ ⌕ Tìm tool: json, jwt, màu...          /    │        │
│           │ └─────────────────────────────────────────────┘        │
│           │ Data                                                   │
│           │  JSON Formatter      Format, minify, kiểm tra cú pháp  │
│           │  XML Formatter       Format, minify, kiểm tra cú pháp  │
│           │ Encoding                                               │
│           │  JWT Decoder         Xem header và payload (không verify)│
│           │  Base64              Mã hóa / giải mã, hỗ trợ UTF-8    │
│           │ Writing & Docs                                         │
│           │  Markdown Preview    Viết và xem trước, an toàn        │
│           │ Generator · Color ...                                  │
└───────────┴───────────────────────────────────────────────────────┘
```

- H1: "DevKit" kèm một câu mô tả (nội dung SEO cho Home). Phím `/` focus vào ô tìm. Tìm lọc theo tên, mô tả, từ khóa (ví dụ "uuid", "guid", "hex").
- Mỗi hàng là link thật (`<a>`); Enter mở tool. Hàng Color Tools có ô màu nhỏ 16px minh họa.
- Prerender: danh sách có sẵn trong HTML (không phụ thuộc JS).

---

# 5. Tương tác chung

| Tình huống | Hành vi |
|---|---|
| Dán dữ liệu | Với tool một chiều (JSON/XML/Base64…), tự chạy khi dán nếu input nhỏ (<200 KB); nút chính vẫn có để chạy lại |
| Copy | Nút đổi thành "Đã copy" 1,5 giây, kèm `aria-live="polite"`; không bật toast |
| Clear | Xóa ngay và hiện thanh nhỏ "Đã xóa · Hoàn tác" 6 giây (không hộp thoại xác nhận) |
| Lỗi parse | Banner inline phía trên output: nêu nguyên nhân, vị trí (dòng, cột) dạng link; bấm → nhảy tới vị trí trong editor. Output hợp lệ trước đó giữ nguyên, có nhãn "Kết quả trước đó" |
| Trạng thái rỗng | Ô nhập có placeholder + nút "Chèn dữ liệu mẫu"; output hiển thị gợi ý một dòng |
| Loading | Chỉ khi nạp chunk lần đầu: skeleton đúng kích thước workspace (không nhảy layout) |
| Phím tắt | `Ctrl/Cmd+Enter` chạy nút chính; `Ctrl/Cmd+Shift+C` copy output; `/` ở Home/sidebar để tìm. Kiểm tra xung đột trình duyệt trước khi chốt |
| Chuyển chế độ (Encode/Decode, Edit/Split/Preview) | Segmented control; nội dung input/output không bị đổi chỗ khó hiểu: nhãn hai vùng đổi theo chế độ ("Văn bản" ↔ "Base64") |
| Motion | ≤160ms cho đổi tab/mở popover/đổi nhãn Copy; tôn trọng `prefers-reduced-motion` |

# 6. Đề xuất ngoài Design System (cần duyệt, ghi vào §12 nếu đồng ý)

| # | Đề xuất | Lý do | Mặc định nếu không duyệt |
|---|---|---|---|
| D1 | Component "Xử lý trên thiết bị" ở status bar (2.4) | Điểm nhấn gắn với privacy | Không có chỉ báo, chỉ có banner Markdown |
| D2 | Hoàn tác sau Clear thay vì hộp thoại xác nhận | Giảm click, không mất dữ liệu | Clear xóa thẳng (rủi ro mất dữ liệu) |
| D3 | Home dạng danh sách có hàng thay vì lưới card | Quét nhanh, ít "template" | Lưới card (Design System §8 Card) |
| D4 | Phím tắt `/`, `Ctrl/Cmd+Enter`, `Ctrl/Cmd+Shift+C` | Quy trình nhanh cho dev | Không có phím tắt |
| D5 | Giữ Inter + indigo; cân nhắc đổi sau nếu muốn bản sắc riêng | Đã duyệt; đổi muộn tốn công | Giữ |

Không có đề xuất nào đổi token, font hay spacing đã duyệt.
