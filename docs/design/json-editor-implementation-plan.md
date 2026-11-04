# JSON Editor — Implementation Plan (ĐÃ DUYỆT 2026-11-04; đợt A, B và C đã làm)

Dựa trên `docs/design/json-editor-spec.md` (đã duyệt). Quyết định đã chốt khi duyệt spec (theo đề xuất): giữ chế độ Nén; sửa ở Cây format lại toàn văn bản; bỏ tên tài liệu; **đợt D (kéo thả, diff trong Cây) để sau**; chỉ JSON, XML giữ nguyên.

## 1. Tóm tắt yêu cầu
Hai ô của JSON Formatter có thêm: breadcrumb, Mở hết/Thu hết, tìm kiếm, Cây/Bảng sửa được, Query (lọc/sắp xếp/chọn trường), Transform ◀▶, Mở/Lưu/Copy ▾. Không có menu trên cùng, tài khoản, cloud. Nội dung không rời trình duyệt, không lưu vào LocalStorage.

## 2. Hiện trạng (đã đọc code)
- `JsonFormatter.tsx` (41 dòng) chỉ khai báo `DataAdapter` cho `DualPaneTool` (462 dòng, dùng chung với XML).
- `DualPaneTool` giữ state hai ô (`text/view/indent/sort`), `renderPane` dựng `Panel` (toolbar, actions), `Segmented` chọn cách xem, so sánh, Format/Copy ◀▶.
- `CodeEditorImpl`: khi `value` đổi từ ngoài, effect đồng bộ gửi **một transaction thay toàn bộ** nên **đã nằm trong lịch sử Undo** — tận dụng được cho sửa ở Cây. Editor luôn mounted (ẩn bằng class `hidden`) nên lịch sử không mất khi đổi cách xem.
- `TreeNode` (model.ts) có `id` kiểu `$.a[0]` ghép bằng chuỗi nên **không dùng làm đường dẫn được** (khóa chứa dấu chấm gây nhập nhằng); chưa có mảng đường dẫn.
- `TreeView`: trạng thái mở nằm trong từng `Row` (`useState`), chưa điều khiển từ ngoài; chỉ đọc. `TableView`: chỉ đọc, `findTable` lấy mảng đầu tiên theo BFS.
- `formatJson/minifyJson/sortKeys` (core/json.ts) dùng `JSON.parse` + `JSON.stringify`; số lớn mất độ chính xác đã có cảnh báo `findLossyNumbers` (PRD §3.1, R6).
- Đã có: `MenuButton`, `Popover`, `IconButton`, `Segmented`, `Checkbox`, `downloadText`, kiểm tra kích thước + đọc tệp ở Markdown Preview (`core/readFile.ts`), kéo thả tệp ở Markdown Preview, hằng 25 MB ở `ImageColorPanel`.
- `@codemirror/search` có trong `node_modules` nhưng **chưa là dependency trực tiếp** (đến từ gói `codemirror`).
- Không có xung đột docs ↔ code mà plan phụ thuộc vào.

## 3. Truy vết yêu cầu

| Yêu cầu (spec) | Triển khai | Khu vực | Test |
|---|---|---|---|
| Breadcrumb (Cây/Bảng) + ô gõ đường dẫn | `Breadcrumb`, `core/path.ts` | A | unit path; component; e2e |
| Breadcrumb ở Text theo con trỏ | `pathAtOffset`, `CodeEditor.onCursor` | A | unit; component |
| Mở hết / Thu hết | `TreeView` lift `openIds` | A | component |
| Tìm kiếm Text + Cây | `SearchBar`, `searchTree`, handle tìm của editor | A | unit; component; e2e |
| Mở tệp, kéo thả, Lưu ▾, Copy ▾ | `DataPane`, tái dùng `readFile`/`downloadText` | A | component; e2e |
| Cây sửa tại chỗ | `core/edit.ts`, `InlineEdit`, `TreeView` | B | unit edit; component |
| Menu nút ▾ (chèn/nhân đôi/xóa/đổi kiểu) | `NodeMenu` | B | unit; component; e2e |
| Undo/Redo cho thao tác Cây | sửa qua `setText` → transaction CM | B | component |
| Query kiểu Compass (Filter/Sort/Project, có RegExp) + xem trước | `core/filter.ts`, `core/query.ts`, `QueryPanel` | C | unit filter/query; component |
| Transform ◀▶ áp Query | `formatInto` nhận query | C | unit; e2e |
| Sắp xếp theo đường dẫn | cùng `core/query.ts` (khối Sắp xếp) | C | unit |
| Bảng sửa ô, sắp xếp cột | `TableView` | C | component |
| Responsive, a11y, theme | token, `role=tree`, ⋮ trên mobile | A–C | e2e viewport, axe |
| Diff trong Cây, kéo thả | **Ngoài phạm vi** (đợt D) | — | — |

## 4. Thay đổi đề xuất

### Lõi (hàm thuần, test trước)
1. **`src/features/json-formatter/core/path.ts`** (mới): `type Path = Array<string|number>`; `formatPath` (`sections[0].type`, khóa lạ dùng `["a.b"]`); `parsePath` (có lỗi rõ ràng); `pathAtOffset(text, offset)` bằng bộ quét tự viết theo kiểu `findLossyNumbers` (trả `null` khi JSON không hợp lệ).
2. **`core/edit.ts`** (mới): `applyEdit(text, op, indent)` → parse → áp thao tác bất biến → stringify, cùng cơ chế lỗi `Result<string, ToolError>` với `formatJson`. Thao tác: `setValue`, `renameKey` (giữ thứ tự khóa), `remove`, `insert`, `duplicate`, `changeType`. Dùng `Object.defineProperty` như `sortKeys` để an toàn với khóa `__proto__`. Từ chối sửa khi `findLossyNumbers` không rỗng (xem R1).
3. **`core/filter.ts` + `core/query.ts`** (mới) — **bộ lọc kiểu MongoDB Compass (yêu cầu bổ sung 2026-11-04)**. `QueryPanel` có ba ô như Compass: **Filter** `{ userName: "quan.mv" }`, **Sort** `{ age: -1 }`, **Project** `{ name: 1 }`. Mỗi phần tử của mảng là một "document". Parser tự viết cho cú pháp nới lỏng (khóa không ngoặc kép, chuỗi nháy đơn/kép, số, `true/false/null`, **literal RegExp `/abc/i`**), không `eval`, không thêm thư viện.
   - Toán tử so khớp: `$eq $ne $gt $gte $lt $lte $in $nin $exists $regex (+ $options) $not $size $all $elemMatch`; logic: `$and $or $nor`.
   - Quy tắc: khóa chấm (`"a.b.c"`), khớp xuyên mảng như Mongo, giá trị RegExp tương đương `$regex`, so sánh khác kiểu không khớp (không ném lỗi).
   - Phạm vi mảng: `base` (mặc định mảng đầu tiên tìm theo BFS như `findTable`, hiện tên đường dẫn trong panel); không có mảng → "Query cần một mảng".
   - An toàn RegExp: giới hạn độ dài mẫu (≤ 200 ký tự) và chạy trong khối try/catch; ReDoS được ghi vào rủi ro R7. Lỗi cú pháp trả `Result` kèm vị trí để hiển thị inline.
   - Sort: `{field: 1|-1}` nhiều khóa, ổn định. Project: `{a:1}` (chỉ giữ) hoặc `{a:0}` (loại), hỗ trợ khóa chấm.
4. **`core/search.ts`** (mới, hoặc trong `data-tools`): `searchTree(root, term)` → danh sách id khớp theo khóa/giá trị, không phân biệt hoa thường.
5. **`data-tools/model.ts`**: thêm `path?: Array<string|number>` vào `TreeNode`, điền trong `jsonToTree`; XML để trống. `TableData.rows` thêm `path`.

### UI dùng chung
6. **`components/common/Panel.tsx`**: thêm slot `subbar` dưới `toolbar` (breadcrumb, SearchBar, QueryPanel). Không đổi API cũ.
7. **`components/common/Breadcrumb.tsx`** (mới): `nav`, mục cuối `aria-current="location"`, nút ✎ chuyển sang `input` đường dẫn (Enter nhảy, Esc hủy), cuộn ngang trên mobile.
8. **`components/editors`** (`types.ts`, `CodeEditorImpl.tsx`): thêm prop `onCursor(offset)`; thêm vào handle `search(term) → {count}`, `findNext`, `findPrev`, `clearSearch`. Dùng `SearchQuery`, `setSearchQuery`, `findNext/Previous` từ `@codemirror/search`. Nếu spike cho thấy tô khớp chỉ hiện khi panel mở, dùng `openSearchPanel` có sẵn làm phương án dự phòng cho Text.

### Data tools
9. **`data-tools/DataPane.tsx`** (mới, tách từ `renderPane`): gom state theo ô (view, indent, sort, chọn nút, tìm kiếm, query, `openIds`) và toolbar. Đây là tái cấu trúc nhỏ nhưng cần thiết vì `DualPaneTool` sẽ phình thêm khoảng 300 dòng; chỉ di chuyển code, hành vi XML không đổi.
10. **`DualPaneTool.tsx`**: còn giữ state chung (so sánh, lỗi, hai ô) và cột giữa; `DataAdapter` thêm các khả năng tùy chọn `edit`, `query`, `lossy`; `formatInto` truyền thêm query của ô nguồn; nhãn "Format ◀▶" → "Transform ◀▶". Bật Undo/Redo ở mọi cách xem khi adapter `editable`.
11. **`TreeView.tsx`**: chuyển sang `role="tree"` + roving tabindex; props `selectedId`, `onSelect`, `matches`, `openIds`/`onToggle`, và `onEdit` (có thì sửa được). Thêm dòng "Mục mới" ở container rỗng. Phân trang 100 nút giữ nguyên.
12. **`InlineEdit.tsx`, `NodeMenu.tsx`, `SearchBar.tsx`, `QueryPanel.tsx`** (mới, trong `data-tools`), dùng `Popover/MenuButton/IconButton/Input` hiện có.
13. **`TableView.tsx`**: sắp xếp cột là **trạng thái xem** (không đổi dữ liệu, `aria-sort`); sửa ô qua `onEdit`.
14. **`JsonFormatter.tsx`** và i18n (`src/i18n/locales/vi.ts`): nối adapter; thêm khóa chuỗi (breadcrumb, tìm, query, menu nút, lỗi sửa). Guide JSON (`src/i18n/guides`) thêm một đoạn ngắn về sửa ở Cây.

### Tệp
15. Mở tệp: tái dùng `checkFileSize`/`decodeMarkdownFile` nếu độc lập với Markdown, nếu không thì chuyển phần chung sang `lib/io/` (kiểm khi code). Giới hạn 25 MB, lỗi inline, giữ nội dung cũ. Kéo thả theo cách đã làm ở Markdown Preview. Lưu ▾: `downloadText` (`.json` đang format / `.min.json`). Copy ▾ bằng `MenuButton`.

## 5. Ảnh hưởng dữ liệu / API / cấu hình
- Không backend, không database, không request ra ngoài, không LocalStorage cho nội dung.
- **Công nghệ mới cần duyệt:** thêm `@codemirror/search` làm dependency trực tiếp. Lý do: cần `SearchQuery`/`setSearchQuery`/`findNext` để SearchBar điều khiển tìm kiếm; gói đã có sẵn trong lockfile qua `codemirror` (cùng tiền lệ với `@codemirror/commands`). Cách khác: chỉ dùng panel tìm mặc định của CodeMirror (Ctrl+F) cho Text, SearchBar riêng chỉ cho Cây. Chi phí thêm: gần như 0 byte bundle.
- Docs cập nhật sau khi code: Design System §12 (4 dòng ở spec §9), `docs/design/components.md` và `layouts.md` §4.1, `docs/04` Phụ lục B, PRD §3.1 (ghi chú sửa ở Cây).

## 6. Lỗi và nhất quán
- JSON lỗi: Cây/Bảng/Query/Breadcrumb tắt (spec §5). Sửa sai kiểu: giữ giá trị cũ, viền `danger`, `role="alert"`.
- Nhất quán: text là nguồn duy nhất; mỗi thao tác sinh một `setText` → một transaction CM → một bước Undo. Cây không giữ dữ liệu riêng nên không thể lệch Text.
- Sau sửa/chèn/xóa, chọn lại nút theo `path` mới; nếu không còn thì chọn cha.
- Không có đồng thời hay lưu trữ phía máy chủ. Debounce 250ms cho phân tích (đã có), Query chạy theo debounce và có giới hạn kích thước như hiện nay (200.000 ký tự).

## 7. Kế hoạch test

**Unit (vitest, cạnh mã):**
- `path`: format/parse khứ hồi; khóa có `.`, `[`, rỗng, số; `pathAtOffset` ở khóa, giá trị, trong mảng, ngoài chuỗi, JSON lỗi.
- `edit`: từng thao tác; `renameKey` giữ thứ tự; `remove` phần tử cuối/duy nhất; `insert` vào mảng và đối tượng; trùng khóa; `__proto__`; số lớn bị từ chối; kết quả luôn là JSON hợp lệ.
- `query`: từng toán tử; kiểu hỗn hợp; mảng rỗng; gốc không phải mảng; `pick` trường thiếu; sắp xếp ổn định.
- `search`: khớp khóa/giá trị, không hoa thường.

**Component (Testing Library):** TreeView chọn/mở rộng/phím mũi tên; Mở hết/Thu hết; sửa tại chỗ (Enter/Esc/giá trị sai); NodeMenu; Breadcrumb (bấm, gõ đường dẫn sai); SearchBar đếm và đóng; QueryPanel xem trước/Áp dụng/Hủy; TableView sắp xếp + sửa ô; Undo/Redo sau sửa ở Cây; Transform ◀▶ có/không Query.

**E2E (Playwright, `tests/e2e/tools.spec.ts`):** nhập JSON → Cây → sửa giá trị → Text khớp → Undo; mở tệp `.json` và tệp > 25 MB; lọc rồi Transform sang ô phải; so sánh vẫn tô dòng; mobile (menu ⋮); axe Light/Dark; luồng bàn phím.

**Hồi quy:** XML Formatter nguyên vẹn (adapter không có `editable/query`); các test hiện có của `data-tools.test.tsx`, `json.test.ts`, `diff.test.ts`; `npm run verify` (typecheck, lint, test, build, seo, bundle); riêng bundle: chunk JSON không được kéo CodeMirror vào Home (`HEAVY_MARKERS`).

## 8. Thứ tự thực hiện
1. Nhánh mới từ `feat/ui-refresh-topnav-json-diff` (hoặc từ `main` sau khi nhánh này merge — xem Câu hỏi 2).
2. **Đợt A:** lõi `path`/`search` + test → `Panel.subbar` → `Breadcrumb` → `TreeView` (openIds, chọn) → `SearchBar` + handle editor (spike `@codemirror/search` trước) → tách `DataPane` → Mở/Lưu/Copy ▾ → i18n → test → `verify`.
3. **Đợt B:** `core/edit` + test → `InlineEdit` → `NodeMenu` → Undo/Redo mọi view → e2e → `verify`.
4. **Đợt C:** `core/query` + test → `QueryPanel` → Transform → `TableView` sửa/sắp xếp → e2e → `verify`.
5. Cập nhật docs (§12 và các tệp ở mục 5). Mỗi đợt một commit/PR riêng để dễ revert; mỗi đợt dừng cho bạn xem trước khi sang đợt kế.

## 9. Giả định
- Đã duyệt: Nén giữ, format lại khi sửa Cây, bỏ tên tài liệu, hoãn đợt D, chỉ JSON.
- `CodeEditorImpl` tiếp tục tạo giao dịch lịch sử cho thay đổi `value` từ ngoài (đã đọc code xác nhận).
- Một Query tại một thời điểm cho mỗi ô; xem trước là chỉ-đọc.
- Sắp xếp cột trong Bảng là trạng thái xem, không ghi vào text.

## 10. Rủi ro
- **R1 — Mất chính xác khi sửa ở Cây:** `JSON.stringify` làm mất số lớn, gộp khóa trùng và đẩy khóa dạng số lên đầu. Giảm thiểu: khi `findLossyNumbers` khác rỗng thì tắt sửa ở Cây và hiện `Notice`; ghi chú format lại một lần. Phương án triệt để (sửa theo vùng văn bản để giữ nguyên phần còn lại) tốn công hơn nhiều, chưa làm.
- **R2 — Hiệu năng:** Mở hết trên mảng rất lớn. Giữ phân trang 100 nút/nút cha; mỗi sửa parse+stringify lại toàn văn bản (≤200.000 ký tự thì chấp nhận được, sẽ đo).
- **R3 — Tô khớp tìm của CodeMirror** có thể cần panel mở (spike ở đầu đợt A; có phương án dự phòng).
- **R4 — Phím tắt** `Ctrl+F`/`Ctrl+D` xung đột trình duyệt: chỉ chặn khi focus trong ô; kiểm tra thủ công trên Chrome/Edge/Firefox.
- **R5 — Tách `DataPane`** có thể làm vỡ XML: chặn bằng test hồi quy và chỉ di chuyển code.
- **R7 — RegExp tùy ý do người dùng nhập (ReDoS)** có thể làm đơ tab: giới hạn độ dài mẫu, chạy theo debounce, chỉ chạy trên tối đa 100.000 document; chấp nhận rủi ro tự gây vì dữ liệu và mẫu đều của chính người dùng.
- **R6 — Ngân sách bundle:** thêm UI Cây/Query vào chunk tool; đo bằng `check:bundle` và `perf.spec.ts` ở mỗi đợt.

## 11. Câu hỏi mở — ĐÃ TRẢ LỜI (2026-11-04)
Trả lời: 1 có; 2 có (`feat/json-editor`); 3 tắt sửa ở Cây khi có số lớn; **4 thêm tìm theo object kiểu Compass có RegExp (đã đưa vào mục 4.3)**; 5 có; **I APPROVE**.

### (Gốc)
1. Duyệt thêm `@codemirror/search` làm dependency trực tiếp? (đề xuất: có)
2. Làm trên nhánh nào? Nhánh hiện tại `feat/ui-refresh-topnav-json-diff` còn mở; đề xuất tách nhánh mới `feat/json-editor` từ nhánh này, vì hai thay đổi nối tiếp nhau.
3. Khi JSON có số lớn bị mất chính xác: tắt hẳn sửa ở Cây (đề xuất), hay vẫn cho sửa kèm cảnh báo?
4. Query chỉ áp cho mảng (gốc hoặc `base`). Có cần lọc object theo khóa không? (đề xuất: chưa)
5. Có thêm `Ctrl+D`/`Delete` ngay đợt B, hay chỉ dùng menu ▾ ở đợt đầu? (đề xuất: có phím tắt, vì rẻ)

## 12. Phê duyệt
**Chưa bắt đầu triển khai.** Chờ bạn gõ đúng: **I APPROVE** (kèm trả lời các câu hỏi §11 nếu muốn khác đề xuất).

---

## Nhật ký triển khai

### Đợt A — xong (nhánh `feat/json-editor`)
- Lõi: `core/path.ts` (`formatPath`, `parsePath`, `getAt`, `pathAtOffset`, `offsetOfPath`), `data-tools/search.ts`, `TreeNode.path`, `findByPath`, `findById`, `defaultExpanded`, `allContainerIds`.
- UI: `Breadcrumb`, `SearchBar`, `Panel.subbar`, `MenuButton iconOnly/alignEnd`, `DataPane` (tách khỏi `DualPaneTool`, XML giữ nguyên hành vi), `TreeView` dạng `role="tree"` có chọn nút và phím mũi tên, `lib/io/readText.ts`.
- Sai khác so với plan: **không thêm `@codemirror/search`**. Khi kiểm bằng trình duyệt thật (rủi ro R3), `findNext` của gói này tự mở panel tìm mặc định và cướp focus, nên `CodeEditor` có bộ tô khớp riêng (`findField`). Câu hỏi 1 của §11 vì thế không còn cần thiết.
- Test: 20 test `path`, 6 test `search`/helper, 11 test component `json-editor.test.tsx`; toàn bộ vitest xanh (949), `npm run verify` xanh. Đã kiểm bằng tay trên trình duyệt: tìm trong Văn bản (tô khớp, focus ở ô tìm), breadcrumb theo con trỏ, chuyển sang Cây giữ nút đang chọn, Mở hết.
- E2E: sửa 3 chỗ trong `tests/e2e/states.qa.spec.ts` vì Copy của JSON thành menu. **Chưa chạy được** do máy chưa cài trình duyệt Playwright (`npx playwright install` cần tải về).

### Đợt B — xong (cùng nhánh `feat/json-editor`)
- Lõi: `core/edit.ts` (`applyEdit` với `setValue`, `renameKey`, `remove`, `duplicate`, `insert`, `changeType`; `parseEditedValue`; `isLossy`) + 46 test. Kiểu `EditOp`, `NodeAction`, `EditSupport` nằm ở `data-tools/types.ts`.
- UI: `InlineEdit`, menu nút trong `TreeView`, phím `Enter`/`F2`/`Delete`/`Ctrl+D`, nhấp đúp để sửa; `DataPane` biến thao tác thành `EditOp` rồi ghi vào văn bản (một giao dịch CodeMirror, nên Hoàn tác/Làm lại chạy ở mọi cách xem). Chèn mới tự mở ô sửa khóa (đối tượng) hoặc giá trị (mảng).
- Tắt sửa và báo lý do khi có số vượt độ chính xác (quyết định 3). Nút Hoàn tác/Làm lại bật ở mọi cách xem của JSON.
- Sửa một lỗi gặp khi test: bấm vào mục menu làm nổi bọt sự kiện `click` lên dòng, chọn lại nút cũ ngay sau thao tác; menu giờ chặn nổi bọt.
- Test: thêm 12 test component sửa trong Cây (`json-editor.test.tsx`). Toàn bộ vitest xanh (1007), `npm run verify` xanh. Kiểm bằng tay trên trình duyệt: sửa giá trị, Hoàn tác từ Cây, mở menu nút.
- Còn lại / để ý: menu 11 mục bị cắt đáy ở ô thấp (cuộn nội bộ); chưa có dòng "Mục mới" ở container rỗng; E2E Playwright vẫn chưa chạy được trên máy này (chưa cài trình duyệt).

### Đợt C — xong (cùng nhánh `feat/json-editor`)
- Lõi: `core/filter.ts` (parser cú pháp Compass, không `eval`; bộ so khớp với `$eq $ne $gt $gte $lt $lte $in $nin $exists $regex $options $not $size $all $elemMatch $and $or $nor`, khóa chấm, mảng như MongoDB), `core/query.ts` (`runQuery`: Filter, rồi Sort nhiều khóa theo thứ tự kiểu MongoDB, rồi Project giữ hoặc loại; `queryText`). 34 test.
- UI: `QueryPanel` (Filter, Project, Sort, đếm kết quả, tên mảng, Áp dụng/Hủy/Esc), nút Query trên toolbar, xem trước chỉ đọc thay nội dung ô, `Transform ◀▶` áp Query đang mở của ô nguồn. `TableView`: sắp xếp cột, di chuyển ô bằng mũi tên, sửa ô bằng nhấp đúp hoặc Enter/F2.
- Sai khác: Query cho ra **chỉ mảng kết quả** (không giữ phần còn lại của tài liệu); Sort theo đường dẫn (`{ "a.b": 1 }`) nằm trong ô Sort chứ không có hộp thoại riêng; toolbar chưa gom vào menu ⋮ dưới 640px.
- Test: thêm 13 test component (`json-query.test.tsx`), đổi tên nút "Format sang ô …" thành "Transform sang ô …" cho JSON trong test đơn vị và E2E. Toàn bộ vitest xanh (1054), `npm run verify` xanh. Kiểm bằng tay trên trình duyệt: RegExp + Sort + Project, xem trước, Transform sang ô phải.
- Còn lại: E2E Playwright chưa chạy được (chưa cài trình duyệt); menu ⋮ mobile; đợt D (diff trong Cây, kéo thả) theo quyết định ban đầu để sau.

### Bổ sung sau đợt C — dán vào mọi cách xem, Hướng dẫn thành icon, trang không cuộn
- Dán: `Panel.onPaste` + `DataPane.takeText`. Ở Cây, Bảng, Nén dán thay cả nội dung và hiện ngay; nút "Dán từ clipboard" cho lúc tiêu điểm không ở trong ô. Nén sửa được (`ownCompact` giữ chữ vừa gõ). 6 test mới.
- Hướng dẫn: `ToolShell` có icon `?` ở thanh trạng thái mở `Dialog placement=right`. Nội dung vẫn có trong HTML (kiểm bởi `check:seo`).
- Trang không cuộn: `ToolShell fill` (JSON, XML, Markdown). Đo trên trình duyệt 1400x800: `scrollHeight` bằng chiều cao viewport cả khi có thông báo lỗi và khi dán 300 phần tử vào Cây; chỉ vùng Cây có thanh cuộn.
- Chưa làm: dưới lg các ô vẫn xếp chồng nên trang vẫn cuộn; Color tools, Base64, UUID, JWT chưa dùng `fill`.

### Bổ sung: cột giữa, So sánh trong Cây, chọn mảng cho Bảng
- Cột giữa: nút lên gần đầu cột, vùng kéo chỉ ở dải dưới các nút (`SplitWorkspace`).
- So sánh: `treeMarks` (core/diff.ts) thay `markLines`/`indexLines` (đã xóa cùng test cũ); `CompareResult` có `items` và `DiffMarks` mỗi bên; `DataPaneHandle` (`reveal`, `expand`) cho nút khác biệt trước/kế tiếp; `TreeView` nhận `diff`. 3 test `treeMarks`, 5 test So sánh.
- Bảng: `findTableSources`, `tableOf` (model.ts), thao tác `extract` (core/edit.ts, 2 test), danh sách mảng, ô chọn mảng, nút Trích xuất. 4 test.
- Đã kiểm trên trình duyệt 1400x800: vị trí nút và dải kéo, tô khác biệt hai bên, chấm trên container, danh sách mảng trong Bảng. `npm run verify` xanh (1072 test).

### Chỉnh sau phản hồi: đường chia, cảnh báo So sánh, dấu ngoặc trong Cây
- `SplitWorkspace`: không còn đường kẻ full chiều cao.
- `DualPaneTool`: So sánh ngoài Cây thì cảnh báo (`Notice` + nút chuyển), không tự chuyển; `startCompare` dùng chung cho nút trong cảnh báo.
- `TreeView`: bracket sau khóa, dòng đóng `close` trong `flatten`. Thêm 3 test (cảnh báo hai trường hợp, dấu ngoặc); sửa test So sánh cũ cho phải chuyển Cây trước. Đã kiểm trên trình duyệt; vitest xanh (1075).
