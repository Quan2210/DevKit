# DevKit

Bộ công cụ nhỏ gọn cho developer, chạy hoàn toàn trên trình duyệt. **Không backend, không database, không gửi dữ liệu ra ngoài**: mọi thứ bạn dán vào đều được xử lý ngay trên máy của bạn.

## Công cụ

| Nhóm | Tool | Mô tả |
|---|---|---|
| Data Tools | JSON Formatter & Validator / Editor | Format, minify, validate, sửa dạng cây, truy vấn, so sánh |
| Data Tools | XML Formatter & Validator | Format, minify, báo lỗi theo dòng/cột |
| Encoding | JWT Decoder | Giải mã header, payload, kiểm tra hạn token |
| Encoding | Base64 Encoder/Decoder | Mã hoá / giải mã văn bản |
| Generator | UUID Generator | Sinh UUID hàng loạt |
| Writing & Docs | Markdown Preview | Xem trước Markdown (đã sanitize, không tải ảnh ngoài) |
| Color Tools | Color Picker, Palette Generator, Contrast Checker, CSS Gradient Generator | Chọn, tạo bảng màu, kiểm tra tương phản WCAG, tạo gradient |

Giao diện có sẵn chế độ sáng/tối và hỗ trợ đa ngôn ngữ.

## Cách dùng

1. Mở trang chủ, chọn tool ở thanh điều hướng hoặc ô tìm kiếm nhanh.
2. Dán hoặc nhập dữ liệu vào khung bên trái (input); kết quả hiện ở khung bên phải (output).
3. Dùng các nút ở giữa/trên đầu để chuyển chế độ, sao chép hoặc tải kết quả.

Dữ liệu chỉ nằm trong bộ nhớ của trình duyệt; tắt tab là mất, không có gì được lưu trên server.

## Clone và chạy trên máy

### Yêu cầu

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) **>= 22.22.0** (xem `.nvmrc`; có thể dùng `nvm use` / `fnm use`)

### Các bước

```bash
git clone https://github.com/Quan2210/DevKit.git
cd DevKit
npm install
npm run dev
```

Mở địa chỉ hiển thị trong terminal (thường là http://localhost:5173).

### Chạy bản build như production

```bash
npm run build
npm run serve
```

Mở http://localhost:4173. Bản build nằm trong thư mục `stage/` và là site tĩnh, có thể đưa lên GitHub Pages, Cloudflare Pages hoặc bất kỳ static hosting nào.

### Cấu hình (tuỳ chọn)

Sao chép `.env.example` thành `.env` nếu cần đổi:

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `VITE_BASE` | Base path khi deploy (có `/` đầu và cuối), vd `/DevKit/` | `/` |
| `VITE_SITE_URL` | Origin của site (không kèm base path), dùng cho canonical, og:url, sitemap | `http://localhost:4173` |

## Lệnh thường dùng

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build site tĩnh vào `stage/` |
| `npm run serve` | Phục vụ bản build để xem thử |
| `npm test` | Unit test (Vitest) |
| `npm run test:e2e` | E2E test (Playwright) |
| `npm run typecheck` / `npm run lint` | Kiểm tra type và lint |
| `npm run verify` | Chạy toàn bộ kiểm tra: typecheck, lint, test, build, SEO, bundle size |

Lần đầu chạy E2E có thể cần `npx playwright install`.

## Công nghệ

React 19, React Router (SPA, prerender), TypeScript, Vite, Tailwind CSS 4, CodeMirror 6, Vitest, Playwright.

## Giấy phép

[MIT](LICENSE)

## Tài liệu

- [Requirements (PRD)](docs/01_DevKit_Requirements_v1.1.md)
- [Design System](docs/02_DevKit_Design_System_v1.1.md)
