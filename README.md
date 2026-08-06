# sign-test

Bàn thử chức năng ký và thẩm định chữ ký — **hai màn**, không có login. Luồng ký
chạy trên contract của collection *"Signing Service — Toàn bộ luồng ký (p12 /
MPKI App / eSign Cloud OTP)"*.

## Chạy

```bash
npm install
npm run dev
```

| Đường dẫn | Màn |
|---|---|
| http://localhost:3000/ | Ký tài liệu |
| http://localhost:3000/verify | Thẩm định tệp đã ký |

Hai màn dùng chung địa chỉ API và chuyển qua lại bằng thanh điều hướng ở trên
cùng. Mỗi màn là một URL riêng nên mở song song hai tab được — ký ở tab này rồi
verify kết quả ở tab kia.

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

## Màn verify

Thả một tệp đã ký vào, nhận báo cáo thẩm định: kết luận từng chữ ký, cây kiểm
tra, chuỗi chứng thư, dấu thời gian, manifest và danh sách issue.

Ba điều dễ đọc sai kết quả:

1. **HTTP 200 không có nghĩa chữ ký hợp lệ.** 200 chỉ nghĩa là verify chạy xong;
   kết luận nằm ở `data.status`. Chữ ký hỏng vẫn trả 200.
2. **`INDETERMINATE` không phải lỗi.** Chữ ký đúng về mật mã nhưng thiếu dữ liệu
   để kết luận — hay gặp nhất là backend chưa cấu hình trust anchor. Màn hình
   hiển thị vàng, không phải đỏ.
3. **`matched: null` khác `matched: false`.** `null` = không đối chiếu được;
   `false` = digest sai.

### Service ký hiện tại chưa có verify

Màn verify gọi `POST /api/v2/signatures/validate`. Signing Service ở
`localhost:8080` **không có** endpoint này — nó chỉ ký. Khi đó màn hình báo
`VERIFY_NOT_SUPPORTED` kèm hướng dẫn, không phải lỗi tệp. Trỏ địa chỉ API sang
service có verify (Sigil API) để dùng màn này.

Nút *Thêm vào allowlist và verify lại* (hiện khi issue là `OCSP_URL_NOT_ALLOWED`
/ `CRL_URL_NOT_ALLOWED`) gọi `POST /api/v1/revocation-allowlist` và cũng phụ
thuộc service đó. Bên signing-tool nút này ẩn/hiện theo quyền `trust:admin`;
ở đây không có xác thực nên luôn hiện.

## Cấu trúc

```
app/page.tsx                       màn ký (Server Component)
app/verify/page.tsx                màn verify
app/api/signing/**                 proxy sang backend, không gắn token
components/shell/page-chrome.tsx   khung chung: điều hướng + địa chỉ API + ngôn ngữ + theme
features/signing/
  api-base-url.ts                  base URL cấu hình trên giao diện (localStorage)
  sign-api.ts                      client của Signing Service
  sign-configuration.ts            dựng & validate request ký
  sign-record-store.ts             giữ phiên eSign Cloud + agreementUuid
  document-format.ts               nhận diện định dạng, quét chữ ký đích
  components/                      workspace, preview, hộp thoại phiên ký
features/verification/
  api.ts                           client verify + bảng dịch mã lỗi
  components/                      workspace verify (báo cáo, cây kiểm tra, chuỗi CA)
lib/server/sign-proxy.ts           chỗ DUY NHẤT chạm tới địa chỉ backend
lib/types/signing.ts               contract luồng ký
lib/types/verification.ts          contract luồng verify + adapter schema v2 → v1
lib/i18n/                          từ điển EN/VI
```

Hai contract **không** dùng chung enum định dạng: bên ký nói định dạng tài liệu
(`PDF/XML/WORD/EXCEL/POWERPOINT`), bên verify nói chuẩn chữ ký (`PADES/XADES/
OOXML`) và loại tệp theo đuôi (`DOCX/XLSX/PPTX`).

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
| `POST /api/signing/signatures/validate` | `POST /api/v2/signatures/validate` (multipart: `file`) |
| `POST /api/signing/revocation-allowlist` | `POST /api/v1/revocation-allowlist` |

Hai đường cuối thuộc màn verify và cần service có verify — xem mục *Màn verify*.
