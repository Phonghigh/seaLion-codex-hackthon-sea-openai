# Deploy API local trên macOS bằng Cloudflare CLI

Runbook **macOS — Terminal (zsh/bash)** · cập nhật **31/10/2026** · CLI sử dụng: **cloudflared**.

Mac chạy API, PostgreSQL và tunnel. iPhone/iOS mở Site public trong Safari để kiểm tra demo; các lệnh dưới đây chạy trên Mac.

Theo [Architecture](Architecture.md): API, PostgreSQL và ảnh chạy trên máy local; FE public trên ChatGPT Sites gọi API qua HTTPS URL của **Quick Tunnel**.

Quick Tunnel không cần account, login hoặc domain riêng. URL ngẫu nhiên có thể đổi khi tạo lại tunnel. [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

## Flow triển khai

```text
Chuẩn bị CLI
    → chạy PostgreSQL + API local
    → kiểm tra API local
    → mở Quick Tunnel, lấy URL HTTPS
    → kiểm tra API public
    → cập nhật API base URL trên FE
    → cho phép origin FE trong CORS của API
    → kiểm tra từ Site public
    → giữ API và tunnel chạy suốt buổi demo
```

## 1. Chuẩn bị thông tin

| Giá trị | Ví dụ / cách lấy |
| --- | --- |
| Local API | `http://127.0.0.1:3001`, thay port bằng port API thực tế. |
| Endpoint kiểm tra | `/api/health`, thay bằng GET endpoint đã có, không gây thay đổi dữ liệu. |
| Endpoint POST | Một route POST thực tế của API, dùng để kiểm tra preflight. |
| Public API | URL `https://….trycloudflare.com` do CLI in ra sau khi mở tunnel. |
| FE origin | Giá trị header `Origin` của request từ FE, lấy trong DevTools → Network. |

Checkout hiện chưa có ứng dụng hoặc `package.json`. Lệnh build/start API và endpoint thực tế cần lấy từ ứng dụng khi sẵn sàng; runbook này không tạo các script giả định đó.

Chuẩn bị ba tab Terminal: **A chạy API**, **B chạy tunnel**, **C kiểm tra**. Biến shell không tự chia sẻ giữa các tab; mỗi block dưới đây khai báo biến cần dùng.

## 2. Cài cloudflared một lần

Nếu đã có CLI trong PATH, kiểm tra phiên bản rồi chuyển sang bước 3:

```sh
cloudflared --version
```

Nếu chưa có CLI, kiểm tra Homebrew:

```sh
command -v brew
```

Nếu chưa có Homebrew, cài theo [hướng dẫn Homebrew chính thức](https://brew.sh/) và làm bước cấu hình PATH do installer in ra. Sau đó mở tab Terminal mới.

Cài cloudflared bằng Homebrew, áp dụng cho Mac Apple Silicon và Intel:

```sh
brew install cloudflared
cloudflared --version
```

Kết quả cần thấy: CLI in phiên bản và thoát thành công. Lệnh cài macOS được xác nhận trong [Cloudflare Downloads](https://developers.cloudflare.com/tunnel/downloads/). Không cần cài lại cho mỗi lần demo. Khi cần cập nhật, chạy `brew update` rồi `brew upgrade cloudflared`.

## 3. Chạy API local — terminal A

1. Khởi động PostgreSQL local bằng cách vận hành DB hiện có.
2. Kiểm tra cấu hình DB, thư mục lưu ảnh và OpenAI nằm phía server.
3. Chạy build/start API bằng lệnh thực tế của ứng dụng. API nên bind `127.0.0.1` nếu cloudflared chạy cùng máy.
4. Giữ terminal A chạy. Máy phải luôn bật và không sleep trong buổi demo.

Tại terminal C, kiểm tra local trước:

```sh
local_api='http://127.0.0.1:3001'
health_path='/api/health'
curl --connect-timeout 5 --max-time 15 -i "${local_api}${health_path}"
```

Thay `health_path` bằng endpoint GET thực tế và đổi port nếu API dùng port khác.

**Điều kiện tiếp tục:** response có HTTP status và nội dung đúng với API. Nếu endpoint yêu cầu đăng nhập, kiểm tra qua cơ chế auth hiện có. `404` cho biết sai endpoint; không coi đó là health check đạt. Xác nhận API truy cập được DB và ảnh trước khi mở đường public.

## 4. Mở Quick Tunnel — terminal B

```sh
cloudflared tunnel --url http://127.0.0.1:3001
```

Port phải khớp API ở bước 3. Giữ terminal B mở; sao chép URL HTTPS được CLI in ra. Đợi log kết nối tunnel rồi kiểm tra bước 5. [Lệnh tạo Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

Không chạy `wrangler deploy`, `cloudflared tunnel login`, tạo Named Tunnel hoặc cấu hình DNS trong flow này. Không trỏ tunnel vào PostgreSQL hay thư mục chứa toàn bộ ổ đĩa.

## 5. Kiểm tra API public — terminal C

```sh
printf 'Dan URL HTTPS trycloudflare.com vua nhan: '
IFS= read -r public_api
public_api="${public_api%/}"
health_path='/api/health'
curl --connect-timeout 10 --max-time 30 -i "${public_api}${health_path}"
```

`health_path` phải giống endpoint đã kiểm tra ở bước 3. Khi được hỏi, dán URL rồi nhấn Enter, không thêm dấu nháy hoặc khoảng trắng.

**Điều kiện tiếp tục:** response đúng như khi gọi API local. Nếu lỗi, xử lý theo bảng cuối tài liệu trước khi chuyển sang FE. Kiểm tra thêm từ mạng khác, ví dụ điện thoại dùng 4G, để xác nhận URL public truy cập được.

## 6. Cập nhật FE và CORS

### API base URL của FE

Đặt API base URL bằng giá trị `public_api`. Nếu FE thêm prefix `/api` trong API client thì base chỉ chứa origin; tránh URL `/api/api/...`.

- Nếu API base nằm trong build: cập nhật cấu hình và publish lại FE qua ChatGPT Sites.
- Nếu FE đã hỗ trợ runtime config: cập nhật theo cơ chế sẵn có rồi reload trang.
- FE và ảnh phải gọi HTTPS URL tunnel; `localhost` trên trình duyệt của giám khảo là máy của họ.

### Origin được phép trên API

Mở Site public → DevTools → Network → chọn request API → đọc header `Origin`. Đây có thể là origin của frame chạy FE; không suy đoán từ URL trang quản lý ChatGPT. Origin không có path hoặc dấu `/` cuối.

Cấu hình allowlist của API với origin thực tế, rồi reload cấu hình/restart API nếu cần. Tên biến môi trường phụ thuộc API đã triển khai.

Các điều kiện CORS dưới đây là yêu cầu cấu hình cho API; xem [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) để đối chiếu header:

- Origin được phép: trả `Access-Control-Allow-Origin` đúng origin đó và `Vary: Origin`.
- `OPTIONS`: xử lý trước auth, trả `204` cho preflight hợp lệ.
- Cho method/header thực dùng; ví dụ POST JSON có Bearer cần `POST`, `Authorization`, `Content-Type`.
- Response lỗi ứng dụng như `401`/`400` cũng có CORS header cho origin hợp lệ.
- Với Bearer: FE dùng `credentials: 'omit'`. Không dùng `mode: 'no-cors'` hoặc wildcard để che lỗi cấu hình.

Public FE vẫn phải tuân theo cơ chế truy cập API. CORS không thay thế auth; token quản trị/reset, DB password và OpenAI key chỉ nằm phía server.

## 7. Kiểm tra preflight bằng CLI

Tại terminal C, chạy với origin và route thật. Lệnh này chỉ kiểm tra `OPTIONS`, **không gửi POST thay đổi dữ liệu**:

```sh
printf 'Dan URL HTTPS API: '
IFS= read -r public_api
public_api="${public_api%/}"
printf 'Dan Origin thuc te cua FE: '
IFS= read -r site_origin
site_origin="${site_origin%/}"
printf 'Nhap route POST thuc te, bat dau bang /api/: '
IFS= read -r post_path
curl --connect-timeout 10 --max-time 30 -i -X OPTIONS "${public_api}${post_path}" \
  -H "Origin: ${site_origin}" \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type'
```

Kết quả mong đợi theo cấu hình trên:

```http
HTTP/2 204
Access-Control-Allow-Origin: <origin FE thực tế>
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Authorization, Content-Type
Vary: Origin
```

HTTP có thể hiển thị phiên bản khác; methods/headers có thể chứa thêm các giá trị được cho phép. Tên header không phân biệt chữ hoa/thường. Nếu client không dùng Bearer, bỏ `authorization` trong yêu cầu kiểm tra và điều chỉnh danh sách mong đợi.

Lặp lại với `Origin: https://not-allowed.example`. Response không được cấp `Access-Control-Allow-Origin` cho origin này. `curl` không thực thi CORS của trình duyệt, nên vẫn cần bước 8.

## 8. Xác nhận demo từ Site public

- Mở Site public trên thiết bị/trình duyệt khác; thực hiện đăng nhập/nhập token demo theo cơ chế API hiện có.
- Đọc dữ liệu, gửi một thao tác POST demo và kiểm tra ảnh upload/ảnh cũ tải được.
- Kiểm tra request thiếu/sai quyền bị từ chối, FE đọc được lỗi ứng dụng.
- Trong Network, API/ảnh dùng tunnel URL đúng và không có lỗi preflight. Trong Console, kiểm tra CSP `connect-src` có chặn domain tunnel không.

**Kiểm tra trên iPhone/iOS:** mở link Site public bằng Safari, dùng 4G/5G để kiểm tra từ mạng khác; thực hiện đăng nhập demo, đọc dữ liệu, gửi tin và tải ảnh. Mac vẫn phải chạy API/tunnel. Không nhập `127.0.0.1` trên iPhone vì đó là loopback của iPhone.

Ảnh lưu ID/khóa file hoặc path API tương đối để không phụ thuộc hostname tạm. Nếu ảnh cần Bearer header, FE fetch có auth rồi hiển thị blob; `<img src>` không tự gửi custom Bearer header.

**Deployment đạt khi:** API local và API public hoạt động, FE public thực hiện được luồng demo từ mạng khác, và lỗi truy cập được xử lý đúng. Chưa có bằng chứng deploy thực tế chỉ từ việc CLI in ra URL.

## 9. Dừng và mở lại demo

**Dừng:** nhấn `Ctrl+C` tại terminal B để đóng tunnel. Dừng API ở A khi cần. DB và thư mục ảnh không cần xóa/reset.

**Mở lại:** chạy API nếu đã dừng → chạy lại lệnh tunnel ở bước 4 → lấy URL mới → cập nhật API base FE → publish/reload theo bước 6 → chạy lại kiểm tra public và browser. Nếu origin FE vẫn giữ nguyên thì không cần thay CORS allowlist.

Quick Tunnel dành cho demo: không có bảo đảm uptime, giới hạn 200 request đang xử lý đồng thời và không hỗ trợ SSE. Nếu API chỉ hỗ trợ streaming SSE, cần giải quyết trước khi dùng flow này. [Giới hạn Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

## 10. Xử lý lỗi nhanh

| Lỗi | Thao tác |
| --- | --- |
| Không tìm thấy `brew` | Hoàn thành cài đặt Homebrew và bước PATH do installer hướng dẫn, rồi mở Terminal mới. |
| Không tìm thấy `cloudflared` | Chạy `brew list cloudflared` và `command -v cloudflared`; kiểm tra Homebrew PATH. |
| Local GET lỗi | Kiểm tra terminal A, port và endpoint thực tế. |
| Public trả `502` | Kiểm tra local GET trước; đối chiếu `--url` với host/port API. |
| Tunnel không kết nối | Đọc log terminal B, kiểm tra mạng/firewall; đối chiếu [Cloudflare troubleshooting](https://developers.cloudflare.com/tunnel/troubleshooting/). |
| CLI gọi được, browser lỗi CORS | So sánh Origin thực tế, response OPTIONS và CORS header trên response lỗi ứng dụng. |
| Browser báo CSP | Kiểm tra chính sách `connect-src` của FE/Sites; backend CORS không sửa được CSP. |
| URL cũ ngừng chạy | Lấy URL từ process tunnel đang chạy và cập nhật FE. |
| Ảnh mất sau đổi URL | Kiểm tra file local và API base; ảnh không được gắn cứng hostname tunnel cũ. |
| `429` khi nhiều request | Giảm request đồng thời/polling, kiểm tra log để phân biệt giới hạn tunnel và API. |

## Checklist trước khi chia sẻ

- [ ] PostgreSQL, API và cloudflared đang chạy.
- [ ] Local GET và public GET trả kết quả đúng.
- [ ] API base FE là URL mới nhất; Site đã public.
- [ ] Origin FE được cho phép; preflight và browser smoke đạt.
- [ ] Dữ liệu/ảnh đọc được từ thiết bị khác; API kiểm tra quyền đúng.
- [ ] Máy local không sleep trong buổi demo.
- [ ] Safari trên iPhone mở Site qua 4G/5G và dùng được API/ảnh.
