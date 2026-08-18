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
| http://localhost:3000/external-sign#demo=1 | Ký bằng liên kết, cho người ngoài hệ thống |

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

## Màn ký ngoài hệ thống

`/external-sign` là màn ký cho người **không có tài khoản**: họ nhận một liên kết
`https://…/external-sign#t=RAW_TOKEN`, mở ra, đọc tài liệu và ký. Contract nằm ở
`docs/EXTERNAL_SIGNING_FRONTEND_INTEGRATION.md` của signing-service.

**Backend ĐÃ CÓ** (đo trên bản đang chạy 13/08/2026), dù tài liệu tự gọi mình là
*contract mục tiêu*: cả `/api/public/**` lẫn nhóm quản trị link `…/public-links` đều
trả về đúng hình dạng tài liệu mô tả. Luồng thật chạy được từ đầu tới cuối: phát link
ở màn chi tiết quy trình → mở link → đọc tài liệu → ký.

Vẫn giữ **chế độ mô phỏng** vì nó xem được những thứ luồng thật không cho xem rẻ:
năm màn báo link không dùng được, và hai trạng thái chỉ tới sau khi hết hạn hoặc có
người ký thật:

```
/external-sign#demo=1              phiên hợp lệ, ký được hết ba pha
/external-sign#demo=1&t=expired    link hết hạn
/external-sign#demo=1&t=invalid    token sai
/external-sign#demo=1&t=notcurrent chưa tới lượt ký
/external-sign#demo=1&t=signed     đã ký rồi
/external-sign#demo=1&t=changed    tài liệu đã đổi sau khi tạo link
```

Bản mô phỏng dựng cả tệp PDF hai trang ngay tại trình duyệt để khung chữ ký của
signature plan luôn khớp với khoảng trống trên giấy. Xoá nó là xoá
`features/external-signing/demo-session.ts`, `demo-document.ts`,
`app/external-sign/demo-ca/` và nhánh `readDemoFlag()` trong
`use-external-signing-session.ts` — không component nào phải sửa, vì chế độ mô
phỏng cắm vào `ExternalSigningTransport` chứ không vào giao diện.

### Quản trị link (§4)

Ở màn chi tiết quy trình (`/sign-request/workflows/{id}`), **người tạo** yêu cầu thấy
một khối *Link ký ngoài hệ thống* — mỗi người ký một khu vực: trạng thái người ký,
thứ tự, trạng thái link, hạn dùng, và các nút *Tạo link* / *Sao chép* / *Thu hồi* /
*Tạo link mới*. Người ký không thấy khối này: họ không phát link cho người khác, và
`tokenHint` của người khác cũng không phải thứ họ được đọc.

Ba điều đáng biết:

- **`url` chỉ tồn tại một lần.** Backend lưu hash của token, API danh sách luôn trả
  `url: null`. Nên sau khi tạo, đường dẫn nằm trong state của panel và không đi đâu
  khác — không `localStorage`, không toast (toast nằm lại lâu hơn người dùng nghĩ),
  không log. Nó tự biến mất khi link không còn dùng được.
- **"Tạo link mới" là thao tác phá huỷ**, nên luôn đi qua hộp thoại xác nhận: backend
  thu hồi link đang hoạt động trước khi tạo. Hộp thoại đó cũng là chỗ chọn hạn link
  (mặc định dịch vụ / 24 giờ / 3 ngày / 7 ngày).
- **Nút bị khoá luôn nói vì sao.** Chưa tới lượt, đã ký, đã từ chối, quy trình đã
  đóng — bốn lý do dẫn tới bốn việc khác nhau.

Khối này có một **công tắc bản dựng** (viền đứt): đổ vào panel những link giả sống
trong bộ nhớ trang, kèm hai lệnh *giả lập đã ký* / *giả lập hết hạn*. Nó tồn tại vì
`CONSUMED` và `EXPIRED` không tới được bằng cách bấm nút thật. Xoá cùng
`features/sign-request/public-link-preview.ts`.

#### Ba điều đo được trên dịch vụ đang chạy

1. **`createdAt` là `null` trong phản hồi của lần TẠO** (trong danh sách thì có thật).
   Vì thế thứ tự "mới nhất trước" không được dựa vào một mình trường đó — xem
   `compareLinksNewestFirst`. Lấy sai dòng đầu nghĩa là nút thu hồi trỏ vào một link
   đã chết.
2. **`tokenHint` là 8 ký tự CUỐI của token**, không phải 8 ký tự đầu. Đừng cắt chuỗi
   token để so khớp; so nguyên giá trị dịch vụ trả về.
3. **`url` mang domain do dịch vụ ký cấu hình** (`sign.example.vn` ở bản thử), không
   phải origin của trang này — panel cảnh báo khi hai bên khác nhau, vì link sao chép
   ra sẽ không mở được ở môi trường thử. Đây là mục 1 trong danh sách "cần chốt" ở §15
   của tài liệu.

#### Một lỗi 500 chưa giải thích được

`POST …/public-links` chạy tốt khoảng mười phút rồi **trả `500 INTERNAL_ERROR` cho
mọi signer**, kể cả signer chưa có link nào — trong khi `GET` và `revoke` vẫn bình
thường. Không tìm ra điều kiện dữ liệu nào giải thích được (đã thử: có/không link
`ACTIVE`, có/không thân `{ expiresAt }`, signer sạch ở một yêu cầu khác). Nghi dịch vụ
tự rơi vào trạng thái hỏng chứ không phải lệch contract, nhưng đó chỉ là phỏng đoán —
cần xem log backend.

Giao diện vì thế **không dịch mã này thành chẩn đoán nào**: nó hiện đúng câu dịch vụ
gửi về. Một câu như "hãy thu hồi link cũ trước" từng được thêm vào rồi bỏ đi, vì nó
dựa trên một tương quan tình cờ và sẽ chỉ người dùng đi sai đường.

### Năm điều khác hẳn ba màn còn lại

1. **Không có khung nội bộ.** `AppNavbar` tự ẩn trên `/external-sign` (danh sách
   `PUBLIC_PATH_PREFIXES`). Thanh đó chở tên các màn nghiệp vụ và ô địa chỉ dịch vụ
   ký — một bản đồ hệ thống mà liên kết ký bị chuyển tiếp sẽ mang theo.
2. **Địa chỉ backend KHÔNG cấu hình được từ giao diện.** Ba màn còn lại cho client
   đặt `X-Signing-Base-Url`; ở một trang mở cho người lạ, header đó là một endpoint
   để bất kỳ ai bắt máy chủ này gọi tới địa chỉ họ chọn. Luồng public chỉ đọc
   `SIGNING_API_URL` phía máy chủ, và thiếu nó thì trả
   `EXTERNAL_SIGNING_API_NOT_CONFIGURED`.
3. **Phiên là cookie, không phải header.** `lib/server/public-signing-proxy.ts`
   chuyển tiếp `Cookie` lên backend và `Set-Cookie` xuống trình duyệt, nguyên văn.
   Đường dẫn proxy cố ý trùng đường dẫn backend (`/api/public/...`) để thuộc tính
   `Path` của cookie vẫn đúng sau khi đi qua lớp này.
4. **Không có `X-Username`.** Danh tính người ký *chính là* cookie phiên; chuyển
   tiếp một header danh tính ở đây là mở đường giả lập người ký.
5. **Client không chọn gì thuộc về tài liệu.** Không gửi `signingRequestId`,
   `signerId`, tệp, toạ độ chữ ký, `signatureMode` hay `sessionId` — backend đọc lại
   tất cả từ phiên và ghi đè mọi toạ độ client gửi. `PublicSignRequest` trong
   `lib/types/external-signing.ts` vì thế hẹp hơn `SignRequestPayload`, và thiếu
   đúng những trường mà người ngoài hệ thống không được quyết định.

### Token và CSRF

Token nằm ở **URL fragment**, không phải query string: fragment không được gửi lên
server, không vào access log, không vào `Referer`. Nó được đọc đúng một lần, đổi lấy
phiên, rồi bị xoá khỏi thanh địa chỉ bằng `replaceState` (không `pushState` — nút
Back sẽ đưa người ký về đúng URL còn mang token). Token **không bao giờ** đi vào
`localStorage`/`sessionStorage`/IndexedDB.

CSRF token thì được phép nằm trong `sessionStorage`: một mình nó không ký được gì,
vì lệnh ký còn cần cookie `HttpOnly` mà JS không đọc nổi. Nó tồn tại để phiên sống
qua một lần F5. Mất CSRF nhưng còn cookie là một trạng thái riêng — **xem được tài
liệu, không ký được** — chứ không phải "link hỏng".

### Ba phương thức ký, và món nợ trong đó

`features/external-signing/method-model.ts` khai **hằng số** ba phương thức
(PKCS#12, MPKI App, eSign Cloud). Đây là chỗ duy nhất trong ứng dụng đoán khả năng
của backend thay vì đọc `/capabilities`, và có lý do: luồng public không có endpoint
capability nào, còn tài liệu tích hợp vẫn để ngỏ chính câu "phương thức nào được
phép cho người ngoài hệ thống" (§15, mục 4). Khi backend mở
`GET /api/public/signing-session/capabilities` thì xoá hằng số đó — đừng thêm
phương thức thứ tư vào bằng tay.

`baselineLevel` chốt ở `T` và không hỏi người ký: đó là một quyết định kỹ thuật họ
không có cơ sở nào để đưa ra. `USB_TOKEN` vắng mặt vì nó cần agent chạy trên máy
người ký và đi qua cặp endpoint nội bộ riêng.

### Cookie `Secure` khi thử cục bộ

Proxy **không** sửa thuộc tính cookie của backend. Nếu dịch vụ ký đặt `Secure`,
trình duyệt bỏ cookie đó trên `http://localhost` và phiên không giữ được — phải thử
trên https. Hạ `Secure` xuống cho chạy được ở máy mình là âm thầm làm yếu phiên ký
của production.

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
app/external-sign/page.tsx         màn ký công khai (ngoài login guard, không có navbar)
app/api/signing/**                 proxy sang dịch vụ ký, không gắn token
app/api/public/**                  proxy phiên ký công khai (chuyển tiếp cookie hai chiều)
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
features/sign-request/
  public-link-api.ts               phát/liệt kê/thu hồi link ký (API nội bộ, X-Username)
  public-link-preview.ts           kho link giả của công tắc bản dựng
  components/public-link-panel.tsx khối quản trị link ở màn chi tiết quy trình
features/external-signing/
  api.ts                           client `/api/public/*` (credentials: include, CSRF)
  session-store.ts                 token trong fragment, CSRF trong sessionStorage
  method-model.ts                  ba phương thức ký mở cho người ngoài + dựng payload
  use-external-signing-*.ts        khởi tạo phiên, tải tài liệu, máy trạng thái ký
  demo-session.ts                  chế độ mô phỏng (`#demo=1`) cho các màn lỗi
  components/                      khung riêng, khung chữ ký trên PDF, màn chờ, ba màn kết
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

Luồng ký ngoài hệ thống — **chỉ** `SIGNING_API_URL`, không nhận header địa chỉ; cookie
đi cả hai chiều:

| Frontend | Backend |
|---|---|
| `POST /api/public/signing-links/exchange` | `POST /api/public/signing-links/exchange` |
| `GET /api/public/signing-session` | `GET /api/public/signing-session` |
| `GET /api/public/signing-session/document` | tương ứng — nhị phân |
| `GET /api/public/signing-session/signature-plan` | tương ứng |
| `POST /api/public/signing-session/sign` | tương ứng (multipart: `request`, `p12File`) |

Quản trị link — API nội bộ, đòi `X-Username`:

| Frontend | Backend |
|---|---|
| `GET /api/workflow/signing-requests/{id}/signers/{signerId}/public-links` | tương ứng, không có `/api/workflow` |
| `POST` cùng đường dẫn | tương ứng — thân tuỳ chọn `{ expiresAt }`, trả `url` MỘT lần |
| `POST …/public-links/{linkId}/revoke` | tương ứng — `204 No Content` |

Dịch vụ verify (`VERIFY_API_URL` / `X-Verify-Base-Url`):

| Frontend | Backend |
|---|---|
| `POST /api/verify` | `POST /api/v1/verify` (multipart: `file`) |
| `GET /api/verify` | `GET /api/v1/verify` — chỉ để thăm dò, mong đợi 405 |
| `POST /api/verify/revocation-allowlist` | `POST /api/v1/revocation-allowlist` |
