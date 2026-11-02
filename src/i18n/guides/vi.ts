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
        "Dán JSON vào ô bên trái, kết quả tự cập nhật sau khi bạn ngừng gõ (với tài liệu trên 200.000 ký tự, hãy bấm Format hoặc Minify).",
        "Chọn Format để làm đẹp (2 hoặc 4 dấu cách) hoặc Minify để nén thành một dòng.",
        "Khi JSON sai, thông báo lỗi nêu vị trí dòng và cột; bấm vào vị trí để nhảy tới đó.",
        "Ctrl+Enter (hoặc Cmd+Enter) chạy lại thao tác đang chọn.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Số có quá nhiều chữ số có nghĩa hoặc vượt phạm vi số thực 64-bit (ví dụ 12345678901234567890 hoặc 1e999) không biểu diễn chính xác được; công cụ cảnh báo thay vì âm thầm làm tròn.",
        "JSON lồng nhau hơn khoảng 4.000 cấp có thể không định dạng được; công cụ báo lỗi thay vì treo.",
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
  xml: [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Dán XML vào ô bên trái, kết quả tự cập nhật sau khi bạn ngừng gõ (với tài liệu trên 200.000 ký tự, hãy bấm Format hoặc Minify).",
        "Chọn Format để thụt lề (2 hoặc 4 dấu cách) hoặc Minify để bỏ khoảng trắng thừa.",
        "Khi XML sai, thông báo lỗi nêu vị trí dòng và cột (nếu trình duyệt cung cấp); bấm vào vị trí để nhảy tới đó. Công cụ không tự sửa XML lỗi.",
        "Dùng Copy hoặc Tải .xml để lấy kết quả.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Chỉ khoảng trắng dùng để thụt lề mới bị thay đổi. Văn bản, thuộc tính (giữ nguyên dấu nháy và thứ tự), namespace, comment, CDATA, processing instruction và entity được giữ nguyên.",
        'Trong nội dung trộn văn bản và thẻ (ví dụ <p>Xin chào <b>bạn</b></p>) hoặc dưới xml:space="preserve", khoảng trắng là nội dung nên phần tử đó được giữ nguyên, không xuống dòng.',
        "Sau khi xử lý, công cụ phân tích lại kết quả và so với đầu vào; nếu không khớp, nó báo lỗi thay vì đưa ra kết quả sai.",
        "Nội dung phần DOCTYPE được giữ nguyên văn nhưng không được kiểm tra DTD.",
        "File tải về luôn là UTF-8. Nếu khai báo <?xml ... encoding=...?> khác UTF-8, khai báo được giữ nguyên và công cụ cảnh báo.",
        "Nút Tải .xml bị tắt khi XML đang lỗi hoặc kết quả đã cũ, để không lưu nhầm kết quả của lần nhập trước.",
        "Dữ liệu được xử lý ngay trong trình duyệt, không gửi đi đâu.",
      ],
    },
  ],
  markdown: [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Viết hoặc dán Markdown ở ô soạn và xem kết quả ngay bên cạnh. Trên màn hình nhỏ, dùng nút Soạn/Xem để chuyển.",
        "Hỗ trợ CommonMark và GFM: tiêu đề, danh sách, danh sách việc cần làm, bảng, gạch ngang chữ, đoạn mã có tô màu, trích dẫn, liên kết, chú thích cuối trang.",
        "Mở file .md từ máy hoặc kéo thả vào ô soạn; file được đọc ngay trong trình duyệt, không tải lên đâu cả.",
        "Copy hoặc tải về Markdown và HTML. HTML xuất ra đã được làm sạch.",
      ],
    },
    { type: "h2", text: "An toàn và riêng tư" },
    {
      type: "ul",
      items: [
        "HTML thô trong tài liệu bị bỏ qua, và mọi nội dung được làm sạch trước khi hiển thị, nên mã độc trong Markdown không chạy được.",
        "Ảnh từ URL ngoài bị chặn theo mặc định vì mỗi ảnh sẽ khiến trình duyệt gửi request tới máy chủ khác. Chỉ ảnh nhúng sẵn (data URI png, jpeg, gif, webp) hiển thị được. Bạn có thể bật tải ảnh ngoài khi cần.",
        "Nội dung không được lưu, trừ khi bạn tự bật tùy chọn nhớ bản nháp trên thiết bị này.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "File mở từ máy tối đa 5 MB và phải là văn bản UTF-8.",
        "Chưa hỗ trợ công thức toán, sơ đồ Mermaid và xuất PDF.",
        "Tài liệu rất lớn (trên khoảng 200.000 ký tự) được xử lý trong luồng nền nên có thể cập nhật chậm hơn một chút.",
      ],
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
