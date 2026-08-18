// lib/i18n/dictionaries/vi.ts
import type { Dictionary } from "./en";

export const vi: Dictionary = {
  common: {
    cancel: "Huỷ",
    close: "Đóng",
    save: "Lưu",
    copy: "Sao chép",
    copied: "Đã sao chép",
    loading: "Đang tải…",
    loadMore: "Tải thêm",
    viewAll: "Xem tất cả",
    manage: "Quản lý",
    back: "Quay lại",
    continueLabel: "Tiếp tục",
    yes: "Có",
    no: "Không",
    unknown: "Không xác định",
    notConfigured: "Chưa cấu hình",
    configured: "Đã cấu hình",
    never: "Chưa từng",
  },

  routes: {
    home: {
      label: "Trang chủ",
      title: "Công cụ hỗ trợ ký của FIS CA",
      description: "Chọn màn để bắt đầu — ký, tạo yêu cầu ký, hoặc xác minh",
    },
    login: {
      label: "Đăng nhập",
      title: "Đăng nhập vào hệ thống Sigil",
      description: "Cách duy nhất để bạn đăng nhập vào hệ thống!",
    },
    dashboard: {
      label: "Tổng quan",
      title: "Tổng quan",
      description: "Tình trạng ký, xác minh & PKI trên toàn tổ chức",
    },
    sign: {
      label: "Ký",
      title: "Ký tài liệu",
      description:
        "Ký tài liệu với các chuẩn ký được lọc theo chính sách và nguồn khoá được quản trị",
    },
    signRequest: {
      label: "Yêu cầu ký",
      title: "Tạo yêu cầu ký",
      description:
        "Đính kèm tài liệu, sắp xếp ai ký ở bước nào, rồi phát yêu cầu đi",
    },
    verify: {
      label: "Xác minh",
      title: "Xác minh chữ ký",
      description:
        "Xác thực tính xác thực, toàn vẹn và giá trị pháp lý của tệp đã ký",
    },
    certificates: {
      label: "Kho chứng chỉ",
      title: "Kho chứng chỉ",
      description:
        "Kiểm kê, nhập, tin cậy và vòng đời cho mọi chứng chỉ trên nền tảng",
    },
    trustManagement: {
      label: "Quản lý gốc tin cậy",
      title: "Quản lý gốc tin cậy",
      description:
        "Quản trị CA tin cậy, phiên bản công bố và truy cập mạng kiểm tra thu hồi",
    },
    accountManagement: {
      label: "Tài khoản & phân quyền",
      title: "Quản lý tài khoản",
      description:
        "Tạo và bảo vệ tài khoản trong tenant, gán vai trò và kiểm soát quyền truy cập hiệu lực",
    },
    keyProviders: {
      label: "Quản lý nguồn khoá",
      title: "Quản lý nguồn khoá",
      description:
        "Kết nối và quản trị HSM, token, kho khoá và cloud KMS — khoá không bao giờ rời khỏi nơi lưu giữ",
    },
    developers: {
      label: "Nhà phát triển",
      title: "Công cụ dành cho nhà phát triển",
      description: "Thông tin xác thực API, sandbox và bộ công cụ kiểm tra chữ ký",
    },
    signingHistory: {
      label: "Lịch sử ký",
      title: "Lịch sử ký",
      description: "Xem lịch sử các phiên ký đã hoàn tất, thất bại và đang xử lý — tải file và thử lại",
    },
    systemLogs: {
      label: "Nhật ký hệ thống",
      title: "Nhật ký hệ thống",
      description: "Điều tra sự cố vận hành, hoạt động kiểm toán và toàn bộ dấu vết của một yêu cầu",
    },
  },

  nav: {
    keysAndCertificates: "Khoá & Chứng chỉ",
    administration: "Quản trị",
    developerDocs: "Tài liệu",
    primaryLabel: "Điều hướng chính",
    openMenu: "Mở menu điều hướng",
    closeMenu: "Đóng menu điều hướng",
    navigationTitle: "Điều hướng",
    backToHome: "Trang chủ",
    open: "Mở",
    home:"Trang chủ",
    openNavigation:"Mở menu điều hướng",
    openSettings:"Mở cài đặt",
    mobileNavigationTitle:"Điều hướng",
    mobileNavigationDescription:"Chuyển giữa các màn hình của ứng dụng.",
    settingsTitle:"Cài đặt",
    settingsDescription:"Thiết lập giao diện ứng dụng.",
    language:"Ngôn ngữ",
    languageDescription:"Ngôn ngữ hiển thị.",
    theme:"Giao diện",
    themeDescription:"Chế độ hiển thị sáng hoặc tối."
  },

  shell: {
    search: {
      trigger: "Tìm kiếm…",
      ariaLabel: "Tìm kiếm (mở bảng lệnh)",
    },
    commandPalette: {
      placeholder: "Tìm trang…",
      ariaLabel: "Tìm trang",
      dialogLabel: "Bảng lệnh",
      navigateGroup: "ĐIỀU HƯỚNG",
      noResults: (query: string) => `Không có trang nào khớp với “${query}”.`,
    },
    notifications: {
      ariaLabel: (unread: number) =>
        unread > 0 ? `Thông báo (${unread} chưa đọc)` : "Thông báo",
      panelTitle: "Thông báo",
      empty: "Không có thông báo.",
      severity: { danger: "Nghiêm trọng", warning: "Cảnh báo", info: "Thông tin" },
      markRead: "Đánh dấu đã đọc",
      markAllRead: "Đánh dấu tất cả đã đọc",
    },
    theme: {
      ariaLabel: "Giao diện màu",
      light: "Sáng",
      dark: "Tối",
      system: "Hệ thống",
    },
    language: {
      ariaLabel: "Ngôn ngữ",
    },
    account: {
      ariaLabel: (name: string) => `Tài khoản: ${name}`,
      panelLabel: "Tài khoản",
      sessionNote:
        "Đã đăng nhập — mọi thao tác đều được ghi nhận dưới danh tính này trong nhật ký kiểm toán.",
      logOut: "Đăng xuất",
      confirmTitle: "Đăng xuất khỏi Sigil?",
      confirmBody:
        "Bạn sẽ cần đăng nhập lại để tiếp tục ký, xác minh và quản lý chứng chỉ.",
      confirmCancel: "Huỷ",
      confirmSubmit: "Đăng xuất",
      confirmPending: "Đang đăng xuất…",
      confirmDialogLabel: "Xác nhận đăng xuất",
      unavailableLabel: "Không xác định được phiên đăng nhập",
    },
    backendStatus: {
      offlineTitle: "Không kết nối được với máy chủ Sigil",
      offlineDescription:
        "Một số dữ liệu có thể chưa hiển thị. Hệ thống sẽ tự kết nối lại.",
      retry: "Thử lại",
      checking: "Đang kiểm tra…",
      contentTitle: "Trang này cần máy chủ Sigil",
      contentDescription:
        "Không thể tải dữ liệu khi chưa kết nối được máy chủ. Nội dung sẽ tự hiển thị ngay khi backend sống lại — bạn không cần tải lại trang.",
    },
    shortcutHelp: {
      dialogLabel: "Phím tắt",
      title: "Phím tắt",
      close: "Đóng bảng phím tắt",
      items: [
        { keys: "Ctrl/⌘ K", action: "Mở bảng lệnh" },
        { keys: "?", action: "Hiển thị phím tắt" },
        { keys: "Esc", action: "Đóng bảng lệnh / trợ giúp / lớp phủ đang mở" },
      ],
      footer:
        "Tổ hợp phím đi nhanh (G rồi D/S/V/K/Y/T) được quy định trong tài liệu đặc tả UI cho giai đoạn sau.",
    },
    skipToContent: "Bỏ qua để đến nội dung chính",
    breadcrumbHome: "Trang chủ",
    toast: {
      regionLabel: "Thông báo",
      close: "Đóng thông báo",
    },
    flash: {
      loginSuccessTitle: "Đăng nhập thành công",
      loginSuccessDescription: "Chào mừng bạn quay lại Sigil.",
      logoutSuccessTitle: "Đã đăng xuất",
      logoutSuccessDescription: "Phiên làm việc đã kết thúc an toàn.",
    },
  },

  notFound: {
    eyebrow: "404 — Không tìm thấy",
    title: "Trang này không tồn tại",
    description: "Địa chỉ có thể sai, hoặc màn hình này chưa được xây dựng.",
    cta: "Về Tổng quan",
  },

  errorPage: {
    ariaLabel: "Lỗi trang",
    title: "Đã có lỗi xảy ra trên trang này",
    description:
      "Phần còn lại của ứng dụng không bị ảnh hưởng. Bạn có thể thử lại, hoặc dùng menu điều hướng phía trên để tiếp tục.",
    retry: "Thử lại",
  },

  auth: {
    left: {
      productLine: "NỀN TẢNG CHỮ KÝ SỐ",
      heading: "Ký, niêm phong và xác minh — không rời ranh giới bảo mật.",
      description:
        "Khóa riêng được giữ trong HSM. Mọi thao tác ký đều được đóng dấu thời gian và ghi vào nhật ký kiểm toán bất biến.",
    },
    right: {
      heading: "Đăng nhập",
      subheading: "Truy cập bảng điều khiển ký của bạn.",
    },
    sso: "Tiếp tục với SSO doanh nghiệp",
    passkey: "Đăng nhập bằng Passkey",
    comingSoon: "Sắp ra mắt — chưa được backend hỗ trợ",
    orEmail: "HOẶC EMAIL",
    emailLabel: "Email công việc",
    emailPlaceholder: "ban@congty.com",
    passwordLabel: "Mật khẩu",
    forgotPassword: "Quên mật khẩu?",
    forgotPasswordTitle: "Liên hệ quản trị viên để đặt lại mật khẩu — chưa có luồng tự phục vụ",
    showPassword: "Hiện mật khẩu",
    hidePassword: "Ẩn mật khẩu",
    rememberDevice: "Ghi nhớ thiết bị này trong 30 ngày",
    submit: "Đăng nhập",
    submitting: "Đang đăng nhập…",
    noAccount: "Chưa có tài khoản?",
    contactAdmin: "Liên hệ quản trị viên",
    tlsNote: "Kết nối được mã hóa TLS 1.3",
  },

  dashboard: {
    summaryAriaLabel: "Tổng quan nền tảng",
    kpis: {
      signaturesRecent: "Chữ ký · gần đây",
      signaturesTrend: "+12.4% so với kỳ trước",
      verificationSuccess: "Tỷ lệ xác minh thành công",
      checkedCount: (n: number) => `${n} đã kiểm tra`,
      activeJobs: "Yêu cầu đang xử lý",
      activeJobsDetail: "Đang chờ hoặc đang ký",
      blockedJobs: "Yêu cầu bị chặn",
      blockedJobsAttention: "Cần người vận hành xử lý",
      blockedJobsNone: "Không có yêu cầu ký bị chặn",
    },
    infraAlert: {
      unreachable: (name: string) => `${name} không thể kết nối.`,
      degraded: (name: string) => `${name} đang suy giảm hiệu năng.`,
      blockedDetail: (n: number) => `${n} yêu cầu ký hiện đang bị chặn.`,
      reviewHealth: "Kiểm tra tình trạng nhà cung cấp và các lần kết nối gần đây.",
      reviewProvider: "Kiểm tra nhà cung cấp",
    },
    signingVolume: {
      title: "Khối lượng ký",
      subtitle: "Số chữ ký thành công trong bảy ngày qua",
      rangeLabel: "7 ngày",
      ariaLabel: "Biểu đồ cột khối lượng ký trong bảy ngày qua",
      barTitle: (label: string, value: number) => `${label}: ${value}k chữ ký`,
      days: {
        Mon: "T2",
        Tue: "T3",
        Wed: "T4",
        Thu: "T5",
        Fri: "T6",
        Sat: "T7",
        Sun: "CN",
      },
    },
    verificationOutcomes: {
      title: "Kết quả xác minh",
      subtitle: "Phân bố kết quả theo chuẩn ETSI",
      ariaLabel: (valid: number, invalid: number, indeterminate: number) =>
        `${valid}% hợp lệ, ${invalid}% không hợp lệ, ${indeterminate}% chưa xác định`,
      valid: "Hợp lệ",
      indeterminate: "Chưa xác định",
      invalid: "Không hợp lệ",
      verifyAnother: "Xác minh tệp khác →",
    },
    certificateExpiration: {
      title: "Chứng chỉ sắp hết hạn",
      viewAll: "Xem tất cả",
      empty: "Không có chứng chỉ nào sắp hết hạn.",
      columns: { certificate: "Chứng chỉ", issuer: "Đơn vị cấp", expires: "Hết hạn", status: "Trạng thái" },
      daysSuffix: (n: number) => `${n} ngày`,
      expiring: "▲ Sắp hết hạn",
    },
    recentActivity: {
      title: "Hoạt động gần đây",
      justNow: "vừa xong",
      minutesAgo: (n: number) => `${n} phút trước`,
      hoursAgo: (n: number) => `${n} giờ trước`,
      daysAgo: (n: number) => `${n} ngày trước`,
      verifiedAs: (name: string, verdict: string) => `${name} được xác minh là ${verdict}`,
      job: {
        signed: (name: string) => `${name} đã ký thành công`,
        failed: (name: string) => `${name} ký thất bại`,
        blocked: (name: string) => `${name} đang bị chặn do nhà cung cấp không khả dụng`,
        signing: (name: string) => `${name} đang được ký`,
        queued: (name: string) => `${name} đang chờ xử lý`,
      },
    },
    infrastructureHealth: {
      title: "Tình trạng hạ tầng",
      manage: "Quản lý",
      latencyNa: "Chưa có độ trễ",
      latencyMs: (ms: number) => `Độ trễ ${ms}ms`,
      keys: (n: number) => `${n} khoá`,
      status: {
        online: "Trực tuyến",
        degraded: "Suy giảm",
        unreachable: "Không thể kết nối",
        "not-configured": "Chưa cấu hình",
      },
    },
    notifications: {
      title: "Thông báo",
      empty: "Không có thông báo.",
    },
  },

  sign: {
    banner: {
      title: "Bàn thử luồng ký",
      description:
        "Mọi lời gọi đi tới POST /api/v1/sign của dịch vụ ký đang chọn ở góc trên bên phải. Nguồn chữ ký, thuật toán và mức baseline lấy từ /capabilities của chính dịch vụ đó.",
    },
    resume: {
      title: "Phiên ký chưa hoàn tất",
      description: "Có một phiên ký eSign Cloud còn mở. Nối lại thay vì ký lại từ đầu?",
      descriptionWithFile: (name: string) =>
        `“${name}” đang có phiên ký còn mở. Nối lại thay vì ký lại từ đầu?`,
      resume: "Nối lại",
      dismiss: "Bỏ qua",
    },
    steps: {
      navLabel: "Các bước ký",
      stepOf: (current: number, total: number) => `Bước ${current} / ${total}`,
      back: "Quay lại",
      next: "Tiếp tục",
      lockedHint: "Hoàn tất các bước trước để mở bước này.",
      document: {
        label: "Tài liệu",
        description: "Định dạng tệp quyết định những nguồn chữ ký dùng được ở bước sau.",
      },
      source: {
        label: "Nguồn ký",
        description: "Nguồn không ký được định dạng này vẫn hiện ra, chỉ bị khoá kèm lý do.",
      },
      credential: {
        label: "Thông tin ký",
        description: "Những gì nguồn này cần ở bạn trước khi chạm được tới khoá riêng.",
      },
      signature: {
        label: "Chữ ký",
        description: "Mức baseline, thuật toán và cách chữ ký hiển thị trên tài liệu.",
      },
      review: {
        label: "Xác nhận",
        description: "Xem lại cấu hình, rồi gửi lệnh ký.",
      },
      summaryTitle: "Sẵn sàng ký",
      summaryDocument: "Tài liệu",
      summaryFormat: "Định dạng",
      summarySource: "Nguồn ký",
      summaryProfile: "Cấu hình",
      summaryAppearance: "Chữ ký hiển thị",
      summaryOn: "Bật",
      summaryOff: "Tắt",
      summaryUnset: "—",
      restart: "Ký lại từ đầu",
      restartHint:
        "Xoá tài liệu, khoá ký và mọi lựa chọn — trang trở về đúng trạng thái lúc mới mở. Mất luôn cả agreementUuid, nên lần ký eSign Cloud sau phải đăng ký lại: thêm một giao dịch bên FPT. Tải file đã ký về trước: nó chỉ tồn tại trong trang này.",
    },
    document: {
      sectionTitle: "Tài liệu",
      dropHere: "Kéo thả tài liệu vào đây",
      acceptedTypes: "PDF, XML, Word, Excel hoặc PowerPoint",
      chooseDocument: "Chọn tài liệu",
      backendNote: "Backend hiện chỉ hỗ trợ PDF, XML và OOXML (DOCX/XLSX/PPTX).",
      remove: (name: string) => `Xoá ${name}`,
      detectedType: "Loại phát hiện được",
      backendFormat: "Định dạng theo backend",
      unknownType: "Không xác định",
      boundaryTitle: "Ranh giới ký",
      boundaryText:
        "Tài liệu chỉ rời trình duyệt đúng một lần, trong multipart của lệnh ký. Việc băm, cấp phép và ký diễn ra tại dịch vụ ký và bên CA — khoá riêng không bao giờ đến trình duyệt.",
    },
    contentLabel: {
      pdf: "Tài liệu PDF",
      xml: "Tài liệu XML",
      ooxml: "Gói OOXML",
      raw: "Nội dung nhị phân",
      "large-file": "Tệp nhị phân lớn",
    },
    preview: {
      title: "Xem trước",
      signedTitle: "Tài liệu đã ký",
      signedBadge: "Đã ký",
      unknownType: "Loại không xác định",
      emptyTitle: "Chưa chọn tài liệu",
      emptyDescription: "Chọn một tài liệu để xem trước vùng ký.",
      unsupportedTitle: "Chức năng chưa khả dụng",
      unsupportedBody: (fileName: string) =>
        `${fileName} không thuộc PDF, XML hoặc OOXML — Sigil hiện chưa hỗ trợ ký các định dạng nhị phân khác.`,
      zoomOut: "Thu nhỏ",
      zoomIn: "Phóng to",
      zoomFit: "Vừa khung",
      resetPosition: "Đặt lại vị trí mặc định",
      signatureAreaLabel: (page: number) => `Vùng chữ ký — trang ${page}`,
      digitallySignedBy: "Được ký số bởi {signer}",
      resizeHandle: "Thay đổi kích thước vùng chữ ký",
      resizeHint: "Kéo để thay đổi kích thước",
      pdfNavAriaLabel: "Điều hướng trang PDF",
      previousPage: "Trang trước",
      nextPage: "Trang sau",
      pageLabel: "Trang",
      cannotRenderPdf: (error: string) => `Không thể hiển thị PDF: ${error}`,
      cannotRenderWord: (error: string) => `Không thể hiển thị Word: ${error}`,
      cannotRenderExcel: (error: string) => `Không thể hiển thị Excel: ${error}`,
      cannotRenderPowerPoint: (error: string) => `Không thể hiển thị PowerPoint: ${error}`,
      readingContent: "Đang đọc nội dung…",
      readingSpreadsheet: "Đang đọc bảng tính…",
      readingSlides: "Đang đọc nội dung slide…",
      slideLabel: (n: number) => `Slide ${n}`,
      noTextInSlide: "(không có văn bản)",
    },
    config: {
      configurationTitle: "Cấu hình chữ ký",
      baselineLevelLabel: "Mức baseline",
      timestampNote:
        "Baseline T LUÔN gọi TSA, không phụ thuộc cờ SIGNING_TSA_ENABLED. Nếu ký lỗi SIGNING_FAILED, thử lại với baseline B để tách bạch lỗi TSA khỏi lỗi ký.",
      algorithmLabel: "Thuật toán ký",
      /** Nhãn nhóm `<optgroup>`. Nhãn từng thuật toán lấy từ algorithmCatalog. */
      algorithmScheme: {
        RSASSA_PSS: "RSA-PSS (khuyến nghị)",
        RSA_PKCS1_V1_5: "RSA PKCS#1 v1.5 (tương thích rộng nhất)",
        ECDSA: "ECDSA (cần chứng thư khoá EC)",
      } as Record<string, string>,
      algorithmNone: "Nguồn này không khai báo thuật toán nào.",
      algorithmNoneForFormat: (format: string) =>
        `Nguồn này không ký được định dạng ${format}.`,
      algorithmFormatNote: (format: string) =>
        `${format} chỉ ký được bằng RSA PKCS#1 v1.5: ECMA-376 Part 2 không định nghĩa RSA-PSS hay ECDSA cho chữ ký gói, và Word/Excel không đọc được chúng. Đây là giới hạn của định dạng, không phải của dịch vụ ký.`,
      algorithmEcNote:
        "ECDSA cần chứng thư dùng khoá EC. Không kiểm tra trước được — loại khoá chỉ đọc được sau khi mở file khoá bằng mật khẩu. Chứng thư khoá RSA sẽ báo ALGORITHM_KEY_TYPE_MISMATCH lúc ký.",
      signatureTypeLabel: "Loại ký",
      coSign: "Đồng ký",
      counterSign: "Xác nhận ký",
      visibleSignature: "Chữ ký hiển thị (kéo khung trên bản xem trước)",
      appearanceUnsupported: "Định dạng này không có chữ ký hình ảnh; toạ độ bị bỏ qua.",
      documentNameLabel: "Tên tài liệu gửi cho CA",
      documentNamePlaceholder: "hop-dong.pdf",
      documentNameHint: "Hiện cho người ký lúc họ xác nhận. Bỏ trống thì lấy tên file đã chọn.",
      signFailedTitle: "Ký thất bại",
      signButton: "Ký tài liệu",
      downloadSignedFile: "Tải file đã ký",
    },
    result: {
      dialogLabel: "Đã ký xong",
      title: "Đã ký xong",
      subtitle: "Dịch vụ ký đã trả về tài liệu đã ký.",
      document: "Tài liệu",
      source: "Nguồn ký",
      profile: "Hồ sơ",
      inMemoryNote:
        "File đã ký chỉ nằm trong trang này: response mang nó về dưới dạng base64 và KHÔNG có endpoint nào tải lại được. Hãy tải xuống trước khi rời màn hình.",
      signAgainSameSignature: "Ký lại với chữ ký này",
      signAgainHint:
        "Ký lại sẽ giữ nguyên cấu hình chữ ký này và đưa bản xem trước về lại tài liệu chưa ký — kết quả ở trên bị bỏ đi. Cần thì tải nó về trước.",
      download: "Tải file đã ký",
    },
    source: {
      title: "Nguồn chữ ký",
      loading: "Đang tải danh sách nguồn chữ ký…",
      loadFailed: "Không tải được nguồn chữ ký từ địa chỉ API này.",
      retry: "Thử lại",
      empty: "Dịch vụ này không khai báo nguồn chữ ký nào.",
      unsupportedForFormat: (format: string) => `Không ký được file ${format}.`,
      interaction: {
        NONE: "Ký xong ngay trong request này, không phải xác nhận gì thêm.",
        APP_CONFIRMATION:
          "Request bị giữ tới khi người ký bấm xác nhận trên FPT MPKI App — đừng đóng tab.",
        REDIRECT_OTP:
          "Ba pha: người ký xác nhận danh tính, rồi nhập OTP trên trang của CA.",
        LOCAL_AGENT:
          "Trình duyệt làm việc với FPT-CA Signing Agent trên chính máy này; cửa sổ PIN là của FPT-CA, không phải của trang này.",
      },
    },
    pkcs12: {
      title: "File khoá PKCS#12",
      fileLabel: "File khoá (.p12 / .pfx)",
      chooseFile: "Chọn file khoá",
      noFile: "Chưa chọn file",
      passwordLabel: "Mật khẩu file khoá",
      passwordPlaceholder: "Bắt buộc",
      aliasLabel: "Alias",
      aliasPlaceholder: "Bỏ trống để tự chọn",
      aliasHint: "Bỏ trống thì provider lấy alias đầu tiên có private key.",
    },
    mpki: {
      title: "FPT MPKI App",
      usernameLabel: "Username người ký",
      usernamePlaceholder: "Tên đăng nhập MPKI App",
      loadCredentials: "Tải",
      loading: "Đang tải…",
      loadFailed: "Không tải được credential của người ký này.",
      credentialLabel: "Credential",
      chooseCredential: "Chọn credential",
      emptyTitle: "Không có credential",
      empty: "Không tìm thấy credential cho username này. Kiểm tra tên và MPKI_USER_ID_PREFIX.",
      multipleWarning:
        "Người ký có nhiều credential — kiểm tra kỹ: chọn nhầm là ký nhầm một danh tính pháp lý.",
      note: "Tên trên chữ ký lấy từ CN của chứng thư, không bao giờ lấy từ màn hình này.",
    },
    esign: {
      title: "FPT eSign Cloud (OTP)",
      signerNameNote:
        "Tên trên chữ ký lấy từ chứng thư CA cấp cho hồ sơ đăng ký này. Màn hình này không hỏi tên người ký.",
      agreementLabel: "agreementUuid",
      agreementIssued: "Do yêu cầu đăng ký cấp về",
      agreementEmpty:
        "Chưa có. Định danh này do CA cấp trong response của yêu cầu đăng ký bên dưới — không nhập tay được.",
      agreementHint:
        "Định danh người ký trên CA, lấy thẳng từ response đăng ký chứ không do người dùng gõ vào. Nó chỉ sống trong lượt ký này — trình duyệt không giữ lại gì, nên ký lại từ đầu là phải đăng ký lại, tức thêm một giao dịch bên FPT.",
      forget: "Xoá",
      agreementReady: "Đã xác nhận danh tính — chứng thư sẵn sàng",
      agreementRecreate: "Tạo lại agreement",
      agreementRecreateHint:
        "Tạo lại sẽ bỏ agreementUuid hiện tại và quay về bước đăng ký. Mỗi lần đăng ký là một giao dịch mới bên FPT.",
      enrollmentTitle: "Đăng ký chứng thư",
      personalNameLabel: "Họ tên",
      citizenIdLabel: "Số CCCD",
      mobileLabel: "Số điện thoại (nhận OTP)",
      emailLabel: "Email",
      locationLabel: "Quận / huyện",
      provinceLabel: "Tỉnh / thành phố",
      countryLabel: "Quốc gia",
      photosTitle: "Ảnh giấy tờ",
      photoFrontLabel: "CCCD mặt trước",
      photoBackLabel: "CCCD mặt sau",
      faceImageLabel: "Ảnh chân dung",
      photosHint:
        "Hai mặt CCCD là bắt buộc — thiếu thì hồ sơ không qua được bước xác nhận danh tính. Ảnh chân dung không bắt buộc, bỏ trống vẫn được gửi với giá trị rỗng. Ảnh được chuyển sang base64 ngay tại trình duyệt; ảnh lớn hơn 2 MB sẽ tự thu nhỏ trước khi gửi.",
      imageEmpty: "Chưa có ảnh",
      imageChoose: "Chọn ảnh",
      imageReplace: "Đổi ảnh",
      imageRemove: "Xoá ảnh",
      imageReading: "Đang xử lý…",
      imageProblem: {
        NOT_IMAGE: "Tệp này không phải ảnh.",
        TOO_LARGE: "Ảnh quá lớn, thu nhỏ hết cỡ vẫn vượt 2 MB. Hãy chọn ảnh nhẹ hơn.",
        UNREADABLE: "Không đọc được ảnh này. Định dạng HEIC của iPhone cần đổi sang JPG trước.",
      },
      privacyNote: "Dữ liệu cá nhân — gửi thẳng cho CA, trang này không lưu lại.",
      requiredLegend: "Trường bắt buộc",
      requiredMissing:
        "Điền đủ họ tên, số CCCD, số điện thoại, email và ảnh hai mặt CCCD để đăng ký được.",
      enroll: "Đăng ký và lấy agreementUuid",
      enrolling: "Đang đăng ký…",
      enrollDone: "Đã tạo đăng ký",
      enrollFailed: "Đăng ký thất bại",
      enrollHint:
        "Ký thẳng khi chưa có agreementUuid vẫn chạy — service tự đăng ký — nhưng response ký KHÔNG trả uuid về, nên lần ký sau lại đăng ký lại.",
      openSicUrl: "Mở trang xác nhận danh tính",
      confirmTitle: "Bước cuối: xác nhận danh tính",
      confirmBody:
        "Trang xác nhận mở ở cửa sổ riêng và tự đóng sau khi người ký xác nhận xong. Đóng xong, trang này tự kiểm tra trạng thái đăng ký một lần.",
      confirmCostWarning:
        "Lần kiểm tra tự động đó là một giao dịch bên FPT và trừ một lượt ký. Bấm mở trang là chấp nhận điều này.",
      confirmWaiting: "Đang chờ cửa sổ xác nhận đóng lại…",
      confirmPopupBlocked:
        "Trình duyệt đã chặn cửa sổ bật lên, nên không biết được lúc nào trang xác nhận đóng. Mở bằng liên kết dưới đây rồi tự bấm kiểm tra sau khi xác nhận xong.",
      confirmOpenManually: "Mở trang xác nhận ở tab mới",
      confirmCheckNow: "Đã xác nhận xong — kiểm tra (trừ 1 lượt ký)",
      confirmCheckAgain: "Kiểm tra lại (trừ 1 lượt ký)",
      advancedTitle: "Công cụ nâng cao",
      statusWarning:
        "Đây KHÔNG phải thao tác chỉ đọc: mỗi lần gọi là một giao dịch bên FPT và một lượt ký bị trừ. Bước CONTINUE đã báo PENDING_IDENTITY miễn phí rồi.",
      statusCheck: "Kiểm tra xác nhận danh tính",
      statusConfirm: "Xác nhận: chấp nhận trừ 1 lượt ký",
      statusChecking: "Đang kiểm tra…",
      statusFailed: "Không đọc được trạng thái đăng ký.",
    },
    usbToken: {
      title: "FPT USB Token",
      signerNameNote:
        "Tên trên chữ ký lấy từ CN của chứng thư được chọn trong token, không bao giờ lấy từ màn hình này.",
      checkAgent: "Kiểm tra Signing Agent",
      agentChecking: "Đang kiểm tra…",
      agentReady: (count: number) =>
        `Signing Agent đã phản hồi — tìm thấy ${count} chứng thư trong token.`,
      note: "FPT-CA Signing Agent phải đang chạy trên chính máy này ở localhost:14211. Trình duyệt gọi thẳng tới đó — không có thông tin nào của token đi qua dịch vụ ký.",
      algorithmNote:
        "Luồng này chỉ có ba lựa chọn RSA PKCS#1 v1.5. FPT-CA Signing Agent 1.3.1 không có tham số nào khai sơ đồ ký — /SignHash chỉ nhận hàm băm — nên chọn RSA-PSS hay ECDSA là chắc chắn hỏng ở bước cuối.",
      pinPolicyNote:
        "PIN chỉ được nhập trong cửa sổ của FPT-CA. Trang này không hỏi, không chuyển tiếp và không lưu PIN.",

      dialogTitle: "Ký bằng FPT USB Token",
      phase: {
        PREPARING: "Đang chuẩn bị tài liệu…",
        CONNECTING_AGENT: "Đang kết nối Signing Agent…",
        SELECTING_CERTIFICATE: "Chọn chứng thư",
        WAITING_FOR_PIN: "Đang chờ chữ ký…",
        COMPLETING: "Đang hoàn thiện PDF đã ký…",
      },
      phaseBody: {
        PREPARING: "Dịch vụ đang dựng digest để USB Token ký.",
        CONNECTING_AGENT: "Đang đọc chứng thư trong USB Token qua localhost:14211.",
        SELECTING_CERTIFICATE: "Chọn danh tính sẽ dùng để ký.",
        WAITING_FOR_PIN:
          "Nhập PIN trong cửa sổ FPT-CA vừa xuất hiện. Không thấy thì kiểm tra thanh taskbar.",
        COMPLETING: "Dịch vụ đang kiểm tra chữ ký và chèn vào PDF.",
      },
      pinNote:
        "Vui lòng nhập PIN trong cửa sổ FPT-CA vừa xuất hiện — tuyệt đối không nhập trên trang này.",
      chooseCertificate: "Chứng thư trong token",
      certificateIssuer: (issuer: string) => `Cấp bởi ${issuer}`,
      certificateValidity: (from: string, to: string) => `${from} → ${to}`,
      certificateNote:
        "Hiệu lực hiển thị theo đúng chuỗi agent trả về; dịch vụ ký đọc lại hiệu lực thật từ chính chứng thư.",
      certificateCounter: (current: number, total: number) => `${current} / ${total}`,
      previousCertificate: "Chứng thư trước",
      nextCertificate: "Chứng thư sau",
      goToCertificate: (position: number) => `Xem chứng thư thứ ${position}`,
      certificateSerial: (serial: string) => `Số sê-ri ${serial}`,
      signWithCertificate: "Ký với chứng thư này",
      noCertificates:
        "Không tìm thấy chứng thư dùng được. Kiểm tra USB Token đã cắm chưa và driver đã nhận thiết bị chưa.",
      retry: "Làm lại từ đầu",
      jobExpiresIn: (countdown: string) => `Phiên ký hết hạn sau ${countdown}`,
      jobExpired: "Phiên ký đã hết hạn — làm lại từ đầu.",
      jobAlgorithm: (label: string) => `Thuật toán của phiên ký: ${label}`,
      errorSchemeUnsupported: (label: string) =>
        `Dịch vụ ký đã chuẩn bị phiên này cho ${label}, nhưng FPT-CA Signing Agent 1.3.1 chỉ ký được RSA PKCS#1 v1.5. Ký tiếp sẽ hỏng ở bước cuối, nên đã dừng tại đây. Chọn một thuật toán RSA PKCS#1 v1.5 rồi ký lại.`,
      errorDigestUnsupported:
        "USB Token không ký được với hàm băm đã chọn. Thử lại với RSA PKCS#1 v1.5 / SHA-256 — thiết bị đời cũ thường chỉ làm được SHA-256.",
      errorUnreachable:
        "Không gọi được FPT-CA Signing Agent ở localhost:14211. Kiểm tra agent đang chạy, và trình duyệt có được phép truy cập mạng nội bộ không.",
      errorAgentToken:
        "Phiên của Signing Agent không còn hợp lệ — thường là do agent vừa khởi động lại. Hãy làm lại từ đầu.",
      errorCancelled: "Việc chọn chứng thư đã bị huỷ ở cửa sổ FPT-CA.",
      errorGeneric: "Ký bằng USB Token thất bại.",
    },
    target: {
      label: "Chữ ký đích",
      scanning: "Đang quét chữ ký có sẵn trong tài liệu…",
      choose: "Chọn chữ ký",
      none: "Không tìm thấy chữ ký nào trong file này. Counter-sign cần một tài liệu đã ký.",
      manual: "Id chữ ký đích",
      manualPlaceholder: "hoặc dán id, ví dụ sha256:…",
      hint:
        "Id được đọc từ chính file sắp nộp lên. PDF ký bằng công cụ khác dùng dạng sha256:<hex của CMS>.",
    },
    session: {
      appTitle: "Đang chờ xác nhận trên app",
      otpTitle: "Ký bằng eSign Cloud",
      subtitleWithFile: (source: string, fileName: string) => `${source} · ${fileName}`,
      working: "Đang làm việc với dịch vụ ký…",
      appWaiting: "Đang chờ người ký xác nhận…",
      appWaitingBody:
        "Mở FPT MPKI App và bấm xác nhận. Request được giữ tới lúc đó — đừng đóng tab này.",
      genericError: "Bước ký này không hoàn tất.",
      correlationId: (id: string) => `Mã tra cứu: ${id}`,
      sessionLostNote:
        "Phiên không còn: hoặc đã quá 15 phút, hoặc đã hoàn tất và bị xoá. Hãy ký lại từ đầu.",
      identityTitle: "Chờ xác nhận danh tính",
      identityBody:
        "Người ký phải mở trang của CA và xác nhận thông tin cấp chứng thư, rồi quay lại đây bấm tiếp.",
      identityDoneTitle: "Danh tính đã xác nhận",
      identityDoneBody:
        "Chứng thư đã sẵn sàng. Bước còn lại là mở giao dịch để CA gửi OTP — bấm nút bên dưới.",
      otpReadyTitle: "Sẵn sàng nhập OTP",
      otpReadyBody:
        "Bấm nút bên dưới để mở trang nhập OTP của CA ở cửa sổ riêng. Nhập OTP xong thì quay lại đây lấy file đã ký.",
      otpStageTitle: "Chờ nhập OTP",
      otpStageBody:
        "Người ký nhập OTP trên trang của CA. Đóng trang đó lại là ứng dụng tự lấy file đã ký — không tốn lượt ký.",
      otpIncomplete:
        "Trang OTP đã đóng nhưng chưa lấy được chữ ký: bước nhập OTP chưa thành công. Mở lại trang và nhập lại.",
      openIdentityUrl: "Mở trang xác nhận",
      openOtpUrl: "Mở trang nhập OTP",
      popupBlocked:
        "Trình duyệt đã chặn cửa sổ mới. Dùng liên kết bên dưới để mở trang ở tab mới.",
      billableWarning:
        "Bước tiếp theo TẠO GIAO DỊCH bên FPT: thêm một billCode, thêm một OTP, trừ một lượt ký. Chỉ bấm khi người ký đã xác nhận xong.",
      expiresIn: (value: string) => `Hết hạn sau ${value}`,
      expired: "Đã hết hạn",
      sessionIdLabel: "sessionId",
      close: "Đóng",
      continueBillable: "Người ký đã xác nhận — đi tiếp",
      continueFree: "Lấy file đã ký",
    },
    apiBaseUrl: {
      buttonTitle: "Địa chỉ dịch vụ ký",
      serverDefault: "Mặc định của máy chủ",
      title: "Địa chỉ dịch vụ ký",
      description:
        "Mọi lời gọi trên màn hình này đều đi tới địa chỉ đây. Đổi qua lại giữa localhost, domain nội bộ và IP public mà không phải khởi động lại dev server.",
      label: "Base URL",
      placeholder: "http://localhost:8080",
      emptyHint: "Bỏ trống để dùng SIGNING_API_URL trong biến môi trường của máy chủ.",
      errorScheme: "Chỉ nhận http:// hoặc https://.",
      errorMalformed: "URL không hợp lệ. Nhớ ghi cả scheme, ví dụ http://192.168.1.10:8080.",
      test: "Kiểm tra kết nối",
      testing: "Đang kiểm tra…",
      testOk: (count: number) => `Kết nối được — dịch vụ khai báo ${count} nguồn chữ ký.`,
      testFailed: "Không gọi được dịch vụ ký ở địa chỉ này.",
      save: "Lưu",
      cancel: "Huỷ",
      savedTitle: "Đã đổi địa chỉ API",
      proxyNote:
        "Trình duyệt không gọi thẳng địa chỉ này: request đi qua route của chính ứng dụng, nhờ vậy tránh được CORS và dùng được cả với host chỉ cho phép gọi server-to-server.",
    },
    status: {
      signing: "Đang ký…",
    },
    toast: {
      signSuccessTitle: "Ký tài liệu thành công",
      signFailedTitle: "Ký tài liệu thất bại",
      signFailedGeneric: "Yêu cầu ký không hoàn tất. Vui lòng thử lại.",
      missingDocument:
        "Dịch vụ báo COMPLETED nhưng không kèm tài liệu. Kiểm tra log dịch vụ theo mã tra cứu.",
      downloadSuccessTitle: "Đã tải file đã ký",
    },
    validation: {
      chooseDocument: "Chọn tài liệu cần ký.",
      unsupportedFormat: "Định dạng chưa hỗ trợ. Dùng PDF, XML, DOCX, XLSX hoặc PPTX.",
      chooseSource: "Chọn một nguồn chữ ký.",
      formatNotSupported: (source: string) => `${source} không ký được định dạng này.`,
      tooLarge: (limit: string) => `Tài liệu vượt giới hạn ${limit} của dịch vụ ký.`,
      algorithmUnsupported: "Thuật toán đang chọn không nằm trong danh sách nguồn này hỗ trợ.",
      algorithmUnsupportedForFormat: (format: string) =>
        `Nguồn này có thuật toán đang chọn, nhưng định dạng ${format} không chở được nó. Chọn một thuật toán RSA PKCS#1 v1.5, hoặc ký một tệp PDF/XML.`,
      baselineUnsupported: (level: string) => `Nguồn này không hỗ trợ mức baseline ${level}.`,
      chooseMode: "Chọn loại ký mà nguồn này hỗ trợ.",
      targetRequired: "Counter-sign cần id của một chữ ký đã có trong tài liệu.",
      p12FileRequired: "Chọn file khoá .p12 / .pfx.",
      p12PasswordRequired: "Mật khẩu file khoá là bắt buộc.",
      mpkiUsernameRequired: "Nhập username MPKI của người ký.",
      mpkiCredentialRequired: "Chọn credential dùng để ký.",
      enrollmentRequired:
        "Chưa có agreementUuid thì phần đăng ký cần họ tên, số CCCD, số điện thoại, email và ảnh hai mặt CCCD.",
      agreementRequired:
        "Hồ sơ đã điền xong nhưng chưa có chứng thư. Bấm “Đăng ký và lấy agreementUuid”, xác nhận danh tính, tới khi trạng thái READY thì mới ký được.",
      agreementNotReady:
        "Đăng ký vừa tạo chưa được xác nhận danh tính. Mở trang xác nhận ở khối eSign Cloud, xong rồi mới ký được.",
    },
  },

  signRequest: {
    /**
     * Danh tính người thao tác — giá trị của `X-Username`. Câu chữ ở đây phải
     * nói rõ nó KHÔNG phải đăng nhập: dịch vụ không xác thực gì cả, nên gõ tên
     * ai vào cũng được, và đó chính là điều người test cần biết.
     */
    actor: {
      title: "Thao tác dưới tên",
      description:
        "Mọi endpoint của quy trình ký đều đòi header X-Username. Dịch vụ ký không có xác thực, nên đây chỉ là cái tên mà yêu cầu được ghi sổ dưới đó — và cũng là cái tên quyết định ai đọc được tài liệu về sau.",
      label: "Tên người dùng",
      placeholder: "user123",
      hint: "Tối đa 128 ký tự. Không có gì được kiểm tra — không tài khoản nào được tạo hay tra cứu.",
      accessNote:
        "Tài liệu của một yêu cầu ký chỉ người tạo và những người được chỉ định ký mới đọc được. Đổi tên ở đây là có thể mất quyền xem những yêu cầu đã tạo dưới tên cũ.",
      buttonTitle: "Đổi tên người thao tác",
      unset: "Chưa chọn",
      save: "Lưu",
      savedTitle: "Đã lưu danh tính",
      required: "Chọn danh tính trước khi tạo yêu cầu.",
      requiredHint:
        "Dùng nút danh tính trên đầu trang. Thiếu X-Username thì dịch vụ từ chối mọi lời gọi của màn này.",
    },
    steps: {
      navLabel: "Các bước tạo yêu cầu",
      stepOf: (current: number, total: number) => `Bước ${current} / ${total}`,
      back: "Quay lại",
      next: "Tiếp tục",
      lockedHint: "Xong các bước trước thì bước này mới mở.",
      document: {
        label: "Tài liệu",
        description: "Tệp mà mọi người trong luồng sẽ ký. Định dạng của nó quyết định những gì cấu hình được ở bước sau.",
      },
      flow: {
        label: "Luồng ký",
        description: "Thêm người ký vào từng bước. Trong một bước mọi người ký song song; mỗi bước sau sẽ ký trên tài liệu chứa chữ ký của bước trước.",
      },
      review: {
        label: "Xác nhận",
        description: "Đặt tên yêu cầu, chọn hạn ký, rồi phát cho bước đầu tiên.",
      },
    },

    document: {
      title: "Tài liệu",
      dropHere: "Thả tài liệu vào đây",
      acceptedTypes: "PDF, XML, Word, Excel hoặc PowerPoint",
      choose: "Chọn tài liệu",
      note: "Chỉ PDF mới có chữ ký hiển thị đặt được lên trang. Các định dạng còn lại ký không kèm khung hiển thị.",
      remove: (name: string) => `Bỏ ${name}`,
      replace: "Đổi tệp",
      detectedFormat: "Định dạng",
      size: "Dung lượng",
      unknownFormat: "Không xác định",
      previewTitle: "Xem trước",
      previewEmpty: "Tải tài liệu lên để xem ở đây.",
      pdfOnlyPreview: "Màn này chỉ dựng bản xem trước cho PDF — luồng ký chạy y hệt với mọi định dạng được hỗ trợ.",
      boundaryTitle: "Tệp đi đâu",
      boundaryText:
        "Tài liệu được tải lên đúng một lần và nằm lại cùng yêu cầu. Mọi người ký trong luồng đều ký lên chính bản đó — không ai tải lại, và mỗi chữ ký chồng lên các chữ ký trước.",
    },

    flow: {
      palette: {
        title: "Người ký",
        hint: "Kéo một người thả vào bước ký, hoặc bấm nút thêm ngay trong bước.",
        searchLabel: "Tìm người ký",
        searchPlaceholder: "Tên, email hoặc phòng ban",
        empty: "Không ai khớp với từ khoá này.",
        systemGroup: "Tài khoản hệ thống",
        linkGroup: "Ngoài hệ thống",
        linkTitle: "Ký qua link xác thực",
        linkDescription: "Gửi một liên kết tới email. Người nhận xác thực rồi mới ký được.",
        linkBadge: "Link",
        dragHandle: (name: string) => `Kéo ${name} vào một bước ký`,
      },

      canvas: {
        title: "Luồng ký",
        stepLabel: (index: number) => `Bước ${index}`,
        stepNamePlaceholder: (index: number) => `Bước ${index} — chưa đặt tên`,
        renameLabel: (index: number) => `Tên của bước ${index}`,
        coSign: "Ký song song",
        counterSign: "Counter-sign",
        coSignHint: "Các chữ ký trong bước này song song với nhau — không cái nào ký đè cái nào.",
        counterSignNothing: "Chưa có chữ ký nào ở các bước trên để ký đè lên.",
        counterSignHint: (count: number, steps: number) =>
          `Ký đè lên ${count} chữ ký của ${steps === 1 ? "bước trước" : `${steps} bước trước`}.`,
        parallelStep: (n: number) => `${n} chữ ký song song`,
        ruleLabel: "Điều kiện xong",
        ruleAll: "Tất cả",
        ruleAny: "Bất kỳ ai",
        ruleAllHint:
          "Mọi người trong bước ký cùng lúc, và phải đủ chữ ký thì bước sau mới mở.",
        ruleAnyHint: "Một chữ ký là đủ để mở bước sau.",
        moveUp: (index: number) => `Đưa bước ${index} lên trên`,
        moveDown: (index: number) => `Đưa bước ${index} xuống dưới`,
        removeStep: (index: number) => `Xoá bước ${index}`,
        lastStepLocked: "Một yêu cầu ký phải có tối thiểu một bước.",
        dragStep: (index: number) => `Kéo bước ${index} để đổi thứ tự`,
        addSigner: "Thêm người ký",
        addStep: "Thêm bước ký",
        dropIntoStep: "Thả vào đây",
        newStepDrop: "Thả một người vào đây để mở bước mới",
        emptyStep: "Chưa có người ký",
        emptyStepHint: "Bấm Thêm người ký để đưa một người vào bước này.",
        signatureCount: (count: number) => `${count} chữ ký`,
        thenLabel: "rồi tới",
        /* Luồng khoá cấu trúc — nói LÝ DO, không chỉ nói trạng thái. */
        fromTemplate: "Do mẫu quy định",
      },

      slot: {
        unassigned: "Chọn người ký",
        unassignedHint: "Ô này đã giữ chỗ nhưng chưa gán ai.",
        roleHint: "Chỗ ký của mẫu — chọn người đứng vào.",
        configure: (name: string) => `Cấu hình chữ ký của ${name}`,
        remove: (name: string) => `Bỏ ${name} khỏi bước này`,
        removeEmpty: "Bỏ ô chữ ký trống này",
        drag: (name: string) => `Kéo ${name} sang bước khác`,
        linkBadge: "Link",
        visible: "Hiển thị",
        invisible: "Ẩn",
        pageLabel: (page: number) => `Trang ${page}`,
        incomplete: "Còn thiếu",
        slotCount: (count: number) => `${count} khung`,
      },

      summary: {
        steps: "Số bước",
        signatures: "Số chữ ký",
        widest: "Bước rộng nhất",
        widestValue: (count: number) => `${count} người song song`,
      },
    },

    config: {
      title: "Ô chữ ký",
      titleReadonly: "Chi tiết chữ ký",
      inStep: (index: number) => `Bước ${index}`,
      stepFieldLabel: "Bước ký",
      stepFieldHint: "Chuyển ô sang bước khác là đổi luôn những chữ ký mà nó ký đè lên.",
      close: "Xong",
      removeSlot: "Bỏ khỏi luồng ký",

      signerSection: "Ai ký",
      signerSystem: "Tài khoản hệ thống",
      signerLink: "Link xác thực",
      signerSwitchHint: "Người ký qua link không cần tài khoản — họ xác thực ngay trên link rồi ký.",
      searchPlaceholder: "Tìm trong danh bạ",
      noResults: "Không ai khớp với từ khoá này.",
      linkEmailLabel: "Địa chỉ email",
      linkEmailPlaceholder: "ten@congty.com",
      linkNameLabel: "Tên hiển thị",
      linkNamePlaceholder: "Hiện trên chữ ký và trong luồng",
      linkNote: "Link ký và bước xác thực của nó chưa được nối trong bản dựng này.",

      signatureSection: "Chữ ký",
      methodLabel: "Cách người ký xác thực",
      methodHintLink: "Qua link chỉ dùng được nguồn từ xa — USB token hay tệp .p12 cần chính máy của người ký.",
      method: {
        MPKI_APP: { label: "FPT MPKI App", hint: "Yêu cầu xác nhận hiện lên điện thoại của người ký." },
        ESIGN_OTP: { label: "FPT eSign Cloud", hint: "Xác nhận danh tính rồi nhập OTP. Mỗi lần bắt đầu trừ một lượt ký." },
        USB_TOKEN: { label: "USB token", hint: "Cần FPT-CA Signing Agent chạy trên máy của người ký." },
        PKCS12: { label: "Tệp PKCS#12", hint: "Người ký tự tải tệp .p12/.pfx và nhập mật khẩu lúc ký." },
      },
      algorithmLabel: "Thuật toán",
      algorithmHint: "Danh sách thật đến từ /capabilities của dịch vụ ký và được lọc theo định dạng tài liệu.",
      baselineLabel: "Mức baseline",
      baseline: {
        B: { label: "B — cơ bản", hint: "Chỉ có chữ ký, không có dấu thời gian." },
        T: { label: "T — có dấu thời gian", hint: "Gọi TSA. Cấu hình TSA sai thì hỏng ngay ở đây." },
        LT: { label: "LT — dài hạn", hint: "Nhúng kèm dữ liệu thu hồi." },
        LTA: { label: "LTA — lưu trữ", hint: "Thêm dấu thời gian lưu trữ cho thẩm định dài hạn." },
      },
      reasonLabel: "Lý do ký",
      reasonPlaceholder: "Phê duyệt với tư cách trưởng phòng",
      locationLabel: "Địa điểm",
      locationPlaceholder: "Hà Nội",

      appearanceSection: "Hiển thị",
      visibleLabel: "Khung chữ ký hiển thị",
      visibleHint: "Vẽ một khung chữ ký lên trang. Tắt đi thì chữ ký chỉ nằm trong cấu trúc tệp.",
      positionTitle: "Vị trí trên trang",
      positionHint: "Kéo khung để dời, kéo góc để đổi kích thước. Khung của những người ký khác hiện mờ để không đặt chồng lên nhau.",
      positionUnavailable: (format: string) =>
        `${format} không có lớp chữ ký hiển thị — vị trí không áp dụng. Chữ ký nằm trong cấu trúc tệp.`,
      positionNoDocument: "Đính kèm tài liệu trước rồi mới đặt được vị trí chữ ký.",
      resetPosition: "Đặt lại vị trí",
      pageOf: (current: number, total: number) => `Trang ${current} / ${total}`,
      previousPage: "Trang trước",
      nextPage: "Trang sau",
      currentPage: "Trang hiện tại",
      zoomOut: "Thu nhỏ",
      zoomIn: "Phóng to",
      fitWidth: "Vừa chiều rộng",
      otherSignerBox: (name: string) => `${name} — cùng trang`,
      renderFailed: (error: string) => `Không hiển thị được PDF: ${error}`,
    },

    review: {
      title: "Thông tin yêu cầu",
      nameLabel: "Tên yêu cầu",
      namePlaceholder: "Nghị quyết HĐQT quý 3",
      deadlineLabel: "Hạn ký",
      deadlineHint: "Không bắt buộc. Gần tới hạn thì hệ thống nhắc người ký.",
      messageLabel: "Lời nhắn cho người ký",
      messagePlaceholder: "Hiện trong thông báo và trên trang ký.",
      remindLabel: "Gửi nhắc nhở",
      remindHint: "Mỗi ngày một lần trong lúc còn chờ ký.",
      notifyLabel: "Báo cho tôi khi hoàn tất",
      notifyHint: "Một email khi bước cuối cùng ký xong.",

      documentSection: "Tài liệu",
      flowSection: "Luồng ký",
      flowSummary: (steps: number, signatures: number) => `${steps} bước · ${signatures} chữ ký`,

      readyTitle: "Sẵn sàng phát yêu cầu",
      readyBody: "Bước đầu tiên được báo ngay; các bước sau mở dần khi bước trước ký xong.",
      issuesTitle: "Cần sửa trước khi phát",
      issue: {
        NO_DOCUMENT: "Chưa đính kèm tài liệu.",
        NO_NAME: "Yêu cầu chưa có tên.",
        EMPTY_STEP: (index: number) => `Bước ${index} chưa có người ký nào.`,
        SLOT_WITHOUT_SIGNER: (index: number) => `Một ô chữ ký ở bước ${index} chưa gán ai.`,
        LINK_WITHOUT_EMAIL: (index: number) => `Một người ký qua link ở bước ${index} chưa có email.`,
        DUPLICATE_IN_STEP: (index: number, name: string) =>
          `${name} xuất hiện hai lần trong bước ${index}. Hai chữ ký song song của cùng một người không thêm giá trị nào.`,
        MISSING_VARIABLE: (label: string) => `Chưa điền “${label}”.`,
      },
      goToStep: (index: number) => `Tới bước ${index}`,
      submit: "Tạo yêu cầu ký",
      submitting: "Đang tạo…",
      backToFlow: "Quay lại luồng ký",
      submitFailed: "Chưa tạo được yêu cầu ký",
      retryNote:
        "Bấm lại vẫn dùng đúng khoá idempotency cũ, nên một yêu cầu thật ra đã được tạo sẽ được trả về chứ không bị nhân đôi.",
      localOnlyNote:
        "Chỉ tên yêu cầu, tài liệu và danh sách người ký được gửi lên dịch vụ. Hạn ký, lời nhắn và hai công tắc phía trên không có trường nào trong API — chúng ở lại trình duyệt này và mất khi tải lại trang.",
    },

    progress: {
      createdAt: (value: string) => `Tạo lúc ${value}`,
      documentLabel: "Tài liệu",
      deadlineLabel: "Hạn ký",
      noDeadline: "Không đặt hạn",
      status: {
        running: "Đang chạy",
        completed: "Hoàn tất",
        declined: "Bị từ chối",
        cancelled: "Đã huỷ",
      },
      progressLabel: (signed: number, total: number) => `${signed} / ${total} chữ ký`,
      waitingOnStep: (index: number) => `Đang chờ bước ${index}`,
      allSigned: "Mọi bước đã ký xong.",
      stepStatus: {
        done: "Xong",
        active: "Đang chờ",
        queued: "Chưa mở",
      },
      slotStatus: {
        signed: "Đã ký",
        pending: "Đang chờ ký",
        queued: "Chưa tới lượt",
        declined: "Đã từ chối",
      },
      signedAt: (value: string) => `Ký lúc ${value}`,
      download: "Tải tài liệu",
      cancelRequest: "Huỷ yêu cầu",
      newRequest: "Tạo yêu cầu mới",
      timelineTitle: "Diễn biến",
      timelineCreated: "Yêu cầu được tạo",
      timelineSigned: (name: string) => `${name} đã ký`,
      timelineStepDone: (index: number) => `Bước ${index} hoàn tất`,
      timelineCompleted: "Đã thu đủ chữ ký",
      timelineWaiting: (name: string) => `Đang chờ ${name}`,

      refresh: "Làm mới",
      refreshFailed: "Không đọc được trạng thái mới nhất",
      downloadFailed: "Không tải được tài liệu",
      previewWarnings: "Cảnh báo lúc dựng tài liệu",
      linkIssuedInDetail:
        "Link ký được phát cho từng người ký ở màn chi tiết quy trình — đó là chỗ duy nhất có mã người ký mà dịch vụ cần.",
      linkOpenDetail: "Quản lý link ký",
      localOnlyTitle: "Không lưu trên máy chủ",
      localOnlyHint:
        "Hạn ký, lời nhắn, công tắc nhắc nhở, luật hoàn tất của bước và cấu hình ký của từng ô đều không có trường nào trong API tạo yêu cầu. Chúng hiện ra từ bộ nhớ của trình duyệt này và mất khi tải lại trang — chữ ký và trạng thái thì đến từ dịch vụ.",
    },

    /**
     * Danh sách quy trình đã tạo và màn chi tiết mở từ đó.
     *
     * Khác `progress` ở LỐI VÀO chứ không ở nội dung: `progress` là màn hiện ra
     * ngay sau khi tạo yêu cầu, còn phần này là đường quay lại nó về sau — kể cả
     * từ một máy khác, kể cả bởi người ký chứ không phải người tạo. Câu chữ vì
     * thế phải đứng được một mình, không nhắc tới "vừa xong".
     */
    workflows: {
      tabs: {
        label: "Các phần của màn yêu cầu ký",
        list: "Quy trình",
        create: "Tạo yêu cầu",
      },

      list: {
        title: "Quy trình ký",
        description:
          "Những yêu cầu bạn tạo và những yêu cầu bạn được chỉ định ký. Dịch vụ chọn ra chúng bằng cách đọc X-Username, không bằng gì khác.",
        refresh: "Làm mới",
        create: "Tạo yêu cầu",
        searchLabel: "Tìm quy trình",
        searchPlaceholder: "Tìm theo tiêu đề",
        statusLabel: "Trạng thái",
        relationLabel: "Phần của tôi",
        allStatuses: "Mọi trạng thái",
        allRelations: "Tất cả",
        status: {
          DRAFT: "Nháp",
          IN_PROGRESS: "Đang chạy",
          COMPLETED: "Đã hoàn tất",
          CANCELLED: "Đã huỷ",
        },
        relation: {
          CREATOR: "Tôi tạo",
          SIGNER: "Tôi ký",
          CREATOR_AND_SIGNER: "Tôi tạo và ký",
        },
        source: {
          TEMPLATE_PREVIEW: "Từ mẫu",
          UPLOADED_DOCUMENT: "Tệp tải lên",
        },
        createdBy: (name: string) => `bởi ${name}`,
        createdAt: (value: string) => `Tạo ${value}`,
        updatedAt: (value: string) => `Cập nhật ${value}`,
        count: (total: number) => `${total} quy trình`,
        pageOf: (page: number, total: number) => `Trang ${page}/${total}`,
        prev: "Trước",
        next: "Sau",
        empty: "Chưa có quy trình nào",
        emptyHint:
          "Yêu cầu bạn tạo, và yêu cầu có người chỉ định bạn ký, sẽ hiện ở đây. Bắt đầu một cái ở thẻ Tạo yêu cầu.",
        noResults: "Không quy trình nào khớp bộ lọc.",
        noResultsHint:
          "Tìm kiếm và trạng thái do dịch vụ xử lý; “phần của tôi” chỉ lọc trong trang đang xem, vì API không có tham số cho nó.",
        relationFilterNote: "Chỉ lọc trong trang này — API không có tham số cho nó.",
        loadFailed: "Không tải được danh sách quy trình",
        retry: "Thử lại",
        actorRequired: "Chọn danh tính trước",
        actorRequiredHint:
          "Danh sách được dựng từ header X-Username — dịch vụ không có cách nào khác để biết phải trả về quy trình của ai. Dùng nút danh tính trên thanh tiêu đề.",
        open: "Mở",
      },

      detail: {
        back: "Tất cả quy trình",
        loading: "Đang mở quy trình…",
        loadFailed: "Không mở được quy trình này",
        loadFailedHint:
          "Một yêu cầu chỉ người tạo và những người được chỉ định ký mới đọc được. Kiểm tra danh tính trên thanh tiêu đề trước khi kết luận là yêu cầu không còn.",
        serverOnlyTitle: "Dựng lại từ dịch vụ",
        serverOnlyHint:
          "Tên bước, luật hoàn tất, hạn ký và cấu hình ký của từng ô chưa bao giờ được gửi lên dịch vụ, nên chúng không hiện ở đây. Mọi thứ trên màn này đến từ GET /api/signing-requests/{id}.",

        assignment: {
          title: "Phần của bạn",
          none: "Bạn không phải người ký trong quy trình này.",
          noneHint: "Nó hiện ra vì bạn là người tạo.",
          stepLabel: (index: number) => `Bước ${index}`,
          waiting: "Đang chờ chữ ký của bạn",
          notYourTurn: "Một bước trước đó chưa ký xong.",
          signed: (value: string) => `Bạn đã ký ${value}`,
          declined: "Bạn đã từ chối quy trình này.",
          sign: "Ký ngay",
          signFailed: "Không giành được quyền ký",
          decline: "Từ chối",
          lockedTitle: "Đang có người khác ký",
          lockedBody: "Chờ lượt ký đó hoàn tất thì bạn mới ký được.",
          lockedByBody: (holder: string) =>
            `${holder} đang ký. Chờ lượt ký đó hoàn tất thì bạn mới ký được.`,
        },

        cancel: "Huỷ quy trình",
        remind: "Gửi nhắc nhở",
        cancelConfirmTitle: "Huỷ quy trình này?",
        cancelConfirmBody:
          "Thao tác này dừng quy trình cho tất cả mọi người. Người ký chưa ký sẽ không ký được nữa, và không thể hoàn tác.",
        cancelConfirmAction: "Huỷ quy trình",
        cancelConfirmDismiss: "Giữ nguyên",
        cancelDone: "Đã huỷ quy trình",
        cancelFailed: "Không huỷ được quy trình",

        declineConfirmTitle: "Từ chối ký?",
        declineConfirmBody:
          "Thao tác này dừng cả quy trình cho tất cả mọi người, không chỉ phần của bạn, và không thể hoàn tác.",
        declineConfirmAction: "Từ chối",
        declineConfirmDismiss: "Giữ nguyên chờ ký",
        declineDone: "Đã từ chối",
        declineFailed: "Không từ chối được",

        links: {
          title: "Link ký ngoài hệ thống",
          intro:
            "Mỗi người ký một link, dành cho người không có tài khoản. Một link chỉ ký được đúng một chữ ký và chỉ dùng được bởi người ký nó được phát cho.",
          loading: "Đang đọc danh sách link…",
          noLink: "Chưa phát link nào",
          order: (position: number) => `Người ký thứ ${position}`,
          tokenHintLabel: "Mã nhận dạng link",

          signerTurn: "Đang tới lượt — phát link được ngay.",
          signerWaiting: "Còn người ký trước chưa xong.",
          signerSigned: "Đã ký.",
          signerDeclined: "Đã từ chối ký.",

          status: {
            ACTIVE: "Đang hoạt động",
            EXPIRED: "Đã hết hạn",
            REVOKED: "Đã thu hồi",
            CONSUMED: "Đã dùng",
          },
          expiresAt: (value: string) => `Hết hạn ${value}`,
          expiredAt: (value: string) => `Hết hạn từ ${value}`,
          revokedAt: (value: string) => `Thu hồi lúc ${value}`,
          consumedAt: (value: string) => `Đã ký lúc ${value}`,

          create: "Tạo link",
          recreate: "Tạo link mới",
          revoke: "Thu hồi",
          copy: "Sao chép link",
          hideUrl: "Ẩn",
          history: (count: number) => `${count} link trước đó`,

          createTitle: "Tạo link ký",
          createConfirm: "Tạo link",
          recreateTitle: "Tạo link ký mới",
          recreateConfirm: "Thay link hiện tại",
          recreateWarning:
            "Tạo link mới sẽ làm link đang hoạt động mất hiệu lực. Nếu bạn đã gửi link đó đi, người nhận sẽ phải dùng link mới.",
          expiryLabel: "Thời hạn",
          expiry: {
            default: "Mặc định của hệ thống",
            h24: "24 giờ",
            d3: "3 ngày",
            d7: "7 ngày",
          },
          expiryHint:
            "Hạn càng ngắn càng an toàn: ai giữ link cũng ký được thay người ký này cho tới khi link hết hạn.",

          freshTitle: "Link — chỉ hiện một lần",
          foreignDomain: (origin: string) =>
            `Link trỏ tới ${origin} — đó là domain mà dịch vụ ký được cấu hình để phát trang ký công khai. Hãy chắc địa chỉ đó thật sự phục vụ trang ký trước khi gửi đi.`,
          freshHint:
            "Đường dẫn này không được lưu ở đâu và không hiện lại được. Hãy sao chép và gửi cho người ký ngay; nếu mất, phải tạo link mới.",

          copyFailed: "Không sao chép được",
          copyFailedHint:
            "Trình duyệt chặn quyền truy cập clipboard. Hãy chọn đường dẫn ở trên và sao chép bằng tay.",
          createFailed: "Không tạo được link",
          createdWithoutUrl: "Link đã tạo nhưng không có đường dẫn",
          createdWithoutUrlHint:
            "Dịch vụ tạo được link nhưng không trả về URL, nên không có gì để gửi đi. Kiểm tra phản hồi của API tạo link trước khi tạo thêm.",
          revoked: "Đã thu hồi link",
          revokedHint: "Link không còn ký được nữa. Tạo link mới nếu người ký vẫn cần.",
          revokeFailed: "Không thu hồi được link",
          loadFailed: "Không đọc được danh sách link",

          blockedRequestClosed: "Quy trình đã đóng nên không phát thêm link được.",
          blockedSigned: "Người này đã ký xong.",
          blockedDeclined: "Người này đã từ chối, link phát ra cũng không dùng được.",
          blockedNotTurn:
            "Chưa tới lượt người này. Dịch vụ từ chối phát link cho người chưa ký được — hãy phát sau khi các bước trước hoàn tất.",

          endpointMissing: "Dịch vụ này không có endpoint quản trị link",
          endpointMissingHint:
            "GET/POST /api/signing-requests/{id}/signers/{signerId}/public-links và endpoint thu hồi của nó trả về 404. Trỏ trang sang một dịch vụ có chúng, hoặc bật bản dựng bên dưới để xem giao diện.",

          previewToggle: "Bản dựng — link giả",
          previewToggleHint:
            "Đổ vào khối này những link chỉ sống trong bộ nhớ trang. Dùng nó để xem hai trạng thái hết hạn và đã dùng — link thật chỉ tới đó sau khi hết hạn hoặc có người ký. Không có gì được gửi đi và không có gì sống qua lần tải lại trang.",
          previewConsume: "Giả lập: người ký đã ký",
          previewExpire: "Giả lập: link hết hạn",
        },

        /**
         * Thao tác chưa có endpoint. Nói ra ĐÚNG endpoint còn thiếu và đúng chỗ
         * phải sửa: người test bàn thử này cũng là người sẽ nối API vào.
         */
        missing: {
          title: "Thao tác này chưa có endpoint",
          remind:
            "Dịch vụ không gửi thông báo nào cả. Điền ENDPOINTS.remind trong features/sign-request/workflow-actions.ts khi endpoint đó có.",
        },
      },

      /**
       * Trang ký một ô của quy trình — `/sign-request/workflows/{id}/sign`.
       *
       * Nhánh riêng chứ không nằm trong `detail` nữa: nó là câu chữ của MỘT
       * TRANG, và trang đó có những thứ một hộp thoại chưa từng có (thanh tiến
       * trình, màn chặn, khối tài liệu). Người đọc là người ký NỘI BỘ nên câu
       * chữ được phép nói về quy trình và người soạn — khác `externalSign.*`,
       * nơi người đọc là khách.
       */
      sign: {
        title: "Ký phần của bạn",
        subtitle: (signer: string, document: string) => `${signer} · ${document}`,
        back: "Về quy trình",

        loading: "Đang mở lượt ký của bạn…",
        loadFailed: "Không mở được lượt ký này",
        retry: "Thử lại",

        steps: {
          navLabel: "Các bước ký",
          stepOf: (current: number, total: number) => `Bước ${current}/${total}`,
          lockedHint: "Xong các bước trước thì bước này mới mở.",
          review: {
            label: "Đọc",
            title: "Đọc tài liệu",
            description:
              "Đây là bản bạn sắp ký. Những người ở bước sau sẽ ký chồng lên chính bản này.",
          },
          method: {
            label: "Cách ký",
            title: "Cách ký",
            description: "Chọn đúng loại chứng thư bạn đang có trong tay.",
          },
          credential: {
            label: "Thông tin",
            title: "Thông tin chứng thư",
            description: "Thứ mà cách ký vừa chọn cần, trước khi nó chạm được tới khoá riêng.",
          },
          sign: {
            label: "Ký",
            title: "Ký tài liệu",
            description: "Xem lại một lượt, rồi ký.",
          },
        },

        consent: {
          checkbox: "Tôi đã đọc tài liệu này và đồng ý ký",
          hint:
            "Chữ ký của bạn được áp vào đúng bản đang hiện ở bên trái, và được ghi nhận theo tên đăng nhập của bạn.",
          scrollNote: "Đọc hết tài liệu trước khi ký — ký rồi thì không rút lại được ở màn này.",
        },

        summary: {
          title: "Bạn đang ký cái gì",
          documentLabel: "Tài liệu",
          signerLabel: "Ký với tư cách",
          stepLabel: "Bước",
          step: (index: number) => `Bước ${index}`,
          statusPending: "Đang chờ chữ ký của bạn",
          statusSigned: "Đã ký",
          statusDeclined: "Đã từ chối",
          checksumLabel: "Mã kiểm tra tài liệu",
          checksumHint:
            "Đối chiếu với mã hiện trên màn quy trình để chắc đây đúng là tệp đó.",
        },

        planTitle: "Chỗ bạn sẽ ký",
        planLoading: "Đang đọc vị trí chữ ký…",
        planSummary: (count: number, pages: number[]) =>
          `${count} ô chữ ký · trang ${pages.join(", ")}`,
        planEmpty: "Quy trình không đặt ô chữ ký nào cho bạn.",
        planHint:
          "Vị trí do quy trình quyết định, không sửa được ở đây. Dịch vụ đọc lại chúng lúc ký.",
        planFailed: "Không đọc được vị trí chữ ký",
        planRetry: "Thử lại",

        capabilitiesLoading: "Đang đọc các cách ký khả dụng…",
        capabilitiesFailed: "Không đọc được các cách ký",

        methodTitle: "Cách ký",
        methodNote:
          "Đây là những nguồn chữ ký dịch vụ đang bật, cộng thêm USB Token. Chọn USB Token thì FPT-CA Signing Agent phải đang chạy trên chính máy này.",
        credentialTitle: "Thông tin chứng thư",

        sourceLabel: "Nguồn chữ ký",
        algorithmLabel: "Thuật toán",
        baselineLabel: "Mức baseline",

        action: {
          needConsent: "Xác nhận bạn đã đọc tài liệu trước đã.",
          needMethod: "Chọn cách bạn muốn ký.",
          needFields: "Điền nốt thứ mà cách ký vừa chọn cần.",
          reloadingDocument: "Đang chờ bản tài liệu mới…",
        },

        sign: "Ký tài liệu",
        signing: "Đang ký…",

        failedTitle: "Ký không thành công",

        staleTitle: "Tài liệu vừa thay đổi",
        staleBody:
          "Một người cùng bước đã ký xong trước bạn, nên bản tài liệu đã khác. Chưa có gì của bạn bị mất — bấm ký lại là được.",

        resumeTitle: "Đang có một lượt ký chưa xong",
        resumeBody:
          "Lượt ký trước của bạn vẫn mở ở dịch vụ ký (thường là do tải lại trang giữa chừng). Hãy tiếp tục lượt đó thay vì bắt đầu lại — bắt đầu lại chỉ nhận về đúng thông báo này.",
        resumeUsbBody:
          "Bạn còn một lượt ký đang mở ở dịch vụ ký, và dịch vụ chỉ cho mở một lượt mỗi lần. Lượt ký bằng USB Token thì không nối lại được từ đây: hãy ký nốt ở tab đã bắt đầu nó, hoặc chờ phiên đó hết hạn (15 phút) rồi ký lại từ đầu.",
        resume: "Tiếp tục lượt ký",

        signedTitle: "Đã ký xong",
        signedBody:
          "Chữ ký của bạn đã được ghi vào tài liệu của quy trình. Những người ở bước sau sẽ ký trên bản này.",

        /** Màn chặn — mỗi lý do một câu trả lời khác nhau. */
        blocked: {
          title: "Bạn chưa ký được lúc này",
          NOT_A_SIGNER: {
            title: "Bạn không phải người ký trong quy trình này",
            body:
              "Lượt ký này của người khác, hoặc danh tính trên thanh tiêu đề không phải danh tính mà quy trình đã chỉ định. Kiểm tra danh tính trước khi kết luận là có gì đó sai.",
          },
          SIGNER_NOT_FOUND: {
            title: "Lượt ký đó không tồn tại",
            body:
              "Đường dẫn mang theo một người ký mà quy trình này không có. Hãy mở quy trình rồi bấm nút Ký ngay ở khối “Phần của bạn”.",
          },
          SIGNER_MISSING: {
            title: "Đường dẫn không nói rõ phải ký ô nào",
            body:
              "Một người có thể đứng ở hai bước khác nhau trong cùng một quy trình, nên trang này cần biết bạn định ký lượt nào. Hãy mở quy trình rồi bấm nút Ký ngay ở khối “Phần của bạn”.",
          },
          NOT_YOUR_TURN: {
            title: "Một bước trước đó chưa ký xong",
            body:
              "Quy trình ký theo CẤP: bạn ký được khi mọi người bắt buộc ở các cấp trước đã xong. Từ giờ tới lúc đó bạn không phải làm gì cả.",
          },
          ALREADY_SIGNED: {
            title: "Bạn đã ký phần này rồi",
            body: "Chữ ký của bạn đã nằm trong tài liệu. Ở đây không còn việc gì nữa.",
          },
          DECLINED: {
            title: "Bạn đã từ chối quy trình này",
            body: "Việc từ chối không rút lại được từ màn này.",
          },
          REQUEST_CANCELLED: {
            title: "Quy trình này đã bị huỷ",
            body: "Quy trình đã huỷ thì không ai ký được nữa, tới lượt ai cũng vậy.",
          },
          REQUEST_COMPLETED: {
            title: "Quy trình này đã hoàn tất",
            body: "Mọi người đã ký xong. Tài liệu hoàn chỉnh nằm ở màn quy trình.",
          },
          LEASE_TOKEN_MISSING: {
            title: "Phiên ký này không hợp lệ",
            body: "Trang này không được mở qua nút Ký ngay ở màn quy trình, hoặc phiên đã hết hạn. Quay lại và bấm Ký ngay lại từ đầu.",
          },
        },
      },
    },

    template: {
      signatureCount: (count: number) => `${count} chữ ký`,
      stepCount: (count: number) => `${count} bước`,
      variableCount: (count: number) => `${count} ô cần điền`,

      source: {
        label: "Tài liệu lấy từ đâu",
        uploadTab: "Tải tệp lên",
        templateTab: "Dùng mẫu",
      },

      picker: {
        title: "Mẫu có sẵn",
        detailTitle: "Chi tiết mẫu",
        detailEmpty: "Chọn một mẫu để xem luồng ký và các ô phải điền của nó.",
        searchPlaceholder: "Tìm mẫu",
        refresh: "Tải lại",
        create: "Tạo mẫu",
        edit: "Sửa",
        duplicate: "Nhân bản",
        delete: "Xoá",
        confirmDelete: (name: string) => `Xoá “${name}”? Không khôi phục lại được.`,
        loadFailed: "Không tải được danh sách mẫu",
        version: (versionNo: number) => `b${versionNo}`,
        publishedNote:
          "Mẫu được soạn bên dịch vụ: tải tệp lên, cấu hình các ô phải điền và các vai ký, rồi publish một phiên bản. Màn này dùng bản đã publish — số chỗ ký, thứ tự bước và vị trí khung chữ ký lấy từ đó và không sửa được ở đây.",
        previewUnavailable: "Mẫu này chưa dựng được bản xem trước.",
        empty: "Chưa có mẫu nào đang phục vụ",
        emptyHint:
          "Một mẫu chỉ hiện ở đây sau khi có ít nhất một phiên bản được publish. Tải tài liệu lên và publish bên dịch vụ, rồi tải lại danh sách.",
        noResults: "Không có mẫu nào khớp.",
        untitled: "Mẫu chưa đặt tên",
        noDescription: "Chưa có mô tả.",
        builtIn: "Dựng sẵn",
        unnamedRole: "Chỗ ký chưa đặt tên",
        flowSection: "Luồng ký",
        variablesSection: "Các ô phải điền",
        noVariables: "Mẫu này không có ô nào phải điền.",
        deadlineNote: (days: number) => `Hạn ký đặt sau ngày tạo yêu cầu ${days} ngày.`,
        applied: (name: string) => `Đã áp mẫu: ${name}`,
        appliedBody: (signatures: number, variables: number) =>
          `${signatures} chỗ ký và ${variables} ô cần điền đã sẵn. Chọn ai đứng vào từng vai — bản thân các vai thì do mẫu chốt.`,
        detached: "Đã bỏ mẫu — luồng ký dựng lại từ đầu, vì vai của mẫu không gửi kèm một tệp tự tải lên được.",
      },

      variables: {
        label: "Điền thông tin",
        description:
          "Điền những chỗ trống mà mẫu để lại. Giá trị đi thẳng vào tài liệu, nên mọi người ký lên đúng bản đã hoàn chỉnh.",
        title: "Thông tin trong tài liệu",
        progress: (filled: number, total: number) => `Đã điền ${filled}/${total}`,
        stillRequired: (count: number) => `còn ${count} ô bắt buộc`,
        required: "Bắt buộc",
        optional: "không bắt buộc",
        reset: "Xoá hết",
        noVariables: "Mẫu này không có ô nào phải điền. Sang bước sau để xếp người ký.",
        selectPlaceholder: "— Chọn —",
        unfilled: "chưa điền",
        previewTitle: "Xem trước",
        previewEmpty: "Không mở được tài liệu của mẫu.",
        previewUnreadable:
          "Không đọc được phần chữ của tệp này nên không dựng được bản xem trước. Giá trị vừa điền vẫn được ghi kèm yêu cầu.",
        serverRenderNote:
          "Đây là bản xem trước TRỐNG của mẫu, giá trị vừa gõ được vẽ chồng lên chỗ trống. Tài liệu thật do dịch vụ dựng lúc tạo yêu cầu — bản đó mới là thứ mọi người ký.",
      },

      review: {
        section: "Dựng từ mẫu",
        edit: "Sửa thông tin",
        goToVariables: "Tới ô điền",
      },

      builder: {
        titleCreate: "Tạo template",
        titleEdit: "Chỉnh sửa template",
        headingCreate: "Tạo template mới",
        headingEdit: "Chỉnh sửa template",
        serverDraft: (versionNo: number) => `BẢN NHÁP V${versionNo} TRÊN MÁY CHỦ`,
        introMetadataOnly:
          "Bản đã publish là bất biến. Ở đây chỉ đổi được tên và mô tả của mẫu.",
        intro:
          "Tải tài liệu, xác nhận biến, cấu hình luồng ký và kiểm tra bản PDF trước khi publish.",
        openFullscreen: "Preview toàn màn hình",
        fallbackName: "Template",
        fallbackPreviewTitle: "Preview template",
        fieldPreviewTitle: (name: string) => `Preview biến · ${name}`,
        noDocumentTitle: "Chưa có tài liệu",
        noDocumentBody: "Quay lại bước 1 và tải tài liệu nguồn.",

        stepper: {
          navLabel: "Các bước tạo template",
          document: { label: "Tài liệu", caption: "Upload & detect" },
          variables: { label: "Biến dữ liệu", caption: "Xác nhận & preview" },
          signatures: { label: "Chữ ký", caption: "Workflow & vị trí" },
          review: { label: "Kiểm tra", caption: "Preview & lưu" },
        },

        actions: {
          saveChanges: "Lưu thay đổi",
          back: "Quay lại",
          saveDraft: "Lưu bản nháp",
          submitDocument: "Nộp tài liệu",
          continue: "Tiếp tục",
          publish: "Publish mẫu",
        },

        hint: {
          metadataLocked: "Mẫu đã rời trạng thái nháp — máy chủ không cho sửa gì thêm.",
          metadataEditable: "Đổi tên hoặc mô tả rồi bấm Lưu thay đổi.",
          documentPending:
            "Nhập mã, tên rồi chọn tệp. Bản nháp chỉ được tạo khi bấm Nộp tài liệu.",
          documentReady: (fields: number, pages: number) =>
            `Máy chủ đã dò được ${fields} biến trên ${pages} trang.`,
          variables: (count: number) =>
            `Đang cấu hình ${count} biến. Khoá biến do máy chủ đọc từ tệp, không sửa được.`,
          signatures: (roles: number, steps: number) =>
            `${roles} chữ ký trong ${steps} bước. Vị trí được lưu khi sang bước sau.`,
          reviewDirty: "Còn thay đổi chưa lưu — Publish sẽ tự lưu chúng trước.",
          reviewClean: "Kiểm tra lần cuối rồi Publish để chuyển mẫu sang ACTIVE.",
        },

        error: {
          fileType: (extensions: string) =>
            `Chỉ nhận ${extensions}. Máy chủ không đọc được định dạng khác ở bước tạo mẫu.`,
          fileTooLarge: (size: string) => `Tệp vượt quá dung lượng cho phép (${size}).`,
          createDraft: "Không tạo được bản nháp mẫu trên máy chủ.",
          preview: (variant: string) => `Không tải được bản PDF ${variant}.`,
          saveFields: "Không lưu được cấu hình biến.",
          saveSigners: "Không lưu được vai ký và vị trí chữ ký.",
          saveMetadata: "Không cập nhật được tên và mô tả.",
          publish: "Không publish được mẫu.",
        },

        document: {
          identityEyebrow: "01 · THÔNG TIN TEMPLATE",
          identityTitle: "Thông tin nhận diện",
          identityDescription:
            "Các thông tin dùng trong danh sách template và khi tạo yêu cầu ký từ template.",
          codeLabel: "Mã template",
          codeHint: "Bắt đầu bằng chữ hoặc số; chỉ chứa chữ, số, gạch dưới, gạch nối.",
          codePlaceholder: "HD_LAO_DONG",
          statusLabel: "Trạng thái",
          statusHint: "Do máy chủ quyết định — publish mới chuyển sang ACTIVE.",
          nameLabel: "Tên template",
          namePlaceholder: "Hợp đồng lao động",
          namePickFileFirst: "Chọn tài liệu trước để mở ô tên và mô tả.",
          descriptionLabel: "Mô tả",
          descriptionHint: "Không bắt buộc. Nên mô tả ngắn mục đích sử dụng.",
          lockedNote:
            "Bản nháp đã được tạo trên máy chủ nên mã, tên và mô tả khoá lại ở bước này. Đổi tên hay mô tả là một thao tác riêng sau khi mẫu đã lưu.",
          sourceEyebrow: "02 · TÀI LIỆU NGUỒN",
          sourceTitle: "Tải tài liệu và nhận diện biến",
          sourceDescription:
            "Backend sẽ đọc DOCX/XLSX, tìm các biến dạng {{variable}} và chuẩn bị PDF preview.",
          dropzone: "Chọn hoặc kéo thả tài liệu vào đây",
          dropzoneHint: (size: string) =>
            `Chỉ DOCX và XLSX, tối đa ${size}. Máy chủ là nguồn sự thật cho danh sách biến và bản PDF preview.`,
          replaceFile: "Thay tài liệu",
          metricFields: "Biến phát hiện",
          metricPages: "Số trang PDF",
          metricVersion: "Version ID",
          analysisBusyStrong: "Đang nộp tài liệu:",
          analysisBusy:
            "máy chủ dò biến và chuyển sang PDF. Việc này có thể mất vài chục giây với tệp nặng.",
          analysisDoneStrong: "Bản nháp đã tạo trên máy chủ.",
          analysisDone: (count: number) => `Nhận được ${count} biến.`,
          analysisPending:
            "Tệp mới chỉ nằm ở trình duyệt. Bấm “Nộp tài liệu” để máy chủ đọc biến và dựng PDF — bản nháp chỉ tồn tại từ lúc đó.",
        },

        variables: {
          title: "Biến trong tài liệu",
          description:
            "Key được backend detect và không chỉnh sửa tại đây. Bạn chỉ cấu hình cách nhập dữ liệu.",
          count: (n: number) => `${n} biến`,
          none: "Không phát hiện biến dạng {{variable}} trong tài liệu.",
          occurrences: (n: number) => `${n} vị trí`,
          keyLocked: "Key do backend detect",
          labelLabel: "Tên hiển thị",
          labelPlaceholder: "Số hợp đồng",
          typeLabel: "Kiểu dữ liệu",
          optionsLabel: "Các lựa chọn",
          optionsHint: "Phân cách bằng dấu phẩy.",
          defaultLabel: "Giá trị mặc định",
          hintLabel: "Gợi ý nhập",
          requiredLabel: "Bắt buộc nhập khi tạo yêu cầu ký",
          previewTitle: "Preview biến",
          previewSubtitle: "Các biến được highlight trong PDF do backend render.",
        },

        signatures: {
          flowTitle: "Luồng ký",
          flowDescription:
            "Chọn một chữ ký để chỉnh cấu hình và đặt vị trí trên tài liệu bên phải.",
          roleCount: (n: number) => `${n} chữ ký`,
          flowNotice:
            "Các bước chạy lần lượt từ trên xuống. Nhiều chữ ký trong CÙNG một bước thì ký song song: cùng mở lượt một lúc, và bước sau chờ tất cả họ ký xong.",
          stepNamePlaceholder: (n: number) => `Bước ký ${n}`,
          parallelStep: (n: number) => `${n} chữ ký song song`,
          moveStepUp: "Chuyển bước lên",
          moveStepDown: "Chuyển bước xuống",
          deleteStep: "Xóa bước",
          addRole: "Thêm chữ ký cho bước này",
          addParallelRole: "Thêm chữ ký song song",
          addStep: "Thêm bước ký",
          positionTitleEmpty: "Chọn một chữ ký để đặt vị trí",
          positionHint:
            "Kéo/thay đổi kích thước khung ký trên PDF. Các khung khác hiển thị ở dạng tham chiếu.",
          reloadPdf: "Tải lại PDF",
          loadingPlain: "Đang tạo PDF để đặt vị trí chữ ký…",
          previewFailedTitle: "Không tạo được preview",
          noPreviewTitle: "Chưa có PDF preview",
          noPreviewBody: "Bấm “Tải lại PDF” để lấy lại bản PLAIN từ máy chủ.",
          noRoleTitle: "Chưa chọn chữ ký",
          noRoleBody: "Chọn một chữ ký ở panel bên trái để đặt vị trí.",
          invisibleTitle: "Chữ ký không hiển thị",
          invisibleBody:
            "Chữ ký này được cấu hình invisible signature nên không cần vị trí trên trang.",
          unnamedRole: "Chữ ký chưa đặt tên",
          noCode: "chưa có mã",
          pageChip: (page: number) => `Trang ${page}`,
          noBox: "Không có khung ký",
          roleNamePlaceholder: "VD: Người lao động",
          deleteRole: "Xóa chữ ký",
          roleCodeLabel: "Mã vai",
          roleCodeHint: "Định danh nghiệp vụ gửi lên máy chủ. Đổi nhãn không đổi mã.",
          roleCodePlaceholder: "EMPLOYEE",
          suggestedSigner: "Gợi ý người ký",
          noSuggestion: "Không gợi ý",
          baselineLabel: "Baseline",
          locationLabel: "Địa điểm ký",
          reasonLabel: "Lý do ký",
          visibleLabel: "Hiển thị chữ ký trên tài liệu",
          visibleHint:
            "Mẫu bắt buộc bật: máy chủ đòi mỗi vai phải có ít nhất một khung chữ ký, nên chữ ký vô hình sẽ chặn publish.",
        },

        review: {
          emptyTitle: "Chưa có template",
          emptyBody: "Quay lại các bước trước để cấu hình.",
          summaryTemplate: "Template",
          summaryNoCode: "Chưa có mã",
          summaryFields: "Biến",
          summaryFieldsSub: "máy chủ dò được",
          summarySteps: "Bước ký",
          summaryStepsSub: (roles: number) => `${roles} chữ ký`,
          summaryStatus: "Trạng thái",
          summaryStatusSub: "sau khi publish",
          publishEyebrow: "KIỂM TRA CUỐI",
          publishTitle: "Sẵn sàng publish mẫu?",
          publishDescription:
            "Publish chuyển mẫu sang ACTIVE và chốt bản này lại — bản đã publish không sửa được nữa.",
          blockersTitle: "Điều kiện bắt buộc",
          noBlockers: "Không còn lỗi chặn publish.",
          warningsTitle: "Cảnh báo model",
          noWarnings: "Không có cảnh báo bổ sung.",
          workflowEyebrow: "WORKFLOW",
          workflowTitle: "Tóm tắt luồng ký",
          workflowDescription: "Thứ tự từ trên xuống dưới là thứ tự thực thi của workflow.",
          stepFallback: (n: number) => `Bước ${n}`,
          orderChip: (n: number) => `Thứ tự ký ${n}`,
          unnamedRole: "Chưa đặt tên",
          finalEyebrow: "BẢN KIỂM TRA CUỐI",
          finalTitle: "PDF có tô biến, kèm mọi khung chữ ký",
          finalDescription:
            "PDF do máy chủ dựng; khung chữ ký vẽ đè ở đây theo đúng toạ độ sẽ được gửi lên.",
          loadingHighlight: "Đang tải bản PDF có tô biến…",
          previewFailedTitle: "Không tải được preview",
          noPreviewTitle: "Chưa có PDF preview",
          noPreviewBody: "Quay lại bước trước để tải bản PDF.",
        },

        previewPanel: {
          refresh: "Làm mới",
          fullscreen: "Toàn màn hình",
          loading: "Backend đang render PDF preview…",
          errorTitle: "Không tạo được preview",
          emptyTitle: "Chưa có PDF preview",
          emptyBody: "Preview sẽ xuất hiện sau khi API render tài liệu được kết nối.",
        },

        fullscreen: {
          label: (title: string) => `Preview ${title}`,
          subtitle: "Preview cuối · biến được highlight · khung chữ ký hiển thị theo cấu hình",
          close: "Đóng preview",
        },

        viewer: {
          previousPage: "Trang trước",
          currentPage: "Trang hiện tại",
          nextPage: "Trang sau",
          zoomOut: "Thu nhỏ",
          zoomIn: "Phóng to",
          fitWidth: "Vừa chiều rộng",
          pages: (n: number) => `PDF · ${n} trang`,
          preparing: "Đang chuẩn bị PDF…",
          frameTitle: "PDF preview",
        },

        metadataOnly: {
          eyebrow: "SỬA MẪU",
          title: "Thông tin nhận diện",
          description: "Mã mẫu và nội dung tài liệu không đổi được sau khi mẫu đã tồn tại.",
          codeLabel: "Mã template",
          statusLabel: "Trạng thái",
          nameLabel: "Tên template",
          descriptionLabel: "Mô tả",
          lockedNote:
            "Mẫu này đã rời trạng thái nháp nên máy chủ khoá cả tên và mô tả. Muốn đổi nội dung hay luồng ký thì phải tạo một mẫu mới — dịch vụ chưa có API tạo bản (version) mới cho mẫu đã publish.",
          editableNote:
            "Chỉ tên và mô tả sửa được ở đây. Biến, vai ký và vị trí chữ ký thuộc về bản đã publish và là bất biến.",
        },

        status: {
          DRAFT: "Bản nháp",
          ACTIVE: "Đang hoạt động",
          INACTIVE: "Tạm ngưng",
          ARCHIVED: "Lưu trữ",
        },

        variableType: {
          text: "Văn bản (TEXT)",
          multiline: "Văn bản dài (LONG_TEXT)",
          number: "Số (NUMBER)",
          date: "Ngày (DATE)",
          select: "Danh sách chọn (SELECT)",
        },

        blockers: {
          unnamedRole: "chữ ký chưa đặt tên",
          codeMissing: "Chưa nhập mã template.",
          codeInvalid:
            "Mã template phải bắt đầu bằng chữ hoặc số, và chỉ chứa chữ, số, gạch dưới, gạch nối.",
          codeTooLong: (max: number) => `Mã template vượt quá ${max} ký tự.`,
          noDocument: "Chưa chọn tài liệu nguồn.",
          nameMissing: "Chưa nhập tên template.",
          nameTooLong: (max: number) => `Tên template vượt quá ${max} ký tự.`,
          descriptionTooLong: (max: number) => `Mô tả vượt quá ${max} ký tự.`,
          notAnalyzed: "Tài liệu chưa được máy chủ nhận và phân tích.",
          selectNoOptions: (key: string) =>
            `Biến {{${key}}} kiểu danh sách chưa có lựa chọn nào.`,
          defaultNotInOptions: (key: string) =>
            `Giá trị mặc định của {{${key}}} không nằm trong danh sách lựa chọn.`,
          noRoles: "Chưa có chữ ký nào trong luồng ký.",
          emptyStep: (step: number) => `Bước ${step} chưa có chữ ký nào.`,
          roleUnnamed: "Còn chữ ký chưa đặt tên vai.",
          roleNoCode: (label: string) => `Chữ ký “${label}” chưa có mã vai.`,
          duplicateRoleCode: (code: string) => `Mã vai “${code}” bị trùng.`,
          roleInvisible: (label: string) =>
            `Chữ ký “${label}” đang để vô hình. Mẫu bắt buộc mọi vai phải có khung chữ ký trên trang.`,
          slotPageOutOfRange: (label: string, page: number, pageCount: number) =>
            `Chữ ký “${label}” đặt ở trang ${page}, ngoài phạm vi ${pageCount} trang.`,
          slotNoSize: (label: string) => `Khung chữ ký “${label}” không có kích thước.`,
          slotOutOfBounds: (label: string) => `Khung chữ ký “${label}” nằm tràn ra ngoài mép trang.`,
          slotOverlap: (first: string, second: string) =>
            `Khung chữ ký “${first}” và “${second}” đè lên nhau.`,
        },
      },

      form: {
        titleCreate: "Tạo mẫu",
        titleEdit: "Sửa mẫu",
        description:
          "Đặt tên mẫu, nói khi nào thì lấy ra dùng, và đính tài liệu mà mẫu dựng lên từ đó. Các ô phải điền và vai ký được cấu hình ở phiên bản, sau bước này.",

        codeLabel: "Mã mẫu",
        codePlaceholder: "HOP_DONG_DICH_VU",
        codeHint: "Định danh mà dịch vụ gọi tới. Chỉ chữ, số và gạch dưới.",
        nameLabel: "Tên mẫu",
        namePlaceholder: "Hợp đồng dịch vụ",
        descriptionLabel: "Mô tả",
        descriptionHint: "Một dòng để đồng nghiệp biết khi nào thì lấy mẫu này ra dùng.",
        statusLabel: "Trạng thái",
        status: {
          DRAFT: "Bản nháp",
          ACTIVE: "Đang phục vụ",
          INACTIVE: "Ngừng phục vụ",
          ARCHIVED: "Đã lưu trữ",
        },

        fileSection: "Tài liệu nguồn",
        chooseFile: "Chọn tài liệu",
        replaceFile: "Đổi tệp",
        noFile: "Chưa chọn tài liệu nào.",
        fileHint:
          "PDF, DOCX hoặc XLSX. Mọi chỗ bạn đã gõ {{ten_bien}} trong tệp trở thành một ô phải điền.",
        keepFile: "Để trống nếu vẫn giữ tài liệu mà phiên bản hiện tại đang dùng.",

        incomplete: "Mẫu cần có mã và tên.",
        notWired:
          "Chưa gửi đi đâu cả: hộp thoại này mới chỉ gom giá trị, lời gọi tạo/sửa mẫu còn phải nối vào dịch vụ.",
        save: "Lưu mẫu",
      },

      manager: {
        title: "Quản lý mẫu",
        description: "Mọi thứ dùng lại được của một yêu cầu ký nằm ở đây.",
        searchPlaceholder: "Tìm mẫu",
        create: "Tạo mẫu",
        use: "Dùng",
        edit: "Sửa",
        duplicate: "Nhân bản",
        delete: "Xoá",
        copySuffix: "(bản sao)",
        updatedAt: (value: string) => `sửa ${value}`,
        confirmDelete: (name: string) => `Xoá “${name}”? Không khôi phục lại được.`,
        saved: "Đã lưu mẫu",
        deleted: "Đã xoá mẫu",
        deleteFailed: "Không xoá được mẫu",
        saveFailed: "Không lưu được mẫu",
        saveFailedBody:
          "Bộ nhớ của trình duyệt từ chối ghi — nhiều khả năng đã đầy. Xoá bớt một mẫu không còn dùng rồi thử lại.",
        storageNote:
          "Mẫu chỉ nằm trong trình duyệt này. Đồng nghiệp không thấy được, và xoá dữ liệu duyệt web là mất.",
      },

      editor: {
        titleCreate: "Tạo mẫu",
        titleEdit: "Sửa mẫu",
        description:
          "Bên trái là tài liệu và những chỗ trống trong nó; bên phải là ai ký, theo thứ tự nào.",

        pickFileTitle: "Bắt đầu từ một tài liệu",
        pickFileBody:
          "Tải lên tệp mà mẫu này sinh ra. Mọi chỗ bạn đã gõ {{ten_bien}} trong tệp trở thành một ô phải điền; khung chữ ký được đặt lên chính tệp đó.",
        chooseFile: "Chọn tài liệu",
        fileTooLarge: (limit: string) =>
          `Tệp lớn hơn ${limit}. Mẫu nằm trong bộ nhớ của trình duyệt, chỗ đó không chứa nổi tài liệu cỡ này.`,

        infoSection: "Mẫu",
        nameLabel: "Tên mẫu",
        namePlaceholder: "Hợp đồng dịch vụ",
        descriptionLabel: "Mô tả",
        descriptionHint: "Một dòng để đồng nghiệp biết khi nào thì lấy mẫu này ra dùng.",

        fileSection: "Tài liệu",
        replaceFile: "Đổi tệp",
        nonPdfNote:
          "Chỉ PDF mới có khung chữ ký hiển thị trên trang. Vị trí đặt bên dưới vẫn được ghi lại nhưng không vẽ ra với định dạng này.",
        scanning: "Đang đọc tài liệu…",
        scanned: (count: number) =>
          count === 0
            ? "Không thấy chỗ trống dạng {{ten_bien}} nào trong tài liệu."
            : `Thấy ${count} chỗ trống trong tài liệu.`,
        scanFailed:
          "Không đọc được phần chữ của tệp này. Khai báo biến bằng tay — chúng vẫn hoạt động bình thường.",
        undeclaredFound: (count: number) =>
          `${count} chỗ trống có trong tài liệu nhưng chưa khai báo. Sẽ không ai được hỏi để điền chúng.`,
        addAllVariables: "Khai báo hết",

        variablesSection: "Các biến",
        addVariable: "Thêm biến",
        noVariables:
          "Chưa có biến nào. Mọi thứ viết dạng {{ten_bien}} trong tài liệu thuộc về chỗ này.",
        removeVariable: "Bỏ biến",
        variableKeyLabel: "Tên biến trong tệp",
        variableLabelLabel: "Nhãn",
        variableLabelPlaceholder: "Nhãn hiện trên form điền",
        variableTypeLabel: "Kiểu",
        variableType: {
          text: "Văn bản",
          multiline: "Văn bản dài",
          number: "Số",
          date: "Ngày",
          select: "Chọn một",
        },
        optionsLabel: "Các lựa chọn",
        optionsPlaceholder: "Các lựa chọn, ngăn nhau bằng dấu phẩy",
        defaultValueLabel: "Giá trị mặc định",
        defaultValuePlaceholder: "Giá trị mặc định",
        variableHintLabel: "Gợi ý",
        variableHintPlaceholder: "Gợi ý dưới ô nhập",
        requiredLabel: "Bắt buộc",
        notInDocument: "không có trong tệp",
        notInDocumentHint:
          "Không tìm thấy tên này trong phần chữ của tài liệu. Một cái tên gõ sai thì không bao giờ được điền.",

        defaultsSection: "Mặc định cho yêu cầu",
        requestNameLabel: "Tên yêu cầu",
        requestNamePlaceholder: "Hợp đồng {{so_hop_dong}}",
        messageLabel: "Lời nhắn cho người ký",
        patternHint: "Dùng được {{ten_bien}} ở đây — nó được thay bằng giá trị đã điền.",
        deadlineDaysLabel: "Hạn ký, tính bằng ngày",
        deadlineDaysHint: "Tính từ ngày tạo yêu cầu. Bỏ trống nghĩa là không đặt hạn.",

        flowSection: "Các chỗ ký",
        flowHint:
          "Một chỗ ký là một VAI, không phải một người: “Kế toán trưởng”, không phải một cái tên. Người cụ thể được chọn ở mỗi lần dùng mẫu.",
        addRole: "Thêm chỗ ký",
        removeRole: "Bỏ chỗ ký",
        roleLabel: "Tên chỗ ký",
        rolePlaceholder: "Kế toán trưởng",
        unnamedRole: "Chỗ ký chưa đặt tên",
        suggestedLabel: "Người thường ký",
        suggestedHint: "Điền sẵn cho người dùng mẫu — họ vẫn đổi được.",
        noSuggestion: "Không gợi ý ai",
        showConfig: "Cấu hình",
        hideConfig: "Thu gọn",
        emptyStep: "Bước này chưa có chỗ ký nào.",

        save: "Lưu mẫu",
        ready: "Sẵn sàng lưu",
        moreIssues: (count: number) => `và ${count} mục nữa`,
        issue: {
          NO_NAME: "Mẫu chưa có tên.",
          NO_FILE: "Mẫu chưa có tài liệu.",
          NO_ROLE: "Mẫu chưa có chỗ ký nào.",
          ROLE_WITHOUT_NAME: "Một chỗ ký chưa được đặt tên.",
          EMPTY_STEP: (index: number) => `Bước ${index} chưa có chỗ ký nào.`,
          DUPLICATE_VARIABLE_KEY: (key: string) => `Biến {{${key}}} bị khai báo hai lần.`,
          SELECT_WITHOUT_OPTIONS: (key: string) =>
            `{{${key}}} là biến chọn một nhưng chưa có lựa chọn nào.`,
          UNDECLARED_VARIABLE: (key: string) =>
            `{{${key}}} có trong tài liệu nhưng chưa khai báo — sẽ không ai được hỏi giá trị của nó.`,
        },
      },
    },
  },

  verify: {
    exportReport: "Xuất báo cáo",
    exportReportTitle: "Khả dụng sau khi tích hợp xuất báo cáo",
    banner: {
      title: "Xác minh chữ ký độc lập",
      description:
        "Xác thực tính toàn vẹn mật mã, độ tin cậy chứng chỉ, dấu thời gian và dữ liệu xác thực dài hạn.",
    },
    apiBaseUrl: {
      buttonTitle: "Địa chỉ dịch vụ verify",
      serverDefault: "Mặc định của máy chủ",
      title: "Địa chỉ dịch vụ verify",
      description:
        "Màn này gọi POST /api/v1/verify ở địa chỉ đây. Đây là service riêng, không phải dịch vụ ký — đổi ở đây không đụng tới địa chỉ ký bên màn kia.",
      label: "Base URL",
      placeholder: "http://localhost:8082",
      emptyHint: "Bỏ trống để dùng VERIFY_API_URL trong biến môi trường của máy chủ.",
      errorScheme: "Chỉ nhận http:// hoặc https://.",
      errorMalformed: "URL không hợp lệ. Nhớ ghi cả scheme, ví dụ http://192.168.1.10:8082.",
      test: "Kiểm tra kết nối",
      testing: "Đang kiểm tra…",
      testOk: (baseUrl: string) => `Kết nối được — ${baseUrl} có endpoint verify.`,
      testFailed: "Không gọi được dịch vụ verify ở địa chỉ này.",
      save: "Lưu",
      cancel: "Huỷ",
      savedTitle: "Đã đổi địa chỉ dịch vụ verify",
      proxyNote:
        "Trình duyệt không gọi thẳng địa chỉ này: request đi qua route /api/verify của chính ứng dụng, nhờ vậy tránh được CORS và dùng được cả với host chỉ cho phép gọi server-to-server.",
    },
    report: {
      signatureCounts: (passed: number, processed: number, detected: number) =>
        `${passed}/${processed} đạt đầy đủ · phát hiện ${detected}`,
      statisticsLine: (cryptographicallyValid: number, processed: number) =>
        `${cryptographicallyValid}/${processed} chữ ký đúng về mật mã`,
      artifact: "Tệp",
      trustAnchors: "Gốc tin cậy",
      anchorCounts: (signer: number, tsa: number) => `${signer} người ký · ${tsa} TSA`,
      policy: "Policy",
      engine: "Engine",
      verifiedAt: "Thời điểm thẩm định",
      runId: "Run ID",
      sha256: "SHA-256 của tệp",
      completeness: "Mức hoàn tất",
      completenessValue: {
        COMPLETE: "Mọi bước đã chạy và kết luận rõ",
        PARTIAL: "Còn bước chưa chạy",
        NOT_PERFORMED: "Không có chữ ký nào được xử lý",
      },
      stats: {
        cryptographicallyValid: "Đúng về mật mã",
        totalPassed: "Đạt đầy đủ",
        indeterminate: "Chưa đủ căn cứ",
        totalFailed: "Không đạt",
      },
      noAnchorsNote:
        "Dịch vụ verify chưa cấu hình gốc tin cậy nào nên không đánh giá được đường dẫn chứng thư. Chỉ riêng điều này đã đủ làm cả báo cáo thành INDETERMINATE — không phải lỗi của tệp.",
    },
    upload: {
      sectionTitle: "Tệp đã ký",
      dropHere: "Kéo thả tệp đã ký để xác minh",
      acceptedTypes: "PDF, XML hoặc OOXML (DOCX/XLSX/PPTX) — tối đa 32 MB",
      chooseFile: "Chọn tệp đã ký",
      remove: (name: string) => `Xoá ${name}`,
      verifying: "Đang xác minh…",
      completed: "Đã xác minh xong",
      failed: "Xác minh thất bại",
    },
    signatureList: {
      title: "Chữ ký tìm thấy",
      empty: "Không tìm thấy chữ ký nào trong tệp này.",
      checksPassed: (passed: number, total: number) =>
        `Đạt ${passed}/${total} mục kiểm tra chính`,
    },
    empty: {
      title: "Tải lên một tệp đã ký",
      description:
        "Sigil sẽ xác thực tính toàn vẹn chữ ký, độ tin cậy chứng chỉ, dấu thời gian và dữ liệu xác thực dài hạn.",
    },
    progress: {
      title: "Đang xác minh chữ ký…",
      description: "Đang gửi tệp tới dịch vụ verify và chờ kết quả.",
      checks: [
        "Đang phát hiện vùng chứa chữ ký",
        "Đang xác thực tính toàn vẹn mật mã",
        "Đang dựng chuỗi chứng chỉ",
        "Đang xác thực dấu thời gian",
      ],
    },
    error: {
      title: "Không thể verify tệp này",
      retry: "Thử tệp khác",
      correlationId: (id: string) => `Mã tra cứu: ${id}`,
    },
    tabs: {
      result: "Kết quả",
      tree: "Cây xác thực",
      chain: "Chuỗi chứng chỉ",
      timestamp: "Dấu thời gian",
      manifest: "Manifest & tham chiếu",
      issues: "Vấn đề",
      ariaLabel: "Bằng chứng xác minh",
    },
    banner2: {
      signedBy: (profile: string, signedAt: string) => `${profile} · ký lúc ${signedAt}`,
      unknownSigner: "người ký không xác định",
      signedByPrefix: " · bởi ",
      trustAnchor: (name: string) => ` · gốc tin cậy: ${name}`,
      warnings: (n: number) => `▲ ${n} cảnh báo`,
      noWarnings: "Không có cảnh báo",
      signingTimeUntrusted:
        "Thời điểm ký là lời khai của người ký — chưa có dấu thời gian tin cậy nào chứng thực.",
    },
    verdict: {
      valid: "Chữ ký hợp lệ",
      invalid: "Chữ ký không hợp lệ",
      /* Cố ý không phải "không hợp lệ": tệp không có vấn đề gì, là verifier chưa kết luận được. */
      indeterminate: "Chưa đủ căn cứ kết luận",
    },
    result: {
      standard: "Chuẩn ký",
      signatureAlgorithm: "Thuật toán ký",
      digestAlgorithm: "Thuật toán băm",
      validationSummary: "Tóm tắt xác thực",
    },
    /*
     * Năm thẻ của schema 6.1.0. Nhãn để ở đây cho màn hình còn song ngữ, riêng
     * `detail` vẫn lấy nguyên của backend vì đó là chỗ duy nhất nói được lý do
     * của chính ca đang xem. `id` chưa có trong bảng này rơi về `title` backend
     * trả, nên một thẻ mới ở bản minor sau vẫn hiện ra được.
     */
    primaryChecks: {
      documentTitle: "Kiểm tra chính trên toàn tài liệu",
      documentDescription:
        "Kết quả xấu nhất của từng mục trên mọi chữ ký. Chọn một chữ ký để xem kết quả của riêng nó.",
      linkedIssues: (n: number) => (n === 1 ? "Xem nguyên nhân →" : `Xem ${n} nguyên nhân →`),
      byId: {
        INTEGRITY: {
          title: "Tính toàn vẹn",
          description: "Nội dung được ký không đổi kể từ lúc ký.",
        },
        TRUSTED_SIGNATURE: {
          title: "Chữ ký tin cậy",
          description:
            "Giá trị chữ ký đúng về mật mã và chứng thư người ký neo được về một nguồn tin cậy.",
        },
        SIGNED_WITHIN_VALIDITY: {
          title: "Ký trong thời gian hiệu lực",
          description: "Chữ ký được tạo khi chứng thư của người ký còn hiệu lực.",
        },
        TIMESTAMP_PRESENT: {
          title: "Dấu thời gian",
          description: "Tài liệu có mang một dấu thời gian hợp lệ hay không.",
        },
        CERTIFICATE_NOT_REVOKED: {
          title: "Chứng thư chưa bị thu hồi",
          description: "Chứng thư người ký chưa bị thu hồi tại mốc thời gian tham chiếu.",
        },
      } as Record<string, { title: string; description: string }>,
    },
    validation: {
      groups: {
        cryptographicIntegrity: "Toàn vẹn mật mã",
        signedScope: "Phạm vi được ký",
        certificatePath: "Đường dẫn chứng thư",
        revocation: "Kiểm tra thu hồi",
        trustedTime: "Mốc thời gian tin cậy",
        signaturePolicy: "Chính sách chữ ký",
        longTermValidation: "Xác thực dài hạn",
      },
    },
    remediations: {
      title: "Việc cần làm",
      description:
        "Dịch vụ verify đã gộp và xếp sẵn thứ tự — làm lần lượt từ trên xuống.",
      requiresResigning: "Phải ký lại tài liệu",
      networkRequirement: {
        NOT_REQUIRED: "Không cần truy cập mạng",
        REQUIRED: "Cần truy cập mạng",
        CONDITIONAL: "Có thể cần truy cập mạng",
      },
      stage: {
        VERIFIER_CONFIGURATION: "Cấu hình verifier",
        DOCUMENT_GENERATION: "Sinh tài liệu",
        SIGNATURE_CREATION: "Tạo chữ ký",
        TIMESTAMP_CREATION: "Tạo dấu thời gian",
        VALIDATION_MATERIAL: "Vật liệu xác thực",
        WORKFLOW_CONFIGURATION: "Cấu hình quy trình",
        USER_ACTION: "Thao tác người dùng",
      },
    },
    revocation: {
      title: "Kiểm tra thu hồi",
      empty: "Không có kết quả kiểm tra thu hồi cho chữ ký này.",
    },
    tree: {
      standard: "Chuẩn / mức baseline",
      canonicalization: "Canonicalization",
      notApplicable: "không áp dụng",
      signatureAlgorithm: "Thuật toán chữ ký",
      digest: "Digest",
      matched: "khớp",
      notMatched: "không khớp",
      unknownMatch: "không đối chiếu được",
      yes: "có",
      no: "không",
      certificateChain: "Chuỗi chứng chỉ",
      references: (matched: number, total: number) => `${matched}/${total} reference khớp`,
      byteRange: "Byte range",
      coversCurrentDocument: "Phủ tài liệu hiện tại",
      unsignedTrailingBytes: "Byte thừa không được ký",
      elementPath: "Đường dẫn phần tử chữ ký",
      timestamp: "Dấu thời gian",
      timestampCount: (n: number) => `có ${n}`,
      absent: "không có",
      longTerm: "Xác thực dài hạn",
      wrappingIndicators: "Dấu hiệu tấn công wrapping",
    },
    checks: {
      title: "Các bước engine đã kiểm tra",
      /* Giải thích vì sao bước này chưa chạy — xem blockedByCheckIds. */
      blockedBy: (blockers: string) => `Chưa chạy — bị chặn bởi: ${blockers}`,
      type: {
        PDF_BYTE_RANGE: "Byte range của PDF",
        XML_REFERENCE_RESOLUTION: "Phân giải reference XML",
        SIGNED_OBJECT_INTEGRITY: "Toàn vẹn đối tượng được ký",
        SIGNATURE_CRYPTOGRAPHY: "Mật mã của chữ ký",
        SIGNED_ATTRIBUTES: "Thuộc tính được ký",
        ALGORITHM_POLICY: "Chính sách thuật toán",
        CERTIFICATE_PATH: "Đường dẫn chứng thư",
        REVOCATION: "Kiểm tra thu hồi",
        SIGNATURE_TIMESTAMP: "Dấu thời gian của chữ ký",
        DOCUMENT_MODIFICATION: "Thay đổi tài liệu",
        BASELINE_PROFILE: "Hồ sơ baseline",
        LONG_TERM_VALIDATION: "Xác thực dài hạn",
      },
      /*
       * NOT_EVALUATED và INDETERMINATE được đặt chữ để không thể lẫn: cái đầu là
       * *chưa đi tìm*, cái sau là *đã tìm và không rõ*. Gộp lại là mất đúng thông
       * tin người đọc cần.
       */
      outcome: {
        PASS: "Đạt",
        FAIL: "Không đạt",
        INDETERMINATE: "Không kết luận được",
        WARNING: "Đạt, có lưu ý",
        NOT_APPLICABLE: "Không áp dụng",
        NOT_EVALUATED: "Chưa kiểm tra",
        UNSUPPORTED: "Chưa hỗ trợ",
      },
    },
    chain: {
      trustedBanner: (anchor: string) => `Chuỗi dẫn đến gốc tin cậy — ${anchor}`,
      notTrustedBanner: "Chưa xác định được đường dẫn tới gốc tin cậy",
      rejectedBanner: "Đường dẫn chứng thư bị từ chối",
      trustAnchorBadge: "Gốc tin cậy",
      selfSigned: "Tự ký",
      serial: "Số seri",
      fingerprint: "Vân tay SHA-256",
      validity: (from: string, to: string) => `Hiệu lực ${from} → ${to}`,
      status: {
        VALID: "Hợp lệ",
        EXPIRED: "Đã hết hạn",
        NOT_YET_VALID: "Chưa có hiệu lực",
        INVALID: "Không hợp lệ",
        UNKNOWN: "Chưa rõ",
      },
      role: {
        ROOT: "Gốc",
        INTERMEDIATE: "Trung gian",
        LEAF: "Chứng chỉ ký",
        SIGNER: "Chứng chỉ ký",
        TSA: "TSA",
        OCSP_RESPONDER: "OCSP responder",
        UNKNOWN: "Vai trò chưa rõ",
      },
    },
    timestamp: {
      none: "Chữ ký này không có dấu thời gian.",
      timestampLabel: "Thời điểm (genTime)",
      messageImprint: "Message imprint",
      tsa: "TSA",
      policy: "Policy OID",
      accuracy: "Độ chính xác",
      status: "Trạng thái",
      revocation: "Thu hồi của TSA",
      chainTitle: "Chuỗi chứng thư của TSA",
      issuesTitle: "Vấn đề của dấu thời gian",
      notUsableAsPoe:
        "Dấu thời gian này có mặt nhưng chưa dùng được làm bằng chứng tồn tại — chứng thư của chính TSA chưa neo được về một gốc tin cậy đã cấu hình.",
    },
    manifest: {
      columns: {
        uri: "URI",
        type: "Loại",
        digestAlgorithm: "Thuật toán băm",
        digestValue: "Giá trị băm",
        matched: "Khớp",
      },
      wholeDocument: "(toàn bộ tài liệu)",
      external: "NGOÀI TÀI LIỆU",
      duplicateId: "TRÙNG ID",
      byteRange: "Byte range",
      coversWholeRevision: "Phủ toàn bộ revision được ký",
      coversCurrentDocument: "Phủ tài liệu hiện tại",
      unsignedTrailingBytes: "Byte thừa không được ký",
      empty: "Không có reference nào.",
    },
    issues: {
      summary: (errors: number, warnings: number) => `${errors} lỗi · ${warnings} cảnh báo`,
      none: "Không có vấn đề nào được ghi nhận cho chữ ký này.",
      documentLevel: "Vấn đề mức tài liệu",
      rootCauses: "Nguyên nhân gốc",
      consequences: (n: number) => `${n} hệ quả kéo theo`,
      needsResigning: "Cần ký lại tài liệu",
      byCode: {
        SIGNER_TRUST_STORE_EMPTY: {
          title: "Chưa xác minh được nguồn chứng thư của người ký",
          description:
            "Chữ ký vẫn có thể đúng về mật mã, nhưng verifier chưa được cấu hình nguồn tin cậy để xác nhận chứng thư của người ký.",
        },
        TSA_TRUST_STORE_EMPTY: {
          title: "Chưa xác minh được nguồn dấu thời gian",
          description:
            "Dấu thời gian có thể đúng về mật mã nhưng verifier chưa thể neo chứng thư TSA vào nguồn tin cậy.",
        },
        ISSUER_CERTIFICATE_NOT_AVAILABLE: {
          title: "Thiếu chứng thư trung gian",
          description: "Hệ thống chưa có đủ certificate cần thiết để xây dựng hoàn chỉnh đường dẫn chứng thư.",
        },
        REVOCATION_NOT_EVALUATED: {
          title: "Chưa kiểm tra được trạng thái thu hồi",
          description:
            "Đây là bước chưa được thực hiện do một kiểm tra phụ thuộc phía trước chưa hoàn tất; không có nghĩa chứng thư đã bị thu hồi.",
        },
      } as Record<string, { title: string; description: string }>,
    },
    allowlist: {
      action: "Thêm vào allowlist và verify lại",
      adding: "Đang xử lý…",
      genericError: "Đã có lỗi xảy ra. Vui lòng thử lại.",
      reverifyFailed: "Đã thêm vào allowlist nhưng verify lại thất bại.",
    },
    summary: {
      validSummary: (processed: number) => `Đã xử lý ${processed} chữ ký. Các kiểm tra bắt buộc theo policy hiện tại đã đạt.`,
      invalidSummary:
        "Phát hiện chữ ký hoặc nội dung không đáp ứng yêu cầu xác thực. Hãy chọn chữ ký có trạng thái lỗi để xem nguyên nhân.",
      indeterminateSummary: (valid: number, processed: number) =>
        `${valid}/${processed} chữ ký hợp lệ về mật mã, nhưng hệ thống chưa có đủ điều kiện để kết luận đầy đủ về trust, revocation hoặc thời gian tin cậy.`,
      cryptoValidCount: (valid: number, processed: number) => `${valid}/${processed} chữ ký hợp lệ về mật mã`,
      failedCount: (n: number) => `${n} chữ ký không đạt`,
      indeterminateCount: (n: number) => `${n} chữ ký chưa thể kết luận đầy đủ`,
      rootIssuesCount: (n: number) => `${n} vấn đề gốc cần rà soát`,
    },
    apiErrors: {
      VERIFY_NOT_SUPPORTED:
        "Dịch vụ ở địa chỉ này không có endpoint verify (POST /api/v1/verify). Kiểm tra lại địa chỉ dịch vụ verify — dịch vụ ký không thẩm định được.",
      ALLOWLIST_NOT_SUPPORTED:
        "Dịch vụ ở địa chỉ này không có endpoint allowlist thu hồi (POST /api/v1/revocation-allowlist).",
      VERIFY_API_UNREACHABLE: "Không kết nối được tới dịch vụ verify. Kiểm tra lại địa chỉ và xem service đã chạy chưa.",
      VERIFY_API_NOT_CONFIGURED:
        "Chưa có địa chỉ dịch vụ verify. Đặt địa chỉ ở nút cấu hình phía trên, hoặc đặt VERIFY_API_URL trong .env.local.",
      VERIFY_API_BASE_URL_INVALID:
        "Địa chỉ dịch vụ verify không hợp lệ. Phải là URL http:// hoặc https:// đầy đủ, ví dụ http://192.168.1.10:8082.",
      VERIFY_SCHEMA_UNSUPPORTED:
        "Backend trả báo cáo verify theo schema mà bàn thử này chưa đọc được (đang hỗ trợ schema 6.x). Cần cập nhật lại bộ chuyển đổi trong lib/types/verification.ts.",
      FILE_EMPTY: "File rỗng.",
      FILE_READ_FAILED: "Không đọc được file đã tải lên. Vui lòng thử lại.",
      VALIDATION_FAILED: "Yêu cầu verify không hợp lệ.",
      FILE_TOO_LARGE: "File vượt quá giới hạn 32 MiB.",
      INTERNAL_ERROR: "Dịch vụ verify gặp lỗi nội bộ khi xử lý file này.",
      ALLOWLIST_HOST_EMPTY: "Không xác định được host để thêm vào allowlist.",
      unknownError: (code: string) => `Đã xảy ra lỗi không xác định khi verify (${code}).`,
    },
    ux: {
      overview: "Tổng quan",
      advanced: "Thông tin nâng cao",
      viewTablistAriaLabel: "Chế độ hiển thị kết quả xác thực",
      verificationResult: "Kết quả xác thực",
      signatures: "Chữ ký",
      signer: "Người ký",
      signatureDetailTitle: "Chi tiết chữ ký",
      trust: "Tin cậy",
      signingTime: "Thời gian ký",
      /* Cố ý không gọi là "Thời gian ký": chưa có gì chứng minh giá trị này ngoài lời khai của người ký. */
      claimedSigningTime: "Người ký khai ký lúc",
      timestampNotTrustedTime:
        "Dấu thời gian hợp lệ, nhưng verifier chưa nạp trust anchor của TSA nên chưa dùng mốc thời gian này làm thời điểm tham chiếu.",
      userChecks: "Kiểm tra chính",
      integrity: "Tính toàn vẹn nội dung",
      integrityDescription: "Kiểm tra phạm vi nội dung mà chữ ký bảo vệ.",
      cryptography: "Giá trị chữ ký",
      cryptographyDescription: "Kiểm tra chữ ký bằng khóa công khai của người ký.",
      identityCertificate: "Danh tính & chứng thư",
      identityCertificateDescription: "Kiểm tra đường dẫn chứng thư tới nguồn tin cậy.",
      trustedTime: "Thời gian tin cậy",
      trustedTimeDescription: "Kiểm tra dấu thời gian có thể dùng làm bằng chứng thời gian hay không.",
      needsAttention: "Cần chú ý",
      noResignRequired: "Không cần ký lại tài liệu",
      laterRevisionTitle: "Có cập nhật sau chữ ký này",
      laterRevisionDescription:
        "Chữ ký không bao phủ trạng thái mới nhất của tài liệu. Xem Phạm vi ký trong tab nâng cao để rà soát các revision sau ký.",
      advancedDescription: "Thông tin dành cho developer, auditor hoặc quản trị viên khi cần chẩn đoán kết quả xác thực.",
      advancedNavAriaLabel: "Điều hướng thông tin nâng cao",
      sections: {
        technical: "Môi trường xác thực",
        checks: "Các bước kiểm tra",
        timestamp: "Dấu thời gian",
        scope: "Phạm vi ký",
        issues: "Vấn đề & xử lý",
        raw: "Raw JSON",
      },
      reportMetadata: "Thông tin lần xác thực",
      trustDomain: "Trust domain",
      signerTrust: "Signer trust",
      tsaTrust: "TSA trust",
      anchorsCount: (n: number) => `${n} gốc tin cậy`,
      signatureMetadata: "Thông tin kỹ thuật chữ ký",
      mainIndication: "Main indication",
      subIndications: "Sub-indications",
      signatureId: "Signature ID",
      copyJson: "Sao chép JSON",
      details: "Xem chi tiết",
    },
  },

  certificates: {
    filters: {
      searchPlaceholder: "Tìm subject, đơn vị cấp, số serial, fingerprint…",
      searchAriaLabel: "Tìm chứng chỉ",
      statusAriaLabel: "Lọc theo trạng thái chứng chỉ",
      keySourceAriaLabel: "Lọc theo nguồn khoá",
      expiringWithinAriaLabel: "Sắp hết hạn trong số ngày",
      allStatuses: "Tất cả trạng thái",
      allKeySources: "Tất cả nguồn khoá",
    },
    status: {
      VALID: "Hợp lệ",
      EXPIRING: "Sắp hết hạn",
      EXPIRED: "Đã hết hạn",
      NOT_YET_VALID: "Chưa có hiệu lực",
      DISABLED: "Đã tắt",
    },
    table: {
      empty: "Không có chứng chỉ nào khớp với bộ lọc hiện tại.",
      columns: {
        subject: "Subject",
        issuer: "Đơn vị cấp",
        serial: "Serial",
        status: "Trạng thái",
        expires: "Hết hạn",
        source: "Nguồn",
      },
    },
    workspace: {
      loading: "Đang tải…",
      loadMore: "Tải thêm",
      loadPageFailedTitle: "Không thể tải trang chứng chỉ tiếp theo",
      paginationAriaLabel: "Phân trang chứng chỉ",
      showing: (n: number) => `Đang hiển thị ${n} chứng chỉ`,
      page: (page: number) => `Trang ${page}`,
      previous: "Trước",
      next: "Sau",
    },
    page: {
      importTitle: "Backend chưa hỗ trợ nhập chứng chỉ độc lập",
      import: "Nhập",
    },
    statusDialog: {
      enable: "Bật",
      disable: "Tắt",
      dialogLabel: (action: string) => `${action} chứng chỉ`,
      confirmTitle: (action: string, name: string) => `${action} ${name}?`,
      enableBody: "Chứng chỉ sẽ khả dụng trở lại cho các thao tác trên nền tảng.",
      disableBody:
        "Chứng chỉ sẽ bị tắt trong nội bộ hệ thống. Thao tác này không thu hồi chứng chỉ tại CA cấp phát.",
      cancel: "Huỷ",
      submit: (action: string) => `${action} chứng chỉ`,
      pending: (action: string) => `Đang ${action.toLowerCase()}…`,
      enabledToastTitle: "Đã bật chứng chỉ",
      disabledToastTitle: "Đã tắt chứng chỉ",
      genericError: "Không thể cập nhật chứng chỉ.",
    },
    trustChain: {
      trusted: "Chuỗi chứng chỉ đáng tin cậy",
      notTrusted: "Chuỗi chứng chỉ không đáng tin cậy",
      issuer: (name: string) => `Đơn vị cấp: ${name}`,
    },
    copyFingerprint: {
      button: "Sao chép fingerprint",
      successTitle: "Đã sao chép fingerprint",
      failedTitle: "Không thể sao chép",
      failedDescription: "Trình duyệt đã chặn truy cập clipboard.",
    },
    detail: {
      tabs: {
        general: "Tổng quan",
        details: "Chi tiết",
        extensions: "Extensions",
        chain: "Chuỗi chứng nhận",
        asn1: "Trình kiểm tra ASN.1",
      },
      issuedTo: "Cấp cho",
      issuedBy: "Cấp bởi",
      validFrom: "Hiệu lực từ",
      validTo: "Hiệu lực đến",
      serialNumber: "Số serial",
      source: "Nguồn",
      sha256Fingerprint: "Fingerprint SHA-256",
      exportPem: "Xuất PEM",
      exportDer: "Xuất DER",
      signatureAlgorithm: "Thuật toán ký",
      publicKey: "Khoá công khai",
      format: "Định dạng",
      trustStatus: "Trạng thái tin cậy",
      certificateAuthority: "Đơn vị chứng nhận (CA)",
      selfSigned: "Tự ký",
      yes: "Có",
      no: "Không",
      fallbackTitle: "Chứng chỉ",
    },
  },

  keyProviders: {
    filters: {
      searchAriaLabel: "Tìm nguồn khoá",
      searchPlaceholder: "Tìm tên hoặc loại nhà cung cấp…",
      statusAriaLabel: "Lọc theo trạng thái",
      typeAriaLabel: "Lọc theo loại nhà cung cấp",
      allStatuses: "Tất cả trạng thái",
      allTypes: "Tất cả loại nhà cung cấp",
    },
    status: {
      UNVERIFIED: "Chưa xác minh",
      ONLINE: "Trực tuyến",
      DEGRADED: "Suy giảm",
      OFFLINE: "Ngoại tuyến",
      DISABLED: "Đã tắt",
      DELETED: "Đã xoá",
    },
    type: {
      PKCS12: "PKCS#12",
      REMOTE_HSM: "HSM từ xa",
      REMOTE_CA: "CA từ xa",
      USB_TOKEN: "USB Token",
    },
    table: {
      emptyTitle: "Không tìm thấy nguồn khoá nào",
      emptyDescription: "Thay đổi bộ lọc hiện tại hoặc thêm một nguồn khoá.",
      columns: {
        provider: "Nhà cung cấp",
        type: "Loại",
        health: "Tình trạng",
        latency: "Độ trễ",
        keys: "Khoá",
        actions: "Hành động",
      },
      viewDetails: "Xem chi tiết",
      viewLabel: (name: string) => `Xem ${name}`,
    },
    page: {
      summary: {
        providersOnPage: "Nhà cung cấp trên trang này",
        totalConfigured: (n: number) => `${n} đã cấu hình tổng cộng`,
        onlineOnPage: "Trực tuyến trên trang này",
        requireAttention: (n: number) => `${n} cần xử lý trên trang này`,
        discoveredCredentials: "Credential được phát hiện",
        referencesOnly: "Chỉ là tham chiếu; khoá vẫn được lưu giữ an toàn",
      },
      paginationAriaLabel: "Phân trang nguồn khoá",
      pageOf: (page: number, total: number) => `Trang ${page} / ${total}`,
      showingRange: (first: number, last: number, total: number) =>
        `Hiển thị ${first}-${last} trong ${total}`,
      goToPage: (page: number) => `Đi tới trang ${page}`,
      previous: "Trước",
      next: "Sau",
    },
    wizard: {
      addProvider: "+ Thêm nguồn khoá",
      eyebrow: "Trình hướng dẫn cấu hình",
      title: "Thêm nguồn khoá",
      dialogLabel: "Thêm nguồn khoá",
      close: "Đóng trình hướng dẫn cấu hình",
      progressAriaLabel: "Tiến trình cấu hình",
      steps: ["Loại", "Cấu hình", "Kiểm tra", "Xem lại"],
      types: {
        PKCS12: { label: "PKCS#12", description: "Tệp keystore phần mềm (.p12 hoặc .pfx)" },
        REMOTE_HSM: { label: "HSM từ xa", description: "Module bảo mật phần cứng kết nối qua mạng" },
        REMOTE_CA: { label: "CA từ xa", description: "Đơn vị chứng nhận nội bộ hoặc công cộng" },
        USB_TOKEN: { label: "USB Token", description: "Token phần cứng gắn cục bộ" },
      },
      fields: {
        displayName: "Tên hiển thị",
        pkcs12File: "Tệp PKCS#12",
        pkcs12Password: "Mật khẩu PKCS#12",
        preferredAlias: "Alias ưu tiên (tuỳ chọn)",
        endpoint: "Endpoint",
        partition: "Partition",
        keyLabel: "Nhãn khoá",
        authType: "Loại xác thực",
        clientSecret: "Client secret",
        accountId: "Account ID",
        certificateProfile: "Hồ sơ chứng chỉ",
        apiKey: "API key",
        modulePath: "Đường dẫn module PKCS#11",
        slot: "Slot",
        tokenLabel: "Nhãn token",
        pin: "PIN",
      },
      secretsNote: "Thông tin bí mật chỉ được gửi đến máy chủ và không bao giờ được lưu trong trình duyệt.",
      testTitle: "Kiểm tra PKCS#12",
      testDescription: "Xác thực mật khẩu và chọn một credential được phát hiện.",
      selectAliasLegend: "Chọn alias credential",
      creatingDraft: "Đang tạo bản nháp…",
      testing: "Đang kiểm tra…",
      retest: "Kiểm tra lại",
      testPkcs12: "Kiểm tra PKCS#12",
      draftExpires: (date: string) => `Bản nháp hết hạn lúc ${date}`,
      adapterNotImplementedTitle: "Adapter chưa được triển khai",
      adapterNotImplementedBody:
        "Cấu hình này sẽ được lưu ở trạng thái CHƯA XÁC MINH. Không thể kiểm tra, đồng bộ hoặc dùng để ký cho đến khi có adapter backend.",
      show: "Hiện",
      hide: "Ẩn",
      back: "Quay lại",
      cancel: "Huỷ",
      creatingProvider: "Đang tạo nguồn khoá…",
      createProvider: "Tạo nguồn khoá",
      continueLabel: "Tiếp tục",
      review: {
        type: "Loại",
        displayName: "Tên hiển thị",
        file: "Tệp",
        selectedAlias: "Alias đã chọn",
        endpoint: "Endpoint",
        partition: "Partition",
        keyLabel: "Nhãn khoá",
        accountId: "Account ID",
        profile: "Hồ sơ",
        modulePath: "Đường dẫn module",
        slot: "Slot",
        tokenLabel: "Nhãn token",
      },
      errors: {
        pkcs12NotVerified: "Không thể xác minh bản nháp PKCS#12.",
        pkcs12TestFailed: "Không thể kiểm tra PKCS#12.",
        testFirst: "Hãy kiểm tra tệp PKCS#12 và chọn một alias credential trước.",
        createFailed: "Không thể tạo nguồn khoá.",
      },
      toastSuccessTitle: "Đã tạo nguồn khoá thành công",
    },
    replaceDialog: {
      trigger: "Thay thế PKCS#12",
      dialogLabel: "Thay thế dữ liệu PKCS#12",
      title: "Thay thế dữ liệu PKCS#12",
      passwordPlaceholder: "Mật khẩu PKCS#12",
      selectAliasLegend: "Chọn alias credential",
      cancel: "Huỷ",
      testing: "Đang kiểm tra…",
      testReplacement: "Kiểm tra thay thế",
      saving: "Đang lưu…",
      saveReplacement: "Lưu thay thế",
      concurrentChangeError: "Nguồn khoá đã thay đổi ở phiên khác. Hãy tải lại và thử lại.",
      verifyFailed: "Không thể xác minh tệp PKCS#12 thay thế.",
      testFailedGeneric: "Không thể kiểm tra tệp thay thế.",
      successTitle: "Đã thay thế PKCS#12 thành công",
    },
    actions: {
      test: "Kiểm tra",
      sync: "Đồng bộ",
      enable: "Bật nguồn khoá",
      disable: "Tắt nguồn khoá",
      delete: "Xoá",
      adapterNotImplemented: "Adapter chưa được triển khai",
      deleteConfirm: (name: string) => `Xoá nguồn khoá "${name}"?`,
      genericError: "Không thể cập nhật nguồn khoá.",
    },
    detail: {
      latencyUnavailable: "Chưa có độ trễ",
      latencyMs: (ms: number) => `Độ trễ ${ms} ms`,
      lastChecked: "Kiểm tra lần cuối:",
      version: "Phiên bản",
      configurationTitle: "Cấu hình",
      material: "Vật liệu khoá",
      secret: "Bí mật",
      updated: "Cập nhật",
      credentialsTitle: (n: number) => `Credential (${n})`,
      noCredentials: "Không phát hiện credential nào trên nguồn khoá này.",
      noAlgorithms: "Không có thuật toán",
      defaultBadge: "Mặc định",
      viewCertificate: "Xem chứng chỉ",
      noBoundCertificate: "Không có chứng chỉ liên kết",
      fallbackTitle: "Nguồn khoá",
    },
  },

  systemLogs: {
    tabs: {
      logs: "Nhật ký hệ thống",
      audit: "Vết kiểm toán",
    },
    access: {
      title: "Không đủ quyền truy cập",
      description: "Tài khoản cần quyền log:read để xem nhật ký hệ thống và vết kiểm toán.",
    },
    overview: {
      title: "Không gian điều tra",
      description:
        "Màn hình chỉ chứa các sự kiện WARN và ERROR đã được lưu để điều tra sự cố, không phải toàn bộ log kỹ thuật trên máy chủ.",
      adminNote:
        "Dòng không có tenant là sự kiện mức hệ thống, xảy ra trước khi hệ thống xác định được tenant.",
      retention:
        "Thời gian lưu: ERROR 180 ngày; WARN và INFO 30 ngày. Vết kiểm toán không bị dọn theo lịch.",
    },
    traceSearch: {
      label: "Mở dấu vết của một yêu cầu",
      placeholder: "Dán mã correlation ID",
      submit: "Mở dấu vết",
    },
    filters: {
      title: "Bộ lọc",
      level: "Mức",
      allLevels: "Tất cả mức",
      source: "Nguồn",
      allSources: "Tất cả nguồn",
      range: "Khoảng thời gian",
      last24Hours: "24 giờ gần nhất",
      last7Days: "7 ngày gần nhất",
      last30Days: "30 ngày gần nhất",
      last180Days: "180 ngày gần nhất",
      correlationId: "Mã tra cứu",
      errorCode: "Mã lỗi",
      resourceType: "Loại đối tượng",
      resourceId: "ID đối tượng",
      eventType: "Loại sự kiện",
      actorId: "ID người thực hiện",
      advanced: "Thêm bộ lọc",
      apply: "Áp dụng",
      reset: "Đặt lại",
      exactMatchHint: "ID và mã được khớp chính xác.",
    },
    table: {
      time: "Thời gian",
      level: "Mức",
      source: "Nguồn",
      errorCode: "Mã lỗi",
      message: "Nội dung",
      resource: "Đối tượng",
      correlationId: "Mã tra cứu",
      actor: "Người thực hiện",
      eventType: "Sự kiện",
      details: "Chi tiết",
      actions: "Thao tác",
      viewDetails: "Xem chi tiết log",
      openTrace: "Mở toàn bộ dấu vết",
      filterByCode: (code: string) => `Lọc theo ${code}`,
      emptyLogs: "Không có log hệ thống nào khớp bộ lọc.",
      emptyAudit: "Không có vết kiểm toán nào khớp bộ lọc.",
      loadMore: "Tải thêm",
      loading: "Đang tải…",
      end: "Đã hiển thị hết dữ liệu hiện có.",
    },
    detail: {
      title: "Chi tiết log",
      close: "Đóng chi tiết log",
      message: "Nội dung",
      context: "Ngữ cảnh",
      technical: "Thông tin kỹ thuật",
      stackTrace: "Stack trace",
      noStack: "Sự kiện này không có stack trace.",
      copy: "Sao chép",
      copied: "Đã sao chép",
      viewTrace: "Xem toàn bộ dấu vết",
      malformedContext: "Ngữ cảnh đã lưu không phải JSON hợp lệ.",
      systemScope: "Sự kiện mức hệ thống",
      fields: {
        logger: "Logger",
        exception: "Ngoại lệ",
        request: "Yêu cầu HTTP",
        status: "Trạng thái HTTP",
        duration: "Thời lượng",
        tenant: "Tenant",
        actor: "Người thực hiện",
        resource: "Đối tượng",
      },
    },
    errors: {
      title: "Không thể tải nhật ký",
      generic: "Không thể kết nối tới dịch vụ nhật ký. Hãy thử lại.",
      accessDenied: "Tài khoản không còn quyền đọc nhật ký.",
      invalidCursor: "Con trỏ phân trang đã hết hiệu lực. Danh sách được đưa về dữ liệu mới nhất.",
      notFound: "Không tìm thấy dòng log này.",
      traceNotFound: "Không tìm thấy dấu vết cho mã này.",
    },
    trace: {
      title: "Dấu vết yêu cầu",
      description: "Dòng thời gian của hoạt động người dùng và sự kiện hệ thống",
      copy: "Sao chép mã",
      copied: "Đã sao chép mã tra cứu",
      auditKind: "Vết kiểm toán",
      logKind: "Log hệ thống",
      noData: "Không tìm thấy dấu vết cho mã này.",
      backToLogs: "Quay lại nhật ký hệ thống",
    },
    sources: {
      HTTP: "HTTP",
      SIGNING_JOB: "Tác vụ ký",
      SCHEDULER: "Tác vụ định kỳ",
      VERIFICATION: "Xác minh",
      KEY_SOURCE: "Nguồn khoá",
      TSA: "Dấu thời gian",
      REVOCATION: "Thu hồi",
      NOTIFICATION: "Thông báo",
      SYSTEM: "Hệ thống",
    },
  },

  developers: {
    sandboxBadge: "Sandbox",
    infoNotice: {
      title: "Không gian chẩn đoán",
      description:
        "Nội dung trình kiểm tra là dữ liệu mô phỏng cho đến khi việc phân tích tệp thực tế được kết nối. Máy tính hash là công cụ duy nhất ở đây thực hiện tính toán cục bộ thật.",
    },
    sidebar: {
      title: "Trình gỡ lỗi chữ ký",
      subtitle: "Công cụ kiểm tra và chẩn đoán",
      navAriaLabel: "Điều hướng công cụ nhà phát triển",
    },
    footer: {
      environment: "Môi trường: sandbox",
      sessionNote: "Dữ liệu phiên không được lưu trữ",
    },
    groups: {
      xml: "Chữ ký XML (XAdES)",
      cms: "CMS / PKCS#7",
      container: "Định dạng container",
      pdf: "PDF",
      pki: "PKI",
      utilities: "Tiện ích",
    },
    tools: {
      "xml-viewer": { label: "Xem XML", description: "Mã nguồn XML thô với đánh dấu chữ ký" },
      "canonicalized-xml": { label: "XML đã canonical hoá", description: "Chuyển đổi C14N và các byte đã ký" },
      "signed-info": { label: "SignedInfo", description: "Thuật toán, phép biến đổi và tham chiếu" },
      references: { label: "Xem tham chiếu", description: "Kết quả digest cho từng tham chiếu đã ký" },
      digest: { label: "Digest & SignatureValue", description: "Giá trị digest và chữ ký thô" },
      cms: { label: "Cấu trúc CMS", description: "Cấu trúc CMS SignedData" },
      asn1: { label: "Xem ASN.1", description: "ASN.1 dạng hex và đã giải mã" },
      ooxml: { label: "Khám phá gói OOXML", description: "Các phần trong gói ZIP và nguồn gốc chữ ký" },
      relationships: { label: "Xem Relationship", description: "Quan hệ .rels của OOXML" },
      manifest: { label: "Manifest", description: "Digest manifest theo từng phần" },
      "pdf-byte-range": { label: "PDF ByteRange", description: "Vùng byte đã ký quanh /Contents" },
      "certificate-chain": { label: "Chuỗi chứng chỉ", description: "Đường dẫn từ người ký đến gốc tin cậy" },
      hash: { label: "Máy tính hash", description: "Công cụ digest Web Crypto cục bộ" },
    },
    xmlViewer: { sourceLabel: "Mã nguồn chữ ký XML" },
    canonicalized: {
      note: "Canonical hoá loại bỏ các khác biệt tuần tự hoá không đáng kể trước khi tính digest.",
      label: "Canonical hoá XML độc quyền 1.0",
    },
    signedInfo: {
      canonicalization: "Canonical hoá",
      canonicalizationValue: "Exclusive XML C14N 1.0",
      signatureMethod: "Phương thức ký",
      references: "Tham chiếu",
      referencesValue: "3 tham chiếu đã ký",
      signatureFormat: "Định dạng chữ ký",
    },
    references: {
      uriLabel: (uri: string) => `URI: ${uri}`,
      documentRoot: "(gốc tài liệu)",
      digestMatch: "✓ Digest khớp",
      transforms: "Phép biến đổi",
      digest: "Digest SHA-256",
    },
    digestPanel: {
      digestLabel: "Digest · SHA-256",
      signatureValueLabel: "SignatureValue · RSA-PSS · base64",
      verifiedNote:
        "Xác minh RSA-PSS thành công với khoá công khai của người ký. Đây chỉ là bằng chứng mẫu thử nghiệm.",
    },
    cmsPanel: { label: "CMS SignedData" },
    asn1: { offset: "Offset", bytes: "Byte", ascii: "ASCII" },
    ooxml: {
      part: "Phần trong gói",
    },
    relationships: {
      columns: { id: "ID", type: "Loại", target: "Đích", mode: "Chế độ" },
      internal: "Nội bộ",
    },
    manifest: {
      columns: { number: "#", part: "Phần trong gói", algorithm: "Thuật toán", digest: "Digest", result: "Kết quả" },
      match: "✓ Khớp",
    },
    pdfByteRange: {
      ariaLabel: "Chữ ký PDF bao phủ hai vùng byte cách nhau bởi trường Contents",
      signedRange1: "Vùng đã ký 1",
      signedRange2: "Vùng đã ký 2",
      note: "Vị trí giữ chỗ `/Contents` của PDF được loại trừ khỏi digest. Các vùng byte còn lại được băm và nằm trong phạm vi chữ ký.",
    },
    certChain: {
      nodes: {
        root: { name: "Gov Root CA G3", detail: "Gốc tự ký · gốc tin cậy" },
        intermediate: { name: "Treasury Issuing CA", detail: "Trung gian · được cấp bởi Gov Root CA G3" },
        leaf: { name: "A. Torres (người ký)", detail: "Lá · được cấp bởi Treasury Issuing CA" },
      },
      status: { trusted: "Tin cậy", valid: "Hợp lệ", signer: "Người ký" },
    },
    hash: {
      note: "Việc băm chạy cục bộ qua Web Crypto API của trình duyệt. Dữ liệu nhập không được gửi lên máy chủ bởi thành phần này.",
      inputLabel: "Văn bản đầu vào",
      inputPlaceholder: "Dán văn bản để tính digest…",
      algorithmLegend: "Thuật toán digest",
      weakWarning: "SHA-1 chỉ dùng cho chẩn đoán hệ thống cũ. Không dùng cho chữ ký mới.",
      compute: "Tính hash",
      digestLabel: (algorithm: string) => `Digest ${algorithm}`,
      copy: "Sao chép",
      copiedTitle: "Đã sao chép",
    },
    copyable: { copy: "Sao chép", copiedTitle: "Đã sao chép" },
  },

  signingHistory: {
    filters: {
      legend: "Bộ lọc",
      fromDate: "Từ ngày",
      toDate: "Đến ngày",
      keySource: "Nguồn khoá",
      allKeySources: "Tất cả nguồn khoá",
      status: "Trạng thái",
      allStatuses: "Tất cả trạng thái",
      onlyStored: "Chỉ phiên ký còn lưu file",
      apply: "Áp dụng",
      clear: "Xoá lọc",
      invalidRange: "Ngày bắt đầu phải trước ngày kết thúc.",
      activeNote: "Bộ lọc chạy trên server cho toàn bộ lịch sử, không chỉ trang hiện tại.",
    },
    pagination: {
      ariaLabel: "Phân trang lịch sử ký",
      previous: "Trang trước",
      next: "Trang sau",
      page: (n: number) => `Trang ${n}`,
      cursorReset: "Liên kết phân trang đã hết hiệu lực. Đang hiển thị lại trang đầu.",
    },
    table: {
      empty: "Không tìm thấy phiên ký nào.",
      emptyStored: "Không có phiên ký nào còn lưu file. File bị xóa khi vượt dung lượng lưu trữ của tenant.",
      columns: {
        status: "Trạng thái",
        standard: "Chuẩn ký",
        level: "Mức cơ sở",
        algorithm: "Thuật toán",
        keySource: "Nguồn khoá",
        certificate: "Chứng chỉ",
        createdAt: "Ngày tạo",
        completedAt: "Ngày hoàn tất",
        actions: "",
      },
    },
    status: {
      QUEUED: "Đang chờ",
      PROCESSING: "Đang xử lý",
      AWAITING_AUTHORIZATION: "Chờ uỷ quyền",
      COMPLETED: "Hoàn tất",
      FAILED: "Thất bại",
      CANCELLED: "Đã huỷ",
    },
    keySourceType: {
      PKCS12: "PKCS#12",
      REMOTE_CA: "CA từ xa",
      REMOTE_HSM: "HSM từ xa",
      USB_TOKEN: "USB Token",
    },
    evicted: "Đã dọn dẹp",
    evictedTooltip: "File đã bị xóa do vượt dung lượng lưu trữ. Thông tin phiên ký vẫn được giữ lại.",
    resultAvailable: "File khả dụng",
    downloadResult: "Tải file đã ký",
    downloadEvidence: "Tải bằng chứng ký",
    downloading: "Đang tải…",
    retry: "Thử lại",
    loading: "Đang tải lịch sử ký…",
    loadFailed: "Không thể tải lịch sử ký.",
    detail: {
      title: "Chi tiết phiên ký",
      status: "Trạng thái",
      createdAt: "Thời gian tạo",
      completedAt: "Thời gian hoàn tất",
      standard: "Chuẩn chữ ký",
      level: "Mức cơ sở",
      algorithm: "Thuật toán",
      signatureMode: "Chế độ ký",
      keySourceType: "Loại nguồn khoá",
      certificate: "Dấu vân tay chứng chỉ",
      attempt: "Lần thử",
      retryOf: "Thử lại từ",
      jobId: "Mã phiên ký",
      clientReference: "Tham chiếu",
      errorCode: "Mã lỗi",
      errorDetail: "Chi tiết lỗi",
      close: "Đóng",
      signatureModeCo: "Đồng ký",
      signatureModeCounter: "Ký phản",
    },
    toast: {
      downloadFailedTitle: "Tải thất bại",
      downloadFailedBody: "Không thể tải file. File có thể đã bị xóa.",
      retryFailedTitle: "Thử lại thất bại",
    },
    correlationId: (id: string) => `Correlation ID: ${id}`,
  },

  /**
   * QUYỀN KÝ ĐỘC QUYỀN (signing lease) — dùng chung cho màn ký nội bộ và màn ký
   * công khai, vì cả hai nói về đúng một cơ chế của backend.
   *
   * Câu chữ cố ý KHÔNG nhắc tới "lease": người ký không cần biết tên cơ chế, họ
   * cần biết bây giờ chờ hay bấm được. Riêng nhánh `lockedByBody` (có tên người
   * đang ký) CHỈ màn nội bộ dùng — xem `SigningLeasePanel`.
   */
  signingLease: {
    checking: "Đang kiểm tra lượt ký…",
    lockedTitle: "Đang có người khác ký",
    lockedBody:
      "Một người ký khác đang ký tài liệu này. Vui lòng chờ người ký hiện tại hoàn tất — màn hình tự cập nhật khi lượt ký khả dụng.",
    lockedByBody: (holder: string) =>
      `${holder} đang ký tài liệu này. Vui lòng chờ — màn hình tự cập nhật khi lượt ký hoàn tất.`,
    lockedRetryHint: (seconds: number) =>
      `Lượt ký hiện tại còn tối đa ${Math.max(1, Math.ceil(seconds / 60))} phút.`,
    heldTitle: "Bạn đang có một lượt ký đang mở",
    heldBody:
      "Dịch vụ ký ghi nhận một lượt ký của bạn còn dở — thường là do tải lại trang hoặc mở ở một tab khác. Huỷ lượt cũ để bắt đầu lại từ đầu.",
    cancel: "Huỷ lượt cũ và bắt đầu lại",
    cancelling: "Đang huỷ…",
    errorTitle: "Không kiểm tra được trạng thái lượt ký",
    errorBody:
      "Chưa biết lượt ký này có đang trống hay không, nên chưa cho ký. Thử lại sau giây lát.",
    retry: "Thử lại",

    /** Câu ngắn nằm dưới nút Ký, nói vì sao nó đang tắt. */
    action: {
      checking: "Đang kiểm tra trạng thái lượt ký…",
      locked: "Người ký khác đang ký tài liệu này.",
      held: "Huỷ lượt ký đang mở trước khi ký lại.",
      unavailable: "Chưa kiểm tra được trạng thái lượt ký.",
    },

    /** `SIGNING_LEASE_LOCKED` — thua cuộc đua ngay tại lệnh ký. */
    lockedNowTitle: "Người khác vừa bắt đầu ký trước",
    lockedNowBody:
      "Lượt ký vừa được chuyển cho người ký khác trong đúng giây bạn bấm. Chưa có gì của bạn được gửi đi — màn hình sẽ tự mở lại khi tới lượt bạn.",

    /** `SIGNING_LEASE_LOST` — lượt ký đang dở không còn hợp lệ. */
    lostTitle: "Lượt ký đã kết thúc",
    lostBody:
      "Lượt ký đã hết hạn hoặc được chuyển cho người khác. Mọi bước đang dở đã bị bỏ — vui lòng bắt đầu lại từ đầu khi lượt ký khả dụng.",
  },

  externalSign: {
    meta: {
      title: "Ký tài liệu",
      description: "Xem tài liệu và ký — không cần tài khoản",
    },

    chrome: {
      brand: "FIS CA",
      subtitle: "Ký tài liệu điện tử",
      publicBadge: "Liên kết ký dành riêng cho bạn",
      secureNote: "Không cần đăng nhập. Liên kết này chỉ ký đúng một chữ ký — của bạn.",
      sessionExpiresIn: (remaining: string) => `Phiên còn ${remaining}`,
      sessionEndingSoon: "Phiên sắp hết hạn",
      sessionExpired: "Phiên đã hết hạn",
      sessionExpiredBody:
        "Chưa có gì được ký. Mở lại liên kết trong email của bạn để bắt đầu phiên mới.",
    },

    demo: {
      badge: "Bản mô phỏng",
      title: "Bản mô phỏng giao diện — không có gì được ký",
      body:
        "Nhóm endpoint ký công khai hiện là contract mục tiêu, chưa được cài vào dịch vụ ký, nên trang này đang chạy trên dữ liệu giả dựng ngay tại trình duyệt. Không lời gọi nào đi ra và không chữ ký nào được tạo.",
      scenarios:
        "Thêm kịch bản vào liên kết để xem các trạng thái khác: #demo=1&t=expired, t=invalid, t=notcurrent, t=signed, t=changed, t=conflict (người cùng cấp ký trước), t=locked (người khác đang giữ lượt ký).",
    },

    loading: {
      title: "Đang mở liên kết ký của bạn",
      body: "Đang kiểm tra liên kết và tải tài liệu. Việc này mất một lát.",
    },

    unavailable: {
      whatNow: "Việc cần làm",
      contactSender: "Liên hệ người đã gửi tài liệu cho bạn để nhận liên kết mới.",
      retry: "Thử lại",
      codeLabel: "Mã lỗi",
      correlationLabel: (id: string) => `Mã tra cứu: ${id}`,
    },

    errors: {
      unknownTitle: "Đã xảy ra lỗi",
      unknownBody: "Vui lòng thử lại. Nếu vẫn vậy, hãy liên hệ người gửi tài liệu.",
      EXTERNAL_SIGNING_NO_SESSION: {
        title: "Trang này cần một liên kết ký",
        body: "Hãy mở liên kết trong email hoặc tin nhắn bạn nhận được. Liên kết đó mang mã xác định bạn là ai.",
      },
      EXTERNAL_SIGNING_TOKEN_INVALID: {
        title: "Liên kết không hợp lệ",
        body: "Có thể liên kết bị gõ sai, bị trình email cắt ngắn, hoặc đã bị thay bằng một liên kết mới hơn.",
      },
      EXTERNAL_SIGNING_FORBIDDEN: {
        title: "Phiên này không ký được",
        body: "Dịch vụ ký không còn tin phiên hiện tại. Mở lại liên kết của bạn để bắt đầu phiên mới.",
      },
      EXTERNAL_SIGNING_LINK_EXPIRED: {
        title: "Liên kết đã hết hạn",
        body: "Liên kết ký chỉ có hiệu lực trong một thời gian nhất định. Chưa có gì được ký.",
      },
      EXTERNAL_SIGNING_CSRF_MISSING: {
        title: "Tab này không ký được",
        body: "Bạn vẫn đọc được tài liệu, nhưng khoá của phiên ký đã mất — chuyện này xảy ra khi mở lại trang ở một tab mới. Hãy mở lại liên kết của bạn để ký.",
      },
      EXTERNAL_SIGNING_API_NOT_CONFIGURED: {
        title: "Hiện chưa ký được",
        body: "Trang này chưa kết nối được tới dịch vụ ký. Vui lòng báo người gửi tài liệu.",
      },
      EXTERNAL_SIGNING_API_UNREACHABLE: {
        title: "Không kết nối được tới dịch vụ ký",
        body: "Thường chỉ là tạm thời. Thử lại sau một phút.",
      },
      SIGNER_NOT_CURRENT: {
        title: "Chưa tới lượt bạn ký",
        body: "Còn người phải ký trước bạn. Khi họ ký xong, bạn dùng đúng liên kết này là ký được.",
      },
      SIGNING_DOCUMENT_CHANGED: {
        title: "Tài liệu đã thay đổi",
        body: "Tài liệu bị sửa sau khi liên kết của bạn được tạo, nên liên kết này không còn khớp. Hãy xin người gửi một liên kết mới.",
      },
      SIGNER_ALREADY_PROCESSED: {
        title: "Bạn đã ký tài liệu này",
        body: "Không cần làm gì thêm. Người gửi đã nhận được chữ ký của bạn.",
      },
      SIGNING_LEASE_LOCKED: {
        title: "Người khác đang ký tài liệu này",
        body: "Lượt ký vừa được chuyển cho một người ký khác. Chờ họ hoàn tất rồi ký lại — không cần mở lại liên kết.",
      },
      SIGNING_LEASE_LOST: {
        title: "Lượt ký của bạn đã kết thúc",
        body: "Lượt ký đã hết hạn hoặc được chuyển cho người khác. Hãy bắt đầu lại từ đầu khi lượt ký khả dụng.",
      },
      SIGNING_ALREADY_STARTED: {
        title: "Đang có một lượt ký chưa xong",
        body: "Hãy tiếp tục lượt ký đó bên dưới thay vì bắt đầu lại.",
      },
      SIGNING_NOT_STARTED: {
        title: "Lượt ký đó không còn hiệu lực",
        body: "Hãy ký lại từ đầu.",
      },
      SIGN_REQUEST_INVALID: {
        title: "Kiểm tra lại thông tin bạn nhập",
        body: "Có thông tin ký còn thiếu hoặc chưa khớp. Xem lại các ô rồi thử lại.",
      },
      SIGNED_DOCUMENT_MISSING: {
        title: "Không lưu được chữ ký",
        body: "Đừng thử lại ngay — hãy liên hệ người gửi để họ kiểm tra với bộ phận hỗ trợ.",
      },
    },

    summary: {
      title: "Bạn đang ký",
      documentLabel: "Tài liệu",
      signerLabel: "Ký với tư cách",
      orderLabel: "Lượt của bạn",
      order: (position: number) => `Người ký thứ ${position}`,
      checksumLabel: "Mã kiểm tra tài liệu",
      checksumHint:
        "Mã này ứng với đúng tệp bạn đang xem. Nếu người gửi đọc cho bạn một mã khác, đừng ký.",
      statusPending: "Đang chờ bạn ký",
      statusSigned: "Đã ký",
      statusDeclined: "Đã từ chối",
    },

    steps: {
      navLabel: "Các bước ký",
      stepOf: (current: number, total: number) => `Bước ${current}/${total}`,
      lockedHint: "Hoàn tất các bước trước để mở bước này.",
      review: {
        label: "Đọc",
        title: "Đọc tài liệu",
        description: "Xem hết tài liệu, rồi xác nhận bạn đồng ý ký.",
      },
      method: {
        label: "Cách ký",
        title: "Bạn muốn ký bằng cách nào?",
        description: "Chọn thứ bạn đang có — mỗi cách ghi rõ cần những gì.",
      },
      credential: {
        label: "Thông tin",
        title: "Thông tin để ký",
        description: "Điền những gì cách ký bạn vừa chọn cần ở bạn.",
      },
      sign: {
        label: "Ký",
        title: "Đặt chữ ký của bạn",
        description: "Xem lại lần cuối, rồi ký.",
      },
    },

    viewer: {
      title: "Tài liệu",
      loading: "Đang tải tài liệu…",
      errorTitle: "Không tải được tài liệu",
      retry: "Tải lại",
      page: (current: number, total: number) => `Trang ${current}/${total}`,
      previous: "Trang trước",
      next: "Trang sau",
      zoomIn: "Phóng to",
      zoomOut: "Thu nhỏ",
      signatureBadge: "Chữ ký của bạn",
      signatureOnPage: (page: number) => `Chữ ký của bạn nằm ở trang ${page}`,
      goToSignature: "Đến vị trí ký của tôi",
      pageHasSignature: "Trang này có chữ ký",
      extraSlots: (count: number) =>
        `Tài liệu này có ${count} ô chữ ký của bạn. Tất cả đều đã được đánh dấu.`,
      nonPdfTitle: "Không xem trước được định dạng này",
      nonPdfBody:
        "Bạn vẫn ký được. Nếu cần đọc kỹ trước, hãy xin người gửi một bản để xem.",
    },

    consent: {
      title: "Trước khi ký",
      checkbox: "Tôi đã đọc và đồng ý ký tài liệu này",
      hint: "Chữ ký điện tử của bạn có giá trị pháp lý như chữ ký tay.",
      scrollNote: "Hãy xem hết các trang — chữ ký có hiệu lực với toàn bộ tài liệu.",
    },

    method: {
      title: "Bạn muốn ký bằng cách nào?",
      note: "Người gửi quyết định những cách ký được phép dùng cho tài liệu này.",
      requirementLabel: "Bạn cần có",
      pkcs12: {
        label: "Tệp chứng thư (.p12 / .pfx)",
        description: "Bạn đang giữ tệp chứng thư và mật khẩu của nó.",
        requirement: "Tệp .p12 hoặc .pfx và mật khẩu của tệp",
      },
      mpki: {
        label: "Ứng dụng FPT MPKI",
        description: "Bạn xác nhận chữ ký trên điện thoại.",
        requirement: "Ứng dụng FPT MPKI đã đăng nhập trên điện thoại",
      },
      signCloud: {
        label: "FPT eSign Cloud",
        description: "Bạn xác nhận danh tính rồi nhập mã OTP.",
        requirement: "Thông tin CCCD và số điện thoại đã đăng ký với FPT",
      },
      usbToken: {
        label: "FPT USB Token",
        description: "Bạn ký bằng chứng thư nằm trong USB Token.",
        requirement:
          "USB Token đang cắm vào máy này, mã PIN của nó, và FPT-CA Signing Agent đang chạy",
      },
      /** Hiện trên cách ký mà định dạng tài liệu loại trừ — USB Token chỉ ký PDF. */
      unsupportedForFormat: "Không dùng được với định dạng tệp này",
    },

    pkcs12: {
      title: "Tệp chứng thư PKCS#12 (.p12 / .pfx)",
      fileLabel: "Tệp chứng thư",
      chooseFile: "Chọn tệp",
      replaceFile: "Đổi tệp",
      noFile: "Chưa chọn tệp",
      passwordLabel: "Mật khẩu của tệp",
      passwordPlaceholder: "Mật khẩu bảo vệ tệp chứng thư",
      aliasLabel: "Tên khoá (không bắt buộc)",
      aliasPlaceholder: "Để trống để dùng khoá đầu tiên",
      aliasHint: "Chỉ cần điền khi trong tệp có nhiều hơn một chứng thư.",
      privacyNote:
        "Tệp và mật khẩu được gửi đúng một lần để tạo chữ ký này, trang này không lưu lại.",
    },

    mpki: {
      usernameLabel: "Tên đăng nhập MPKI",
      usernamePlaceholder: "Tài khoản bạn dùng trong ứng dụng FPT MPKI",
      loadCredentials: "Tìm chứng thư của tôi",
      changeAccount:"Đổi tài khoản",
      loading: "Đang tìm…",
      credentialSelectLabel: "Chứng thư",
      chooseCredential: "— Chọn chứng thư —",
      multipleWarning:
        "Tìm thấy nhiều hơn một chứng thư. Hãy chọn đúng cái bạn muốn dùng — chữ ký mang danh tính của chứng thư đó.",
      loadFailed: "Không liệt kê được chứng thư của bạn",
      empty: "Không có chứng thư nào đăng ký với tên đăng nhập này. Hãy kiểm tra lại.",
      manualHint:
        "Bạn cũng có thể tự gõ mã chứng thư nếu đã biết — để trống khi bạn chỉ có một chứng thư.",
      credentialLabel: "Mã chứng thư (không bắt buộc)",
      credentialPlaceholder: "Để trống nếu bạn chỉ có một chứng thư",
      credentialHint: "Chỉ điền khi FPT cấp cho bạn nhiều hơn một chứng thư.",
      note: "Sau khi bấm Ký, hãy để trang này mở và xác nhận yêu cầu trong ứng dụng.",
    },

    signCloud: {
      haveCertificate: "Tôi đã có chứng thư eSign Cloud",
      needCertificate: "Tôi cần cấp chứng thư mới",
      agreementLabel: "Mã chứng thư (agreementUuid)",
      agreementPlaceholder: "Mã FPT đã cấp cho bạn",
      agreementHint: "Mã này được gửi cho bạn khi chứng thư được cấp.",
      enrollmentTitle: "Đăng ký chứng thư",
      enrollmentHint:
        "FPT cấp chứng thư mang tên bạn từ những thông tin này. Chúng đi tới nhà cung cấp chứng thư, trang này không giữ lại.",
      personalNameLabel: "Họ và tên",
      citizenIdLabel: "Số CCCD",
      mobileLabel: "Số điện thoại",
      emailLabel: "Email",
      locationLabel: "Thành phố (không bắt buộc)",
      provinceLabel: "Tỉnh/Thành (không bắt buộc)",
      countryLabel: "Quốc gia",
      imagesTitle: "Ảnh giấy tờ",
      imagesHint: "Hai mặt CCCD phải đọc được. Ảnh chân dung không bắt buộc.",
      /*
       * Mỗi nhãn một từ. Ba ô này nằm cạnh nhau trong cột rộng 23.5rem, và nhãn
       * nào dài đủ để xuống dòng là ô đó cao hơn hai ô kia — tiêu đề ngay trên
       * đã nói đây là ảnh giấy tờ rồi.
       */
      frontLabel: "Mặt trước",
      backLabel: "Mặt sau",
      faceLabel: "Chân dung",
      chooseImage: "Chọn ảnh",
      replaceImage: "Đổi ảnh",
      removeImage: "Bỏ ảnh",
      imageTooLarge: "Ảnh này quá lớn dù đã được thu nhỏ. Hãy thử một ảnh nhẹ hơn.",
      imageNotImage: "Hãy chọn một tệp ảnh.",
      imageUnreadable:
        "Không đọc được ảnh này. Ảnh HEIC của iPhone thường bị lỗi — hãy thử ảnh JPG.",
      required: "Bắt buộc",
      requiredLegend: "Bắt buộc",

      /* Đăng ký — đường duy nhất để có mã chứng thư. */
      enroll: "Yêu cầu cấp chứng thư",
      enrolling: "Đang gửi…",
      enrollFailed: "Không gửi được yêu cầu cấp chứng thư",
      requiredMissing: "Hãy điền đủ các ô có dấu * và nộp cả hai mặt CCCD.",
      enrollHint:
        "FPT kiểm tra những thông tin này rồi cấp chứng thư mang tên bạn. Bước sau bạn xác nhận danh tính trên trang của họ.",
      agreementIssued: "Đã gửi yêu cầu cấp chứng thư",
      agreementReadyTitle: "Chứng thư của bạn đã sẵn sàng",
      agreementRestart: "Làm lại với thông tin khác",
      confirmTitle: "Xác nhận danh tính",
      confirmBody:
        "Hãy mở trang của nhà cung cấp chứng thư và xác nhận thông tin ở đó. Xong thì quay lại tab này — trang sẽ tự kiểm tra giúp bạn.",
      openSic: "Mở trang xác nhận danh tính",
      sicWaiting: "Đang chờ trang đó…",
      sicBlocked: "Trình duyệt đã chặn cửa sổ bật lên. Hãy dùng liên kết bên dưới.",
      sicOpenManually: "Mở trang xác nhận ở tab mới",
      checkStatus: "Kiểm tra chứng thư của tôi",
      checking: "Đang kiểm tra…",
      checkAgain: "Kiểm tra lại",
      statusFailed: "Không đọc được trạng thái chứng thư",
      notReadyYet:
        "Chưa xác nhận xong. Hãy hoàn tất phần xác nhận danh tính trên trang của nhà cung cấp chứng thư rồi kiểm tra lại.",
    },

    /**
     * USB Token — câu chữ dành cho khách ở bước điền thông tin. Hộp thoại ký thì
     * dùng chung với màn `/sign` nên vẫn đọc `sign.usbToken`.
     */
    usbToken: {
      title: "FPT USB Token",
      checkAgent: "Thử kết nối",
      agentChecking: "Đang thử…",
      agentReady: (count: number) =>
        `Signing Agent đã trả lời — tìm thấy ${count} chứng thư trong token của bạn.`,
      noCertificates:
        "Không tìm thấy chứng thư dùng được. Hãy kiểm tra token đã cắm vào máy và driver đã nhận nó chưa.",
      errorUnreachable:
        "Không kết nối được tới FPT-CA Signing Agent ở localhost:14211. Hãy cài và chạy phần mềm đó, rồi thử lại.",
      errorGeneric: "Không đọc được USB Token.",
      note: "Trình duyệt nói chuyện thẳng với Signing Agent trên máy bạn. Không có thông tin nào của token được gửi đi đâu cả.",
      signerNameNote:
        "Tên trên chữ ký là tên trong chứng thư nằm trong token của bạn — trang này không hỏi tên bao giờ.",
      pinNote:
        "Mã PIN chỉ được nhập trong cửa sổ của FPT-CA. Trang này không hỏi và không lưu mã PIN.",
    },

    action: {
      signButton: "Ký tài liệu",
      signing: "Đang ký…",
      needConsent: "Hãy xác nhận bạn đã đọc tài liệu trước.",
      needMethod: "Hãy chọn cách bạn muốn ký.",
      needFields: "Hãy điền các ô ở trên.",
      cannotSign: "Tab này không ký được — hãy mở lại liên kết của bạn.",
      expired: "Phiên đã hết hạn. Hãy mở lại liên kết của bạn.",
      reloadingDocument: "Đang tải bản tài liệu mới nhất…",
      declineNote: "Nếu bạn không muốn ký, chỉ cần đóng trang này và báo lại người gửi.",
    },

    /** Có người ký cùng lúc với bạn: tài liệu đổi giữa chừng, ký lại là xong. */
    stale: {
      title: "Tài liệu vừa được cập nhật",
      body: "Một người ký cùng bước với bạn vừa ký xong ngay trước đó nên tài liệu đã đổi. Bản mới nhất đang được tải về — bạn ký lại là chữ ký vào đúng bản đó.",
    },

    resume: {
      title: "Bạn có một lượt ký đang dở",
      description:
        "Bạn đã bắt đầu ký bằng eSign Cloud và chưa hoàn tất. Tiếp tục để không phải làm lại từ đầu.",
      dismiss: "Bỏ qua",
      resume: "Tiếp tục",
    },

    pending: {
      close: "Đóng",
      working: "Đang xử lý…",
      appTitle: "Đang chờ bạn xác nhận",
      appBody:
        "Mở ứng dụng FPT MPKI trên điện thoại và xác nhận yêu cầu. Hãy để trang này mở.",
      identityTitle: "Xác nhận danh tính",
      identityBody:
        "Mở trang của nhà cung cấp chứng thư, xác nhận thông tin của bạn, rồi quay lại đây bấm tiếp tục.",
      identityDoneTitle: "Sẵn sàng cho bước sau",
      identityDoneBody: "Bấm tiếp tục để nhận mã OTP.",
      openIdentity: "Mở trang xác nhận danh tính",
      continueButton: "Tôi đã xác nhận — tiếp tục",
      continueNote: "Bước này mở giao dịch ký tại nhà cung cấp chứng thư.",
      otpTitle: "Nhập mã OTP",
      otpBody:
        "Trang của nhà cung cấp chứng thư sẽ hỏi mã gửi về điện thoại của bạn. Xong ở đó thì trang này tự lấy chữ ký về.",
      otpReadyTitle: "Mở trang nhập mã",
      otpReadyBody: "Nhập mã OTP để hoàn tất chữ ký.",
      openOtp: "Mở trang nhập mã",
      checkResult: "Kiểm tra kết quả",
      otpNotDone:
        "Chưa có chữ ký — trang nhập mã bị đóng trước khi xong. Hãy mở lại và nhập mã cho đủ.",
      popupBlocked: "Trình duyệt của bạn đã chặn cửa sổ phụ. Hãy dùng liên kết bên dưới.",
      expiresIn: (remaining: string) => `Còn lại: ${remaining}`,
      expired: "Đã hết thời gian — hãy làm lại.",
    },

    completed: {
      title: "Đã ký xong",
      body: "Chữ ký của bạn đã được thêm vào tài liệu và gửi lại cho người gửi.",
      documentLabel: "Tài liệu",
      signerLabel: "Người ký",
      signedAtLabel: "Thời điểm ký",
      download: "Tải một bản về máy",
      downloadHint: "Để bạn lưu lại. Người gửi đã có bản đã ký.",
      noCopyNote: "Người gửi đã có bản đã ký. Cần một bản cho mình thì hãy hỏi họ.",
      closeHint: "Bạn có thể đóng trang này.",
    },
  },
};
