# DevKit --- Product Requirements & Design System

**Tài liệu:** Product Requirements Document (PRD) + UI Design System\
**Phiên bản:** 1.0\
**Trạng thái:** Draft for implementation\
**Phạm vi:** DevKit v1 --- Frontend-only, tích hợp Feedback Service\
**Định hướng:** Xây dựng bộ công cụ nhỏ gọn, nhanh, dễ sử dụng cho
developer.

------------------------------------------------------------------------

# 1. Tổng quan sản phẩm

## 1.1. Mục tiêu

DevKit là một website cung cấp các tiện ích thường dùng trong quá trình
phát triển phần mềm. Người dùng có thể truy cập từng công cụ qua URL
riêng, nhập dữ liệu, xử lý ngay trên trình duyệt và sao chép hoặc tải
kết quả.

Các mục tiêu chính:

-   Trải nghiệm đơn giản, nhất quán và tối ưu cho developer.
-   Thời gian phản hồi nhanh; ưu tiên xử lý dữ liệu ngay trên client.
-   Không yêu cầu đăng nhập để sử dụng các công cụ trong v1.
-   Không phụ thuộc backend hoặc database riêng.
-   Responsive trên desktop, tablet và mobile.
-   Có thể mở rộng thêm tools mà không phải thay đổi kiến trúc tổng thể.

## 1.2. Nguyên tắc sản phẩm

1.  **Privacy first:** Nội dung người dùng nhập vào các tool được xử lý
    cục bộ trên trình duyệt, không gửi lên server.
2.  **Frontend-first:** V1 không triển khai backend hoặc database riêng.
3.  **Low operational cost:** Hạn chế dịch vụ trả phí; ưu tiên hosting
    static/free tier.
4.  **Consistent UX:** Các tool dùng chung quy chuẩn layout, editor,
    thông báo lỗi và thao tác.
5.  **Composable:** Mỗi tool là một feature độc lập, có thể tái sử dụng
    shared components/utilities.
6.  **Accessible:** Hỗ trợ keyboard, focus state, contrast và semantic
    HTML.
7.  **SEO-friendly:** Mỗi tool có route, title, description và metadata
    riêng.

## 1.3. Ngoài phạm vi v1

-   Tài khoản người dùng, đăng nhập và phân quyền.
-   Lưu dữ liệu tool lên cloud hoặc đồng bộ giữa thiết bị.
-   Backend/API và database riêng cho DevKit.
-   Lịch sử thao tác đồng bộ trên nhiều thiết bị.
-   Các tính năng AI cần gọi model/API trả phí.
-   SQL Formatter nếu không còn đủ thời gian sau các hạng mục P0/P1.

------------------------------------------------------------------------

# 2. Phạm vi tính năng

## 2.1. Danh sách tools

  Nhóm              Tool                           Priority Phiên bản
  ----------------- ---------------------------- ---------- -------------------
  Data Tools        JSON Formatter & Validator           P0 v1
  Encoding          JWT Decoder                          P0 v1
  Encoding          Base64 Encoder/Decoder               P0 v1
  Generator         UUID Generator                       P0 v1
  Data Tools        XML Formatter & Validator            P1 v1
  Color Tools       Color Picker                         P1 v1
  Color Tools       Color Palette Generator              P1 v1
  Color Tools       Color Contrast Checker               P1 v1
  Color Tools       CSS Gradient Generator               P1 v1
  Developer Tools   SQL Formatter                        P2 Nếu còn thời gian

**Tổng scope:** 9 tools thuộc P0/P1; SQL Formatter là P2. Tổng cộng 10
tools nếu tính cả P2.

## 2.2. Quy chuẩn chung cho mọi tool

Mỗi tool cần có:

-   Tên và mô tả ngắn giải thích công dụng.
-   Input area phù hợp với loại dữ liệu.
-   Output hoặc preview rõ ràng.
-   Nút thao tác chính (Format, Decode, Generate, Validate...).
-   Copy kết quả.
-   Clear/reset input.
-   Loading state nếu có xử lý bất đồng bộ đáng kể.
-   Empty state khi chưa có dữ liệu.
-   Error state dễ hiểu, chỉ rõ lỗi khi có thể.
-   Responsive layout.
-   Hướng dẫn ngắn hoặc ví dụ đầu vào nếu giúp người dùng bắt đầu nhanh.

Không bắt buộc mọi tool phải có đủ Input/Output hai cột. UI cần chọn bố
cục phù hợp với tác vụ và kích thước màn hình.

------------------------------------------------------------------------

# 3. Functional Requirements

## 3.1. JSON Formatter & Validator --- P0

### Mục tiêu

Format JSON, kiểm tra cú pháp và hiển thị dữ liệu dễ đọc.

### Yêu cầu chức năng

-   Nhập JSON trực tiếp hoặc paste nội dung.
-   Beautify/format JSON với indentation có thể chọn (2 hoặc 4 spaces).
-   Minify JSON.
-   Validate JSON và hiển thị trạng thái hợp lệ/không hợp lệ.
-   Hiển thị thông tin lỗi parse nếu có, gồm message và vị trí nếu
    runtime cung cấp.
-   Copy output.
-   Clear input/output.
-   Không tự ý sửa hoặc bỏ dữ liệu không hợp lệ.

### Acceptance Criteria

-   JSON hợp lệ được format đúng và giữ nguyên cấu trúc/giá trị.
-   JSON không hợp lệ hiển thị lỗi dễ hiểu, không làm crash UI.
-   Minify tạo JSON hợp lệ tương đương dữ liệu đầu vào.
-   Copy output hoạt động.
-   Tool hoạt động hoàn toàn trên client.

## 3.2. JWT Decoder --- P0

### Mục tiêu

Giải mã phần header và payload của JWT để người dùng kiểm tra nội dung
token.

### Yêu cầu chức năng

-   Nhập JWT token.
-   Decode header và payload.
-   Hiển thị các claim dưới dạng JSON dễ đọc.
-   Nếu có `exp`, hiển thị thời điểm hết hạn và trạng thái expired/not
    expired theo thời gian hiện tại của thiết bị.
-   Copy header, payload hoặc nội dung đã format.
-   Báo lỗi khi token sai định dạng hoặc Base64URL không hợp lệ.
-   Hiển thị cảnh báo rõ ràng: tool chỉ decode, không xác minh chữ ký và
    không chứng minh token là hợp lệ/an toàn.

### Acceptance Criteria

-   Decode đúng JWT dạng compact gồm 3 phần phân tách bằng dấu chấm.
-   Token sai định dạng có error state.
-   Không hiển thị rằng chữ ký đã được xác minh.
-   Không gửi token lên server hoặc ghi token vào analytics/log.

## 3.3. Base64 Encoder/Decoder --- P0

### Mục tiêu

Encode/decode văn bản Base64.

### Yêu cầu chức năng

-   Có chế độ Encode và Decode.
-   Hỗ trợ Unicode/UTF-8.
-   Validate input khi decode.
-   Copy kết quả.
-   Clear nội dung.
-   Thông báo lỗi khi chuỗi Base64 không hợp lệ.

### Acceptance Criteria

-   Encode/decode round-trip giữ nguyên nội dung Unicode.
-   Decode input lỗi không làm crash ứng dụng.
-   Có thể chuyển đổi mode mà không gây nhầm lẫn về input/output.

## 3.4. UUID Generator --- P0

### Mục tiêu

Tạo UUID nhanh chóng.

### Yêu cầu chức năng

-   Generate một hoặc nhiều UUID.
-   Hỗ trợ UUID v4.
-   Cho phép chọn số lượng trong giới hạn hợp lý.
-   Copy một UUID hoặc copy toàn bộ danh sách.
-   Generate lại.
-   Hiển thị số lượng kết quả.

### Acceptance Criteria

-   UUID tạo ra đúng định dạng UUID v4.
-   Không dùng `Math.random()` cho mục đích tạo UUID nếu có Web Crypto
    API.
-   Giới hạn số lượng để tránh làm treo UI.
-   Copy từng item và copy all hoạt động.

## 3.5. XML Formatter & Validator --- P1

### Mục tiêu

Beautify, minify và kiểm tra cú pháp XML ngay trên browser.

### Yêu cầu chức năng

-   Nhập/paste XML.
-   Beautify XML với indentation 2 hoặc 4 spaces.
-   Minify XML.
-   Validate XML.
-   Phát hiện parse error và hiển thị thông báo lỗi.
-   Syntax highlighting nếu tích hợp editor hỗ trợ.
-   Copy output.
-   Download output dạng `.xml`.
-   Clear input/output.

### Quy tắc xử lý dữ liệu

-   Không được làm mất text node, attribute, namespace, comment hoặc
    CDATA một cách âm thầm.
-   Không tự động sửa XML sai cấu trúc.
-   Cần kiểm thử với XML có namespace, attribute, comment, CDATA, ký tự
    escape và nội dung Unicode.
-   Nếu phương pháp serialize làm thay đổi định dạng quote hoặc thứ tự
    attribute nhưng không thay đổi ý nghĩa XML, cần ghi nhận giới hạn
    này trong UI/help text nếu phù hợp.

### Acceptance Criteria

-   XML hợp lệ được beautify/minify và có thể parse lại.
-   XML không hợp lệ hiển thị lỗi và không tạo output giả như thể thành
    công.
-   Không làm thay đổi nội dung text/attribute hoặc cấu trúc XML.
-   Download tạo file `.xml` đúng nội dung.
-   Xử lý hoàn toàn trên client.

## 3.6. Color Picker --- P1

### Mục tiêu

Cho phép chọn màu và chuyển đổi giữa các định dạng màu phổ biến.

### Yêu cầu chức năng

-   Chọn màu qua color picker UI.
-   Nhập/chỉnh sửa màu bằng HEX.
-   Hiển thị/chỉnh sửa RGB, RGBA và HSL.
-   Preview màu realtime.
-   Copy từng định dạng.
-   Random Color.
-   Recent Colors lưu bằng LocalStorage.
-   Xóa lịch sử màu.
-   Xử lý input không hợp lệ và alpha channel rõ ràng.

### Acceptance Criteria

-   Chuyển đổi qua lại giữa HEX/RGB/RGBA/HSL nhất quán trong sai số làm
    tròn cho phép.
-   Alpha channel được giữ khi làm việc với RGBA.
-   Recent Colors tồn tại sau khi reload trên cùng browser.
-   Nếu LocalStorage không khả dụng, tool vẫn hoạt động và thông báo
    không gây gián đoạn.
-   Copy đúng định dạng đang chọn.

## 3.7. Color Palette Generator --- P1

### Mục tiêu

Tạo bảng màu dựa trên màu gốc và quy tắc phối màu.

### Yêu cầu chức năng

-   Chọn/nhập màu gốc.
-   Hỗ trợ các chế độ:
    -   Monochromatic
    -   Analogous
    -   Complementary
    -   Triadic
    -   Tetradic
-   Cho phép chọn số lượng màu trong phạm vi UI hỗ trợ.
-   Randomize palette.
-   Preview các swatch.
-   Copy mã màu từng swatch.
-   Copy toàn bộ palette.
-   Export CSS Variables.

### Acceptance Criteria

-   Mỗi chế độ tạo palette theo đúng quy tắc màu tương ứng.
-   Màu đầu vào không hợp lệ được xử lý bằng validation.
-   CSS Variables export có cú pháp hợp lệ.
-   Copy từng màu và copy all hoạt động.
-   Các swatch có label/giá trị đủ rõ để phân biệt.

## 3.8. Color Contrast Checker --- P1

### Mục tiêu

Kiểm tra độ tương phản giữa foreground và background theo WCAG 2.x.

### Yêu cầu chức năng

-   Chọn foreground color và background color.
-   Nhập màu theo định dạng được hỗ trợ.
-   Preview text trên background.
-   Tính Contrast Ratio.
-   Đánh giá:
    -   WCAG AA --- Normal Text: 4.5:1
    -   WCAG AA --- Large Text: 3:1
    -   WCAG AAA --- Normal Text: 7:1
    -   WCAG AAA --- Large Text: 4.5:1
-   Cho phép đổi foreground/background.
-   Gợi ý màu gần nhất đạt ngưỡng mục tiêu (nếu triển khai được mà không
    làm tăng scope đáng kể).

### Acceptance Criteria

-   Tính luminance và contrast ratio theo công thức WCAG, không dùng
    khoảng cách RGB đơn giản.
-   Kết quả ratio được hiển thị nhất quán, làm tròn hợp lý.
-   Trạng thái Pass/Fail được đánh giá đúng cho từng ngưỡng.
-   Preview có thể đọc được và không chỉ dựa vào màu để truyền đạt trạng
    thái.
-   Có thể copy foreground/background.

## 3.9. CSS Gradient Generator --- P1

### Mục tiêu

Tạo gradient CSS trực quan và copy code.

### Yêu cầu chức năng

-   Hỗ trợ Linear Gradient và Radial Gradient.
-   Thêm/xóa/chỉnh sửa nhiều color stops.
-   Chỉnh màu từng stop.
-   Với Linear Gradient: điều chỉnh góc.
-   Với Radial Gradient: cung cấp các tùy chọn shape/position cơ bản nếu
    phù hợp UI.
-   Preview realtime.
-   Generate CSS code.
-   Copy CSS.
-   Có một số preset cơ bản nếu không làm UI phức tạp.

### Acceptance Criteria

-   CSS được generate có cú pháp hợp lệ.
-   Preview phản ánh đúng cấu hình.
-   Thêm/xóa/reorder color stops hoạt động ổn định.
-   Copy code trả về đúng CSS đang preview.
-   Không yêu cầu backend.

## 3.10. SQL Formatter --- P2

### Mục tiêu

Format SQL để dễ đọc.

### Yêu cầu chức năng tối thiểu nếu triển khai

-   Nhập SQL.
-   Format/beautify.
-   Chọn indentation.
-   Copy output.
-   Clear input.
-   Có thể bổ sung dialect selector nếu thư viện hỗ trợ ổn định.

### Acceptance Criteria

-   Format không làm thay đổi ý nghĩa câu SQL trong các trường hợp được
    thư viện hỗ trợ.
-   Hiển thị lỗi hoặc giới hạn nếu SQL dialect không được hỗ trợ.
-   Không chặn tiến độ các tính năng P0/P1.

------------------------------------------------------------------------

# 4. Non-functional Requirements

## 4.1. Performance

-   Các thao tác thông thường phản hồi gần như tức thì với input kích
    thước hợp lý.
-   Tránh re-render không cần thiết khi người dùng nhập liệu.
-   Với input lớn, cân nhắc debounce hoặc xử lý ngoài main interaction
    path.
-   Không tải editor/library nặng trước khi cần nếu có thể lazy-load
    theo route.

## 4.2. Security & Privacy

-   Không gửi nội dung JSON/XML/JWT/Base64/SQL hoặc dữ liệu màu riêng tư
    lên server.
-   Không ghi nội dung input vào analytics, console log hoặc error
    tracking.
-   Không render input người dùng như HTML không được sanitize.
-   JWT Decoder chỉ decode, không verify chữ ký.
-   Không sử dụng `eval` hoặc thực thi nội dung người dùng.
-   Download file dùng Blob/object URL và revoke URL sau khi hoàn tất.
-   Feedback Service chỉ nhận nội dung feedback và metadata tối thiểu;
    không đính kèm nội dung tool input/output.

## 4.3. Accessibility

-   Tất cả input/button có label hoặc accessible name.
-   Có keyboard focus state rõ ràng.
-   Không dùng màu sắc làm phương thức duy nhất để truyền đạt trạng
    thái.
-   Đảm bảo contrast cho text và controls theo mục tiêu WCAG AA.
-   Các thông báo lỗi cần có text, không chỉ có icon/màu.

## 4.4. Responsive

-   Desktop: tận dụng không gian cho input/output song song khi phù hợp.
-   Tablet: cho phép chuyển sang layout dọc nếu không đủ chiều rộng.
-   Mobile: ưu tiên một cột, controls dễ thao tác, editor không tràn
    viewport.
-   Navigation/sidebar cần có phương án thu gọn trên màn hình nhỏ.

## 4.5. Browser support

-   Ưu tiên các phiên bản hiện đại của Chrome, Edge, Firefox và Safari.
-   Các API như Clipboard, Web Crypto và LocalStorage cần có fallback
    hoặc thông báo phù hợp khi không khả dụng.

------------------------------------------------------------------------

# 5. Design System

## 5.1. Design principles

1.  **Developer-focused:** Giao diện rõ ràng, ít trang trí, ưu tiên nội
    dung và thao tác.
2.  **Clarity over decoration:** Phân cấp thị giác rõ, tránh hiệu ứng
    không cần thiết.
3.  **Consistent patterns:** Cùng một loại thao tác phải có cùng cách
    thể hiện trên mọi tool.
4.  **Efficient workflow:** Giảm số click để thực hiện tác vụ phổ biến.
5.  **Readable by default:** Typography, spacing và code editor tối ưu
    cho việc đọc.
6.  **Responsive by design:** Không xem mobile là phiên bản desktop thu
    nhỏ.

## 5.2. Visual direction

-   Phong cách: Modern developer utility, tối giản, sạch và chuyên
    nghiệp.
-   Nền tổng thể trung tính; dùng accent color có kiểm soát.
-   Card và panel có đường viền nhẹ, shadow hạn chế.
-   Code/editor dùng font monospace.
-   Tránh gradient trang trí quá nhiều ở cấp layout; gradient chỉ là nội
    dung chính trong Gradient Generator.
-   Không sử dụng quá nhiều màu trạng thái cùng lúc.

## 5.3. Color tokens

Đây là bộ token khởi đầu; cần tinh chỉnh sau khi dựng UI thực tế và kiểm
tra contrast.

### Light theme

  Token                     Giá trị     Công dụng
  ------------------------- ----------- ----------------
  `--color-bg`              `#F8FAFC`   Nền ứng dụng
  `--color-surface`         `#FFFFFF`   Card/panel
  `--color-surface-muted`   `#F1F5F9`   Vùng phụ
  `--color-text`            `#0F172A`   Text chính
  `--color-text-muted`      `#64748B`   Text phụ
  `--color-border`          `#E2E8F0`   Border
  `--color-primary`         `#4F46E5`   Primary action
  `--color-primary-hover`   `#4338CA`   Hover
  `--color-success`         `#16A34A`   Success
  `--color-warning`         `#D97706`   Warning
  `--color-danger`          `#DC2626`   Error/danger
  `--color-info`            `#0284C7`   Information

### Dark theme

  Token                     Giá trị     Công dụng
  ------------------------- ----------- ----------------
  `--color-bg`              `#0B1120`   Nền ứng dụng
  `--color-surface`         `#111827`   Card/panel
  `--color-surface-muted`   `#1F2937`   Vùng phụ
  `--color-text`            `#F8FAFC`   Text chính
  `--color-text-muted`      `#94A3B8`   Text phụ
  `--color-border`          `#334155`   Border
  `--color-primary`         `#818CF8`   Primary action
  `--color-primary-hover`   `#A5B4FC`   Hover
  `--color-success`         `#4ADE80`   Success
  `--color-warning`         `#FBBF24`   Warning
  `--color-danger`          `#F87171`   Error/danger
  `--color-info`            `#38BDF8`   Information

Không hard-code màu trực tiếp trong feature nếu màu đó thuộc hệ thống
token. Với màu do người dùng chọn trong Color Tools, lưu dưới dạng giá
trị dữ liệu riêng, không nhầm với theme token.

## 5.4. Typography

-   UI font: ưu tiên `Inter`, fallback `system-ui, sans-serif`.
-   Code font: `JetBrains Mono`, fallback `Consolas, monospace`.
-   Body text: 14--16px.
-   Secondary/help text: 12--14px.
-   Page title: 24--30px tùy breakpoint.
-   Section title: 16--20px.
-   Button/input text: 14px.
-   Line-height body: khoảng 1.5.
-   Code editor line-height: khoảng 1.5--1.6.

Không dùng quá nhiều font weight; ưu tiên 400, 500, 600 và 700.

## 5.5. Spacing & layout

Dùng spacing scale theo bội số 4px:

  Token          Giá trị
  ------------ ---------
  `space-1`          4px
  `space-2`          8px
  `space-3`         12px
  `space-4`         16px
  `space-5`         20px
  `space-6`         24px
  `space-8`         32px
  `space-10`        40px
  `space-12`        48px

Quy chuẩn layout gợi ý: - App content max-width: 1200--1440px tùy
shell. - Page horizontal padding: 24px desktop, 16px tablet, 12--16px
mobile. - Card padding: 16--24px. - Khoảng cách giữa section:
24--32px. - Tool input/output panel gap: 16px. - Không để editor hoặc
bảng màu gây horizontal overflow toàn trang.

## 5.6. Border radius & elevation

  Component           Radius
  --------------- ----------
  Small control          6px
  Input/button           8px
  Card/panel            12px
  Modal/popover     12--16px
  Pill/badge           999px

-   Border mặc định 1px.
-   Shadow nhẹ cho dropdown/modal; card thường ưu tiên border hơn
    shadow.
-   Không lạm dụng glassmorphism hoặc blur.

## 5.7. Component specifications

### Button

Variants: - Primary: hành động chính. - Secondary: hành động phụ. -
Ghost: hành động ít ưu tiên. - Destructive: hành động xóa/nguy hiểm.

States: - Default, hover, active, focus-visible, disabled, loading.

### Input & Textarea

-   Có label rõ ràng.
-   Placeholder chỉ là gợi ý, không thay thế label.
-   Error message đặt gần field.
-   Hỗ trợ clear khi phù hợp.
-   Focus ring nhất quán.

### Card & Panel

-   Dùng cho nhóm chức năng hoặc input/output.
-   Header gồm title và action phụ nếu cần.
-   Không lồng quá nhiều lớp card.

### Tabs / Segmented control

-   Dùng để chuyển mode có liên quan, ví dụ Encode/Decode hoặc
    Beautify/Minify.
-   Hiển thị rõ mode đang active.
-   Hỗ trợ keyboard.

### Code Editor

-   Monospace font.
-   Syntax highlighting theo ngôn ngữ.
-   Line number nếu phù hợp.
-   Có trạng thái read-only cho output.
-   Copy action đặt ở vị trí dễ tìm.
-   Trên mobile, tránh ép editor quá hẹp; ưu tiên chiều rộng nội dung có
    scroll nội bộ.

### Color Swatch

-   Hiển thị màu, mã màu và hành động copy.
-   Không chỉ dựa vào swatch để nhận diện; luôn có mã màu dạng text.
-   Có border cho màu quá sáng/trắng.

### Toast / Inline feedback

-   Success: thông báo ngắn sau copy/generate/save.
-   Error: nêu nguyên nhân và cách xử lý nếu có.
-   Không dùng toast cho lỗi validation cần người dùng đọc lâu; dùng
    inline error.
-   Không hiển thị thông báo quá lâu hoặc quá dày đặc.

### Dialog / Popover

-   Dùng cho lựa chọn phụ hoặc xác nhận hành động quan trọng.
-   Có thể đóng bằng Escape và thao tác ngoài vùng khi phù hợp.
-   Focus không được mất kiểm soát.

## 5.8. Iconography

-   Dùng một bộ icon thống nhất (ví dụ Lucide).
-   Icon kích thước phổ biến 16px hoặc 20px.
-   Icon button phải có accessible label/tooltip.
-   Không trộn nhiều phong cách icon.

## 5.9. Theme behavior

-   Hỗ trợ Light và Dark.
-   Có lựa chọn System nếu phạm vi cho phép.
-   Lưu lựa chọn theme trong LocalStorage.
-   Khi khởi tạo, tránh flash theme sai nếu có thể.
-   Mọi component phải dùng semantic tokens để đổi theme đồng bộ.
-   Editor theme phải đồng bộ với app theme.

------------------------------------------------------------------------

# 6. Information Architecture & Navigation

## 6.1. Điều hướng đề xuất

-   Home / Tools overview.
-   Data Tools:
    -   JSON Formatter
    -   XML Formatter
-   Encoding:
    -   JWT Decoder
    -   Base64 Encoder/Decoder
-   Generators:
    -   UUID Generator
-   Color Tools:
    -   Color Picker
    -   Color Palette Generator
    -   Color Contrast Checker
    -   CSS Gradient Generator
-   Developer Tools:
    -   SQL Formatter (P2)
-   Feedback / About (tùy layout).

## 6.2. Routing

Mỗi tool có URL ổn định, dễ đọc, ví dụ:

-   `/tools/json-formatter`
-   `/tools/xml-formatter`
-   `/tools/jwt-decoder`
-   `/tools/base64`
-   `/tools/uuid-generator`
-   `/tools/color-picker`
-   `/tools/color-palette`
-   `/tools/color-contrast`
-   `/tools/css-gradient`
-   `/tools/sql-formatter`

Route chưa triển khai P2 có thể không xuất hiện trong navigation v1.

## 6.3. Tool page layout

Bố cục gợi ý: 1. Breadcrumb hoặc đường dẫn về danh sách tools. 2. Page
title và mô tả ngắn. 3. Toolbar: mode, options và primary action. 4.
Workspace: input/output hoặc preview. 5. Inline status/error. 6.
Help/tips ngắn nếu cần. 7. Feedback entry point dùng chung.

------------------------------------------------------------------------

# 7. Feedback Service Integration

## 7.1. Mục tiêu

Cho phép người dùng gửi góp ý hoặc báo lỗi về DevKit.

## 7.2. Yêu cầu chức năng

-   Có entry point Feedback dễ tìm nhưng không gây cản trở thao tác
    chính.
-   Form gồm loại feedback, nội dung và thông tin bổ sung tùy chọn.
-   Validate nội dung bắt buộc và giới hạn độ dài.
-   Hiển thị trạng thái submitting, success và error.
-   Không tự động đính kèm nội dung input/output của các tool.
-   Tích hợp theo contract/API được cung cấp bởi Feedback Service hiện
    có.

## 7.3. Giới hạn

-   Không xây backend hoặc database feedback mới trong phạm vi DevKit.
-   Không giả định endpoint, authentication hoặc payload nếu chưa có
    contract.
-   Nếu Feedback Service chưa sẵn sàng ở môi trường local, cần có cách
    cấu hình endpoint và hiển thị lỗi phù hợp; không giả lập gửi thành
    công.

## 7.4. Acceptance Criteria

-   Người dùng mở được form feedback từ giao diện.
-   Validate form trước khi submit.
-   Gửi đúng contract của Feedback Service.
-   Hiển thị success chỉ khi service xác nhận thành công.
-   Khi lỗi mạng/service, hiển thị thông báo và cho phép thử lại.
-   Không gửi tool payload nhạy cảm ngoài ý muốn.

------------------------------------------------------------------------

# 8. Technical Architecture

## 8.1. Định hướng

-   Frontend: React + TypeScript + Vite.
-   Styling: Tailwind CSS và semantic CSS variables/design tokens.
-   Routing: React Router hoặc router hiện có của project.
-   Code editor: CodeMirror.
-   Color utility: thư viện chuyển đổi màu phù hợp (ví dụ Culori); color
    picker UI có thể dùng react-colorful.
-   XML: DOMParser để parse/validate; serializer/formatter cần được kiểm
    thử kỹ.
-   Local persistence: LocalStorage chỉ cho preference/theme/recent
    colors.
-   Hosting: static hosting phù hợp (ví dụ Cloudflare Pages hoặc nền
    tảng tương đương).

Các công nghệ trên là đề xuất, cần ưu tiên dependency đã có trong
repository và tránh thêm package nếu browser API hoặc code hiện tại đáp
ứng tốt.

## 8.2. Cấu trúc thư mục đề xuất

``` text
src/
├── app/
│   ├── router/
│   └── providers/
├── components/
│   ├── layout/
│   ├── common/
│   ├── forms/
│   └── editors/
├── features/
│   ├── json-formatter/
│   ├── xml-formatter/
│   ├── jwt-decoder/
│   ├── base64/
│   ├── uuid-generator/
│   ├── sql-formatter/
│   └── color-tools/
│       ├── color-picker/
│       ├── palette-generator/
│       ├── contrast-checker/
│       ├── gradient-generator/
│       └── shared/
├── services/
│   └── feedback/
├── hooks/
├── lib/
├── styles/
│   ├── tokens.css
│   └── globals.css
└── utils/
```

Đây là cấu trúc tham khảo, không phải yêu cầu phải refactor toàn bộ
project nếu repository hiện tại đã có convention phù hợp.

## 8.3. Color shared module

Các Color Tools cần dùng chung: - Color parsing/validation. - Color
conversion. - Color normalization. - Alpha handling. -
Contrast/luminance utilities. - CSS serialization helpers. - Shared
TypeScript types.

Không để mỗi tool tự viết một bộ chuyển đổi màu riêng.

## 8.4. Error handling

-   Phân biệt validation error, processing error và unexpected error.
-   Không expose stack trace cho người dùng.
-   Giữ input để người dùng sửa khi processing thất bại.
-   Không xóa output hợp lệ trước đó nếu thao tác mới thất bại, trừ khi
    behavior được xác định rõ.
-   Log kỹ thuật không chứa nội dung người dùng nhập.

------------------------------------------------------------------------

# 9. SEO & Content Requirements

Mỗi tool route cần: - Title riêng, mô tả đúng chức năng. - Meta
description ngắn, tự nhiên. - Heading H1 duy nhất và rõ ràng. - Nội dung
hướng dẫn ngắn, hữu ích. - Open Graph metadata cơ bản. - Canonical URL
nếu hệ thống deploy cần. - Không tạo nội dung SEO lặp lại hoặc nhồi từ
khóa.

Home page cần giải thích DevKit là gì, liệt kê các nhóm tool và dẫn tới
từng tool.

------------------------------------------------------------------------

# 10. Testing Strategy

## 10.1. Functional tests

-   Test happy path và invalid input cho từng tool.
-   Test copy/download.
-   Test theme và persistence.
-   Test Feedback Service success/failure.
-   Test các trường hợp Unicode và dữ liệu rỗng.

## 10.2. Color test cases

-   HEX 3/6/8 ký tự theo định dạng được hỗ trợ.
-   RGB/RGBA boundary values.
-   Alpha 0, 0.5, 1.
-   Màu trắng/đen và màu có luminance gần nhau.
-   Contrast ratio đối chiếu các ví dụ WCAG.
-   Palette từng harmony mode.
-   Gradient nhiều color stops.

## 10.3. XML test cases

-   XML đơn giản.
-   Nested elements.
-   Attributes và namespace.
-   Comments.
-   CDATA.
-   Unicode và escaped entities.
-   Empty elements.
-   Malformed XML.
-   XML có processing instruction.

## 10.4. Responsive & browser tests

-   Desktop, tablet, mobile viewport.
-   Chrome, Edge, Firefox, Safari hiện đại.
-   Keyboard navigation và focus.
-   Không có horizontal overflow ngoài editor/workspace được chủ đích
    scroll.

## 10.5. Quality gates

-   Build thành công.
-   TypeScript không có lỗi.
-   Lint/test hiện có pass.
-   Không có lỗi console nghiêm trọng.
-   Các route chính tải được trực tiếp khi refresh.
-   Không có secrets/API key trong frontend bundle.
-   Không có request gửi tool input/output ra ngoài.

------------------------------------------------------------------------

# 11. Delivery Plan --- Week 1

Mục tiêu tuần 1: hoàn thiện bộ DevKit frontend có thể sử dụng, tích hợp
Feedback Service, chưa triển khai backend/database riêng.

Thứ tự ưu tiên:

### Phase 1 --- Foundation

-   Kiểm tra repository và convention hiện tại.
-   Chốt app shell, routing và responsive.
-   Thiết lập design tokens, light/dark theme.
-   Tạo shared components và tool page template.

### Phase 2 --- P0 tools

-   JSON Formatter & Validator.
-   JWT Decoder.
-   Base64 Encoder/Decoder.
-   UUID Generator.

### Phase 3 --- P1 tools

-   XML Formatter & Validator.
-   Color Picker.
-   Color Palette Generator.
-   Color Contrast Checker.
-   CSS Gradient Generator.

### Phase 4 --- Integration & polish

-   Tích hợp Feedback Service.
-   Hoàn thiện empty/loading/error/success states.
-   SEO metadata.
-   Responsive và accessibility pass.

### Phase 5 --- Validation & deploy

-   Functional tests.
-   Build/lint/typecheck.
-   Smoke test các route.
-   Deploy static hosting.

### P2

SQL Formatter chỉ triển khai nếu các hạng mục P0/P1, feedback
integration, testing và deploy đã hoàn thành.

------------------------------------------------------------------------

# 12. Definition of Done

DevKit v1 được xem là hoàn thành khi:

-   [ ] Tất cả tools P0/P1 có route riêng và hoạt động đúng.
-   [ ] SQL Formatter được ghi nhận là P2, không block release.
-   [ ] Có shared layout và design system nhất quán.
-   [ ] Light/Dark theme hoạt động.
-   [ ] Responsive trên desktop/tablet/mobile.
-   [ ] Các thao tác copy/clear/download hoạt động đúng theo từng tool.
-   [ ] Error/empty/success states được xử lý.
-   [ ] Feedback Service được tích hợp theo contract thật.
-   [ ] Không có backend/database riêng trong DevKit v1.
-   [ ] Không gửi dữ liệu tool lên server.
-   [ ] SEO metadata cơ bản đầy đủ.
-   [ ] Build, typecheck, lint và test hiện có pass.
-   [ ] Có thể deploy và truy cập trực tiếp từng route.

------------------------------------------------------------------------

# 13. Implementation Notes for AI Coding Agent

Khi dùng tài liệu này với Cursor/Claude Code:

1.  Trước tiên đọc repository, package manifest, existing routes,
    components, styles và project conventions.
2.  Không tự ý thay đổi stack hoặc refactor diện rộng.
3.  Đối chiếu requirement với code hiện tại và nêu assumptions/gaps.
4.  Đề xuất implementation plan theo từng phase, liệt kê file dự kiến
    thay đổi, dependency mới, risk và test plan.
5.  Chờ người dùng review/approve plan trước khi code.
6.  Sau khi được duyệt, triển khai từng phần với minimal diff.
7.  Chạy build, typecheck, lint và test phù hợp.
8.  Không tự tạo backend/database hoặc dịch vụ trả phí.
9.  Không tự giả định contract của Feedback Service.
10. Báo cáo rõ phần đã làm, phần chưa làm, kết quả kiểm thử và các rủi
    ro còn lại.

**Quy tắc quan trọng:** Nếu requirement mâu thuẫn với cấu trúc hoặc
behavior hiện tại của repository, dừng ở bước phân tích và nêu lựa chọn;
không âm thầm tự quyết định thay đổi lớn.
