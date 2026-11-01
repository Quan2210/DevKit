# DevKit

Bộ công cụ cho developer, frontend-only. Tài liệu gốc:
- `docs/01_DevKit_Requirements_v1.1.md` — PRD (chức năng, kiến trúc, test, kế hoạch)
- `docs/02_DevKit_Design_System_v1.1.md` — Design System + UI/UX Design Workflow

## UI/UX Design Workflow (bắt buộc)

Trước khi viết bất kỳ code frontend/UI nào:

1. Phân tích yêu cầu UI/UX từ Requirement đã duyệt.
2. Dùng skill `frontend-design` để xác định UI direction và design spec.
3. Định nghĩa page layout, reusable component, responsive behavior, interaction pattern.
4. Review thiết kế đối chiếu Design System (checklist §2.5).
5. Cập nhật Implementation Plan theo UI/UX đã duyệt.
6. Implement frontend theo thiết kế đã duyệt.

Quy tắc:
- Hoàn thành và được duyệt UI/UX design **trước** khi implement frontend; chờ user approve.
- Không implement UI theo quyết định styling tùy ý của AI.
- Tuân thủ Design System; tái sử dụng component và design token.
- Không hard-code màu/spacing/font thuộc token.
- Mọi sai khác so với design đã duyệt phải có lý do, ghi vào Design System §12 và được review.

## Quy tắc khác
- Không tạo backend/database riêng; không giả định contract của Feedback Service.
- Không gửi input của tool ra ngoài (kể cả ảnh URL ngoài trong Markdown Preview).
- Đọc repo/convention hiện có trước; không refactor diện rộng.
