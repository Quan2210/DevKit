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
  "color-picker": [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Kéo trên bảng chọn màu, thanh sắc độ (hue) và thanh alpha, hoặc gõ thẳng giá trị vào ô HEX, RGB, HSL. Giá trị hợp lệ áp dụng ngay, giá trị sai hiện lỗi cạnh ô và không đổi màu.",
        "Dùng HEX 3, 4, 6 hoặc 8 chữ số, rgb()/rgba() hoặc hsl()/hsla(), viết kiểu dấu phẩy hoặc dấu cách.",
        "Bấm Copy cạnh từng định dạng để lấy đúng chuỗi đang hiển thị. Alpha nhỏ hơn 1 được giữ trong HEX 8 chữ số, rgba() và hsla().",
        "Màu ngẫu nhiên chọn một màu dễ nhìn; màu bạn dừng lại một lúc sẽ vào danh sách Gần đây (tối đa 20).",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Giá trị ngoài phạm vi (ví dụ rgb(300, 0, 0)) bị từ chối thay vì tự cắt.",
        "Chuyển đổi làm tròn đến số nguyên nên đi vòng qua các định dạng có thể lệch tối đa 1–3 đơn vị mỗi kênh.",
        "Màu gần đây được lưu trong trình duyệt này (localStorage) và không gửi đi đâu. Nếu trình duyệt chặn lưu trữ, danh sách chỉ giữ đến khi tải lại trang.",
      ],
    },
  ],
  "color-palette": [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Chọn màu gốc, chọn quy tắc phối màu và số lượng màu. Mỗi ô có mã HEX và nút Copy; Copy tất cả lấy cả bảng, mỗi màu một dòng.",
        "Đơn sắc giữ nguyên sắc độ và độ bão hòa, chia độ sáng từ 20% đến 90%, màu gốc nằm ở vị trí gần nhất.",
        "Tương tự: màu gốc rồi các màu lệch 30° mỗi bước về hai phía. Bổ túc: +180°. Tam giác: +120° và +240°. Tứ giác: +90°, +180°, +270°.",
        "Khi bạn chọn nhiều màu hơn số sắc độ cơ sở, các màu thêm là biến thể sáng hơn hoặc tối hơn của các sắc độ đó.",
        "Khối CSS Variables xuất :root với các biến --tiền-tố-1, --tiền-tố-2… hợp lệ; tiền tố được làm sạch.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Số lượng cho phép: 2–10 (Đơn sắc, Tương tự, Bổ túc), 3–10 (Tam giác), 4–10 (Tứ giác).",
        "Phối màu tính trong không gian HSL, đơn giản và dễ đoán nhưng không đảm bảo các màu có độ sáng cảm nhận như nhau.",
      ],
    },
  ],
  "color-contrast": [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Nhập màu chữ và màu nền (HEX, rgb(a), hsl(a)) hoặc chọn bằng hộp màu. Bấm Đổi chỗ để hoán đổi hai màu.",
        "Tỉ lệ tương phản được tính theo công thức WCAG 2.x. Bảng kết quả cho AA và AAA, chữ thường và chữ lớn, mỗi ô có biểu tượng và chữ Đạt hoặc Không đạt.",
        "Ngưỡng: AA thường 4.5:1, AA lớn 3:1, AAA thường 7:1, AAA lớn 4.5:1.",
        "Nếu chưa đạt, mục gợi ý tìm màu chữ gần nhất (cùng sắc độ, đổi độ sáng) đạt AA hoặc AAA trên nền hiện tại.",
      ],
    },
    { type: "h2", text: "Độ trong suốt và làm tròn" },
    {
      type: "ul",
      items: [
        "Màu có alpha nhỏ hơn 1 được trộn thành màu đặc trước khi tính. Nền trong suốt được trộn lên nền giả định (mặc định trắng, có thể đổi sang đen hoặc màu tùy chọn); công cụ ghi rõ màu hiệu dụng đã dùng.",
        "Phép trộn dùng số thực, không làm tròn 8 bit trước khi tính, nên #000000 với alpha 0.5 trên nền trắng cho tỉ lệ khoảng 3.97.",
        "Tỉ lệ hiển thị được cắt (không làm tròn lên) đến hai chữ số, và Đạt hoặc Không đạt luôn so trên giá trị chưa làm tròn. Vì vậy 4.499 không bao giờ hiện là 4.5 và đạt.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "WCAG 2.x đo độ sáng, không đo sắc độ; hai màu khác sắc độ nhưng cùng độ sáng vẫn có tỉ lệ thấp.",
        "Công cụ không đánh giá kích thước và độ đậm thực tế của chữ; bạn chọn dòng chữ thường hoặc chữ lớn phù hợp.",
      ],
    },
  ],
  "css-gradient": [
    { type: "h2", text: "Cách dùng" },
    {
      type: "ul",
      items: [
        "Chọn Linear (đặt góc) hoặc Radial (đặt hình dạng và vị trí tâm). Bản xem trước cập nhật ngay.",
        "Mỗi điểm màu có màu, vị trí 0–100% và các nút chuyển lên, chuyển xuống, xóa; dùng bàn phím được hoàn toàn. Cần ít nhất 2 và tối đa 10 điểm màu.",
        "Mẫu có sẵn nạp nhanh một bộ màu. Bấm Copy CSS để lấy dòng background đang xem trước.",
      ],
    },
    { type: "h2", text: "Giới hạn" },
    {
      type: "ul",
      items: [
        "Danh sách luôn xếp theo vị trí trong gradient (điểm mới được chèn đúng chỗ; gõ xong một vị trí thì danh sách tự sắp lại), và chuyển lên hoặc xuống đổi chỗ cả vị trí của hai điểm liền kề.",
        "Mã CSS dùng màu HEX (kèm alpha 8 chữ số khi trong suốt) và các điểm luôn được sắp theo vị trí.",
        "Chưa hỗ trợ conic-gradient, lặp (repeating) và điểm dừng giữa hai màu.",
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
