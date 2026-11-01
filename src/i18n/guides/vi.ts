import type { GuideBlock } from "../types";

/**
 * Help content per tool: how to use it, its limits and a short FAQ. It is prerendered into the page,
 * so it doubles as the SEO text. Keyed by registry tool id.
 */
export const viGuides: Record<string, GuideBlock[]> = {
  json: [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Dán JSON vào ô bên trái, kết quả tự cập nhật sau khi bạn ngừng gõ.",
        "Chọn Format để làm đẹp (2 hoặc 4 dấu cách) hoặc Minify để nén thành một dòng.",
        "Khi JSON sai, thông báo lỗi nêu vị trí dòng và cột; bấm vào vị trí để nhảy tới đó.",
        "Ctrl+Enter (hoặc Cmd+Enter) chạy lại thao tác đang chọn.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Số nguyên lớn hơn 9007199254740991 không biểu diễn chính xác được bằng JSON.parse; công cụ sẽ cảnh báo thay vì âm thầm làm tròn.",
        "Cách viết số được chuẩn hóa (1.0 thành 1, 1e3 thành 1000); giá trị không đổi.",
        "Nếu có hai key trùng tên trong một đối tượng, chỉ giá trị cuối cùng được giữ.",
        "Dữ liệu được xử lý ngay trong trình duyệt, không gửi đi đâu.",
      ],
    },
    { type: "h2", text: "Câu hỏi thường gặp" },
    {
      type: "p",
      text: "JSON có chấp nhận chú thích hoặc dấu phẩy cuối không? Không. Đó là JSON không hợp lệ theo chuẩn, công cụ sẽ báo lỗi chứ không tự sửa.",
    },
  ],
  base64: [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Chọn Mã hóa để đổi văn bản thành Base64, hoặc Giải mã để làm ngược lại.",
        "Bật URL-safe để dùng bảng chữ cái Base64URL (dấu - và _, không cần dấu =), như trong JWT.",
        "Đổi chiều đưa kết quả thành đầu vào mới và đảo chế độ.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Văn bản được mã hóa theo UTF-8 nên tiếng Việt, emoji và ký tự Unicode đều giữ nguyên khi giải mã.",
        "Khoảng trắng và xuống dòng trong chuỗi Base64 được bỏ qua; thiếu dấu = ở cuối vẫn được chấp nhận.",
        "Nếu dữ liệu sau khi giải mã không phải văn bản UTF-8 (ví dụ tệp nhị phân), công cụ báo lỗi thay vì hiển thị ký tự lạ.",
      ],
    },
    { type: "h2", text: "Câu hỏi thường gặp" },
    {
      type: "p",
      text: "Base64 có phải mã hóa bảo mật không? Không. Ai cũng giải mã được; nó chỉ để biểu diễn dữ liệu bằng ký tự in được.",
    },
  ],
  jwt: [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Dán JWT dạng header.payload.signature để xem header và payload dưới dạng JSON.",
        "Các claim iat, nbf, exp được hiển thị theo giờ địa phương và UTC, kèm trạng thái còn hạn hoặc đã hết hạn theo đồng hồ thiết bị của bạn.",
        "Có thể copy riêng header hoặc payload.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Công cụ chỉ giải mã. Nó không xác minh chữ ký, nên không chứng minh token là thật hay an toàn.",
        "Trạng thái hết hạn dựa vào đồng hồ của thiết bị bạn, có thể lệch so với máy chủ.",
        "Token không bao giờ rời khỏi trình duyệt, nhưng vẫn nên tránh dán token còn hiệu lực của hệ thống thật vào bất kỳ trang web nào.",
      ],
    },
    { type: "h2", text: "Câu hỏi thường gặp" },
    {
      type: "p",
      text: "Vì sao token hợp lệ vẫn báo lỗi? Token cần đúng ba phần cách nhau bởi dấu chấm, và header cùng payload phải là JSON dạng đối tượng.",
    },
  ],
  uuid: [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Nhập số lượng từ 1 đến 1000 rồi bấm Tạo UUID.",
        "Bấm Copy trên từng dòng để lấy một UUID, hoặc Copy tất cả để lấy cả danh sách (mỗi UUID một dòng).",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Công cụ tạo UUID phiên bản 4 bằng Web Crypto của trình duyệt, không dùng Math.random.",
        "Nếu trình duyệt không hỗ trợ Web Crypto, công cụ báo lỗi thay vì tạo giá trị kém an toàn.",
      ],
    },
    { type: "h2", text: "Câu hỏi thường gặp" },
    {
      type: "p",
      text: "UUID v4 có thể trùng nhau không? Về lý thuyết có, nhưng xác suất cực nhỏ nên thực tế được coi là duy nhất.",
    },
  ],
};
