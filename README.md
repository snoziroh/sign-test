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
| http://localhost:3000/sign-request | Tạo yêu cầu ký nhiều bước (bản dựng giao diện) |
| http://localhost:3000/verify | Thẩm định tệp đã ký |

Hai màn dùng chung địa chỉ API và chuyển qua lại bằng thanh điều hướng ở trên
cùng. Mỗi màn là một URL riêng nên mở song song hai tab được — ký ở tab này rồi
verify kết quả ở tab kia.

### Chọn môi trường dịch vụ

Ký và verify là **hai service riêng, hai địa chỉ riêng** — không phải hai
endpoint của cùng một service:

| Màn | Service | Cổng quen dùng | Header | Env dự phòng |
|---|---|---|---|---|
| Ký | signing-service | `:8080` | `X-Signing-Base-Url` | `SIGNING_API_URL` |
| Verify | verification-service | `:8082` | `X-Verify-Base-Url` | `VERIFY_API_URL` |

Mỗi màn hiện đúng địa chỉ nó gọi ở góc trên bên phải; đổi ở màn này không đụng
tới màn kia. Cách đổi giống nhau: bấm nút base URL → nhập địa chỉ → *Kiểm tra
kết nối* → *Lưu*. Giá trị nằm trong `localStorage` nên chuyển qua lại giữa
localhost / domain nội bộ / IP public không cần khởi động lại dev server.

`.env.local` chỉ còn là **giá trị dự phòng** khi chưa đặt gì trên giao diện:

```
SIGNING_API_URL=http://localhost:8080
VERIFY_API_URL=http://localhost:8082
```

Chưa có cả hai thì lời gọi trả `500 SIGNING_API_NOT_CONFIGURED` (bên ký) hoặc
`500 VERIFY_API_NOT_CONFIGURED` (bên verify).

*Kiểm tra kết nối* của màn verify thăm dò bằng `GET` vào chính đường verify:
endpoint có thật thì trả **405 Method Not Allowed**. Đủ để xác nhận địa chỉ mà
không gửi file nào lên và không tốn một lượt thẩm định.

Trình duyệt **không** gọi thẳng base URL đó: request luôn đi qua route
`/api/signing/*` và `/api/verify/*` của chính ứng dụng này. Nhờ vậy không vướng
CORS và dùng được với host chỉ cho phép gọi server-to-server.

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

## Màn tạo yêu cầu ký

`/sign-request` là **bản dựng giao diện**: không gọi dịch vụ nào, cả luồng sống
trong state của trang. Vì thế header của màn này không hiện ô địa chỉ API — hiện
một địa chỉ mà màn không gọi tới là nói dối về nơi dữ liệu sẽ đi.

Ba bước soạn — tài liệu → luồng ký → xác nhận — rồi chuyển sang màn theo dõi
tiến trình. Sơ đồ luồng lúc theo dõi là **đúng component** của lúc soạn, chỉ bỏ
phần kéo thả và đổi mỗi ô thành một chỉ báo trạng thái.

Mô hình khớp với `SignatureMode` của contract ký:

- **Bước 1 = `CO_SIGN`.** Mọi chữ ký trong một bước song song với nhau.
- **Bước 2 trở đi = `COUNTER_SIGN`.** Chữ ký ở bước N ký đè lên toàn bộ chữ ký
  của các bước 1…N-1, nên kéo đổi chỗ hai bước là đổi hẳn cây chữ ký.
- `targetSignatureId` **không** tồn tại lúc soạn — id chữ ký chỉ có sau khi chữ
  ký ở bước trước được tạo thật. Bản nháp chỉ mô tả quan hệ giữa các bước.

Kéo thả dùng HTML5 DnD thuần (không thêm thư viện). Nó không chạy trên cảm ứng
và không dùng được bằng bàn phím, nên **mọi thao tác kéo đều có một nút tương
đương**: nút `+` trên danh bạ thả người vào bước đang chọn, nút mũi tên đưa bước
lên/xuống, và ô chọn *Bước ký* trong hộp thoại cấu hình chuyển ô sang bước khác.

Hộp thoại cấu hình của một ô vẽ **khung chữ ký của những người ký khác** dưới
dạng mờ trên cùng trang PDF. Không thấy chúng thì hai chữ ký chồng lên nhau, và
lỗi đó chỉ lộ ra ở tệp cuối cùng — lúc cả hai người đã ký xong.

Màn tiến trình có một khối *Điều khiển bản dựng* (viền đứt) để mô phỏng người
tiếp theo ký. Nó tồn tại để xem được các trạng thái, và được dán nhãn rõ để
không ai tưởng màn hình đang nói chuyện với dịch vụ thật.

## Màn verify

`POST /api/v1/verify` của verification-service, multipart một part `file`. Thả
một tệp đã ký vào, nhận báo cáo thẩm định **schema 6.x**: kết luận mức tài liệu,
kết luận từng chữ ký, chín bước engine đã kiểm tra, chuỗi chứng thư, dấu thời
gian kèm chuỗi TSA riêng, manifest, danh sách issue và danh sách việc cần làm.

Sáu điều dễ đọc sai kết quả:

1. **HTTP 200 không có nghĩa chữ ký hợp lệ.** 200 chỉ nghĩa là verify chạy xong;
   kết luận nằm ở `mainIndication` / `subIndications`. Chữ ký hỏng vẫn trả 200.
2. **`INDETERMINATE` không phải lỗi của tệp.** Chữ ký đúng về mật mã nhưng thiếu
   dữ liệu để kết luận. Hay gặp nhất: `trustDomain.signer.anchorCount = 0` →
   không có trust anchor nào để dựng đường dẫn → `TRUST_STORE_EMPTY`. Đây là lỗi
   cấu hình verifier, không phải lỗi tệp — màn hình hiển thị vàng chứ không đỏ và
   **không** hiện nút "ký lại tài liệu".
3. **Hai con số chữ ký, không phải một.** `cryptographicallyValid` (đúng mật mã)
   tách khỏi `totalPassed` (đạt đầy đủ theo policy). Một tệp lành lặn chạy trên
   server chưa nạp trust anchor sẽ là 1 và 0 — gộp lại thành một con số là báo
   động giả.
4. **`matched: null` khác `matched: false`.** `null` = không đối chiếu được;
   `false` = digest sai.
5. **`NOT_EVALUATED` khác `INDETERMINATE`.** Cái đầu nghĩa là *chưa đi tìm* vì
   tiền đề bị chặn (`blockedByCheckIds` nói bước nào chặn), cái sau nghĩa là *đã
   tìm và không rõ*. Cùng với `NOT_APPLICABLE` / `UNSUPPORTED`, ba trạng thái
   "chưa chạy" hiển thị xám chứ không đỏ.
6. **`severity` không quyết định verdict, `fileNeedsResigning` quyết định CTA.**
   Một issue `ERROR` không tự làm chữ ký `TOTAL_FAILED`; và trust store rỗng là
   `ERROR` nhưng `fileNeedsResigning: false`.

Từ schema 6, body của backend không còn bọc envelope `{ data, meta }` như schema
5 nữa — root nhận thẳng `schemaVersion` / `run` / `data`. `app/api/verify/route.ts`
truyền nguyên body cho adapter, không bóc lớp nào thêm.

Chuỗi của TSA tách riêng khỏi chuỗi người ký vì một dấu thời gian chỉ dùng làm
mốc thời gian tin cậy khi **chính nó** neo được vào một anchor —
`usableAsProofOfExistence: false` nghĩa là có dấu thời gian nhưng chứng thư đang
được đánh giá tại thời điểm verify, không phải tại thời điểm ký.

### Dịch vụ ký không thẩm định được

Trỏ ô địa chỉ của màn verify vào một service chỉ biết ký thì màn hình báo
`VERIFY_NOT_SUPPORTED` — không phải lỗi tệp, mà là sai địa chỉ.

Nút *Thêm vào allowlist và verify lại* (hiện khi issue là `OCSP_URL_NOT_ALLOWED`
/ `CRL_URL_NOT_ALLOWED`) gọi `POST /api/v1/revocation-allowlist` trên **cùng
dịch vụ verify** — allowlist là cấu hình mạng của bên kiểm tra thu hồi. Bên
signing-tool nút này ẩn/hiện theo quyền `trust:admin`; ở đây không có xác thực
nên luôn hiện.

## Cấu trúc

```
app/page.tsx                       màn ký (Server Component)
app/sign-request/page.tsx          màn tạo yêu cầu ký (không gọi API)
app/verify/page.tsx                màn verify
app/api/signing/**                 proxy sang dịch vụ ký, không gắn token
app/api/verify/**                  proxy sang dịch vụ verify (+ adapter schema)
components/shell/page-chrome.tsx   khung chung: điều hướng + địa chỉ API + ngôn ngữ + theme
features/signing/
  api-base-url.ts                  base URL cấu hình trên giao diện (localStorage)
  sign-api.ts                      client của Signing Service
  sign-configuration.ts            dựng & validate request ký
  sign-record-store.ts             giữ phiên eSign Cloud + agreementUuid
  document-format.ts               nhận diện định dạng, quét chữ ký đích
  components/                      workspace, preview, hộp thoại phiên ký
features/sign-request/
  model.ts                         cây bước/ô chữ ký, kiểm tra bản nháp, dẫn xuất tiến trình
  directory.ts                     danh bạ người ký giả lập
  components/                      wizard, sơ đồ luồng (kéo thả), hộp thoại ô, màn tiến trình
features/verification/
  verify-base-url.ts               địa chỉ dịch vụ verify (localStorage) — tách khỏi bên ký
  api.ts                           client verify + bảng dịch mã lỗi
  components/                      workspace verify (báo cáo, cây kiểm tra, chuỗi CA) + ô địa chỉ
lib/server/sign-proxy.ts           chỗ DUY NHẤT chạm tới địa chỉ dịch vụ ký
lib/server/verify-proxy.ts         chỗ DUY NHẤT chạm tới địa chỉ dịch vụ verify
lib/types/signing.ts               contract luồng ký
lib/types/verification.ts          contract verify schema 6.x + adapter sang view model
lib/i18n/                          từ điển EN/VI
```

Hai contract **không** dùng chung enum định dạng: bên ký nói định dạng tài liệu
(`PDF/XML/WORD/EXCEL/POWERPOINT`), bên verify nói chuẩn chữ ký (`PADES/XADES/
OOXML`) và loại tệp theo đuôi (`DOCX/XLSX/PPTX`).

### Nếu dịch vụ thật bật xác thực trở lại

Chỉ cần sửa `signApiFetch` trong `lib/server/sign-proxy.ts` để gắn header
`Authorization` — không route handler nào biết tới token. `verifyApiFetch` gọi
lại chính hàm đó nên cả hai luồng cùng được.

## Đường API đang dùng

Dịch vụ ký (`SIGNING_API_URL` / `X-Signing-Base-Url`):

| Frontend | Backend |
|---|---|
| `GET /api/signing/capabilities` | `GET /api/v1/capabilities` |
| `POST /api/signing/sign` | `POST /api/v1/sign` (multipart: `request`, `file`, `p12File`) |
| `GET /api/signing/remote-ca/mpki/credentials?username=` | `GET /api/v1/remote-ca/mpki/credentials` |
| `GET /api/signing/remote-ca/mpki/credentials/{id}` | `GET /api/v1/remote-ca/mpki/credentials/{id}` |
| `POST /api/signing/remote-ca/fpt/enrollments` | `POST /api/v1/remote-ca/fpt/enrollments` |
| `POST /api/signing/remote-ca/fpt/enrollments/{uuid}/status` | tương ứng dưới `/api/v1` |

Dịch vụ verify (`VERIFY_API_URL` / `X-Verify-Base-Url`):

| Frontend | Backend |
|---|---|
| `POST /api/verify` | `POST /api/v1/verify` (multipart: `file`) |
| `GET /api/verify` | `GET /api/v1/verify` — chỉ để thăm dò, mong đợi 405 |
| `POST /api/verify/revocation-allowlist` | `POST /api/v1/revocation-allowlist` |
