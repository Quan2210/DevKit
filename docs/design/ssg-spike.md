# M0 — Kết quả spike SSG (Change 0.1)

**Ngày:** 2026-11-01 · **Nhánh:** `feat/m0-spike` · **Phương án thử:** A (React Router framework mode, `ssr:false` + `prerender`)
**Kết luận: chọn A.** Mọi tiêu chí kiểm chứng được trong spike đều đạt; không cần dùng A' hay C.

Spike dựng app tối thiểu ngoài repo (3 route: Home, một tool có CodeMirror nạp lazy + nút đếm để kiểm hydrate, 404 dạng splat) với đúng bộ phiên bản của plan. Mã tham chiếu các script hậu build nằm ở `docs/design/ssg-spike/`.

## 1. Phiên bản đã cài và chạy thật
`react@19.3.1`, `react-dom@19.3.1`, `react-router@8.5.1`, `@react-router/dev@8.5.1`, `@react-router/node@8.5.1`, `vite@8.3.5`, `typescript@6.0.3`, `codemirror@6.0.2`, `isbot@5.2.2`, Node 24. `npm i` không báo xung đột peer (xác nhận assumption P2, P3).

## 2. Kết quả theo tiêu chí

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | HTML riêng mỗi route, có title/description/OG/Twitter/canonical, 1 `<h1>`, đọc được không cần JS | **Đạt** | `DevKit/index.html`, `tools/demo/index.html`, `404/index.html` đều có đủ thẻ và đúng 1 `<h1>`; meta lấy từ `meta()` của route |
| 2 | `localStorage`/`window` không làm hỏng prerender | **Đạt** | `Editor` dùng `localStorage` trong `useEffect`; build + prerender thành công. (Chưa thử cố ý đặt `window` ở top-level; lint rule ở M1 sẽ chặn) |
| 3 | Hydrate không cảnh báo; theme-init không flash | **Đạt** | Console 0 lỗi; `data-theme="system"` được đặt trước paint bởi `theme-init.js` đồng bộ; `lang="vi"` |
| 4 | Refresh trực tiếp route, có base path `/DevKit/` | **Đạt** | Static server trả 200 cho `/DevKit/tools/demo/`; URL ngoài base và URL sai trả 404 |
| 5 | CodeMirror ở chunk riêng, không có ở Home | **Đạt** | `Editor-*.js` (384 kB, gzip 124 kB) chỉ tải ở route tool; `index.html` của Home không tham chiếu |
| 6 | Hydrate + chức năng đầy đủ dưới CSP production, `<meta>` và header, 0 vi phạm, không `'unsafe-inline'` cho `script-src` | **Đạt** | Có hash: nút 0→1, CodeMirror mount, 0 lỗi console. **Đối chứng âm** (cùng build, `script-src 'self'` không hash): nút không hydrate, editor không mount, 8 lỗi CSP trong console ⇒ **F-1 được xác nhận bằng thực nghiệm**. Biến thể chỉ-header (không có `<meta>`) cũng đạt |
| 7 | `404.html` prerender (splat, mã 200 → copy), host trả mã 404, hydrate sạch tại URL sai | **Đạt** | `/DevKit/foo/bar` → mã 404, title/H1 tĩnh; hydrate sạch dưới CSP, bấm "Về trang chủ" điều hướng SPA (không reload), 0 lỗi console |
| 8 | `buildUrl()` ra canonical đúng với base | **Chưa kiểm trong spike** | Canonical trong spike là chuỗi cố định. `buildUrl()` là mã của dự án, kiểm bằng unit test U-U1 và `check:seo` ở M1 |

## 3. Phát hiện cần đưa vào plan (đã cập nhật plan v1.3)

1. **Phải đặt cả `base` của Vite lẫn `basename` của React Router.** Chỉ đặt `basename` thì build thoát mã 1 và *không in lỗi*. Có `base` thì lỗi (nếu có) mới hiện rõ.
2. **Cấu trúc đầu ra khi có base path:** HTML nằm ở `build/client/DevKit/...` còn `assets/`, `theme-init.js` nằm ở `build/client/`. Để deploy dưới `/DevKit/` cần bước **ghép (stage)**: copy mọi thứ trừ thư mục base và `index.html` fallback, rồi phủ nội dung `build/client/DevKit/` lên gốc. Khi base là `/` (Cloudflare) không cần bước này.
3. **`404.html` = bản sao của `404/index.html`** (route `*`, prerender path `/404`) và phải được tạo **trước** bước băm CSP. Hoạt động đúng như dự kiến của re-review.
4. **`theme-init.js` phải dùng `import.meta.env.BASE_URL`**: đường dẫn tương đối làm script hỏng ở route lồng nhau (`/DevKit/tools/demo/`).
5. **Số hash:** mỗi trang có 8 script inline (1 classic cho handoff, 1 `type="module"`, 6 script stream, `ScrollRestoration`). 4 trang → **10 hash duy nhất**; ước lượng ~30–40 hash cho ~13 route.
6. **Rủi ro mới (K11): giới hạn độ dài dòng của Cloudflare `_headers`.** Theo ghi nhớ của mình (chưa kiểm chứng, cần xác nhận ở M8) mỗi dòng header bị giới hạn khoảng 2.000 ký tự; ~35 hash × ~60 ký tự đã vượt. Phương án dự phòng: trên Cloudflare chỉ dùng CSP qua `<meta>` (đã chứng minh hoạt động) và đặt `X-Frame-Options: DENY` thay cho `frame-ancestors`; không chia CSP thành nhiều dòng header vì chúng bị nối lại và giao nhau.
7. **Môi trường dev Windows:** Git Bash tự đổi giá trị biến môi trường bắt đầu bằng `/` (vd. `/DevKit/` thành `C:/Program Files/Git/DevKit/`). Dùng `MSYS_NO_PATHCONV=1` hoặc cross-env/PowerShell khi chạy cục bộ; CI Linux không bị.
8. Prerender từ chối phản hồi khác 200 (đúng như reviewer báo), nên 404 phải là splat + `/404`.

## 4. Giới hạn của spike (không nên suy rộng)
- Chỉ 3 route, không có dữ liệu thật, không có Tailwind, không chạy trên Firefox/Safari.
- CSP chỉ thử trên Chromium (trình duyệt tích hợp). Hash CSP3 cho `type="module"` inline được Chrome/Firefox/Safari hiện đại hỗ trợ, nhưng chưa tự kiểm Firefox/Safari; thêm vào smoke test ở M7.
- Chưa đo Lighthouse/Core Web Vitals.

## 5. Quyết định
Chọn **A**. Tiếp theo là Change 0.2 (scaffold) và 0.3 (CI) trên nhánh `feat/m0-scaffold`; cập nhật plan đã nêu ở mục 3.
