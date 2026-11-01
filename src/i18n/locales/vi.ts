/**
 * Vietnamese catalog: the source of truth for message keys (`MessageKey`).
 * Every UI string, tool title/description and page metadata comes from here
 * so another language is one more file with the same keys.
 */
export const vi = {
  "app.name": "DevKit",

  "nav.skip": "Bỏ qua điều hướng",
  "nav.openMenu": "Mở menu",
  "nav.closeMenu": "Đóng menu",
  "nav.main": "Điều hướng chính",
  "nav.search": "Tìm công cụ",
  "nav.searchPlaceholder": "Tìm: json, jwt, màu…",
  "nav.noResults": "Không có công cụ nào khớp “{query}”.",
  "nav.empty": "Chưa có công cụ nào được phát hành.",
  "nav.home": "Trang chủ",

  "breadcrumb.label": "Đường dẫn",
  "breadcrumb.tools": "Công cụ",
  "breadcrumb.back": "Quay lại danh sách công cụ",

  "theme.label": "Giao diện",
  "theme.light": "Sáng",
  "theme.dark": "Tối",
  "theme.system": "Theo hệ thống",

  "group.data": "Dữ liệu",
  "group.encoding": "Mã hóa",
  "group.generator": "Trình tạo",
  "group.writing": "Viết và tài liệu",
  "group.color": "Màu sắc",
  "group.developer": "Công cụ khác",

  "home.metaTitle": "DevKit - Công cụ cho developer, chạy trong trình duyệt",
  "home.metaDescription":
    "Bộ công cụ nhỏ cho developer: định dạng JSON, giải mã JWT, Base64, UUID, màu sắc và hơn thế. Xử lý hoàn toàn trên trình duyệt, dữ liệu không rời khỏi trang.",
  "home.title": "DevKit",
  "home.lead":
    "Công cụ cho developer, chạy hoàn toàn trong trình duyệt. Dữ liệu của bạn không rời khỏi trang này.",
  "home.toolsLabel": "Danh sách công cụ",

  "notFound.metaTitle": "Không tìm thấy trang - DevKit",
  "notFound.metaDescription": "Địa chỉ này không tồn tại hoặc đã được chuyển đi.",
  "notFound.title": "Không tìm thấy trang",
  "notFound.body": "Địa chỉ này không tồn tại hoặc đã được chuyển đi.",
  "notFound.home": "Về trang chủ",

  "error.title": "Công cụ gặp lỗi",
  "error.body":
    "Đã có lỗi ngoài dự kiến. Dữ liệu bạn nhập không được gửi đi đâu cả. Hãy tải lại trang để thử lại.",
  "error.reload": "Tải lại trang",

  "action.copy": "Copy",
  "action.copied": "Đã copy",
  "action.copyFailed": "Không copy được. Hãy chọn nội dung và nhấn Ctrl+C.",
  "action.clear": "Xóa",
  "action.sample": "Mẫu",
  "action.download": "Tải xuống",
  "action.swap": "Đổi chiều",
  "action.undo": "Hoàn tác",
  "action.close": "Đóng",
  "action.cancel": "Hủy",
  "action.confirm": "Xác nhận",

  "undo.cleared": "Đã xóa.",

  "status.valid": "Hợp lệ",
  "status.invalid": "Không hợp lệ",
  "status.pass": "Đạt",
  "status.fail": "Không đạt",

  "device.local": "Xử lý trên thiết bị",
  "device.external": "Ảnh ngoài đang bật: trang gửi request tới máy chủ khác",
  "device.title": "Dữ liệu ở lại trình duyệt",
  "device.body":
    "Nội dung bạn nhập được xử lý ngay trong trình duyệt này và không được gửi tới máy chủ của DevKit. Mọi thư viện được đóng gói cùng trang.",
  "device.verify":
    "Tự kiểm chứng: mở DevTools, chọn tab Network rồi dùng công cụ. Bạn sẽ không thấy request nào mang dữ liệu của mình.",
  "device.externalBody":
    "Bạn đã bật tải ảnh từ URL ngoài. Mỗi ảnh khiến trình duyệt gửi một request tới máy chủ của ảnh đó.",

  "editor.loading": "Đang tải trình soạn thảo…",
  "common.loading": "Đang tải…",
  "toolshell.status": "Trạng thái",
  "toolshell.toolbar": "Thanh công cụ",

  "tool.json.title": "JSON Formatter",
  "tool.json.description": "Format, minify và kiểm tra cú pháp JSON.",
  "tool.xml.title": "XML Formatter",
  "tool.xml.description": "Format, minify và kiểm tra cú pháp XML.",
  "tool.jwt.title": "JWT Decoder",
  "tool.jwt.description": "Xem header và payload của JWT. Chỉ giải mã, không xác minh chữ ký.",
  "tool.base64.title": "Base64",
  "tool.base64.description": "Mã hóa và giải mã Base64, hỗ trợ UTF-8 và URL-safe.",
  "tool.uuid.title": "UUID Generator",
  "tool.uuid.description": "Tạo UUID v4 bằng Web Crypto, tối đa 1000 giá trị mỗi lần.",
  "tool.markdown.title": "Markdown Preview",
  "tool.markdown.description":
    "Viết Markdown và xem trước ngay, an toàn và không gửi dữ liệu đi đâu.",
  "tool.colorPicker.title": "Color Picker",
  "tool.colorPicker.description": "Chọn màu và đổi qua lại giữa HEX, RGB, RGBA, HSL.",
  "tool.colorPalette.title": "Color Palette",
  "tool.colorPalette.description": "Tạo bảng màu theo quy tắc phối màu và xuất CSS variables.",
  "tool.colorContrast.title": "Color Contrast",
  "tool.colorContrast.description": "Kiểm tra độ tương phản giữa hai màu theo WCAG 2.x.",
  "tool.cssGradient.title": "CSS Gradient",
  "tool.cssGradient.description": "Tạo gradient CSS bằng giao diện trực quan và copy mã.",
  "tool.sql.title": "SQL Formatter",
  "tool.sql.description": "Format câu lệnh SQL cho dễ đọc.",
} as const;

export type MessageKey = keyof typeof vi;
