# Bằng chứng sử dụng Codex công khai

Thư mục này thuộc nội dung public của repo. Mỗi dev bật [cấu hình hook chung](../.codex/hooks.json) trước khi phát triển, rồi commit/push log đã rà soát cùng công việc để chia sẻ bằng chứng.

- `events/*.json`: sự kiện Codex và hoạt động tự khai báo; prompt/input/output được che các mẫu bí mật nhận diện được trước khi ghi đĩa.
- `local/`: file thô và bản nháp riêng, bị Git bỏ qua.
- `hooks-backup-*.json` và file tạm: bị Git bỏ qua.
- Báo cáo mặc định: [`docs/codex-usage-report.md`](../docs/codex-usage-report.md) và [JSON](../docs/codex-usage-report.json), bao gồm nội dung prompt đã che bí mật.

Chạy `node scripts/codex-usage/cli.mjs install` từ gốc repo, tin cậy project/hook trong Codex `/hooks`, mở phiên mới và kiểm tra sự kiện thật bằng `status`. Trước khi commit, chạy `node scripts/codex-usage/cli.mjs report` rồi rà soát log và báo cáo. Không có auto commit/push.

Che bí mật không bảo đảm loại bỏ mọi dữ liệu nhạy cảm. Prompt có giới hạn lưu 2.097.152 ký tự; input/output tool và ghi chú tối đa 20.000 ký tự mỗi trường. Toàn bộ đầu vào hook tối đa 2 MiB; lỗi ghi nhận prompt yêu cầu Codex chặn prompt. Log chỉ phản ánh sự kiện hook nhận được; không tự quan sát ứng dụng ChatGPT khác hoặc hook bị tắt/chưa tin cậy. Bản ghi tự khai báo không được tính là lượt tool tự động.

Xem [hướng dẫn đầy đủ](../docs/codex-usage.md) để cài đặt, nhập hoạt động ngoài Codex và đọc đúng giới hạn báo cáo. Không chèn mẫu giả vào log thật hoặc xóa bằng chứng của dev khác.
