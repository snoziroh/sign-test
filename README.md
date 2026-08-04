# sign-test

Bàn thử chức năng ký — **một màn duy nhất**, chạy trên contract của collection
*"Signing Service — Toàn bộ luồng ký (p12 / MPKI App / eSign Cloud OTP)"*.

## Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:3000 — đó là màn ký, không có login, không có điều hướng.

### Chọn môi trường dịch vụ ký

Địa chỉ API đổi **ngay trên giao diện**: nút hiển thị base URL ở góc trên bên
phải → nhập địa chỉ → *Kiểm tra kết nối* → *Lưu*. Giá trị nằm trong
`localStorage` và được gắn vào mọi lời gọi qua header `X-Signing-Base-Url`, nên
chuyển qua lại giữa localhost / domain nội bộ / IP public không cần khởi động
lại dev server.

`.env.local` chỉ còn là **giá trị dự phòng** khi chưa đặt gì trên giao diện:

```
SIGNING_API_URL=http://localhost:8080
```

Chưa có cả hai thì mọi lời gọi trả `500 SIGNING_API_NOT_CONFIGURED`.

Trình duyệt **không** gọi thẳng base URL đó: request luôn đi qua route
`/api/signing/*` của chính ứng dụng này. Nhờ vậy không vướng CORS và dùng được
với host chỉ cho phép gọi server-to-server.

## Ba luồng ký

`POST /api/v1/sign` là cửa vào duy nhất. Nguồn chữ ký và bước giao dịch nằm
trong part `request` của multipart, không nằm ở URL. `authenticationMode` của
nguồn (đọc từ `/capabilities`) quyết định màn hình chờ:

| Nguồn | `authenticationMode` | Cách hoàn tất |
|---|---|---|
| PKCS#12 (.p12/.pfx) | `NONE` | Ký xong ngay trong response của START |
| FPT MPKI App | `APP_CONFIRMATION` | Request bị giữ ~300 giây tới khi người ký xác nhận trên điện thoại |
| FPT eSign Cloud | `REDIRECT_OTP` | START → CONTINUE (xác nhận danh tính) → CONTINUE (lấy file) |

### Những chỗ tốn tiền

- Mỗi lần **START** của eSign Cloud là một lượt ký bị trừ.
- **CONTINUE từ `PENDING_IDENTITY`** mở giao dịch OTP: thêm billCode, trừ một
  lượt ký. Màn hình chỉ tự chạy bước này khi agreement đã `READY` — lúc đó danh
  tính xác nhận xong rồi, stage này không còn là một quyết định. Agreement chưa
  biết trạng thái thì người dùng phải tự bấm.
- **CONTINUE từ `PENDING_OTP`** chỉ đọc chữ ký, lặp bao nhiêu lần cũng được.
  Không thăm dò theo nhịp: chạy đúng một lần khi cửa sổ nhập OTP đóng lại, hoặc
  khi người dùng bấm.
- `POST /remote-ca/fpt/enrollments/{uuid}/status` **không** phải thao tác đọc:
  mỗi lần gọi trừ một lượt ký. Nó nằm sau hai lần bấm trong mục "Công cụ nâng cao".

### `agreementUuid`

Định danh người ký trên CA, dùng lại cho mọi lần ký sau. Ký thẳng khi chưa có
uuid vẫn chạy (service tự đăng ký) nhưng response ký **không trả uuid về** — nên
màn hình có nút *Đăng ký và lấy agreementUuid* gọi
`POST /remote-ca/fpt/enrollments` riêng, rồi lưu uuid vào `localStorage`.

### `targetSignatureId` của counter-sign

Service sinh id chữ ký nhưng không trả về. Màn hình quét ngược từ chính file
đang chọn: PDF đọc khoá `/FISSignatureId`, XML đọc thuộc tính `Id` của
`<ds:Signature>`. Vẫn còn ô nhập tay cho PDF ký bằng công cụ khác (id dạng
`sha256:<hex của CMS>`).

### baseline T luôn gọi TSA

`BaselineLevel.T.requiresTimestamp()` = true và engine bật timestamp chỉ dựa vào
baselineLevel, không đọc `signing.tsa.enabled`. Cấu hình TSA sai chỉ lộ ra ở lần
ký đầu tiên dưới dạng `422 SIGNING_FAILED`. Ký thử với baseline **B** để tách
bạch lỗi TSA khỏi lỗi luồng ký.

## Cấu trúc

```
app/page.tsx                       màn ký (Server Component)
app/api/signing/**                 proxy sang dịch vụ ký, không gắn token
features/signing/
  api-base-url.ts                  base URL cấu hình trên giao diện (localStorage)
  sign-api.ts                      client của Signing Service
  sign-configuration.ts            dựng & validate request ký
  sign-record-store.ts             giữ phiên eSign Cloud + agreementUuid
  document-format.ts               nhận diện định dạng, quét chữ ký đích
  components/                      workspace, preview, hộp thoại phiên ký
lib/server/sign-proxy.ts           chỗ DUY NHẤT chạm tới địa chỉ backend
lib/types/signing.ts               contract với backend
lib/i18n/                          từ điển EN/VI
```

### Nếu dịch vụ thật bật xác thực trở lại

Chỉ cần sửa `signApiFetch` trong `lib/server/sign-proxy.ts` để gắn header
`Authorization` — không route handler nào biết tới token.

## Đường API đang dùng

| Frontend | Backend |
|---|---|
| `GET /api/signing/capabilities` | `GET /api/v1/capabilities` |
| `POST /api/signing/sign` | `POST /api/v1/sign` (multipart: `request`, `file`, `p12File`) |
| `GET /api/signing/remote-ca/mpki/credentials?username=` | `GET /api/v1/remote-ca/mpki/credentials` |
| `GET /api/signing/remote-ca/mpki/credentials/{id}` | `GET /api/v1/remote-ca/mpki/credentials/{id}` |
| `POST /api/signing/remote-ca/fpt/enrollments` | `POST /api/v1/remote-ca/fpt/enrollments` |
| `POST /api/signing/remote-ca/fpt/enrollments/{uuid}/status` | tương ứng dưới `/api/v1` |
