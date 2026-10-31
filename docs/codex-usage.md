# Ghi nhận việc dùng Codex cho seaPilot

**Mọi dev phải bật hook trước khi phát triển và lưu prompt làm bằng chứng công khai trong repo.** `.codex/hooks.json` là cấu hình dùng chung; `.codex-usage/events/` chứa prompt và sự kiện tool đã được che các mẫu bí mật nhận diện được trước khi ghi đĩa. Commit/push log cùng thay đổi công việc và cập nhật báo cáo để chia sẻ bằng chứng. Cần **Node.js 20+**, không cần thêm dependency.

## Thiết lập cho mỗi dev, mỗi clone

Chạy từ thư mục gốc repo:

```powershell
node .\scripts\codex-usage\cli.mjs install
```

Installer cập nhật cấu hình public `.codex/hooks.json` bằng lệnh dùng được giữa các checkout, thay handler cũ của recorder và giữ hook khác. Không cần đường dẫn tuyệt đối riêng của máy. Backup `hooks-backup-*.json`, file tạm và dữ liệu thô trong `.codex-usage/local/` được Git bỏ qua; event logs và báo cáo được phép commit.

Chạy `codex` từ gốc repo, rồi mở **`/hooks` trong Codex CLI**, đọc cấu hình và chấp thuận tin cậy hook của repo. Project cũng cần được tin cậy để Codex nạp lớp cấu hình `.codex/`. Sau đó mở lại phiên làm việc. Installer không tự cấp quyền tin cậy. Nếu Codex chưa hỗ trợ giao diện/hook này, kiểm tra [tài liệu Hooks chính thức của OpenAI](https://learn.chatgpt.com/docs/hooks) và phiên bản Codex đang dùng.

Sau một prompt và thao tác tool thực tế, xem dữ liệu đã nhận:

```powershell
node .\scripts\codex-usage\cli.mjs status
```

`observed_hook_events`, `latest_hook_at` và `manual_entries` chỉ phản ánh dữ liệu đã ghi nhận, có thể gồm log của dev khác đã có trong Git. So sánh thời điểm/sự kiện mới và kiểm tra `/hooks`; `status` không xác nhận hook hiện đang bật hoặc được tin cậy. Không chèn dữ liệu giả để chứng minh hook hoạt động.

Đây là quy ước bắt buộc của project. Recorder không thể ép runtime chạy hook khi project/hook chưa được tin cậy, bị tắt, hoặc dev dùng ứng dụng ChatGPT khác. Cần bật hook trước khi tiếp tục và ghi rõ khoảng trống bằng chứng nếu đã bỏ sót.

## Báo cáo và commit log

Xuất báo cáo trước khi commit công việc:

```powershell
node .\scripts\codex-usage\cli.mjs report
```

Mặc định tạo `docs/codex-usage-report.md` và `.json`, **bao gồm nội dung prompt đã che bí mật**, ghi chú tự khai báo, số prompt, phiên, tên/nhóm tool và tín hiệu kết quả. Input/output của tool nằm trong event logs, không được chép vào báo cáo. Lệnh report ghi đè hai file cùng tiền tố đầu ra.

Đọc log và cả hai báo cáo trước khi commit cùng công việc; không đưa khóa, dữ liệu khách hàng hoặc nội dung nội bộ không được phép công bố lên Git. Script không tự commit, push hay gửi dữ liệu; log trở thành công khai khi được commit/push lên repo public.

Đổi tên/đường dẫn cặp file báo cáo trong repo:

```powershell
node .\scripts\codex-usage\cli.mjs report --out docs/my-usage-report
```

Để xuất bản nháp chỉ có metadata, không có nội dung prompt hoặc ghi chú:

```powershell
node .\scripts\codex-usage\cli.mjs report --metadata-only --out .codex-usage/local/summary
```

`--include-prompts` vẫn được hỗ trợ để tương thích; đây đã là hành vi mặc định. `--metadata-only` chỉ thay đổi bản xuất đó, không xóa nội dung trong event logs công khai.

## Hoạt động ngoài phiên Codex

ChatGPT ở cửa sổ khác và thao tác công cụ ngoài runtime này không được tự động quan sát. Có thể thêm bằng chứng **tự khai báo**, được gắn `user_reported`/`unverified` và tách khỏi số lượt tool tự động.

[`manual-entry.example.json`](../scripts/codex-usage/manual-entry.example.json) chỉ là mẫu giả lập. Sao chép vào `.codex-usage/local/my-entry.json` và thay toàn bộ nội dung bằng hoạt động thực tế trước khi nhập. Không nhập file mẫu vào kho bằng chứng thật. Thư mục `local/` là nơi để file thô hoặc bản nháp riêng, được Git bỏ qua.

Các trường bắt buộc: `service`, `tool`, `occurred_at`, `note`; tùy chọn: `model`, `prompt`. `occurred_at` phải có múi giờ, ví dụ dạng `YYYY-MM-DDTHH:mm:ss+07:00`. Tên service/tool/model dùng chữ ASCII, số và các ký tự `_ . : / -`; nội dung prompt/ghi chú hỗ trợ tiếng Việt.

Sau khi chỉnh file, chạy bằng PowerShell:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding UTF8 .\.codex-usage\local\my-entry.json | node .\scripts\codex-usage\cli.mjs manual
```

Lệnh che các mẫu bí mật trước khi ghi bản lưu public vào `events/`. Mỗi lần nhập tạo bản ghi mới; không nhập lại cùng hoạt động. Ghi rõ mục đích, kết quả và phần bạn tự kiểm tra.

## Nội dung được lưu và giới hạn

- Hook nhận sự kiện phiên, prompt, trước/sau tool, subagent, kết thúc lượt và ngắt phiên. Mỗi bản ghi lưu thành một file trong `.codex-usage/events/` để tránh ghi chồng giữa các tiến trình.
- Log phân biệt các phiên bằng ID đã băm; không tự xác minh danh tính dev. Lịch sử Git cung cấp thông tin tác giả/người commit, không xác minh ai gửi từng prompt.
- Prompt được che bí mật rồi lưu với giới hạn **2.097.152 ký tự**, không bị cắt ở mốc 20.000 ký tự. Input/output của tool và ghi chú tự khai báo có giới hạn **20.000 ký tự mỗi trường**; dữ liệu lồng sâu hoặc danh sách lớn cũng có thể bị giới hạn. Nội dung bị cắt được đánh dấu `truncated`.
- Đầu vào hook tối đa **2 MiB**. Nếu hook prompt được gọi nhưng không xác thực/ghi được dữ liệu, recorder yêu cầu Codex **chặn prompt** và nêu lý do; sửa lỗi ghi nhận rồi gửi lại. Lỗi của các hook khác chỉ cảnh báo, nên sự kiện có thể bị thiếu trong báo cáo. Recorder không tự chấp thuận hành động của AI.
- Nếu che bí mật làm prompt vượt giới hạn lưu, recorder cũng chặn thay vì lưu thiếu nội dung. Cơ chế chặn chỉ hoạt động khi Codex thực thi recorder; thiếu Node, hook chưa bật/chưa được tin cậy hoặc timeout ở runtime vẫn có thể tạo khoảng trống, nên mỗi dev phải kiểm tra `status` sau khi thiết lập.
- Che bí mật là **best effort**, không bảo đảm loại bỏ mọi thông tin nhạy cảm. Dữ liệu đã che vẫn phải được rà soát trước khi công bố; Git history có thể giữ lại nội dung đã push dù file sau đó được sửa. Session/turn/call ID được băm trước khi lưu.
- Chỉ đếm sự kiện nhận được sau khi bật hook; không dựng lại lịch sử. Hosted tools như hosted WebSearch và một số đường chạy đặc biệt có thể không phát sự kiện hook. Tài liệu chính thức mô tả phạm vi hỗ trợ, kể cả các lời gọi lồng trong code mode.
- Nhóm `mcp_external` biểu thị tên tool qua MCP; **MCP không chứng minh công cụ do bên thứ ba sở hữu**. Tên không nhận diện được giữ nhóm `unknown`.
- `PreToolUse` và `PostToolUse` cùng định danh được ghép thành một lượt gọi. Thiếu kết quả có thể do đang chạy, bị ngắt/từ chối hoặc mất sự kiện. Tín hiệu `success`/`error` phản ánh tiến trình/giao thức tool, không xác nhận kết quả nghiệp vụ.
- Mỗi lần hook nhận prompt được giữ riêng, kể cả nội dung lặp trong cùng turn. Số prompt phản ánh các lần hook nhận được sự kiện; lượt gọi tool trùng định danh được chống đếm trùng.
- Đây là bằng chứng có thể chỉnh sửa, không phải chứng nhận bất biến. Không suy ra tổng token, chi phí, thời gian tiết kiệm, tỷ lệ mã do AI viết hay điều kiện hợp lệ của cuộc thi.

## Kiểm tra và xử lý sự cố

Chạy kiểm tra riêng cho recorder, không cần package hay Vitest:

```powershell
node --test tests/codex-usage.test.mjs
```

Tại thời điểm bổ sung recorder, repo chưa có package ứng dụng/Vitest để chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`. Bộ kiểm tra Node này chỉ kiểm tra recorder, không thay thế kiểm tra ứng dụng seaPilot.

Nếu cần tạm dừng recorder để xử lý sự cố, dùng `/hooks` và ghi nhận khoảng thời gian thiếu log; bật lại trước khi tiếp tục phát triển. Khi sửa cấu hình thủ công, giữ hook khác. Không xóa bằng chứng của dev khác hoặc trình bày khoảng thời gian không có log như đã được ghi nhận đầy đủ.
