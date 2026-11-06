# Tùy chỉnh màu giao diện — UI/UX spec (bước 1–4, ĐÃ DUYỆT 2026-11-05)

**Mục tiêu:** người dùng chọn một màu để tô cho các vùng "khung" của app (sidebar, top nav, header của ô, status bar, nền trang), lưu trên máy, áp dụng ngay không nháy màu, và **không bao giờ** làm chữ khó đọc (luôn đạt WCAG AA).

**Đã thử trước:** phiên bản chạy tạm trong trình duyệt (đổi token theo vùng) cho thấy hướng này khả thi: gán lại token ngay trong vùng thì mọi thành phần con tự đổi theo.

**Ngoài phạm vi (cố ý):** đổi màu trạng thái (thêm/xóa/cảnh báo/thành công), đổi màu vùng soạn thảo CodeMirror và màu cú pháp, đổi font/cỡ chữ/bo góc, đồng bộ giữa các máy, nhiều hồ sơ giao diện. Không có tài khoản hay máy chủ; mọi thứ nằm trong `localStorage`.

Ghi chú quy trình: skill `frontend-design` không có trong phiên này (như `json-editor-spec.md`, `text-compare-spec.md`), nên spec do mình viết theo Design System. Nếu muốn chạy lại qua skill thì cài skill rồi review lại §3 và §5.

---

## 1. Hiện trạng

- Tokens ở `src/styles/tokens.css`; sáng là mặc định, tối theo `[data-theme="dark"]` hoặc `prefers-color-scheme`.
- Theme đặt bằng `src/lib/theme.ts` (lưu `devkit:v1:theme`) và script cùng origin `public/theme-init.js` chạy trước hydrate để không nháy màu. Script này nằm ngoài danh sách hash CSP.
- Sidebar, top nav, Panel, status bar, nút... hiện đều dùng chung `--color-surface`; nền trang là `--color-bg`. Vì vậy chưa thể tô riêng từng vùng.
- `src/features/color-tools/shared/color-core/contrast.ts` (Culori) đã có sẵn tính contrast WCAG.

## 2. Phạm vi vùng

| Vùng | Hiện | Tùy chỉnh được | Kiểu |
|---|---|---|---|
| Nền trang | `--color-bg` | Có | Tint nhạt |
| Sidebar + top nav (một "khung điều hướng") | `--color-surface` | Có | Nhạt **hoặc** Đậm |
| Header của hai ô (tiêu đề Panel) và hàng toolbar/subbar | `--color-surface` | Có | Tint vừa |
| Status bar dưới | `--color-surface` | Có | Tint nhạt |
| Thân ô, vùng soạn thảo, popover, dialog | `--color-surface` | **Không** | Giữ nguyên để màu cú pháp và diff luôn đọc được |
| Màu nhấn `--color-primary` | indigo | **Không** ở v1 | Giữ làm nhận diện; hỏi lại ở §10 |
| Màu trạng thái | — | **Không** | Giữ ngữ nghĩa |

Nút Mẫu/So sánh... nằm giữa hai ô vẫn thuộc "thân", không đổi.

## 3. Trải nghiệm

### 3.1. Lối vào

Một nút **Giao diện** (icon bảng màu, `Palette` của Lucide) ở top nav, ngay trước `ThemeSwitcher`. Bấm mở popover (từ `sm` trở lên) hoặc `Dialog` dạng bảng dưới (dưới `sm`). Nút có tên truy cập "Tùy chỉnh màu giao diện". Khi đang dùng màu tùy chỉnh, icon có chấm nhỏ cùng màu đang chọn (kèm `title`, không chỉ dựa vào màu: tên nút vẫn là cố định).

### 3.2. Nội dung popover

```text
┌ Màu giao diện ───────────────────────── ✕ ┐
│ Màu gốc                                    │
│ ◉ Mặc định  ○ Teal  ○ Xanh dương  ○ Tím    │  radiogroup, mỗi ô có tên chữ
│ ○ Hồng  ○ Cam  ○ Xanh lá  ○ Xám            │
│ ┌────┐ [ #0D9488 ]  Chọn màu khác           │  ô màu native + ô nhập HEX
│                                            │
│ Áp dụng cho                                │
│ ☑ Nền trang        ☑ Sidebar và top nav    │
│ ☑ Header của ô     ☑ Thanh trạng thái      │
│                                            │
│ Kiểu của sidebar và top nav                │
│ [ Nhạt | Đậm ]                             │  Segmented
│                                            │
│ ✓ Độ tương phản đạt chuẩn AA (đã tự chỉnh) │  StatusBadge, chữ + icon
│ [ Mẫu xem trước: một dải thu nhỏ ]         │
│                                            │
│ [ Đặt lại về mặc định ]                    │
└────────────────────────────────────────────┘
```

- **Áp dụng ngay khi đổi** (không có nút "Lưu"): xem trước chính là trang thật. Đóng bằng ✕, `Esc` hoặc bấm ra ngoài; giá trị đã lưu.
- **Mặc định** = tắt tùy chỉnh (giao diện hiện tại, đúng từng bit). Chọn màu bất kỳ sẽ bật.
- **Preset (8 màu)**: Mặc định, Teal, Xanh dương, Tím, Hồng, Cam, Xanh lá, Xám. Mỗi preset là một hue; giá trị HEX cụ thể ghi ở §5.
- **Màu tự chọn**: ô `input[type=color]` native và ô HEX (3, 6 ký tự; không alpha). HEX sai: lỗi ngay dưới ô bằng chữ, giữ màu hợp lệ trước đó.
- **Áp dụng cho**: bốn checkbox, mặc định bật cả bốn khi người dùng chọn màu. Bỏ chọn một vùng thì vùng đó về màu mặc định.
- **Kiểu Nhạt/Đậm** chỉ áp dụng cho Sidebar + top nav. Đậm dùng màu gốc đã làm tối làm nền khung điều hướng và chữ sáng.
- **Thông báo tương phản**: luôn hiển thị một dòng trạng thái. `Đạt chuẩn AA` (success), hoặc `Đã tự chỉnh để đạt chuẩn AA` (info) khi màu bị làm sáng/tối, hoặc `Màu này không dùng được, đã giữ màu mặc định` (warning) nếu không chỉnh được trong giới hạn.
- **Đặt lại**: xóa lưu trữ, về mặc định, trả focus về nút Giao diện.

### 3.3. Trạng thái

| Trạng thái | Thiết kế |
|---|---|
| Mặc định | Radio "Mặc định" được chọn; các tuỳ chọn khác bị vô hiệu bằng `aria-disabled` kèm dòng "Chọn một màu để bật" |
| Đang dùng màu | Chấm màu trên nút Giao diện; thông báo AA |
| HEX sai | Lỗi chữ dưới ô, ô giữ viền `danger`, không đổi màu đang dùng |
| Không chỉnh được | Dòng cảnh báo, màu mặc định được giữ; chọn màu khác thì thử lại |
| `localStorage` bị chặn | Vẫn đổi được trong phiên (bộ nhớ), hiện ghi chú "Chưa lưu được trên thiết bị này" như các tool khác dùng `storage.persistent` |
| Tải trang | Màu đã lưu áp dụng trước khi vẽ (script init), không nháy màu mặc định |

## 4. Responsive

| Breakpoint | Hành vi |
|---|---|
| ≥ sm (640) | Popover rộng ~20rem, gắn vào nút ở top nav, căn lề phải |
| < sm | `Dialog` dạng bảng dưới, cuộn được, các ô màu xếp 4 cột |
| Sidebar drawer trên mobile | Cũng nhận màu của khung điều hướng (cùng token) |

Không làm trang cuộn ngang ở 320 px.

## 5. Quy tắc tạo màu (một màu gốc → các vùng)

Màu gốc `B` đổi sang OKLCH bằng Culori. Mỗi vùng tính từ `B` và token nền của theme hiện tại (`--color-bg`, `--color-surface`) bằng `color-mix` trong không gian `oklab`:

| Vùng | Sáng | Tối |
|---|---|---|
| Nền trang | `B` 6% trên `--color-bg` | `B` 8% trên `--color-bg` |
| Khung điều hướng (Nhạt) | `B` 16% trên `--color-surface` | `B` 18% trên `--color-surface` |
| Header của ô | `B` 24% trên `--color-surface` | `B` 22% trên `--color-surface` |
| Status bar | `B` 12% trên `--color-surface` | `B` 14% trên `--color-surface` |
| Khung điều hướng (Đậm) | `B` làm tối tới L≈0.30 | `B` làm tối tới L≈0.24 |

**Khung Đậm** gán lại token cục bộ cho riêng vùng này (`--color-surface`, `--color-surface-muted`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-border-strong`, `--color-primary`, `--color-on-primary`) để icon, chữ, ô tìm nhanh, breadcrumb tự đổi theo mà không sửa từng component (đã thử trong bản demo).

**Cổng tương phản (bắt buộc, tính khi áp dụng):** với mỗi vùng, tính bằng `contrast.ts`:
- `--color-text` trên nền vùng ≥ 4.5:1;
- `--color-text-muted` trên nền vùng ≥ 4.5:1;
- `--color-border-strong` trên nền vùng ≥ 3:1 (thành phần giao diện, WCAG 1.4.11);
- `--color-primary` (hoặc màu nhấn cục bộ của Đậm) trên nền vùng ≥ 3:1.

Nếu không đạt, lặp tối đa 12 bước đẩy độ sáng của vùng đó theo hướng đạt chuẩn (sáng hơn ở Nhạt, tối hơn ở Đậm), mỗi bước 0.02 L. Hết bước vẫn không đạt thì vùng đó dùng mặc định và hiện cảnh báo (§3.2). Không bao giờ lưu một cấu hình chưa qua cổng.

## 6. Kỹ thuật (tóm tắt để duyệt, chi tiết ở plan sau khi duyệt)

- **Token vùng** mặc định trỏ về token cũ, nên không đổi gì khi chưa tùy chỉnh: `--region-page`, `--region-nav`, `--region-panel-header`, `--region-status`. `AppShell` (sidebar, top nav), `Panel` (header, toolbar, subbar) và `ToolShell` (status bar) đọc các token này thay vì `bg-surface`/`bg-bg` trực tiếp.
- **Đậm**: khối `[data-region="nav"]` gán lại token cục bộ từ biến `--nav-*`.
- **Lưu trữ**: khóa mới `devkit:v1:appearance` (JSON nhỏ: `base`, `regions`, `navStyle`, version), đọc/ghi qua `storage` hiện có (kiểm tra kiểu, hỏng thì bỏ). Cập nhật chéo tab bằng sự kiện `storage` như theme.
- **Không nháy màu**: `public/theme-init.js` (đã chạy trước hydrate, nằm ngoài hash CSP) đọc `devkit:v1:appearance` và đặt các biến CSS trên `<html>`. Vì script cần tính màu, giá trị đã tính được lưu kèm (cả bản sáng và tối) để script chỉ việc gán, không cần Culori.
- **Tính màu** nằm ở module thuần `src/lib/appearance.ts` (Culori, đã có sẵn), có unit test. Phần UI chỉ gọi module này.
- **Theme** đổi (sáng/tối/hệ thống) thì chọn lại bộ giá trị đã tính tương ứng; không tính lại.
- **Quyền riêng tư**: chỉ lưu màu và lựa chọn, không có nội dung người dùng.

## 7. Tương tác và bàn phím

- Nút Giao diện: `aria-haspopup="dialog"`, `aria-expanded`. Popover có focus trap, `Esc` đóng, trả focus về nút.
- Preset là `radiogroup` (mũi tên chuyển, Home/End), mỗi radio có tên chữ ("Teal"…), không chỉ ô màu.
- Ô màu native và ô HEX có label rõ; lỗi gắn bằng `aria-describedby`.
- Thông báo tương phản là `role="status"` (`aria-live="polite"`).
- `prefers-reduced-motion`: không chuyển màu có hoạt ảnh (đổi tức thì); mặc định app không dùng chuyển màu cho vùng này.

## 8. Component

**Dùng lại:** `Popover`, `Dialog`, `IconButton`, `Segmented`, `Checkbox`, `StatusBadge`, `Button`, `Input`, `useStoredValue`/`storage`.

**Mới (cần duyệt):**
1. `AppearanceMenu` (`src/components/layout/AppearanceMenu.tsx`): nút + popover/dialog ở §3.
2. `ColorSwatchRadio` (nhỏ, trong cùng file hoặc `common/`): một ô preset dạng radio có nhãn chữ.
3. `src/lib/appearance.ts`: module thuần tính màu, kiểm tra tương phản, (de)serialize.

**Sửa nhỏ:** `AppShell`, `Panel`, `ToolShell`, `tokens.css`, `public/theme-init.js`, `storage.ts` (thêm khóa), `vi.ts` (chuỗi), `ThemeSwitcher` giữ nguyên.

## 9. Đối chiếu checklist (Design System §2.5)

- [x] Mọi màu dùng token; giá trị tính ra đi qua biến CSS, không viết cứng trong component.
- [x] Đủ trạng thái (§3.3): mặc định, đang dùng, lỗi HEX, không chỉnh được, storage bị chặn, tải trang.
- [x] Desktop/tablet/mobile, không cuộn ngang (§4).
- [x] Sáng và tối đều có công thức riêng và cổng AA (§5).
- [x] Tái sử dụng component; ba mục mới có lý do (§8).
- [x] Focus-visible, bàn phím, tên truy cập (§7).
- [x] `prefers-reduced-motion` (§7).
- [x] Sai khác sẽ ghi vào §12 sau khi duyệt (token vùng, khóa lưu trữ, `theme-init.js` mở rộng).

## 10. Câu hỏi cần quyết

1. **Preset hay tự do?** Đề xuất: 8 preset **và** ô chọn màu tự do (có cổng AA). Phương án gọn hơn: chỉ preset.
2. **Màu nhấn (`--color-primary`) có cho đổi không?** Đề xuất v1: **không** (giữ nhận diện, tránh nút chính lẫn với tint). Nếu muốn, thêm một tuỳ chọn "Nút chính theo màu gốc" ở v2.
3. **Kiểu Đậm** cho khung điều hướng có cần ở v1 không? Đề xuất: có, vì đã thử và đẹp; nhưng nó thêm một bộ token cục bộ cần test.
4. **Nút Giao diện ở top nav** (trước ThemeSwitcher) được chưa, hay bạn muốn gộp vào một menu "Cài đặt"?
5. **Mặc định khi bật**: bật cả bốn vùng (đề xuất), hay chỉ khung điều hướng?

## 11. Rủi ro

- Công thức tính màu cần thử với nhiều màu cực đoan (vàng sáng, xanh neon, đen, trắng) để cổng AA không bóp màu quá mức; sẽ có bảng test.
- Mở rộng `theme-init.js` phải nhỏ và không dùng thư viện (chỉ gán biến CSS đã tính sẵn).
- `Panel` dùng ở cả vùng đã đổi màu và vùng mở rộng toàn màn hình (`expandable`); header phải giữ đúng màu ở cả hai.
- Axe phải chạy với vài cấu hình màu (mặc định, Nhạt, Đậm, sáng/tối) để bắt hồi quy tương phản.

---

**Trạng thái:** ĐÃ DUYỆT (2026-11-05), §10 chốt theo đề xuất. Các sai khác khi implement được ghi ở Design System §12.
