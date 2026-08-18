// lib/i18n/dictionaries/en.ts
export const en = {
  common: {
    cancel: "Cancel",
    close: "Close",
    save: "Save",
    copy: "Copy",
    copied: "Copied",
    loading: "Loading…",
    loadMore: "Load more",
    viewAll: "View all",
    manage: "Manage",
    back: "Back",
    continueLabel: "Continue",
    yes: "Yes",
    no: "No",
    unknown: "Unknown",
    notConfigured: "Not configured",
    configured: "Configured",
    never: "Never",
  },

  routes: {
    home: {
      label: "Home",
      title: "FIS CA Signing Tool",
      description: "Pick a workspace — signing, signing requests, or verification",
    },
    login: {
      label: "Login",
      title: "Login to Sigil System",
      description: "The only way that you can log into the system!",
    },
    dashboard: {
      label: "Dashboard",
      title: "Dashboard",
      description: "Organization-wide signing, verification & PKI health",
    },
    sign: {
      label: "Sign",
      title: "Sign Document",
      description:
        "Sign a document with policy-filtered standards and a governed key source",
    },
    signRequest: {
      label: "Sign request",
      title: "Signing Request",
      description:
        "Attach a document, lay out who signs in which order, then send the request out",
    },
    verify: {
      label: "Verify",
      title: "Verify Signature",
      description:
        "Validate authenticity, integrity and legal validity of a signed artifact",
    },
    certificates: {
      label: "Certificate Explorer",
      title: "Certificate Explorer",
      description:
        "Inventory, import, trust and lifecycle for every certificate on the platform",
    },
    trustManagement: {
      label: "Trust Management",
      title: "Trust Management",
      description:
        "Govern trusted certificate authorities, publication versions and revocation network access",
    },
    accountManagement: {
      label: "Accounts & Access",
      title: "Account Management",
      description:
        "Create and secure tenant accounts, assign roles, and explain effective access",
    },
    keyProviders: {
      label: "Key Provider Manager",
      title: "Key Provider Management",
      description:
        "Connect and govern HSMs, tokens, key stores and cloud KMS — keys never leave custody",
    },
    developers: {
      label: "Developers",
      title: "Developer Tools",
      description: "API credentials, sandbox, and the signature inspection toolbox",
    },
    signingHistory: {
      label: "Signing History",
      title: "Signing History",
      description: "Browse completed, failed and in-progress signing jobs with download and retry",
    },
    systemLogs: {
      label: "Logs",
      title: "System Logs",
      description: "Investigate operational failures, audit activity, and complete request traces",
    },
  },

  nav: {
    keysAndCertificates: "Keys & Certificates",
    administration: "Administration",
    developerDocs: "Docs",
    primaryLabel: "Primary",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    navigationTitle: "Navigation",
    backToHome: "Home",
    open: "Open",
    home:"Home",
    openNavigation:"Open navigation",
    openSettings:"Open settings",
    mobileNavigationTitle:"Navigation",
    mobileNavigationDescription:"Move between application screens.",
    settingsTitle:"Settings",
    settingsDescription:"Application preferences.",
    language:"Language",
    languageDescription:"Interface language.",
    theme:"Theme",
    themeDescription:"Interface appearance."
  },

  shell: {
    search: {
      trigger: "Search…",
      ariaLabel: "Search (opens command palette)",
    },
    commandPalette: {
      placeholder: "Search pages…",
      ariaLabel: "Search pages",
      dialogLabel: "Command palette",
      navigateGroup: "NAVIGATE",
      noResults: (query: string) => `No pages match “${query}”.`,
    },
    notifications: {
      ariaLabel: (unread: number) =>
        unread > 0 ? `Notifications (${unread} unread)` : "Notifications",
      panelTitle: "Notifications",
      empty: "No notifications.",
      severity: { danger: "Critical", warning: "Warning", info: "Info" },
      markRead: "Mark as read",
      markAllRead: "Mark all as read",
    },
    theme: {
      ariaLabel: "Color theme",
      light: "Light",
      dark: "Dark",
      system: "System",
    },
    language: {
      ariaLabel: "Language",
    },
    account: {
      ariaLabel: (name: string) => `Account: ${name}`,
      panelLabel: "Account",
      sessionNote:
        "Signed in — all actions are attributed to this identity in the audit log.",
      logOut: "Log out",
      confirmTitle: "Log out of Sigil?",
      confirmBody:
        "You will need to sign in again to continue signing, verifying and managing certificates.",
      confirmCancel: "Cancel",
      confirmSubmit: "Log out",
      confirmPending: "Logging out…",
      confirmDialogLabel: "Confirm log out",
      unavailableLabel: "Session identity unavailable",
    },
    backendStatus: {
      offlineTitle: "Can't reach the Sigil server",
      offlineDescription:
        "Some data may be missing. The app will reconnect automatically.",
      retry: "Retry",
      checking: "Checking…",
      contentTitle: "This page needs the Sigil server",
      contentDescription:
        "Nothing can be loaded while the server is unreachable. The page will load itself as soon as the connection is back — no need to reload.",
    },
    shortcutHelp: {
      dialogLabel: "Keyboard shortcuts",
      title: "Keyboard shortcuts",
      close: "Close keyboard shortcuts",
      items: [
        { keys: "Ctrl/⌘ K", action: "Open command palette" },
        { keys: "?", action: "Show keyboard shortcuts" },
        { keys: "Esc", action: "Close palette / help / active overlay" },
      ],
      footer:
        "Go-to chords (G then D/S/V/K/Y/T) are specified in the UI spec for a later iteration.",
    },
    skipToContent: "Skip to main content",
    breadcrumbHome: "Home",
    toast: {
      regionLabel: "Notifications",
      close: "Close notification",
    },
    flash: {
      loginSuccessTitle: "Logged in successfully",
      loginSuccessDescription: "Welcome back to Sigil.",
      logoutSuccessTitle: "Logged out",
      logoutSuccessDescription: "Your session ended safely.",
    },
  },

  notFound: {
    eyebrow: "404 — Not found",
    title: "This page doesn't exist",
    description: "The address may be wrong, or the screen hasn't been built yet.",
    cta: "Go to Dashboard",
  },

  errorPage: {
    ariaLabel: "Page error",
    title: "Something went wrong on this page",
    description:
      "The rest of the application is unaffected. You can retry, or use the navigation above to continue elsewhere.",
    retry: "Try again",
  },

  auth: {
    left: {
      productLine: "DIGITAL SIGNATURE PLATFORM",
      heading: "Sign, seal and verify — without leaving the security boundary.",
      description:
        "Private keys stay inside the HSM. Every signing action is timestamped and recorded in an immutable audit log.",
    },
    right: {
      heading: "Log in",
      subheading: "Access your signing dashboard.",
    },
    sso: "Continue with enterprise SSO",
    passkey: "Log in with Passkey",
    comingSoon: "Coming soon — no backend support yet",
    orEmail: "OR EMAIL",
    emailLabel: "Work email",
    emailPlaceholder: "you@company.com",
    passwordLabel: "Password",
    forgotPassword: "Forgot password?",
    forgotPasswordTitle: "Contact an administrator to reset your password — no self-service flow yet",
    showPassword: "Show password",
    hidePassword: "Hide password",
    rememberDevice: "Remember this device for 30 days",
    submit: "Log in",
    submitting: "Logging in…",
    noAccount: "Don't have an account?",
    contactAdmin: "Contact an administrator",
    tlsNote: "TLS 1.3 encrypted connection",
  },

  dashboard: {
    summaryAriaLabel: "Platform summary",
    kpis: {
      signaturesRecent: "Signatures · recent",
      signaturesTrend: "+12.4% vs prior period",
      verificationSuccess: "Verification success",
      checkedCount: (n: number) => `${n} checked`,
      activeJobs: "Active jobs",
      activeJobsDetail: "Queued or signing",
      blockedJobs: "Blocked jobs",
      blockedJobsAttention: "Requires operator attention",
      blockedJobsNone: "No blocked signing jobs",
    },
    infraAlert: {
      unreachable: (name: string) => `${name} is unreachable.`,
      degraded: (name: string) => `${name} is degraded.`,
      blockedDetail: (n: number) => `${n} signing jobs are currently blocked.`,
      reviewHealth: "Review provider health and recent connection checks.",
      reviewProvider: "Review provider",
    },
    signingVolume: {
      title: "Signing volume",
      subtitle: "Successful signatures during the last seven days",
      rangeLabel: "7 days",
      ariaLabel: "Signing volume bar chart for the last seven days",
      barTitle: (label: string, value: number) => `${label}: ${value}k signatures`,
      days: {
        Mon: "Mon",
        Tue: "Tue",
        Wed: "Wed",
        Thu: "Thu",
        Fri: "Fri",
        Sat: "Sat",
        Sun: "Sun",
      },
    },
    verificationOutcomes: {
      title: "Verification outcomes",
      subtitle: "ETSI-aligned verdict distribution",
      ariaLabel: (valid: number, invalid: number, indeterminate: number) =>
        `${valid}% valid, ${invalid}% invalid, ${indeterminate}% indeterminate`,
      valid: "Valid",
      indeterminate: "Indeterminate",
      invalid: "Invalid",
      verifyAnother: "Verify another artifact →",
    },
    certificateExpiration: {
      title: "Certificate expiration",
      viewAll: "View all",
      empty: "No certificates are approaching expiration.",
      columns: { certificate: "Certificate", issuer: "Issuer", expires: "Expires", status: "Status" },
      daysSuffix: (n: number) => `${n} days`,
      expiring: "▲ Expiring",
    },
    recentActivity: {
      title: "Recent activity",
      justNow: "just now",
      minutesAgo: (n: number) => `${n}m ago`,
      hoursAgo: (n: number) => `${n}h ago`,
      daysAgo: (n: number) => `${n}d ago`,
      verifiedAs: (name: string, verdict: string) => `${name} verified as ${verdict}`,
      job: {
        signed: (name: string) => `${name} signed successfully`,
        failed: (name: string) => `${name} failed to sign`,
        blocked: (name: string) => `${name} is blocked by provider availability`,
        signing: (name: string) => `${name} is being signed`,
        queued: (name: string) => `${name} is queued`,
      },
    },
    infrastructureHealth: {
      title: "Infrastructure health",
      manage: "Manage",
      latencyNa: "Latency n/a",
      latencyMs: (ms: number) => `${ms}ms latency`,
      keys: (n: number) => `${n} keys`,
      status: {
        online: "Online",
        degraded: "Degraded",
        unreachable: "Unreachable",
        "not-configured": "Not configured",
      },
    },
    notifications: {
      title: "Notifications",
      empty: "No notifications.",
    },
  },

  sign: {
    banner: {
      title: "Signing flow test bench",
      description:
        "Every call goes to POST /api/v1/sign on the service selected in the top right. Sources, algorithms and baseline levels come from that same service's /capabilities.",
    },
    resume: {
      title: "Unfinished signing session",
      description: "An eSign Cloud session is still open. Resume it instead of starting over?",
      descriptionWithFile: (name: string) =>
        `“${name}” still has an open signing session. Resume it instead of starting over?`,
      resume: "Resume",
      dismiss: "Dismiss",
    },
    /** Wizard chrome: progress bar labels and the per-step framing text. */
    steps: {
      navLabel: "Signing steps",
      stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
      back: "Back",
      next: "Continue",
      lockedHint: "Finish the earlier steps to unlock this one.",
      document: {
        label: "Document",
        description: "The file format decides which signature sources can be used next.",
      },
      source: {
        label: "Source",
        description:
          "Sources that cannot sign this format stay listed but disabled, with the reason shown.",
      },
      credential: {
        label: "Credentials",
        description: "What this source needs from you before it can reach a private key.",
      },
      signature: {
        label: "Signature",
        description: "Baseline level, algorithm and how the signature appears on the document.",
      },
      review: {
        label: "Review",
        description: "Check the configuration, then send the signing request.",
      },
      summaryTitle: "Ready to sign",
      summaryDocument: "Document",
      summaryFormat: "Format",
      summarySource: "Source",
      summaryProfile: "Profile",
      summaryAppearance: "Visible signature",
      summaryOn: "On",
      summaryOff: "Off",
      summaryUnset: "—",
      restart: "Start over",
      restartHint:
        "Clears the document, the key material and every choice — the page returns to the state it had when you opened it. The agreementUuid goes with it, so the next eSign Cloud signing has to enroll again: a new transaction at FPT. Download the signed file first: it only exists on this page.",
    },
    document: {
      sectionTitle: "Document",
      dropHere: "Drop a document here",
      acceptedTypes: "PDF, XML, Word, Excel or PowerPoint",
      chooseDocument: "Choose document",
      backendNote: "The backend currently only supports PDF, XML and OOXML (DOCX/XLSX/PPTX).",
      remove: (name: string) => `Remove ${name}`,
      detectedType: "Detected type",
      backendFormat: "Backend format",
      unknownType: "Unknown",
      boundaryTitle: "Signing boundary",
      boundaryText:
        "The document leaves the browser exactly once, inside the signing request's multipart body. Hashing, authorization and signing happen in the signing service and at the CA — private key material never reaches the browser.",
    },
    contentLabel: {
      pdf: "PDF document",
      xml: "XML document",
      ooxml: "OOXML package",
      raw: "Binary content",
      "large-file": "Large binary file",
    },
    preview: {
      title: "Preview",
      /** Shown once the preview switches from the original file to the signed one. */
      signedTitle: "Signed document",
      signedBadge: "Signed",
      unknownType: "Unknown type",
      emptyTitle: "No document selected",
      emptyDescription: "Choose a document to inspect the signing preview.",
      unsupportedTitle: "Feature not available yet",
      unsupportedBody: (fileName: string) =>
        `${fileName} is not PDF, XML or OOXML — the Sigil does not yet support signing other binary formats.`,
      zoomOut: "Zoom out",
      zoomIn: "Zoom in",
      zoomFit: "Fit to page",
      resetPosition: "Reset to default position",
      signatureAreaLabel: (page: number) => `Signature area — page ${page}`,
      digitallySignedBy: "Digitally signed by {signer}",
      resizeHandle: "Resize signature area",
      resizeHint: "Drag to resize",
      pdfNavAriaLabel: "PDF page navigation",
      previousPage: "Previous page",
      nextPage: "Next page",
      pageLabel: "Page",
      cannotRenderPdf: (error: string) => `Unable to display PDF: ${error}`,
      cannotRenderWord: (error: string) => `Unable to display Word document: ${error}`,
      cannotRenderExcel: (error: string) => `Unable to display Excel document: ${error}`,
      cannotRenderPowerPoint: (error: string) => `Unable to display PowerPoint: ${error}`,
      readingContent: "Reading content…",
      readingSpreadsheet: "Reading spreadsheet…",
      readingSlides: "Reading slide content…",
      slideLabel: (n: number) => `Slide ${n}`,
      noTextInSlide: "(no text)",
    },
    config: {
      configurationTitle: "Signature configuration",
      baselineLevelLabel: "Baseline level",
      timestampNote:
        "Baseline T always calls the TSA, regardless of SIGNING_TSA_ENABLED. If signing fails with SIGNING_FAILED, try baseline B to tell a TSA problem apart from a signing problem.",
      algorithmLabel: "Signature algorithm",
      /** `<optgroup>` labels. Per-algorithm labels come from algorithmCatalog. */
      algorithmScheme: {
        RSASSA_PSS: "RSA-PSS (recommended)",
        RSA_PKCS1_V1_5: "RSA PKCS#1 v1.5 (widest compatibility)",
        ECDSA: "ECDSA (needs an EC-key certificate)",
      } as Record<string, string>,
      algorithmNone: "This source declares no algorithms.",
      algorithmNoneForFormat: (format: string) => `This source cannot sign ${format} files.`,
      algorithmFormatNote: (format: string) =>
        `${format} can only be signed with RSA PKCS#1 v1.5: ECMA-376 Part 2 defines no RSA-PSS or ECDSA for package signatures, and Word/Excel cannot read them. That is a format limit, not a service limit.`,
      algorithmEcNote:
        "ECDSA needs a certificate with an EC key. This cannot be checked up front — the key type is only readable after the key file is opened with its password. An RSA-key certificate will fail with ALGORITHM_KEY_TYPE_MISMATCH at signing time.",
      signatureTypeLabel: "Signature type",
      coSign: "Co-sign",
      counterSign: "Counter-sign",
      visibleSignature: "Visible signature (drag the box on the preview)",
      appearanceUnsupported: "This format has no visible signature; position is ignored.",
      documentNameLabel: "Document name sent to the CA",
      documentNamePlaceholder: "contract.pdf",
      documentNameHint: "Shown to the signer when they approve. Defaults to the uploaded file name.",
      signFailedTitle: "Signing failed",
      signButton: "Sign document",
      downloadSignedFile: "Download signed file",
    },
    result: {
      dialogLabel: "Signing complete",
      title: "Signing complete",
      subtitle: "The signing service returned the signed document.",
      document: "Document",
      source: "Source",
      profile: "Profile",
      inMemoryNote:
        "The signed file only exists in this page: the response carries it as base64 and there is no endpoint to fetch it again. Download it before leaving.",
      signAgainSameSignature: "Sign again with this signature",
      signAgainHint:
        "Signing again keeps this signature configuration and rolls the preview back to the unsigned document — the result above is discarded. Download it first if you need it.",
      download: "Download signed file",
    },
    source: {
      title: "Signature source",
      loading: "Loading signature sources…",
      loadFailed: "Unable to load signature sources from this API address.",
      retry: "Try again",
      empty: "This service exposes no signature source.",
      unsupportedForFormat: (format: string) => `Cannot sign ${format} files.`,
      interaction: {
        NONE: "Signing finishes inside this request; nothing else to confirm.",
        APP_CONFIRMATION:
          "The request is held until the signer approves in the FPT MPKI App — keep this tab open.",
        REDIRECT_OTP:
          "Three phases: the signer confirms their identity, then enters an OTP on the CA page.",
        LOCAL_AGENT:
          "The browser talks to the FPT-CA Signing Agent on this machine; the PIN window belongs to FPT-CA, not to this page.",
      },
    },
    pkcs12: {
      title: "PKCS#12 key file",
      fileLabel: "Key file (.p12 / .pfx)",
      chooseFile: "Choose key file",
      noFile: "No file selected",
      passwordLabel: "Key file password",
      passwordPlaceholder: "Required",
      aliasLabel: "Alias",
      aliasPlaceholder: "Leave empty to auto-select",
      aliasHint: "Empty means the provider picks the first alias holding a private key.",
    },
    mpki: {
      title: "FPT MPKI App",
      usernameLabel: "Signer username",
      usernamePlaceholder: "MPKI App login name",
      loadCredentials: "Load",
      loading: "Loading…",
      loadFailed: "Unable to load this signer's credentials.",
      credentialLabel: "Credential",
      chooseCredential: "Choose a credential",
      emptyTitle: "No credential found",
      empty: "No credential for this username. Check the name and MPKI_USER_ID_PREFIX.",
      multipleWarning:
        "This signer has several credentials — check carefully: the wrong one signs under the wrong legal identity.",
      note: "The name on the signature comes from the certificate CN, never from this screen.",
    },
    esign: {
      title: "FPT eSign Cloud (OTP)",
      signerNameNote:
        "The name on the signature comes from the certificate the CA issues for this enrollment. This screen never asks for it.",
      agreementLabel: "agreementUuid",
      agreementIssued: "Issued by the enrollment request",
      agreementEmpty:
        "Nothing yet. The CA issues this identifier in the response to the enrollment below — it cannot be typed in.",
      agreementHint:
        "The signer's identity on the CA, read straight from the enrollment response and never entered by hand. It lives only for this signing — nothing is kept in the browser, so starting over means enrolling again, which is a new transaction at FPT.",
      forget: "Forget",
      agreementReady: "Identity confirmed — the certificate is ready",
      agreementRecreate: "Create a new agreement",
      agreementRecreateHint:
        "This drops the current agreementUuid and returns to the enrollment step. Every enrollment is a new transaction at FPT.",
      enrollmentTitle: "Certificate enrollment",
      personalNameLabel: "Full name",
      citizenIdLabel: "Citizen ID",
      mobileLabel: "Mobile number (receives the OTP)",
      emailLabel: "Email",
      locationLabel: "District",
      provinceLabel: "Province / city",
      countryLabel: "Country",
      photosTitle: "Identity photos",
      photoFrontLabel: "ID card, front",
      photoBackLabel: "ID card, back",
      faceImageLabel: "Portrait photo",
      photosHint:
        "Both sides of the ID card are required — without them the enrollment never passes identity confirmation. The portrait is optional and is still sent with an empty value. Images are converted to base64 in the browser; anything over 2 MB is downscaled before it is sent.",
      imageEmpty: "No image yet",
      imageChoose: "Choose image",
      imageReplace: "Replace image",
      imageRemove: "Remove image",
      imageReading: "Processing…",
      imageProblem: {
        NOT_IMAGE: "That file is not an image.",
        TOO_LARGE: "Still over 2 MB after downscaling. Pick a lighter image.",
        UNREADABLE: "This image could not be read. iPhone HEIC files need converting to JPG first.",
      },
      privacyNote: "Personal data — sent straight to the CA, never stored by this page.",
      requiredLegend: "Required field",
      requiredMissing:
        "Fill in the full name, citizen ID, mobile number, email and both sides of the ID card to enroll.",
      enroll: "Enroll and get agreementUuid",
      enrolling: "Enrolling…",
      enrollDone: "Enrollment created",
      enrollFailed: "Enrollment failed",
      enrollHint:
        "Signing without an agreementUuid also works — the service enrolls on the fly — but the uuid is not returned by the signing response, so the next signing enrolls again.",
      openSicUrl: "Open the identity confirmation page",
      confirmTitle: "Last step: confirm the identity",
      confirmBody:
        "The confirmation page opens in its own window and closes itself once the signer is done. When it closes, this page checks the enrollment status once.",
      confirmCostWarning:
        "That automatic check is a transaction at FPT and burns one signing credit. Opening the page accepts this.",
      confirmWaiting: "Waiting for the confirmation window to close…",
      confirmPopupBlocked:
        "The browser blocked the pop-up, so there is no way to tell when the confirmation page closes. Open it with the link below and run the check yourself once you are done.",
      confirmOpenManually: "Open the confirmation page in a new tab",
      confirmCheckNow: "I have confirmed — check now (burns 1 credit)",
      confirmCheckAgain: "Check again (burns 1 credit)",
      advancedTitle: "Advanced tools",
      statusWarning:
        "This check is not read-only: it opens a transaction at FPT and burns one signing credit each time. The CONTINUE step already reports PENDING_IDENTITY for free.",
      statusCheck: "Check identity confirmation",
      statusConfirm: "Confirm: burn one signing credit",
      statusChecking: "Checking…",
      statusFailed: "Unable to read the enrollment status.",
    },
    usbToken: {
      title: "FPT USB Token",
      signerNameNote:
        "The name on the signature comes from the CN of the certificate picked in the token, never from this screen.",
      checkAgent: "Test the Signing Agent",
      agentChecking: "Testing…",
      agentReady: (count: number) =>
        `Signing Agent answered — ${count} certificate${count === 1 ? "" : "s"} found in the token.`,
      note: "The FPT-CA Signing Agent must be running on this machine at localhost:14211. The browser calls it directly — nothing about the token passes through the signing service.",
      algorithmNote:
        "This flow offers only the three RSA PKCS#1 v1.5 algorithms. FPT-CA Signing Agent 1.3.1 has no parameter for the signature scheme — /SignHash only takes a digest algorithm — so RSA-PSS or ECDSA would fail at the last step.",
      pinPolicyNote:
        "The PIN is only ever typed into the FPT-CA window. This page never asks for it, never forwards it and never stores it.",

      dialogTitle: "Signing with FPT USB Token",
      phase: {
        PREPARING: "Preparing the document…",
        CONNECTING_AGENT: "Connecting to the Signing Agent…",
        SELECTING_CERTIFICATE: "Choose a certificate",
        WAITING_FOR_PIN: "Waiting for the signature…",
        COMPLETING: "Finishing the signed PDF…",
      },
      phaseBody: {
        PREPARING: "The service is building the digest to be signed by the token.",
        CONNECTING_AGENT: "Reading the certificates in the USB Token via localhost:14211.",
        SELECTING_CERTIFICATE: "Pick the identity to sign with.",
        WAITING_FOR_PIN:
          "Enter the PIN in the FPT-CA window that just opened. Check the taskbar if you cannot see it.",
        COMPLETING: "The service is verifying the signature and embedding it into the PDF.",
      },
      pinNote:
        "Please enter the PIN in the FPT-CA window that just opened — never on this page.",
      chooseCertificate: "Certificates in the token",
      certificateIssuer: (issuer: string) => `Issued by ${issuer}`,
      certificateValidity: (from: string, to: string) => `${from} → ${to}`,
      certificateNote:
        "Validity shown as reported by the agent; the service re-reads it from the certificate itself.",
      /** Carousel controls — one certificate is shown at a time. */
      certificateCounter: (current: number, total: number) => `${current} / ${total}`,
      previousCertificate: "Previous certificate",
      nextCertificate: "Next certificate",
      goToCertificate: (position: number) => `Show certificate ${position}`,
      certificateSerial: (serial: string) => `Serial ${serial}`,
      signWithCertificate: "Sign with this certificate",
      noCertificates:
        "No usable certificate found. Check that the USB Token is plugged in and that its driver recognises it.",
      retry: "Start over",
      jobExpiresIn: (countdown: string) => `The signing job expires in ${countdown}`,
      jobExpired: "The signing job has expired — start over.",
      jobAlgorithm: (label: string) => `Algorithm for this job: ${label}`,
      errorSchemeUnsupported: (label: string) =>
        `The signing service prepared this job for ${label}, but FPT-CA Signing Agent 1.3.1 can only produce RSA PKCS#1 v1.5 signatures. Going ahead would fail at the last step, so it stopped here. Pick an RSA PKCS#1 v1.5 algorithm and sign again.`,
      errorDigestUnsupported:
        "The USB Token cannot sign with the selected digest algorithm. Try RSA PKCS#1 v1.5 / SHA-256 — older devices often only do SHA-256.",
      errorUnreachable:
        "Cannot reach the FPT-CA Signing Agent at localhost:14211. Check that it is running, and that the browser is allowed to access the local network.",
      errorAgentToken:
        "The Signing Agent session is no longer valid — it usually means the agent restarted. Start over.",
      errorCancelled: "The certificate selection was cancelled in the FPT-CA window.",
      errorGeneric: "USB Token signing failed.",
    },
    target: {
      label: "Target signature",
      scanning: "Scanning the document for existing signatures…",
      choose: "Choose a signature",
      none: "No signature found in this file. Counter-sign needs an already signed document.",
      manual: "Target signature id",
      manualPlaceholder: "or paste an id, e.g. sha256:…",
      hint:
        "Ids are read from the file you are about to submit. PDFs signed by other tools use sha256:<hex of the CMS>.",
    },
    session: {
      appTitle: "Waiting for approval in the app",
      otpTitle: "Signing with eSign Cloud",
      subtitleWithFile: (source: string, fileName: string) => `${source} · ${fileName}`,
      working: "Talking to the signing service…",
      appWaiting: "Waiting for the signer to approve…",
      appWaitingBody:
        "Open the FPT MPKI App and approve the request. This request stays open until then — do not close this tab.",
      genericError: "This signing step did not complete.",
      correlationId: (id: string) => `Correlation ID: ${id}`,
      sessionLostNote:
        "The session is gone: either the 15 minutes elapsed, or it completed and was deleted. Start over from the beginning.",
      identityTitle: "Waiting for identity confirmation",
      identityBody:
        "The signer must open the CA page and confirm their certificate details, then come back and continue.",
      identityDoneTitle: "Identity already confirmed",
      identityDoneBody:
        "The certificate is ready. All that is left is opening the transaction so the CA sends the OTP — press the button below.",
      otpReadyTitle: "Ready for the OTP",
      otpReadyBody:
        "Open the CA's OTP page with the button below. It opens in its own window; enter the OTP there, then come back and fetch the signed file.",
      otpStageTitle: "Waiting for the OTP",
      otpStageBody:
        "The signer must enter the OTP on the CA page. Close that page and the signed file is fetched automatically — that step is free.",
      otpIncomplete:
        "The OTP page closed but no signature came back: the OTP step did not complete. Open the page again and retry.",
      openIdentityUrl: "Open the confirmation page",
      openOtpUrl: "Open the OTP page",
      popupBlocked:
        "Your browser blocked the new window. Use the link below to open the page in a tab instead.",
      billableWarning:
        "The next step creates a transaction at FPT: one more billCode, one more OTP, one signing credit burnt. Only press it once the signer has confirmed.",
      expiresIn: (value: string) => `Expires in ${value}`,
      expired: "Expired",
      sessionIdLabel: "sessionId",
      close: "Close",
      continueBillable: "Signer confirmed — continue",
      continueFree: "Fetch the signed file",
    },
    apiBaseUrl: {
      buttonTitle: "Signing service address",
      serverDefault: "Server default",
      title: "Signing service address",
      description:
        "Every call on this screen goes to this address. Switch between localhost, an internal domain and a public IP without restarting the dev server.",
      label: "Base URL",
      placeholder: "http://localhost:8080",
      emptyHint: "Leave empty to use SIGNING_API_URL from the server environment.",
      errorScheme: "Only http:// and https:// are accepted.",
      errorMalformed: "Not a valid URL. Include the scheme, e.g. http://192.168.1.10:8080.",
      test: "Test connection",
      testing: "Testing…",
      testOk: (count: number) => `Reachable — ${count} signature source(s) reported.`,
      testFailed: "Could not reach the signing service at this address.",
      save: "Save",
      cancel: "Cancel",
      savedTitle: "API address updated",
      proxyNote:
        "The browser never calls this address directly: requests go through this app's own routes, which avoids CORS and works with hosts that only allow server-to-server calls.",
    },
    status: {
      signing: "Signing…",
    },
    toast: {
      signSuccessTitle: "Document signed",
      signFailedTitle: "Signing failed",
      signFailedGeneric: "The signing request did not complete. Please try again.",
      missingDocument:
        "The service reported COMPLETED but returned no document. Check the service logs with the correlation id.",
      downloadSuccessTitle: "Signed file downloaded",
    },
    validation: {
      chooseDocument: "Choose a document to sign.",
      unsupportedFormat: "Unsupported file type. Use PDF, XML, DOCX, XLSX or PPTX.",
      chooseSource: "Choose a signature source.",
      formatNotSupported: (source: string) => `${source} cannot sign this file type.`,
      tooLarge: (limit: string) => `The document exceeds the service limit of ${limit}.`,
      algorithmUnsupported: "The selected algorithm is not offered by this source.",
      algorithmUnsupportedForFormat: (format: string) =>
        `This source offers the selected algorithm, but ${format} cannot carry it. Pick an RSA PKCS#1 v1.5 algorithm, or sign a PDF/XML file instead.`,
      baselineUnsupported: (level: string) => `Baseline ${level} is not offered by this source.`,
      chooseMode: "Choose a signature type this source supports.",
      targetRequired: "Counter-sign needs the id of a signature already in the document.",
      p12FileRequired: "Choose the .p12 / .pfx key file.",
      p12PasswordRequired: "The key file password is required.",
      mpkiUsernameRequired: "Enter the signer's MPKI username.",
      mpkiCredentialRequired: "Choose which credential to sign with.",
      enrollmentRequired:
        "Without an agreementUuid, enrollment needs the full name, citizen ID, mobile number, email and both sides of the ID card.",
      agreementRequired:
        "The enrollment form is filled in but no certificate exists yet. Press “Enroll and get agreementUuid”, confirm the identity, and sign once the status is READY.",
      agreementNotReady:
        "The enrollment you just created has not been confirmed yet. Open the identity confirmation page in the eSign Cloud card, then sign.",
    },
  },

  /**
   * Màn tạo yêu cầu ký nhiều bước. Câu chữ ở đây nói về QUY TRÌNH (ai ký, theo
   * thứ tự nào), không nói về một lần ký cụ thể — phần đó thuộc `sign`.
   */
  signRequest: {
    /**
     * Danh tính người thao tác — giá trị của `X-Username`. Câu chữ ở đây phải
     * nói rõ nó KHÔNG phải đăng nhập: dịch vụ không xác thực gì cả, nên gõ tên
     * ai vào cũng được, và đó chính là điều người test cần biết.
     */
    actor: {
      title: "Acting as",
      description:
        "Every workflow endpoint requires an X-Username header. The signing service has no authentication, so this is simply the name the request is filed under — and the name that decides who may read the document afterwards.",
      label: "Username",
      placeholder: "user123",
      hint: "Up to 128 characters. Nothing is verified — no account is created or checked.",
      accessNote:
        "The document of a signing request is readable only by the user who created it and the users named as signers. Change this name and you may lose access to requests created under the previous one.",
      buttonTitle: "Change who the requests are filed under",
      unset: "No identity",
      save: "Save",
      savedTitle: "Identity saved",
      required: "Pick an identity before creating the request.",
      requiredHint:
        "Use the identity button in the page header. Without X-Username the service rejects every call on this screen.",
    },
    steps: {
      navLabel: "Request steps",
      stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
      back: "Back",
      next: "Continue",
      lockedHint: "Finish the earlier steps to unlock this one.",
      document: {
        label: "Document",
        description: "The file everyone in the flow will sign. Its format decides what can be configured later.",
      },
      flow: {
        label: "Signing flow",
        description: "Add signers to each step. Everyone inside one step signs in parallel; each later step will sign on the file with earlier step signatures.",
      },
      review: {
        label: "Review",
        description: "Name the request, set a deadline, then send it to the first step.",
      },
    },

    document: {
      title: "Document",
      dropHere: "Drop a document here",
      acceptedTypes: "PDF, XML, Word, Excel or PowerPoint",
      choose: "Choose document",
      note: "PDF is the only format with a visible signature you can place on the page. The rest are signed without a visual block.",
      remove: (name: string) => `Remove ${name}`,
      replace: "Replace",
      detectedFormat: "Format",
      size: "Size",
      unknownFormat: "Unknown",
      previewTitle: "Preview",
      previewEmpty: "Upload a document to see it here.",
      pdfOnlyPreview: "Only PDF renders a preview on this screen — the signing flow works the same for every supported format.",
      boundaryTitle: "Where the file goes",
      boundaryText:
        "The document is uploaded once and stays with the request. Every signer in the flow signs that same copy — nobody re-uploads, and each signature is layered onto the previous ones.",
    },

    flow: {
      palette: {
        title: "Signers",
        hint: "Drag a person onto a step, or use the add button inside the step.",
        searchLabel: "Search signers",
        searchPlaceholder: "Name, email or department",
        empty: "Nobody matches that search.",
        systemGroup: "System accounts",
        linkGroup: "Outside the system",
        linkTitle: "Sign via authentication link",
        linkDescription: "Sends a link to an email address. The recipient authenticates before signing.",
        linkBadge: "Link",
        dragHandle: (name: string) => `Drag ${name} into a step`,
      },

      canvas: {
        title: "Signing flow",
        stepLabel: (index: number) => `Step ${index}`,
        stepNamePlaceholder: (index: number) => `Step ${index} — untitled`,
        renameLabel: (index: number) => `Name of step ${index}`,
        coSign: "Co-sign",
        counterSign: "Counter-sign",
        coSignHint: "Signatures in this step are parallel — none of them signs over another.",
        counterSignNothing: "Nothing to counter-sign yet — no signer stands in the steps above.",
        counterSignHint: (count: number, steps: number) =>
          count === 1
            ? `Signs over 1 signature from the ${steps === 1 ? "previous step" : `${steps} previous steps`}.`
            : `Signs over ${count} signatures from the ${steps === 1 ? "previous step" : `${steps} previous steps`}.`,
        parallelStep: (n: number) => `${n} signatures in parallel`,
        ruleLabel: "Completion",
        ruleAll: "Everyone",
        ruleAny: "Anyone",
        ruleAllHint:
          "Everyone in this step signs at the same time, and all of them must sign before the next step opens.",
        ruleAnyHint: "One signature is enough to open the next step.",
        moveUp: (index: number) => `Move step ${index} up`,
        moveDown: (index: number) => `Move step ${index} down`,
        removeStep: (index: number) => `Delete step ${index}`,
        lastStepLocked: "A request needs at least one step.",
        dragStep: (index: number) => `Drag step ${index} to reorder`,
        addSigner: "Add signer",
        addStep: "Add signing step",
        dropIntoStep: "Drop here",
        newStepDrop: "Drop a person here to open a new step",
        emptyStep: "No signer yet",
        emptyStepHint: "Press Add signer to put someone on this step.",
        signatureCount: (count: number) => (count === 1 ? "1 signature" : `${count} signatures`),
        thenLabel: "then",
        /* Luồng khoá cấu trúc — nói LÝ DO, không chỉ nói trạng thái. */
        fromTemplate: "Set by the template",
      },

      slot: {
        unassigned: "Pick a signer",
        unassignedHint: "This box is reserved but nobody is on it yet.",
        roleHint: "From a template — pick who signs here.",
        configure: (name: string) => `Configure ${name}'s signature`,
        remove: (name: string) => `Remove ${name} from this step`,
        removeEmpty: "Remove this empty signature box",
        drag: (name: string) => `Drag ${name} to another step`,
        linkBadge: "Link",
        visible: "Visible",
        invisible: "Invisible",
        pageLabel: (page: number) => `Page ${page}`,
        incomplete: "Needs attention",
        slotCount: (count: number) => `${count} boxes`,
      },

      summary: {
        steps: "Steps",
        signatures: "Signatures",
        widest: "Widest step",
        widestValue: (count: number) => `${count} in parallel`,
      },
    },

    config: {
      title: "Signature box",
      titleReadonly: "Signature details",
      inStep: (index: number) => `Step ${index}`,
      stepFieldLabel: "Signing step",
      stepFieldHint: "Moving the box to another step changes what it signs over.",
      close: "Done",
      removeSlot: "Remove from flow",

      signerSection: "Who signs",
      signerSystem: "System account",
      signerLink: "Authentication link",
      signerSwitchHint: "A link signer does not need an account — they authenticate on the link before signing.",
      searchPlaceholder: "Search the directory",
      noResults: "Nobody matches that search.",
      linkEmailLabel: "Email address",
      linkEmailPlaceholder: "name@company.com",
      linkNameLabel: "Display name",
      linkNamePlaceholder: "Shown on the signature and in the flow",
      linkNote: "The signing link and its authentication step are not wired up in this build.",

      signatureSection: "Signature",
      methodLabel: "How they authenticate",
      methodHintLink: "Only remote sources work over a link — a USB token or a .p12 file needs the signer's own machine.",
      method: {
        MPKI_APP: { label: "FPT MPKI App", hint: "Confirmation arrives as a push on the signer's phone." },
        ESIGN_OTP: { label: "FPT eSign Cloud", hint: "Identity confirmation, then an OTP. Each start consumes a signing credit." },
        USB_TOKEN: { label: "USB token", hint: "Needs FPT-CA Signing Agent running on the signer's machine." },
        PKCS12: { label: "PKCS#12 file", hint: "The signer uploads a .p12/.pfx and its password at signing time." },
      },
      algorithmLabel: "Algorithm",
      algorithmHint: "The real list comes from the signing service's /capabilities and is filtered by document format.",
      baselineLabel: "Baseline level",
      baseline: {
        B: { label: "B — basic", hint: "Signature only. No timestamp." },
        T: { label: "T — timestamped", hint: "Calls the TSA. A misconfigured TSA fails here first." },
        LT: { label: "LT — long term", hint: "Embeds revocation data." },
        LTA: { label: "LTA — archival", hint: "Adds an archive timestamp for long-term validation." },
      },
      reasonLabel: "Reason",
      reasonPlaceholder: "Approved as head of department",
      locationLabel: "Location",
      locationPlaceholder: "Hà Nội",

      appearanceSection: "Appearance",
      visibleLabel: "Visible signature block",
      visibleHint: "Draws a signature block on the page. Turn it off for an invisible signature stored only in the file structure.",
      positionTitle: "Position on the page",
      positionHint: "Drag the box, or drag its corner to resize. Boxes of the other signers are shown dimmed so they do not overlap.",
      positionUnavailable: (format: string) =>
        `${format} has no visual signature layer — position does not apply. The signature is stored in the file structure.`,
      positionNoDocument: "Attach a document first to place the signature.",
      resetPosition: "Reset position",
      pageOf: (current: number, total: number) => `Page ${current} / ${total}`,
      previousPage: "Previous page",
      nextPage: "Next page",
      currentPage: "Current page",
      zoomOut: "Zoom out",
      zoomIn: "Zoom in",
      fitWidth: "Fit width",
      otherSignerBox: (name: string) => `${name} — same page`,
      renderFailed: (error: string) => `Unable to display the PDF: ${error}`,
    },

    review: {
      title: "Request details",
      nameLabel: "Request name",
      namePlaceholder: "Q3 board resolution",
      deadlineLabel: "Deadline",
      deadlineHint: "Optional. Signers are reminded as it approaches.",
      messageLabel: "Message to signers",
      messagePlaceholder: "Shown in the notification and on the signing page.",
      remindLabel: "Send reminders",
      remindHint: "One reminder a day while a step is waiting.",
      notifyLabel: "Notify me when it completes",
      notifyHint: "An email once the last step is signed.",

      documentSection: "Document",
      flowSection: "Flow",
      flowSummary: (steps: number, signatures: number) =>
        `${steps === 1 ? "1 step" : `${steps} steps`} · ${signatures === 1 ? "1 signature" : `${signatures} signatures`}`,

      readyTitle: "Ready to send",
      readyBody: "The first step is notified immediately; later steps open as the ones before them finish.",
      issuesTitle: "Fix before sending",
      issue: {
        NO_DOCUMENT: "No document attached.",
        NO_NAME: "The request has no name.",
        EMPTY_STEP: (index: number) => `Step ${index} has no signer.`,
        SLOT_WITHOUT_SIGNER: (index: number) => `A signature box in step ${index} has nobody on it.`,
        LINK_WITHOUT_EMAIL: (index: number) => `A link signer in step ${index} has no email address.`,
        DUPLICATE_IN_STEP: (index: number, name: string) =>
          `${name} appears twice in step ${index}. Two parallel signatures from one person add nothing.`,
        MISSING_VARIABLE: (label: string) => `“${label}” has not been filled in.`,
      },
      goToStep: (index: number) => `Go to step ${index}`,
      submit: "Create signing request",
      submitting: "Creating…",
      backToFlow: "Back to the flow",
      submitFailed: "The signing request was not created",
      retryNote:
        "Pressing the button again reuses the same idempotency key, so a request that was in fact created will be returned rather than duplicated.",
      localOnlyNote:
        "Only the name, the document and the signers are sent to the service. The deadline, the message and the two switches above have no field in the API — they stay in this browser and are lost on reload.",
    },

    progress: {
      createdAt: (value: string) => `Created ${value}`,
      documentLabel: "Document",
      deadlineLabel: "Deadline",
      noDeadline: "No deadline",
      status: {
        running: "In progress",
        completed: "Completed",
        declined: "Declined",
        cancelled: "Cancelled",
      },
      progressLabel: (signed: number, total: number) => `${signed} / ${total} signatures`,
      waitingOnStep: (index: number) => `Waiting on step ${index}`,
      allSigned: "Every step is signed.",
      stepStatus: {
        done: "Done",
        active: "Waiting",
        queued: "Not yet open",
      },
      slotStatus: {
        signed: "Signed",
        pending: "Waiting to sign",
        queued: "Not their turn yet",
        declined: "Declined",
      },
      signedAt: (value: string) => `Signed ${value}`,
      download: "Download document",
      cancelRequest: "Cancel request",
      newRequest: "New request",
      timelineTitle: "Activity",
      timelineCreated: "Request created",
      timelineSigned: (name: string) => `${name} signed`,
      timelineStepDone: (index: number) => `Step ${index} completed`,
      timelineCompleted: "All signatures collected",
      timelineWaiting: (name: string) => `Waiting for ${name}`,

      refresh: "Refresh",
      refreshFailed: "Could not read the latest status",
      downloadFailed: "Could not download the document",
      previewWarnings: "Warnings while building the document",
      linkIssuedInDetail:
        "Signing links are issued per signer from the workflow detail screen — that is the only place with the signer IDs the service needs.",
      linkOpenDetail: "Manage signing links",
      localOnlyTitle: "Not stored on the server",
      localOnlyHint:
        "The deadline, the message, the reminder switches, the step rule and each box's signing configuration have no field in the create-request API. They are shown from this browser's memory and disappear on reload — the signatures and the statuses come from the service.",
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
        label: "Signing request sections",
        list: "Workflows",
        create: "New request",
      },

      list: {
        title: "Workflows",
        description:
          "Requests you created and requests where you are named as a signer. The service decides which ones by reading X-Username — nothing else.",
        refresh: "Refresh",
        create: "New request",
        searchLabel: "Search workflows",
        searchPlaceholder: "Search by title",
        statusLabel: "Status",
        relationLabel: "My part",
        allStatuses: "Every status",
        allRelations: "Everything",
        status: {
          DRAFT: "Draft",
          IN_PROGRESS: "In progress",
          COMPLETED: "Completed",
          CANCELLED: "Cancelled",
        },
        relation: {
          CREATOR: "I created it",
          SIGNER: "I sign it",
          CREATOR_AND_SIGNER: "I created and sign it",
        },
        source: {
          TEMPLATE_PREVIEW: "From a template",
          UPLOADED_DOCUMENT: "Uploaded file",
        },
        createdBy: (name: string) => `by ${name}`,
        createdAt: (value: string) => `Created ${value}`,
        updatedAt: (value: string) => `Updated ${value}`,
        count: (total: number) => (total === 1 ? "1 workflow" : `${total} workflows`),
        pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
        prev: "Previous",
        next: "Next",
        empty: "No workflow yet",
        emptyHint:
          "Requests you create, and requests where somebody named you as a signer, show up here. Start one from the New request tab.",
        noResults: "No workflow matches those filters.",
        noResultsHint:
          "Search and status are handled by the service; “my part” only narrows the page you are looking at, because the API has no parameter for it.",
        relationFilterNote: "Applied to this page only — the API has no parameter for it.",
        loadFailed: "Could not load the workflows",
        retry: "Try again",
        actorRequired: "Pick an identity first",
        actorRequiredHint:
          "The list is built from the X-Username header — the service has no other way to know whose workflows to return. Use the identity button in the page header.",
        open: "Open",
      },

      detail: {
        back: "All workflows",
        loading: "Opening the workflow…",
        loadFailed: "Could not open this workflow",
        loadFailedHint:
          "A request is readable only by the user who created it and the users named as signers. Check the identity in the page header before assuming the request is gone.",
        serverOnlyTitle: "Rebuilt from the service",
        serverOnlyHint:
          "Step names, the completion rule, the deadline and each box's signing configuration were never sent to the service, so they are not shown here. Everything on this screen comes from GET /api/signing-requests/{id}.",

        assignment: {
          title: "Your part",
          none: "You are not a signer on this workflow.",
          noneHint: "It is listed for you because you created it.",
          stepLabel: (index: number) => `Step ${index}`,
          waiting: "Waiting for your signature",
          notYourTurn: "An earlier step has not finished signing yet.",
          signed: (value: string) => `You signed ${value}`,
          declined: "You declined this workflow.",
          sign: "Sign now",
          signFailed: "Could not start signing",
          decline: "Decline",
          lockedTitle: "Someone is signing right now",
          lockedBody: "Wait for that signing attempt to finish before you can sign.",
          lockedByBody: (holder: string) =>
            `${holder} is signing right now. Wait for that attempt to finish before you can sign.`,
        },

        cancel: "Cancel workflow",
        remind: "Send a reminder",
        cancelConfirmTitle: "Cancel this workflow?",
        cancelConfirmBody:
          "This stops the workflow for everyone. Signers who have not signed yet will no longer be able to, and this cannot be undone.",
        cancelConfirmAction: "Cancel workflow",
        cancelConfirmDismiss: "Keep it running",
        cancelDone: "Workflow cancelled",
        cancelFailed: "Could not cancel the workflow",

        declineConfirmTitle: "Decline this signature?",
        declineConfirmBody:
          "This stops the whole workflow for everyone, not just your part, and cannot be undone.",
        declineConfirmAction: "Decline",
        declineConfirmDismiss: "Keep it pending",
        declineDone: "Declined",
        declineFailed: "Could not decline",

        /**
         * Quản trị link ký ngoài hệ thống (§4 của tài liệu tích hợp).
         *
         * Người đọc ở đây là NGƯỜI TẠO yêu cầu — một người trong hệ thống — nên câu
         * chữ được phép nói về `signerId`, endpoint và token. Đối lập hẳn với
         * `externalSign.*`, nơi người đọc là khách.
         */
        links: {
          title: "External signing links",
          intro:
            "One link per signer, for people without an account. Each link places exactly one signature and can only be used by the signer it was issued for.",
          loading: "Reading links…",
          noLink: "No link issued yet",
          order: (position: number) => `Signer ${position}`,
          tokenHintLabel: "Link identifier",

          signerTurn: "It is their turn — a link can be issued now.",
          signerWaiting: "An earlier signer has not finished yet.",
          signerSigned: "Already signed.",
          signerDeclined: "Declined to sign.",

          status: {
            ACTIVE: "Active",
            EXPIRED: "Expired",
            REVOKED: "Revoked",
            CONSUMED: "Used",
          },
          expiresAt: (value: string) => `Expires ${value}`,
          expiredAt: (value: string) => `Expired ${value}`,
          revokedAt: (value: string) => `Revoked ${value}`,
          consumedAt: (value: string) => `Signed ${value}`,

          create: "Issue link",
          recreate: "Issue a new link",
          revoke: "Revoke",
          copy: "Copy link",
          hideUrl: "Hide",
          history: (count: number) =>
            count === 1 ? "1 earlier link" : `${count} earlier links`,

          createTitle: "Issue a signing link",
          createConfirm: "Issue link",
          recreateTitle: "Issue a new signing link",
          recreateConfirm: "Replace the link",
          recreateWarning:
            "Issuing a new link makes the current one stop working. If you have already sent it, the recipient will need the new link.",
          expiryLabel: "Valid for",
          expiry: {
            default: "Service default",
            h24: "24 hours",
            d3: "3 days",
            d7: "7 days",
          },
          expiryHint:
            "Shorter is safer: anyone holding the link can sign as this signer until it expires.",

          freshTitle: "Link — shown once",
          foreignDomain: (origin: string) =>
            `The link points at ${origin}, which is where the signing service is configured to publish its public page. Make sure that address actually serves the signing page before sending it.`,
          freshHint:
            "This address is not stored anywhere and cannot be shown again. Copy it and send it to the signer now; if you lose it, issue a new link.",

          copyFailed: "Could not copy",
          copyFailedHint: "Your browser blocked clipboard access. Select the address above and copy it manually.",
          createFailed: "Could not issue the link",
          createdWithoutUrl: "Link issued without an address",
          createdWithoutUrlHint:
            "The service created the link but returned no URL, so there is nothing to send. Check the create-link response before issuing another one.",
          revoked: "Link revoked",
          revokedHint: "It can no longer be used to sign. Issue a new link if the signer still needs one.",
          revokeFailed: "Could not revoke the link",
          loadFailed: "Could not read the links",

          blockedRequestClosed: "This workflow is closed, so no new link can be issued.",
          blockedSigned: "This signer has already signed.",
          blockedDeclined: "This signer declined, so a link would not be usable.",
          blockedNotTurn:
            "Not their turn yet. The service refuses links for a signer who cannot sign — issue it once the earlier steps finish.",

          endpointMissing: "This service has no link endpoints",
          endpointMissingHint:
            "GET/POST /api/signing-requests/{id}/signers/{signerId}/public-links and its revoke endpoint answered 404. Point the page at a service that has them, or turn on the build preview below to review the interface.",

          previewToggle: "Build preview — fake links",
          previewToggleHint:
            "Fills this panel with links that live only in this page's memory. Use it to review the expired and used states, which real links only reach after time passes or somebody signs. Nothing is sent anywhere and nothing survives a reload.",
          previewConsume: "Simulate: signer signed",
          previewExpire: "Simulate: link expired",
        },

        /**
         * Thao tác chưa có endpoint. Nói ra ĐÚNG endpoint còn thiếu và đúng chỗ
         * phải sửa: người test bàn thử này cũng là người sẽ nối API vào.
         */
        missing: {
          title: "This action has no endpoint yet",
          remind:
            "The service sends no notification of any kind. Fill ENDPOINTS.remind in features/sign-request/workflow-actions.ts once that endpoint exists.",
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
        title: "Sign your part",
        subtitle: (signer: string, document: string) => `${signer} · ${document}`,
        back: "Back to the workflow",

        loading: "Opening your signing turn…",
        loadFailed: "Could not open this signing turn",
        retry: "Try again",

        steps: {
          navLabel: "Signing steps",
          stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
          lockedHint: "Finish the earlier steps to unlock this one.",
          review: {
            label: "Read",
            title: "Read the document",
            description:
              "This is the version you are about to sign. Later steps sign on top of it.",
          },
          method: {
            label: "Method",
            title: "How you sign",
            description: "Pick the certificate you actually hold.",
          },
          credential: {
            label: "Details",
            title: "Certificate details",
            description: "What the chosen method needs before it can reach a private key.",
          },
          sign: {
            label: "Sign",
            title: "Sign the document",
            description: "Check it over, then sign.",
          },
        },

        consent: {
          checkbox: "I have read this document and agree to sign it",
          hint:
            "Your signature is applied to the version shown on the left, and it is recorded against your username.",
          scrollNote: "Read the whole document before you sign — signing cannot be undone here.",
        },

        summary: {
          title: "What you are signing",
          documentLabel: "Document",
          signerLabel: "Signing as",
          stepLabel: "Step",
          step: (index: number) => `Step ${index}`,
          statusPending: "Awaiting your signature",
          statusSigned: "Signed",
          statusDeclined: "Declined",
          checksumLabel: "Document checksum",
          checksumHint:
            "Compare it with the checksum shown on the workflow to be sure this is the same file.",
        },

        planTitle: "Where you sign",
        planLoading: "Reading signature positions…",
        planSummary: (count: number, pages: number[]) =>
          `${count} signature ${count === 1 ? "slot" : "slots"} · ${
            pages.length === 1 ? "page" : "pages"
          } ${pages.join(", ")}`,
        planEmpty: "The workflow placed no signature slot for you.",
        planHint:
          "Positions come from the workflow and cannot be changed here. The service reads them again when it signs.",
        planFailed: "Could not read the signature positions",
        planRetry: "Try again",

        capabilitiesLoading: "Reading the available signing methods…",
        capabilitiesFailed: "Could not read the signing methods",

        methodTitle: "How you sign",
        methodNote:
          "These are the signature sources the service has enabled, plus USB Token. Picking USB Token needs the FPT-CA Signing Agent running on this very machine.",
        credentialTitle: "Certificate details",

        sourceLabel: "Signature source",
        algorithmLabel: "Algorithm",
        baselineLabel: "Baseline level",

        action: {
          needConsent: "Confirm you have read the document first.",
          needMethod: "Pick how you want to sign.",
          needFields: "Fill in what the chosen method needs.",
          reloadingDocument: "Waiting for the new version of the document…",
        },

        sign: "Sign document",
        signing: "Signing…",

        failedTitle: "Signing did not go through",

        staleTitle: "The document just changed",
        staleBody:
          "Someone else in your step signed first, so the document is now a different version. Nothing of yours was lost — press sign again.",

        resumeTitle: "A signing attempt is still open",
        resumeBody:
          "Your previous attempt is still open on the signing service — usually because the page was reloaded midway. Continue that one instead of starting over; starting over only returns this same message.",
        resumeUsbBody:
          "You still have a signing attempt open, and the service allows only one at a time. A USB Token attempt cannot be resumed from here: finish it in the tab that started it, or wait for that session to expire (15 minutes) and sign again from the start.",
        resume: "Continue signing",

        signedTitle: "Signed",
        signedBody:
          "Your signature is now part of the workflow's document. Later steps will sign on top of this version.",

        /** Màn chặn — mỗi lý do một câu trả lời khác nhau. */
        blocked: {
          title: "You cannot sign this right now",
          NOT_A_SIGNER: {
            title: "You are not a signer on this workflow",
            body:
              "This signing turn belongs to somebody else, or the identity in the page header is not the one the workflow named. Check the identity before assuming something is wrong.",
          },
          SIGNER_NOT_FOUND: {
            title: "That signing turn does not exist",
            body:
              "The link carries a signer that this workflow does not have. Open the workflow and use the Sign now button in “Your part”.",
          },
          SIGNER_MISSING: {
            title: "The link does not say which slot to sign",
            body:
              "One person can stand at two different steps of the same workflow, so the page needs to know which turn you mean. Open the workflow and use the Sign now button in “Your part”.",
          },
          NOT_YOUR_TURN: {
            title: "An earlier step has not finished signing yet",
            body:
              "The workflow signs by level: you can sign once every required signer before you is done. Nothing is needed from you until then.",
          },
          ALREADY_SIGNED: {
            title: "You already signed this part",
            body: "Your signature is in the document. There is nothing left to do here.",
          },
          DECLINED: {
            title: "You declined this workflow",
            body: "A refusal cannot be taken back from this screen.",
          },
          REQUEST_CANCELLED: {
            title: "This workflow was cancelled",
            body: "Nobody can sign a cancelled workflow, whatever their turn was.",
          },
          REQUEST_COMPLETED: {
            title: "This workflow is already complete",
            body: "Everyone signed. The finished document is on the workflow page.",
          },
          LEASE_TOKEN_MISSING: {
            title: "This signing session is not valid",
            body: "This page did not get here through the Sign now button on the workflow page, or the session has expired. Go back and press Sign now again.",
          },
        },
      },
    },

    /**
     * Mẫu yêu cầu ký. Câu chữ ở đây nói về thứ DÙNG LẠI được — một mẫu, chứ
     * không phải một yêu cầu cụ thể — nên tránh mọi từ ngụ ý "lần này".
     */
    template: {
      signatureCount: (count: number) =>
        count === 1 ? "1 signature" : `${count} signatures`,
      stepCount: (count: number) => (count === 1 ? "1 step" : `${count} steps`),
      variableCount: (count: number) => (count === 1 ? "1 field" : `${count} fields`),

      source: {
        label: "Where the document comes from",
        uploadTab: "Upload a file",
        templateTab: "Use a template",
      },

      picker: {
        title: "Templates",
        detailTitle: "Template details",
        detailEmpty: "Pick a template to see its flow and its fields.",
        searchPlaceholder: "Search templates",
        refresh: "Reload",
        create: "New template",
        edit: "Edit",
        duplicate: "Duplicate",
        delete: "Delete",
        confirmDelete: (name: string) => `Delete “${name}”? This cannot be undone.`,
        loadFailed: "Could not load the templates",
        version: (versionNo: number) => `v${versionNo}`,
        publishedNote:
          "Templates are authored on the service: upload, configure the fields and the signer roles, then publish a version. This screen consumes the published version — the number of signature boxes, the step order and the box positions come from it and cannot be changed here.",
        previewUnavailable: "No preview has been built for this template.",
        empty: "No active templates",
        emptyHint:
          "A template only appears here once one of its versions has been published. Upload the document and publish it on the service, then reload.",
        noResults: "No template matches that.",
        untitled: "Untitled template",
        noDescription: "No description.",
        builtIn: "Sample",
        unnamedRole: "Unnamed slot",
        flowSection: "Signing flow",
        variablesSection: "Fields to fill",
        noVariables: "This template has no fields — nothing to fill in.",
        deadlineNote: (days: number) =>
          `Deadline is set ${days} ${days === 1 ? "day" : "days"} after the request is created.`,
        applied: (name: string) => `Template applied: ${name}`,
        appliedBody: (signatures: number, variables: number) =>
          `${signatures} signature ${signatures === 1 ? "slot" : "slots"} and ${variables} ${variables === 1 ? "field" : "fields"} are ready. Pick who stands in each role — the roles themselves are fixed by the template.`,
        detached: "Template dropped — the flow was rebuilt empty, because template roles cannot be sent with an uploaded file.",
      },

      variables: {
        label: "Fill in",
        description:
          "Fill the blanks the template left. Values go into the document itself, so everyone signs the finished text.",
        title: "Fields in the document",
        progress: (filled: number, total: number) => `${filled} of ${total} filled`,
        stillRequired: (count: number) => `${count} still required`,
        required: "Required",
        optional: "optional",
        reset: "Clear",
        noVariables: "This template has no fields. Continue to arrange the signers.",
        selectPlaceholder: "— Choose —",
        unfilled: "not filled",
        previewTitle: "Preview",
        previewEmpty: "The template document could not be opened.",
        previewUnreadable:
          "The text of this file could not be read here, so there is nothing to preview. The values are still recorded with the request.",
        serverRenderNote:
          "This is the template's blank preview with the values drawn over the placeholders. The real document is built by the service when the request is created — that copy is what everyone signs.",
      },

      review: {
        section: "From template",
        edit: "Edit fields",
        goToVariables: "Fill it in",
      },

      /**
       * Hộp thoại soạn mẫu bốn bước (`template-builder-dialog.tsx`): tải tài
       * liệu, xác nhận biến, dựng luồng ký, kiểm tra rồi publish.
       */
      builder: {
        titleCreate: "New template",
        titleEdit: "Edit template",
        headingCreate: "New template",
        headingEdit: "Edit template",
        serverDraft: (versionNo: number) => `DRAFT V${versionNo} ON THE SERVER`,
        introMetadataOnly:
          "A published version is immutable. Only the name and the description can be changed here.",
        intro:
          "Upload the document, confirm the fields, configure the signing flow, then check the PDF before publishing.",
        openFullscreen: "Full-screen preview",
        fallbackName: "Template",
        fallbackPreviewTitle: "Template preview",
        fieldPreviewTitle: (name: string) => `Field preview · ${name}`,
        noDocumentTitle: "No document yet",
        noDocumentBody: "Go back to step 1 and upload the source document.",

        stepper: {
          navLabel: "Template steps",
          document: { label: "Document", caption: "Upload & detect" },
          variables: { label: "Fields", caption: "Confirm & preview" },
          signatures: { label: "Signatures", caption: "Workflow & position" },
          review: { label: "Review", caption: "Preview & save" },
        },

        actions: {
          saveChanges: "Save changes",
          back: "Back",
          saveDraft: "Save draft",
          submitDocument: "Submit document",
          continue: "Continue",
          publish: "Publish template",
        },

        hint: {
          metadataLocked: "This template has left draft — the server allows no further edits.",
          metadataEditable: "Change the name or the description, then press Save changes.",
          documentPending:
            "Enter a code and a name, then pick a file. The draft is only created once you press Submit document.",
          documentReady: (fields: number, pages: number) =>
            `The server detected ${fields} ${fields === 1 ? "field" : "fields"} across ${pages} ${pages === 1 ? "page" : "pages"}.`,
          variables: (count: number) =>
            `Configuring ${count} ${count === 1 ? "field" : "fields"}. The keys are read from the file by the server and cannot be edited.`,
          signatures: (roles: number, steps: number) =>
            `${roles} ${roles === 1 ? "signature" : "signatures"} across ${steps} ${steps === 1 ? "step" : "steps"}. Positions are saved when you move to the next step.`,
          reviewDirty: "There are unsaved changes — publishing will save them first.",
          reviewClean: "Check it once more, then publish to move the template to ACTIVE.",
        },

        error: {
          fileType: (extensions: string) =>
            `Only ${extensions} are accepted. The server cannot read any other format at this step.`,
          fileTooLarge: (size: string) => `The file is over the size limit (${size}).`,
          createDraft: "Could not create the template draft on the server.",
          preview: (variant: string) => `Could not load the ${variant} PDF.`,
          saveFields: "Could not save the field configuration.",
          saveSigners: "Could not save the signer roles and the signature positions.",
          saveMetadata: "Could not update the name and the description.",
          publish: "Could not publish the template.",
        },

        document: {
          identityEyebrow: "01 · TEMPLATE DETAILS",
          identityTitle: "Identifying information",
          identityDescription:
            "Used in the template list and when a signing request is created from this template.",
          codeLabel: "Template code",
          codeHint:
            "Starts with a letter or a digit; letters, digits, underscores and hyphens only.",
          codePlaceholder: "EMPLOYMENT_CONTRACT",
          statusLabel: "Status",
          statusHint: "Decided by the server — only publishing moves it to ACTIVE.",
          nameLabel: "Template name",
          namePlaceholder: "Employment contract",
          namePickFileFirst: "Pick a document first to unlock the name and the description.",
          descriptionLabel: "Description",
          descriptionHint: "Optional. A short note on what it is for.",
          lockedNote:
            "The draft now exists on the server, so the code, the name and the description are locked at this step. Renaming is a separate action once the template is saved.",
          sourceEyebrow: "02 · SOURCE DOCUMENT",
          sourceTitle: "Upload the document and detect its fields",
          sourceDescription:
            "The backend reads the DOCX/XLSX, finds every {{variable}} placeholder and builds the PDF preview.",
          dropzone: "Choose a document, or drop it here",
          dropzoneHint: (size: string) =>
            `DOCX and XLSX only, up to ${size}. The server is the source of truth for the field list and for the PDF preview.`,
          replaceFile: "Replace document",
          metricFields: "Fields detected",
          metricPages: "PDF pages",
          metricVersion: "Version ID",
          analysisBusyStrong: "Submitting the document:",
          analysisBusy:
            "the server is detecting fields and converting to PDF. This can take tens of seconds for a large file.",
          analysisDoneStrong: "Draft created on the server.",
          analysisDone: (count: number) =>
            `Received ${count} ${count === 1 ? "field" : "fields"}.`,
          analysisPending:
            "The file is still only in the browser. Press “Submit document” for the server to read its fields and build the PDF — the draft exists only from that moment.",
        },

        variables: {
          title: "Fields in the document",
          description:
            "The keys are detected by the backend and are not editable here. You configure how they are filled in.",
          count: (n: number) => `${n} ${n === 1 ? "field" : "fields"}`,
          none: "No {{variable}} placeholder was found in the document.",
          occurrences: (n: number) => `${n} ${n === 1 ? "place" : "places"}`,
          keyLocked: "Key detected by the backend",
          labelLabel: "Display name",
          labelPlaceholder: "Contract number",
          typeLabel: "Data type",
          optionsLabel: "Choices",
          optionsHint: "Separate them with commas.",
          defaultLabel: "Default value",
          hintLabel: "Input hint",
          requiredLabel: "Required when a signing request is created",
          previewTitle: "Field preview",
          previewSubtitle: "The fields are highlighted in the PDF rendered by the backend.",
        },

        signatures: {
          flowTitle: "Signing flow",
          flowDescription:
            "Pick a signature to configure it and to place it on the document on the right.",
          roleCount: (n: number) => `${n} ${n === 1 ? "signature" : "signatures"}`,
          flowNotice:
            "Steps run one after another from top to bottom. Several signatures in the SAME step sign in parallel: they all open at once, and the next step waits for every one of them.",
          stepNamePlaceholder: (n: number) => `Signing step ${n}`,
          parallelStep: (n: number) => `${n} signatures in parallel`,
          moveStepUp: "Move step up",
          moveStepDown: "Move step down",
          deleteStep: "Delete step",
          addRole: "Add a signature to this step",
          addParallelRole: "Add a parallel signature",
          addStep: "Add signing step",
          positionTitleEmpty: "Pick a signature to place it",
          positionHint:
            "Drag or resize the signature box on the PDF. The other boxes are shown for reference.",
          reloadPdf: "Reload PDF",
          loadingPlain: "Building the PDF used to place the signatures…",
          previewFailedTitle: "Could not build the preview",
          noPreviewTitle: "No PDF preview yet",
          noPreviewBody: "Press “Reload PDF” to fetch the PLAIN copy from the server again.",
          noRoleTitle: "No signature selected",
          noRoleBody: "Pick a signature in the panel on the left to place it.",
          invisibleTitle: "Signature not shown",
          invisibleBody:
            "This signature is configured as an invisible signature, so it needs no position on the page.",
          unnamedRole: "Unnamed signature",
          noCode: "no code",
          pageChip: (page: number) => `Page ${page}`,
          noBox: "No signature box",
          roleNamePlaceholder: "e.g. Employee",
          deleteRole: "Delete signature",
          roleCodeLabel: "Role code",
          roleCodeHint: "The business identifier sent to the server. Renaming does not change it.",
          roleCodePlaceholder: "EMPLOYEE",
          suggestedSigner: "Suggested signer",
          noSuggestion: "No suggestion",
          baselineLabel: "Baseline",
          locationLabel: "Signing location",
          reasonLabel: "Signing reason",
          visibleLabel: "Show the signature on the document",
          visibleHint:
            "Templates require it: the server demands at least one signature box per role, so an invisible signature blocks publishing.",
        },

        review: {
          emptyTitle: "No template yet",
          emptyBody: "Go back through the earlier steps to configure it.",
          summaryTemplate: "Template",
          summaryNoCode: "No code",
          summaryFields: "Fields",
          summaryFieldsSub: "detected by the server",
          summarySteps: "Signing steps",
          summaryStepsSub: (roles: number) =>
            `${roles} ${roles === 1 ? "signature" : "signatures"}`,
          summaryStatus: "Status",
          summaryStatusSub: "after publishing",
          publishEyebrow: "FINAL CHECK",
          publishTitle: "Ready to publish this template?",
          publishDescription:
            "Publishing moves the template to ACTIVE and freezes this version — a published version can no longer be edited.",
          blockersTitle: "Must be fixed",
          noBlockers: "Nothing is blocking the publish.",
          warningsTitle: "Model warnings",
          noWarnings: "No further warnings.",
          workflowEyebrow: "WORKFLOW",
          workflowTitle: "Signing flow summary",
          workflowDescription: "Top to bottom is the execution order of the workflow.",
          stepFallback: (n: number) => `Step ${n}`,
          orderChip: (n: number) => `Signing order ${n}`,
          unnamedRole: "Unnamed",
          finalEyebrow: "FINAL PROOF",
          finalTitle: "PDF with the fields highlighted and every signature box",
          finalDescription:
            "The PDF is built by the server; the signature boxes are drawn over it here at exactly the coordinates that will be sent.",
          loadingHighlight: "Loading the PDF with the fields highlighted…",
          previewFailedTitle: "Could not load the preview",
          noPreviewTitle: "No PDF preview yet",
          noPreviewBody: "Go back a step to load the PDF.",
        },

        previewPanel: {
          refresh: "Reload",
          fullscreen: "Full screen",
          loading: "The backend is rendering the PDF preview…",
          errorTitle: "Could not build the preview",
          emptyTitle: "No PDF preview yet",
          emptyBody: "The preview appears once the document rendering API is connected.",
        },

        fullscreen: {
          label: (title: string) => `Preview ${title}`,
          subtitle: "Final preview · fields highlighted · signature boxes as configured",
          close: "Close preview",
        },

        viewer: {
          previousPage: "Previous page",
          currentPage: "Current page",
          nextPage: "Next page",
          zoomOut: "Zoom out",
          zoomIn: "Zoom in",
          fitWidth: "Fit width",
          pages: (n: number) => `PDF · ${n} ${n === 1 ? "page" : "pages"}`,
          preparing: "Preparing the PDF…",
          frameTitle: "PDF preview",
        },

        metadataOnly: {
          eyebrow: "EDIT TEMPLATE",
          title: "Identifying information",
          description:
            "The template code and the document content cannot change once the template exists.",
          codeLabel: "Template code",
          statusLabel: "Status",
          nameLabel: "Template name",
          descriptionLabel: "Description",
          lockedNote:
            "This template has left draft, so the server locks both the name and the description. Changing the content or the signing flow means creating a new template — the service has no API for creating a new version of a published template.",
          editableNote:
            "Only the name and the description are editable here. The fields, the signer roles and the signature positions belong to the published version and are immutable.",
        },

        status: {
          DRAFT: "Draft",
          ACTIVE: "Active",
          INACTIVE: "Suspended",
          ARCHIVED: "Archived",
        },

        variableType: {
          text: "Text (TEXT)",
          multiline: "Long text (LONG_TEXT)",
          number: "Number (NUMBER)",
          date: "Date (DATE)",
          select: "Choice list (SELECT)",
        },

        /**
         * Lý do máy chủ sẽ từ chối, kể ra TRƯỚC khi gọi — xem
         * `features/sign-request/template-authoring.ts`.
         */
        blockers: {
          unnamedRole: "an unnamed signature",
          codeMissing: "The template code is empty.",
          codeInvalid:
            "The template code must start with a letter or a digit, and may contain only letters, digits, underscores and hyphens.",
          codeTooLong: (max: number) => `The template code is over ${max} characters.`,
          noDocument: "No source document has been chosen.",
          nameMissing: "The template name is empty.",
          nameTooLong: (max: number) => `The template name is over ${max} characters.`,
          descriptionTooLong: (max: number) => `The description is over ${max} characters.`,
          notAnalyzed: "The document has not been received and analysed by the server.",
          selectNoOptions: (key: string) => `The choice field {{${key}}} has no choices yet.`,
          defaultNotInOptions: (key: string) =>
            `The default value of {{${key}}} is not one of its choices.`,
          noRoles: "The signing flow has no signature in it.",
          emptyStep: (step: number) => `Step ${step} has no signature.`,
          roleUnnamed: "A signature still has no role name.",
          roleNoCode: (label: string) => `Signature “${label}” has no role code.`,
          duplicateRoleCode: (code: string) => `Role code “${code}” is used twice.`,
          roleInvisible: (label: string) =>
            `Signature “${label}” is set to invisible. A template requires every role to have a signature box on the page.`,
          slotPageOutOfRange: (label: string, page: number, pageCount: number) =>
            `Signature “${label}” sits on page ${page}, outside the ${pageCount}-page range.`,
          slotNoSize: (label: string) => `Signature box “${label}” has no size.`,
          slotOutOfBounds: (label: string) => `Signature box “${label}” runs off the page edge.`,
          slotOverlap: (first: string, second: string) =>
            `Signature boxes “${first}” and “${second}” overlap.`,
        },
      },

      /**
       * Hộp thoại thêm/sửa mẫu. Chỉ nói về phần KHAI BÁO của một mẫu — các ô
       * phải điền và vai ký thuộc về bước cấu hình phiên bản, không phải chỗ này.
       */
      form: {
        titleCreate: "New template",
        titleEdit: "Edit template",
        description:
          "Name the template, say when to reach for it, and attach the document it is built from. Fields and signer roles are configured on the version afterwards.",

        codeLabel: "Code",
        codePlaceholder: "SERVICE_AGREEMENT",
        codeHint: "The identifier the service refers to. Letters, digits and underscores.",
        nameLabel: "Name",
        namePlaceholder: "Service agreement",
        descriptionLabel: "Description",
        descriptionHint: "One line telling a colleague when to reach for this template.",
        statusLabel: "Status",
        status: {
          DRAFT: "Draft",
          ACTIVE: "Active",
          INACTIVE: "Inactive",
          ARCHIVED: "Archived",
        },

        fileSection: "Source document",
        chooseFile: "Choose document",
        replaceFile: "Replace",
        noFile: "No document chosen yet.",
        fileHint:
          "PDF, DOCX or XLSX. Anywhere you wrote {{field_name}} in it becomes a field to fill.",
        keepFile: "Leave this empty to keep the document the current version already uses.",

        incomplete: "A template needs a code and a name.",
        notWired:
          "Nothing is sent yet: this dialog collects the values, and the create/update call is still to be wired to the service.",
        save: "Save template",
      },

      manager: {
        title: "Templates",
        description: "Everything reusable about a signing request lives here.",
        searchPlaceholder: "Search templates",
        create: "New template",
        use: "Use",
        edit: "Edit",
        duplicate: "Duplicate",
        delete: "Delete",
        copySuffix: "(copy)",
        updatedAt: (value: string) => `updated ${value}`,
        confirmDelete: (name: string) => `Delete “${name}”? This cannot be undone.`,
        saved: "Template saved",
        deleted: "Template deleted",
        deleteFailed: "Template not deleted",
        saveFailed: "Template not saved",
        saveFailedBody:
          "Browser storage refused the write — most likely it is full. Remove a template you no longer use and try again.",
        storageNote:
          "Templates are stored in this browser only. They are not shared with colleagues, and clearing site data removes them.",
      },

      editor: {
        titleCreate: "New template",
        titleEdit: "Edit template",
        description:
          "The document and its blanks on the left; who signs it, in what order, on the right.",

        pickFileTitle: "Start from a document",
        pickFileBody:
          "Upload the file this template produces. Anywhere you wrote {{field_name}} in it becomes a blank to fill; signature boxes are placed on top of it.",
        chooseFile: "Choose document",
        fileTooLarge: (limit: string) =>
          `The file is over ${limit}. Templates live in browser storage, which is too small for documents that size.`,

        infoSection: "Template",
        nameLabel: "Name",
        namePlaceholder: "Service agreement",
        descriptionLabel: "Description",
        descriptionHint: "One line telling a colleague when to reach for this template.",

        fileSection: "Document",
        replaceFile: "Replace",
        nonPdfNote:
          "Only PDF carries a visible signature box on the page. Positions set below are recorded but not drawn for this format.",
        scanning: "Reading the document…",
        scanned: (count: number) =>
          count === 0
            ? "No {{placeholder}} found in the document."
            : `${count} placeholder${count === 1 ? "" : "s"} found in the document.`,
        scanFailed:
          "The text of this file could not be read here. Declare the fields by hand — they still work.",
        undeclaredFound: (count: number) =>
          count === 1
            ? "1 placeholder is in the document but not declared. Nobody will be asked to fill it in."
            : `${count} placeholders are in the document but not declared. Nobody will be asked to fill them in.`,
        addAllVariables: "Declare them",

        variablesSection: "Fields",
        addVariable: "Add field",
        noVariables:
          "No fields yet. Anything written as {{field_name}} in the document belongs here.",
        removeVariable: "Remove field",
        variableKeyLabel: "Placeholder name",
        variableLabelLabel: "Label",
        variableLabelPlaceholder: "Label shown on the form",
        variableTypeLabel: "Type",
        variableType: {
          text: "Text",
          multiline: "Long text",
          number: "Number",
          date: "Date",
          select: "Choice",
        },
        optionsLabel: "Choices",
        optionsPlaceholder: "Choices, separated by commas",
        defaultValueLabel: "Default",
        defaultValuePlaceholder: "Default value",
        variableHintLabel: "Hint",
        variableHintPlaceholder: "Hint under the field",
        requiredLabel: "Required",
        notInDocument: "not in document",
        notInDocumentHint:
          "This name was not found in the document text. A misspelt name is never filled in.",

        defaultsSection: "Request defaults",
        requestNameLabel: "Request name",
        requestNamePlaceholder: "Agreement {{contract_no}}",
        messageLabel: "Message to signers",
        patternHint: "You can use {{field_name}} here — it is replaced with what was filled in.",
        deadlineDaysLabel: "Deadline, in days",
        deadlineDaysHint:
          "Counted from the day the request is created. Leave empty for no deadline.",

        flowSection: "Signature slots",
        flowHint:
          "A slot is a role, not a person: “Head of finance”, not a name. The person is chosen each time the template is used.",
        addRole: "Add signature slot",
        removeRole: "Remove slot",
        roleLabel: "Slot name",
        rolePlaceholder: "Head of finance",
        unnamedRole: "Unnamed slot",
        suggestedLabel: "Usual signer",
        suggestedHint: "Filled in for whoever uses the template — they can still change it.",
        noSuggestion: "No suggestion",
        showConfig: "Configure",
        hideConfig: "Hide",
        emptyStep: "This step has no signature slot.",

        save: "Save template",
        ready: "Ready to save",
        moreIssues: (count: number) => `and ${count} more`,
        issue: {
          NO_NAME: "The template has no name.",
          NO_FILE: "The template has no document.",
          NO_ROLE: "The template has no signature slot.",
          ROLE_WITHOUT_NAME: "A signature slot has no name.",
          EMPTY_STEP: (index: number) => `Step ${index} has no signature slot.`,
          DUPLICATE_VARIABLE_KEY: (key: string) => `The field {{${key}}} is declared twice.`,
          SELECT_WITHOUT_OPTIONS: (key: string) =>
            `{{${key}}} is a choice field with no choices.`,
          UNDECLARED_VARIABLE: (key: string) =>
            `{{${key}}} is in the document but not declared — nobody will be asked for it.`,
        },
      },
    },
  },

  verify: {
    exportReport: "Export report",
    exportReportTitle: "Available after report export is integrated",
    banner: {
      title: "Independent signature verification",
      description:
        "Validate cryptographic integrity, certificate trust, timestamps and long-term validation data.",
    },
    apiBaseUrl: {
      buttonTitle: "Verification service address",
      serverDefault: "Server default",
      title: "Verification service address",
      description:
        "This screen calls POST /api/v1/verify on this address. It is a separate service from the signing one — the signing address on the other screen is not changed.",
      label: "Base URL",
      placeholder: "http://localhost:8082",
      emptyHint: "Leave empty to use VERIFY_API_URL from the server environment.",
      errorScheme: "Only http:// and https:// are accepted.",
      errorMalformed: "Not a valid URL. Include the scheme, e.g. http://192.168.1.10:8082.",
      test: "Test connection",
      testing: "Testing…",
      testOk: (baseUrl: string) => `Reachable — the verify endpoint exists at ${baseUrl}.`,
      testFailed: "Could not reach the verification service at this address.",
      save: "Save",
      cancel: "Cancel",
      savedTitle: "Verification address updated",
      proxyNote:
        "The browser never calls this address directly: requests go through this app's own /api/verify routes, which avoids CORS and works with hosts that only allow server-to-server calls.",
    },
    report: {
      signatureCounts: (passed: number, processed: number, detected: number) =>
        `${passed}/${processed} fully passed · ${detected} detected`,
      statisticsLine: (cryptographicallyValid: number, processed: number) =>
        `${cryptographicallyValid}/${processed} cryptographically valid`,
      artifact: "Artifact",
      trustAnchors: "Trust anchors",
      anchorCounts: (signer: number, tsa: number) => `${signer} signer · ${tsa} TSA`,
      policy: "Policy",
      engine: "Engine",
      verifiedAt: "Validation time",
      runId: "Run ID",
      sha256: "File SHA-256",
      completeness: "Completeness",
      completenessValue: {
        COMPLETE: "Every step ran and concluded",
        PARTIAL: "Some steps did not run",
        NOT_PERFORMED: "No signature was processed",
      },
      stats: {
        cryptographicallyValid: "Cryptographically valid",
        totalPassed: "Fully passed",
        indeterminate: "Indeterminate",
        totalFailed: "Failed",
      },
      noAnchorsNote:
        "No trust anchors are configured on the verification service, so no certificate path can be evaluated. This alone is enough to make the whole report INDETERMINATE — it is not a defect of the file.",
    },
    upload: {
      sectionTitle: "Signed artifact",
      dropHere: "Drop a signed file to verify",
      acceptedTypes: "PDF, XML or OOXML (DOCX/XLSX/PPTX) — up to 32 MB",
      chooseFile: "Choose signed file",
      remove: (name: string) => `Remove ${name}`,
      verifying: "Verification in progress…",
      completed: "Verification completed",
      failed: "Verification failed",
    },
    signatureList: {
      title: "Signatures found",
      empty: "No signatures were found in this file.",
      checksPassed: (passed: number, total: number) =>
        `${passed} of ${total} key checks passed`,
    },
    empty: {
      title: "Submit a signed artifact",
      description:
        "Sigil will validate signature integrity, certificate trust, timestamps and long-term validation data.",
    },
    progress: {
      title: "Verifying signatures…",
      description: "Sending the file to the verification service and waiting for the result.",
      checks: [
        "Detecting signature containers",
        "Validating cryptographic integrity",
        "Building certificate chain",
        "Validating timestamps",
      ],
    },
    error: {
      title: "Couldn't verify this file",
      retry: "Try another file",
      correlationId: (id: string) => `Correlation ID: ${id}`,
    },
    tabs: {
      result: "Result",
      tree: "Validation Tree",
      chain: "Certificate Chain",
      timestamp: "Timestamp",
      manifest: "Manifest & References",
      issues: "Issues",
      ariaLabel: "Verification evidence",
    },
    banner2: {
      signedBy: (profile: string, signedAt: string) => `${profile} · signed ${signedAt}`,
      unknownSigner: "unknown signer",
      signedByPrefix: " · by ",
      trustAnchor: (name: string) => ` · trust anchor: ${name}`,
      warnings: (n: number) => `▲ ${n} warnings`,
      noWarnings: "No warnings",
      signingTimeUntrusted:
        "The signing time is the signer's own claim — no trusted timestamp corroborates it.",
    },
    verdict: {
      valid: "Signature is valid",
      invalid: "Signature is invalid",
      /* Deliberately not "invalid": nothing is wrong with the file — the verifier could not conclude. */
      indeterminate: "Not enough evidence to conclude",
    },
    result: {
      standard: "Standard",
      signatureAlgorithm: "Signature algorithm",
      digestAlgorithm: "Digest algorithm",
      validationSummary: "Validation summary",
    },
    /*
     * The five cards of schema 6.1.0. Titles live here so the screen stays
     * bilingual; `detail` still comes from the backend, because it is the only
     * source of the case-specific reason (why SIGNED_WITHIN_VALIDITY came back
     * INDETERMINATE, for instance). An id with no entry here falls back to the
     * backend title, so a card added in a later minor still renders.
     */
    primaryChecks: {
      documentTitle: "Key checks across the document",
      documentDescription:
        "The worst result of each check across every signature. Select a signature to see its own result.",
      linkedIssues: (n: number) => (n === 1 ? "See the cause →" : `See ${n} causes →`),
      byId: {
        INTEGRITY: {
          title: "Content integrity",
          description: "The signed content is unchanged since it was signed.",
        },
        TRUSTED_SIGNATURE: {
          title: "Trusted signature",
          description:
            "The signature value is cryptographically correct and the signer's certificate builds to a trusted source.",
        },
        SIGNED_WITHIN_VALIDITY: {
          title: "Signed within the certificate's validity",
          description: "The signature was created while the signer's certificate was still valid.",
        },
        TIMESTAMP_PRESENT: {
          title: "Timestamp",
          description: "Whether the document carries a valid timestamp token.",
        },
        CERTIFICATE_NOT_REVOKED: {
          title: "Certificate not revoked",
          description: "The signer's certificate had not been revoked at the reference time.",
        },
      } as Record<string, { title: string; description: string }>,
    },
    validation: {
      groups: {
        cryptographicIntegrity: "Cryptographic integrity",
        signedScope: "Signed scope",
        certificatePath: "Certificate path",
        revocation: "Revocation",
        trustedTime: "Trusted time",
        signaturePolicy: "Signature policy",
        longTermValidation: "Long-term validation",
      },
    },
    remediations: {
      title: "What to do next",
      description:
        "Already merged and ordered by the verification service — work through them top to bottom.",
      requiresResigning: "Requires re-signing",
      networkRequirement: {
        NOT_REQUIRED: "No network access needed",
        REQUIRED: "Requires network access",
        CONDITIONAL: "May require network access",
      },
      stage: {
        VERIFIER_CONFIGURATION: "Verifier configuration",
        DOCUMENT_GENERATION: "Document generation",
        SIGNATURE_CREATION: "Signature creation",
        TIMESTAMP_CREATION: "Timestamp creation",
        VALIDATION_MATERIAL: "Validation material",
        WORKFLOW_CONFIGURATION: "Workflow configuration",
        USER_ACTION: "User action",
      },
    },
    revocation: {
      title: "Revocation",
      empty: "No revocation result was reported for this signature.",
    },
    tree: {
      standard: "Standard / baseline level",
      canonicalization: "Canonicalization",
      notApplicable: "not applicable",
      signatureAlgorithm: "Signature algorithm",
      digest: "Digest",
      matched: "matched",
      notMatched: "not matched",
      unknownMatch: "unverifiable",
      yes: "yes",
      no: "no",
      certificateChain: "Certificate chain",
      references: (matched: number, total: number) => `${matched}/${total} references matched`,
      byteRange: "Byte range",
      coversCurrentDocument: "Covers the current document",
      unsignedTrailingBytes: "Unsigned trailing bytes",
      elementPath: "Signature element path",
      timestamp: "Timestamp",
      timestampCount: (n: number) => (n === 1 ? "1 present" : `${n} present`),
      absent: "absent",
      longTerm: "Long-term validation",
      wrappingIndicators: "Wrapping attack indicators",
    },
    checks: {
      title: "Engine checks",
      /* Explains why a step did not run — see blockedByCheckIds. */
      blockedBy: (blockers: string) => `Not evaluated — blocked by: ${blockers}`,
      type: {
        PDF_BYTE_RANGE: "PDF byte range",
        XML_REFERENCE_RESOLUTION: "XML reference resolution",
        SIGNED_OBJECT_INTEGRITY: "Signed object integrity",
        SIGNATURE_CRYPTOGRAPHY: "Signature cryptography",
        SIGNED_ATTRIBUTES: "Signed attributes",
        ALGORITHM_POLICY: "Algorithm policy",
        CERTIFICATE_PATH: "Certificate path",
        REVOCATION: "Revocation",
        SIGNATURE_TIMESTAMP: "Signature timestamp",
        DOCUMENT_MODIFICATION: "Document modification",
        BASELINE_PROFILE: "Baseline profile",
        LONG_TERM_VALIDATION: "Long-term validation",
      },
      /*
       * NOT_EVALUATED and INDETERMINATE are worded so they cannot be confused:
       * the first means the step never ran, the second that it ran without a
       * conclusion. Collapsing them loses exactly what the reader needs.
       */
      outcome: {
        PASS: "Passed",
        FAIL: "Failed",
        INDETERMINATE: "Inconclusive",
        WARNING: "Passed with warning",
        NOT_APPLICABLE: "Not applicable",
        NOT_EVALUATED: "Not evaluated",
        UNSUPPORTED: "Unsupported",
      },
    },
    chain: {
      trustedBanner: (anchor: string) => `Chain builds to a trusted root — ${anchor}`,
      notTrustedBanner: "Could not establish a path to a trusted root",
      rejectedBanner: "The certificate path was rejected",
      trustAnchorBadge: "Trust anchor",
      selfSigned: "Self-signed",
      serial: "Serial number",
      fingerprint: "SHA-256 fingerprint",
      validity: (from: string, to: string) => `Valid ${from} → ${to}`,
      status: {
        VALID: "Valid",
        EXPIRED: "Expired",
        NOT_YET_VALID: "Not yet valid",
        INVALID: "Invalid",
        UNKNOWN: "Unknown",
      },
      role: {
        ROOT: "Root",
        INTERMEDIATE: "Intermediate",
        LEAF: "Signing certificate",
        SIGNER: "Signing certificate",
        TSA: "TSA",
        OCSP_RESPONDER: "OCSP responder",
        UNKNOWN: "Unknown role",
      },
    },
    timestamp: {
      none: "This signature has no timestamp.",
      timestampLabel: "Time (genTime)",
      messageImprint: "Message imprint",
      tsa: "TSA",
      policy: "Policy OID",
      accuracy: "Accuracy",
      status: "Status",
      revocation: "TSA revocation",
      chainTitle: "TSA certificate chain",
      issuesTitle: "Timestamp issues",
      notUsableAsPoe:
        "This timestamp is present but cannot be used as proof of existence — its own TSA certificate is not anchored to a configured trust anchor.",
    },
    manifest: {
      columns: {
        uri: "URI",
        type: "Type",
        digestAlgorithm: "Digest algorithm",
        digestValue: "Digest value",
        matched: "Matched",
      },
      wholeDocument: "(whole document)",
      external: "EXTERNAL",
      duplicateId: "DUPLICATE ID",
      byteRange: "Byte range",
      coversWholeRevision: "Covers the whole signed revision",
      coversCurrentDocument: "Covers the current document",
      unsignedTrailingBytes: "Unsigned trailing bytes",
      empty: "No references.",
    },
    issues: {
      summary: (errors: number, warnings: number) => `${errors} errors · ${warnings} warnings`,
      none: "No issues were reported for this signature.",
      documentLevel: "Document-level issues",
      rootCauses: "Root causes",
      consequences: (n: number) => (n === 1 ? "1 consequence of this" : `${n} consequences of this`),
      needsResigning: "The file must be re-signed",
      byCode: {
        SIGNER_TRUST_STORE_EMPTY: {
          title: "Could not verify the signer's certificate source",
          description:
            "The signature may still be cryptographically correct, but the verifier has not been configured with a trust source to confirm the signer's certificate.",
        },
        TSA_TRUST_STORE_EMPTY: {
          title: "Could not verify the timestamp source",
          description:
            "The timestamp may be cryptographically correct, but the verifier cannot anchor the TSA certificate to a trust source.",
        },
        ISSUER_CERTIFICATE_NOT_AVAILABLE: {
          title: "Missing intermediate certificate",
          description:
            "The system does not yet have the certificates needed to build a complete certificate path.",
        },
        REVOCATION_NOT_EVALUATED: {
          title: "Could not check revocation status",
          description:
            "This step was not run because an earlier dependent check did not complete — it does not mean the certificate has been revoked.",
        },
      } as Record<string, { title: string; description: string }>,
    },
    allowlist: {
      action: "Add to allowlist and re-verify",
      adding: "Working…",
      genericError: "Something went wrong. Please try again.",
      reverifyFailed: "Added to allowlist, but re-verification failed.",
    },
    summary: {
      validSummary: (processed: number) =>
        `Processed ${processed} signature${processed === 1 ? "" : "s"}. Checks required by the current policy have passed.`,
      invalidSummary:
        "A signature or content was found that does not meet verification requirements. Select the signature with an error status to see the cause.",
      indeterminateSummary: (valid: number, processed: number) =>
        `${valid}/${processed} signature(s) are cryptographically valid, but the system does not yet have enough grounds to fully conclude on trust, revocation or trusted time.`,
      cryptoValidCount: (valid: number, processed: number) =>
        `${valid}/${processed} cryptographically valid signature(s)`,
      failedCount: (n: number) => `${n} failed signature${n === 1 ? "" : "s"}`,
      indeterminateCount: (n: number) => `${n} signature${n === 1 ? "" : "s"} not fully conclusive`,
      rootIssuesCount: (n: number) => `${n} root issue${n === 1 ? "" : "s"} to review`,
    },
    apiErrors: {
      VERIFY_NOT_SUPPORTED:
        "The service at this address has no verify endpoint (POST /api/v1/verify). Check the verification service address — the signing service cannot verify.",
      ALLOWLIST_NOT_SUPPORTED:
        "The service at this address has no revocation allowlist endpoint (POST /api/v1/revocation-allowlist).",
      VERIFY_API_UNREACHABLE:
        "Could not connect to the verification service. Check the address and whether the service is running.",
      VERIFY_API_NOT_CONFIGURED:
        "No verification service address is set. Set it in the configuration button above, or set VERIFY_API_URL in .env.local.",
      VERIFY_API_BASE_URL_INVALID:
        "The verification service address is invalid. It must be a full http:// or https:// URL, e.g. http://192.168.1.10:8082.",
      VERIFY_SCHEMA_UNSUPPORTED:
        "The backend returned a verification report in a schema this test bench cannot read yet (currently supporting schema 6.x). The converter in lib/types/verification.ts needs updating.",
      FILE_EMPTY: "The file is empty.",
      FILE_READ_FAILED: "Could not read the uploaded file. Please try again.",
      VALIDATION_FAILED: "The verify request is invalid.",
      FILE_TOO_LARGE: "The file exceeds the 32 MiB limit.",
      INTERNAL_ERROR: "The verification service encountered an internal error while processing this file.",
      ALLOWLIST_HOST_EMPTY: "Could not determine a host to add to the allowlist.",
      unknownError: (code: string) => `An unknown error occurred while verifying (${code}).`,
    },
    ux: {
      overview: "Overview",
      advanced: "Advanced info",
      viewTablistAriaLabel: "Verification result view",
      verificationResult: "Verification result",
      signatures: "Signatures",
      signer: "Signer",
      signatureDetailTitle: "Signature details",
      trust: "Trust",
      signingTime: "Signing time",
      /* Deliberately not "Signing time": nothing corroborates this value but the signer's own word. */
      claimedSigningTime: "Signing time claimed by signer",
      timestampNotTrustedTime:
        "The timestamp is valid, but the verifier has not loaded the TSA's trust anchor, so its time is not used as the reference time.",
      userChecks: "Key checks",
      integrity: "Content integrity",
      integrityDescription: "Checks the scope of content the signature protects.",
      cryptography: "Signature value",
      cryptographyDescription: "Checks the signature using the signer's public key.",
      identityCertificate: "Identity & certificate",
      identityCertificateDescription: "Checks the certificate path to a trusted source.",
      trustedTime: "Trusted time",
      trustedTimeDescription: "Checks whether the timestamp can be used as proof of time.",
      needsAttention: "Needs attention",
      noResignRequired: "No need to re-sign the document",
      laterRevisionTitle: "There is a later update to this signature",
      laterRevisionDescription:
        "The signature does not cover the document's latest state. See Signed scope in the advanced tab to review revisions made after signing.",
      advancedDescription:
        "Information for developers, auditors or administrators diagnosing a verification result.",
      advancedNavAriaLabel: "Advanced information navigation",
      sections: {
        technical: "Verification environment",
        checks: "Checks",
        timestamp: "Timestamp",
        scope: "Signed scope",
        issues: "Issues & remediation",
        raw: "Raw JSON",
      },
      reportMetadata: "Verification run info",
      trustDomain: "Trust domain",
      signerTrust: "Signer trust",
      tsaTrust: "TSA trust",
      anchorsCount: (n: number) => `${n} anchor${n === 1 ? "" : "s"}`,
      signatureMetadata: "Signature technical info",
      mainIndication: "Main indication",
      subIndications: "Sub-indications",
      signatureId: "Signature ID",
      copyJson: "Copy JSON",
      details: "View details",
    },
  },

  certificates: {
    filters: {
      searchPlaceholder: "Search subject, issuer, serial, fingerprint…",
      searchAriaLabel: "Search certificates",
      statusAriaLabel: "Filter certificate status",
      keySourceAriaLabel: "Filter by key source",
      expiringWithinAriaLabel: "Expiring within days",
      allStatuses: "All statuses",
      allKeySources: "All key sources",
    },
    status: {
      VALID: "Valid",
      EXPIRING: "Expiring",
      EXPIRED: "Expired",
      NOT_YET_VALID: "Not yet valid",
      DISABLED: "Disabled",
    },
    table: {
      empty: "No certificates match the current filters.",
      columns: {
        subject: "Subject",
        issuer: "Issuer",
        serial: "Serial",
        status: "Status",
        expires: "Expires",
        source: "Source",
      },
    },
    workspace: {
      loading: "Loading…",
      loadMore: "Load more",
      loadPageFailedTitle: "Unable to load the next certificate page",
      paginationAriaLabel: "Certificate pagination",
      showing: (n: number) => `Showing ${n} certificates`,
      page: (page: number) => `Page ${page}`,
      previous: "Previous",
      next: "Next",
    },
    page: {
      importTitle: "The backend does not support standalone certificate import",
      import: "Import",
    },
    statusDialog: {
      enable: "Enable",
      disable: "Disable",
      dialogLabel: (action: string) => `${action} certificate`,
      confirmTitle: (action: string, name: string) => `${action} ${name}?`,
      enableBody: "The certificate will become available for platform operations again.",
      disableBody:
        "The certificate will be disabled internally. This does not revoke it at the issuing CA.",
      cancel: "Cancel",
      submit: (action: string) => `${action} certificate`,
      pending: (action: string) => `${action}…`,
      enabledToastTitle: "Certificate enabled",
      disabledToastTitle: "Certificate disabled",
      genericError: "Unable to update certificate.",
    },
    trustChain: {
      trusted: "Certificate path is trusted",
      notTrusted: "Certificate path is not trusted",
      issuer: (name: string) => `Issuer: ${name}`,
    },
    copyFingerprint: {
      button: "Copy fingerprint",
      successTitle: "Fingerprint copied",
      failedTitle: "Unable to copy",
      failedDescription: "The browser blocked clipboard access.",
    },
    detail: {
      tabs: {
        general: "General",
        details: "Details",
        extensions: "Extensions",
        chain: "Certification Path",
        asn1: "ASN.1 Inspector",
      },
      issuedTo: "Issued to",
      issuedBy: "Issued by",
      validFrom: "Valid from",
      validTo: "Valid to",
      serialNumber: "Serial number",
      source: "Source",
      sha256Fingerprint: "SHA-256 fingerprint",
      exportPem: "Export PEM",
      exportDer: "Export DER",
      signatureAlgorithm: "Signature algorithm",
      publicKey: "Public key",
      format: "Format",
      trustStatus: "Trust status",
      certificateAuthority: "Certificate authority",
      selfSigned: "Self-signed",
      yes: "Yes",
      no: "No",
      fallbackTitle: "Certificate",
    },
  },

  keyProviders: {
    filters: {
      searchAriaLabel: "Search key providers",
      searchPlaceholder: "Search name or provider type…",
      statusAriaLabel: "Filter by status",
      typeAriaLabel: "Filter by provider type",
      allStatuses: "All statuses",
      allTypes: "All provider types",
    },
    status: {
      UNVERIFIED: "Unverified",
      ONLINE: "Online",
      DEGRADED: "Degraded",
      OFFLINE: "Offline",
      DISABLED: "Disabled",
      DELETED: "Deleted",
    },
    type: {
      PKCS12: "PKCS#12",
      REMOTE_HSM: "Remote HSM",
      REMOTE_CA: "Remote CA",
      USB_TOKEN: "USB Token",
    },
    table: {
      emptyTitle: "No key providers found",
      emptyDescription: "Change the current filters or add a key provider.",
      columns: {
        provider: "Provider",
        type: "Type",
        health: "Health",
        latency: "Latency",
        keys: "Keys",
        actions: "Actions",
      },
      viewDetails: "View details",
      viewLabel: (name: string) => `View ${name}`,
    },
    page: {
      summary: {
        providersOnPage: "Providers on this page",
        totalConfigured: (n: number) => `${n} configured in total`,
        onlineOnPage: "Online on this page",
        requireAttention: (n: number) => `${n} require attention on this page`,
        discoveredCredentials: "Discovered credentials",
        referencesOnly: "References only; keys remain in custody",
      },
      paginationAriaLabel: "Key provider pagination",
      pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
      showingRange: (first: number, last: number, total: number) =>
        `Showing ${first}-${last} of ${total}`,
      goToPage: (page: number) => `Go to page ${page}`,
      previous: "Previous",
      next: "Next",
    },
    wizard: {
      addProvider: "+ Add key provider",
      eyebrow: "Configuration wizard",
      title: "Add key provider",
      dialogLabel: "Add key provider",
      close: "Close configuration wizard",
      progressAriaLabel: "Configuration progress",
      steps: ["Type", "Configure", "Validate", "Review"],
      types: {
        PKCS12: { label: "PKCS#12", description: "Software keystore file (.p12 or .pfx)" },
        REMOTE_HSM: { label: "Remote HSM", description: "Network-attached hardware security module" },
        REMOTE_CA: { label: "Remote CA", description: "Enterprise or public issuing authority" },
        USB_TOKEN: { label: "USB Token", description: "Locally attached hardware token" },
      },
      fields: {
        displayName: "Display name",
        pkcs12File: "PKCS#12 file",
        pkcs12Password: "PKCS#12 password",
        preferredAlias: "Preferred alias (optional)",
        endpoint: "Endpoint",
        partition: "Partition",
        keyLabel: "Key label",
        authType: "Authentication type",
        clientSecret: "Client secret",
        accountId: "Account ID",
        certificateProfile: "Certificate profile",
        apiKey: "API key",
        modulePath: "PKCS#11 module path",
        slot: "Slot",
        tokenLabel: "Token label",
        pin: "PIN",
      },
      secretsNote: "Secrets are sent only to the server and are never persisted in browser storage.",
      testTitle: "Test PKCS#12",
      testDescription: "Validate the password and select one discovered credential.",
      selectAliasLegend: "Select credential alias",
      creatingDraft: "Creating draft…",
      testing: "Testing…",
      retest: "Re-test",
      testPkcs12: "Test PKCS#12",
      draftExpires: (date: string) => `Draft expires at ${date}`,
      adapterNotImplementedTitle: "Adapter not implemented",
      adapterNotImplementedBody:
        "This configuration will be stored as UNVERIFIED. It cannot be tested, synchronized, or used for signing until a backend adapter is available.",
      show: "Show",
      hide: "Hide",
      back: "Back",
      cancel: "Cancel",
      creatingProvider: "Creating provider…",
      createProvider: "Create provider",
      continueLabel: "Continue",
      review: {
        type: "Type",
        displayName: "Display name",
        file: "File",
        selectedAlias: "Selected alias",
        endpoint: "Endpoint",
        partition: "Partition",
        keyLabel: "Key label",
        accountId: "Account ID",
        profile: "Profile",
        modulePath: "Module path",
        slot: "Slot",
        tokenLabel: "Token label",
      },
      errors: {
        pkcs12NotVerified: "The PKCS#12 draft could not be verified.",
        pkcs12TestFailed: "Unable to test PKCS#12.",
        testFirst: "Test the PKCS#12 file and select a credential alias first.",
        createFailed: "Unable to create provider.",
      },
      toastSuccessTitle: "Key provider created successfully",
    },
    replaceDialog: {
      trigger: "Replace PKCS#12",
      dialogLabel: "Replace PKCS#12 material",
      title: "Replace PKCS#12 material",
      passwordPlaceholder: "PKCS#12 password",
      selectAliasLegend: "Select credential alias",
      cancel: "Cancel",
      testing: "Testing…",
      testReplacement: "Test replacement",
      saving: "Saving…",
      saveReplacement: "Save replacement",
      concurrentChangeError: "Provider changed in another session. Reload and retry.",
      verifyFailed: "The replacement PKCS#12 could not be verified.",
      testFailedGeneric: "Unable to test replacement file.",
      successTitle: "PKCS#12 replaced successfully",
    },
    actions: {
      test: "Test",
      sync: "Sync",
      enable: "Enable provider",
      disable: "Disable provider",
      delete: "Delete",
      adapterNotImplemented: "Adapter is not implemented",
      deleteConfirm: (name: string) => `Delete provider "${name}"?`,
      genericError: "Unable to update provider.",
    },
    detail: {
      latencyUnavailable: "Latency unavailable",
      latencyMs: (ms: number) => `${ms} ms latency`,
      lastChecked: "Last checked:",
      version: "Version",
      configurationTitle: "Configuration",
      material: "Material",
      secret: "Secret",
      updated: "Updated",
      credentialsTitle: (n: number) => `Credentials (${n})`,
      noCredentials: "No credentials discovered on this provider.",
      noAlgorithms: "No algorithms",
      defaultBadge: "Default",
      viewCertificate: "View certificate",
      noBoundCertificate: "No bound certificate",
      fallbackTitle: "Key Provider",
    },
  },

  systemLogs: {
    tabs: {
      logs: "System logs",
      audit: "Audit trail",
    },
    access: {
      title: "Access restricted",
      description: "Your account needs the log:read permission to inspect system logs and audit trails.",
    },
    overview: {
      title: "Investigation workspace",
      description:
        "This view contains persisted WARN and ERROR events that are useful for incident investigation, not the complete server log.",
      adminNote:
        "Rows without a tenant are system-level events that occurred before a tenant could be identified.",
      retention:
        "Retention: ERROR logs 180 days; WARN and INFO logs 30 days. Audit events are retained without scheduled cleanup.",
    },
    traceSearch: {
      label: "Open a request trace",
      placeholder: "Paste a correlation ID",
      submit: "Open trace",
    },
    filters: {
      title: "Filters",
      level: "Level",
      allLevels: "All levels",
      source: "Source",
      allSources: "All sources",
      range: "Time range",
      last24Hours: "Last 24 hours",
      last7Days: "Last 7 days",
      last30Days: "Last 30 days",
      last180Days: "Last 180 days",
      correlationId: "Correlation ID",
      errorCode: "Error code",
      resourceType: "Resource type",
      resourceId: "Resource ID",
      eventType: "Event type",
      actorId: "Actor ID",
      advanced: "More filters",
      apply: "Apply filters",
      reset: "Reset",
      exactMatchHint: "IDs and codes use exact matching.",
    },
    table: {
      time: "Time",
      level: "Level",
      source: "Source",
      errorCode: "Error code",
      message: "Message",
      resource: "Resource",
      correlationId: "Correlation ID",
      actor: "Actor",
      eventType: "Event",
      details: "Details",
      actions: "Actions",
      viewDetails: "View log details",
      openTrace: "Open complete trace",
      filterByCode: (code: string) => `Filter by ${code}`,
      emptyLogs: "No system logs match these filters.",
      emptyAudit: "No audit events match these filters.",
      loadMore: "Load more",
      loading: "Loading…",
      end: "You have reached the end of the available records.",
    },
    detail: {
      title: "Log details",
      close: "Close log details",
      message: "Message",
      context: "Context",
      technical: "Technical details",
      stackTrace: "Stack trace",
      noStack: "No stack trace was recorded for this event.",
      copy: "Copy",
      copied: "Copied to clipboard",
      viewTrace: "View complete trace",
      malformedContext: "The stored context is not valid JSON.",
      systemScope: "System-level event",
      fields: {
        logger: "Logger",
        exception: "Exception",
        request: "HTTP request",
        status: "HTTP status",
        duration: "Duration",
        tenant: "Tenant",
        actor: "Actor",
        resource: "Resource",
      },
    },
    errors: {
      title: "Unable to load logs",
      generic: "The log service could not be reached. Try again.",
      accessDenied: "Your account no longer has permission to read logs.",
      invalidCursor: "The paging cursor expired. The list was reset to the newest records.",
      notFound: "This log entry could not be found.",
      traceNotFound: "No trace was found for this correlation ID.",
    },
    trace: {
      title: "Request trace",
      description: "A chronological reconstruction of user activity and system events",
      copy: "Copy ID",
      copied: "Correlation ID copied",
      auditKind: "Audit event",
      logKind: "System log",
      noData: "No trace was found for this correlation ID.",
      backToLogs: "Back to system logs",
    },
    sources: {
      HTTP: "HTTP",
      SIGNING_JOB: "Signing job",
      SCHEDULER: "Scheduler",
      VERIFICATION: "Verification",
      KEY_SOURCE: "Key source",
      TSA: "Timestamp authority",
      REVOCATION: "Revocation",
      NOTIFICATION: "Notification",
      SYSTEM: "System",
    },
  },

  developers: {
    sandboxBadge: "Sandbox",
    infoNotice: {
      title: "Diagnostic workspace",
      description:
        "Inspector content is synthetic until artifact parsing is connected. The hash calculator is the only tool here that performs a real local computation.",
    },
    sidebar: {
      title: "Signature Debugger",
      subtitle: "Inspection and diagnostic utilities",
      navAriaLabel: "Developer tool navigation",
    },
    footer: {
      environment: "Environment: sandbox",
      sessionNote: "Session data is not persisted",
    },
    groups: {
      xml: "XML Signature (XAdES)",
      cms: "CMS / PKCS#7",
      container: "Container Formats",
      pdf: "PDF",
      pki: "PKI",
      utilities: "Utilities",
    },
    tools: {
      "xml-viewer": { label: "XML Viewer", description: "Raw XML source with signature highlighting" },
      "canonicalized-xml": { label: "Canonicalized XML", description: "C14N transform and signed bytes" },
      "signed-info": { label: "SignedInfo", description: "Algorithms, transforms and references" },
      references: { label: "Reference Viewer", description: "Digest result for each signed reference" },
      digest: { label: "Digest & SignatureValue", description: "Raw digest and signature values" },
      cms: { label: "CMS Structure", description: "CMS SignedData structure" },
      asn1: { label: "ASN.1 Viewer", description: "Hexadecimal and decoded ASN.1" },
      ooxml: { label: "OOXML Package Explorer", description: "ZIP package parts and signature origin" },
      relationships: { label: "Relationship Viewer", description: "OOXML .rels relationships" },
      manifest: { label: "Manifest", description: "Per-part digest manifest" },
      "pdf-byte-range": { label: "PDF ByteRange", description: "Signed byte spans around /Contents" },
      "certificate-chain": { label: "Certificate Chain", description: "Signer path to a trusted root" },
      hash: { label: "Hash Calculator", description: "Local Web Crypto digest utility" },
    },
    xmlViewer: { sourceLabel: "XML signature source" },
    canonicalized: {
      note: "Canonicalization removes insignificant serialization differences before digest calculation.",
      label: "Exclusive XML canonicalization 1.0",
    },
    signedInfo: {
      canonicalization: "Canonicalization",
      canonicalizationValue: "Exclusive XML C14N 1.0",
      signatureMethod: "Signature method",
      references: "References",
      referencesValue: "3 signed references",
      signatureFormat: "Signature format",
    },
    references: {
      uriLabel: (uri: string) => `URI: ${uri}`,
      documentRoot: "(document root)",
      digestMatch: "✓ Digest match",
      transforms: "Transforms",
      digest: "SHA-256 digest",
    },
    digestPanel: {
      digestLabel: "Digest · SHA-256",
      signatureValueLabel: "SignatureValue · RSA-PSS · base64",
      verifiedNote:
        "RSA-PSS verification succeeded against the signer public key. This is prototype evidence only.",
    },
    cmsPanel: { label: "CMS SignedData" },
    asn1: { offset: "Offset", bytes: "Bytes", ascii: "ASCII" },
    ooxml: {
      part: "Package part",
    },
    relationships: {
      columns: { id: "ID", type: "Type", target: "Target", mode: "Mode" },
      internal: "Internal",
    },
    manifest: {
      columns: { number: "#", part: "Package part", algorithm: "Algorithm", digest: "Digest", result: "Result" },
      match: "✓ Match",
    },
    pdfByteRange: {
      ariaLabel: "PDF signature covers two byte ranges separated by the Contents field",
      signedRange1: "Signed range 1",
      signedRange2: "Signed range 2",
      note: "The PDF `/Contents` placeholder is excluded from the digest. The remaining byte ranges are hashed and covered by the signature.",
    },
    certChain: {
      nodes: {
        root: { name: "Gov Root CA G3", detail: "Self-signed root · trust anchor" },
        intermediate: { name: "Treasury Issuing CA", detail: "Intermediate · issued by Gov Root CA G3" },
        leaf: { name: "A. Torres (signer)", detail: "Leaf · issued by Treasury Issuing CA" },
      },
      status: { trusted: "Trusted", valid: "Valid", signer: "Signer" },
    },
    hash: {
      note: "Hashing runs locally through the browser Web Crypto API. Input is not sent to the server by this component.",
      inputLabel: "Text input",
      inputPlaceholder: "Paste text to calculate its digest…",
      algorithmLegend: "Digest algorithm",
      weakWarning: "SHA-1 is provided only for legacy diagnostics. Do not use it for new signatures.",
      compute: "Compute hash",
      digestLabel: (algorithm: string) => `${algorithm} digest`,
      copy: "Copy",
      copiedTitle: "Copied",
    },
    copyable: { copy: "Copy", copiedTitle: "Copied" },
  },

  signingHistory: {
    filters: {
      legend: "Filters",
      fromDate: "From date",
      toDate: "To date",
      keySource: "Key source",
      allKeySources: "All key sources",
      status: "Status",
      allStatuses: "All statuses",
      onlyStored: "Only jobs whose file is still stored",
      apply: "Apply",
      clear: "Clear filters",
      invalidRange: "The start date must be before the end date.",
      activeNote: "Filters are applied on the server across the whole history, not just this page.",
    },
    pagination: {
      ariaLabel: "Signing history pagination",
      previous: "Previous",
      next: "Next",
      page: (n: number) => `Page ${n}`,
      cursorReset: "The pagination link expired. Showing the first page again.",
    },
    table: {
      empty: "No signing jobs found.",
      emptyStored: "No stored signing jobs. Files are removed when the tenant storage quota is exceeded.",
      columns: {
        status: "Status",
        standard: "Standard",
        level: "Level",
        algorithm: "Algorithm",
        keySource: "Key source",
        certificate: "Certificate",
        createdAt: "Created",
        completedAt: "Completed",
        actions: "",
      },
    },
    status: {
      QUEUED: "Queued",
      PROCESSING: "Processing",
      AWAITING_AUTHORIZATION: "Awaiting authorization",
      COMPLETED: "Completed",
      FAILED: "Failed",
      CANCELLED: "Cancelled",
    },
    keySourceType: {
      PKCS12: "PKCS#12",
      REMOTE_CA: "Remote CA",
      REMOTE_HSM: "Remote HSM",
      USB_TOKEN: "USB Token",
    },
    evicted: "Cleaned up",
    evictedTooltip: "File was removed due to exceeding storage quota. Signing details are preserved.",
    resultAvailable: "File available",
    downloadResult: "Download signed file",
    downloadEvidence: "Download evidence",
    downloading: "Downloading…",
    retry: "Retry",
    loading: "Loading signing history…",
    loadFailed: "Unable to load signing history.",
    detail: {
      title: "Signing job details",
      status: "Status",
      createdAt: "Created at",
      completedAt: "Completed at",
      standard: "Signature standard",
      level: "Baseline level",
      algorithm: "Algorithm",
      signatureMode: "Signature mode",
      keySourceType: "Key source type",
      certificate: "Certificate fingerprint",
      attempt: "Attempt",
      retryOf: "Retry of",
      jobId: "Job ID",
      clientReference: "Client reference",
      errorCode: "Error code",
      errorDetail: "Error detail",
      close: "Close",
      signatureModeCo: "Co-Sign",
      signatureModeCounter: "Counter-Sign",
    },
    toast: {
      downloadFailedTitle: "Download failed",
      downloadFailedBody: "The file could not be downloaded. It may have been removed.",
      retryFailedTitle: "Retry failed",
    },
    correlationId: (id: string) => `Correlation ID: ${id}`,
  },

  /**
   * Public signing page (`/external-sign`) — the only screen in this app whose
   * reader is not a colleague. Copy rules that follow from that:
   *
   * - No internal vocabulary. No "capability", no "baseline T", no "proxy", and
   *   above all no billing talk: a signer must never be told that their next
   *   click costs the sender a signing credit.
   * - Every dead end says who to contact. This person cannot fix a link, cannot
   *   read a log, and cannot retry their way out of an expired token.
   * - Every step says what it needs before it asks for it, so nobody starts a
   *   method they have no credential for.
   */
  /**
   * SIGNING LEASE — shared by the internal signing screen and the public one,
   * because both describe the same backend mechanism.
   *
   * The wording deliberately never says "lease": signers do not need the name of
   * the mechanism, they need to know whether to wait or to click. Only the
   * internal screen uses `lockedByBody` (which names the current signer) — see
   * `SigningLeasePanel`.
   */
  signingLease: {
    checking: "Checking the signing turn…",
    lockedTitle: "Someone else is signing",
    lockedBody:
      "Another signer is signing this document right now. Please wait for them to finish — this page updates itself as soon as the turn is free.",
    lockedByBody: (holder: string) =>
      `${holder} is signing this document right now. Please wait — this page updates itself once they finish.`,
    lockedRetryHint: (seconds: number) =>
      `The current turn lasts at most ${Math.max(1, Math.ceil(seconds / 60))} more minute(s).`,
    heldTitle: "You already have a signing attempt open",
    heldBody:
      "The signing service still holds an unfinished attempt of yours — usually after a page reload or a second tab. Cancel it to start over.",
    cancel: "Cancel it and start over",
    cancelling: "Cancelling…",
    errorTitle: "Could not check the signing turn",
    errorBody:
      "We do not know whether this turn is free, so signing stays disabled. Try again in a moment.",
    retry: "Try again",

    /** The short line under the Sign button explaining why it is disabled. */
    action: {
      checking: "Checking the signing turn…",
      locked: "Another signer is signing this document.",
      held: "Cancel your open signing attempt first.",
      unavailable: "The signing turn could not be checked.",
    },

    /** `SIGNING_LEASE_LOCKED` — lost the race at the signing call itself. */
    lockedNowTitle: "Someone else started signing first",
    lockedNowBody:
      "The turn went to another signer in the same second you clicked. Nothing of yours was submitted — this page will unlock itself when your turn comes.",

    /** `SIGNING_LEASE_LOST` — the attempt in progress is no longer valid. */
    lostTitle: "That signing attempt has ended",
    lostBody:
      "The turn expired or was handed to someone else. Anything in progress was discarded — please start over once the turn is free.",
  },

  externalSign: {
    meta: {
      title: "Sign document",
      description: "Review the document and sign it — no account needed",
    },

    chrome: {
      brand: "FIS CA",
      subtitle: "Electronic signing",
      publicBadge: "Personal signing link",
      secureNote: "No sign-in needed. This link places exactly one signature — yours.",
      sessionExpiresIn: (remaining: string) => `Session ends in ${remaining}`,
      sessionEndingSoon: "Session is about to end",
      sessionExpired: "Session has ended",
      sessionExpiredBody:
        "Nothing was signed. Open the link from your email again to start a new session.",
    },

    demo: {
      badge: "Demo",
      title: "Interface demo — nothing is being signed",
      body:
        "The public signing endpoints are a target contract and are not live yet, so this page is running on mock data generated in your browser. No service is being called and no signature is created.",
      scenarios:
        "Add a scenario to the link to see the other states: #demo=1&t=expired, t=invalid, t=notcurrent, t=signed, t=changed, t=conflict (someone at the same step signs first), t=locked (someone else holds the signing turn).",
    },

    loading: {
      title: "Opening your signing link",
      body: "Checking the link and loading the document. This takes a moment.",
    },

    unavailable: {
      whatNow: "What to do next",
      contactSender: "Contact the person who sent you this document and ask for a new link.",
      retry: "Try again",
      codeLabel: "Error code",
      correlationLabel: (id: string) => `Reference: ${id}`,
    },

    /**
     * Title + what-to-do, per error code from §11 of the integration document.
     * Codes not listed here fall back to `unknown` with the server's own
     * sentence, which is more useful than a generic apology.
     */
    errors: {
      unknownTitle: "Something went wrong",
      unknownBody: "Please try again. If it keeps happening, contact the sender.",
      EXTERNAL_SIGNING_NO_SESSION: {
        title: "This page needs a signing link",
        body: "Open the link from the email or message you received. It carries the code that identifies you.",
      },
      EXTERNAL_SIGNING_TOKEN_INVALID: {
        title: "This link is not valid",
        body: "It may have been mistyped, cut short by an email client, or replaced by a newer link.",
      },
      EXTERNAL_SIGNING_FORBIDDEN: {
        title: "This session cannot sign",
        body: "The session is no longer trusted by the service. Open your link again to start a new one.",
      },
      EXTERNAL_SIGNING_LINK_EXPIRED: {
        title: "This link has expired",
        body: "Signing links are valid for a limited time. Nothing was signed.",
      },
      EXTERNAL_SIGNING_CSRF_MISSING: {
        title: "This tab cannot sign",
        body: "The document is still readable, but the signing key for this session is gone — that happens when the page is reopened in a new tab. Open your link again to sign.",
      },
      EXTERNAL_SIGNING_API_NOT_CONFIGURED: {
        title: "Signing is not available right now",
        body: "The signing service is not reachable from this site. Please tell the sender.",
      },
      EXTERNAL_SIGNING_API_UNREACHABLE: {
        title: "Cannot reach the signing service",
        body: "This is usually temporary. Try again in a minute.",
      },
      SIGNER_NOT_CURRENT: {
        title: "It is not your turn yet",
        body: "Someone has to sign before you. You will be able to sign with this same link once they do.",
      },
      SIGNING_DOCUMENT_CHANGED: {
        title: "The document has changed",
        body: "It was edited after your link was created, so this link no longer matches it. Ask the sender for a new link.",
      },
      SIGNER_ALREADY_PROCESSED: {
        title: "You have already signed this",
        body: "No further action is needed. The sender has your signature.",
      },
      SIGNING_LEASE_LOCKED: {
        title: "Another signer is signing this document",
        body: "The turn just went to someone else. Wait for them to finish and sign again — you do not need a new link.",
      },
      SIGNING_LEASE_LOST: {
        title: "Your signing attempt has ended",
        body: "The turn expired or was handed to someone else. Start over once the turn is free.",
      },
      SIGNING_ALREADY_STARTED: {
        title: "A signing attempt is already open",
        body: "Continue the attempt below instead of starting a new one.",
      },
      SIGNING_NOT_STARTED: {
        title: "That attempt is no longer open",
        body: "Start signing again from the beginning.",
      },
      SIGN_REQUEST_INVALID: {
        title: "Check what you entered",
        body: "Something in the signing details is missing or does not match. Review the fields and try again.",
      },
      SIGNED_DOCUMENT_MISSING: {
        title: "The signature could not be saved",
        body: "Do not try again straight away — contact the sender so they can check with support.",
      },
    },

    summary: {
      title: "What you are signing",
      documentLabel: "Document",
      signerLabel: "Signing as",
      orderLabel: "Your turn",
      order: (position: number) => `Signer ${position}`,
      checksumLabel: "Document fingerprint",
      checksumHint:
        "Identifies this exact file. If the sender reads you a different fingerprint, do not sign.",
      statusPending: "Awaiting your signature",
      statusSigned: "Signed",
      statusDeclined: "Declined",
    },

    steps: {
      navLabel: "Signing steps",
      stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
      lockedHint: "Finish the earlier steps to unlock this one.",
      review: {
        label: "Read",
        title: "Read the document",
        description: "Check the whole document, then confirm you agree to sign it.",
      },
      method: {
        label: "Method",
        title: "How do you want to sign?",
        description: "Pick what you already have — each option lists what it needs.",
      },
      credential: {
        label: "Details",
        title: "Your signing details",
        description: "Fill in what the method you picked needs from you.",
      },
      sign: {
        label: "Sign",
        title: "Place your signature",
        description: "One last look, then sign.",
      },
    },

    viewer: {
      title: "Document",
      loading: "Loading document…",
      errorTitle: "The document could not be loaded",
      retry: "Load again",
      page: (current: number, total: number) => `Page ${current} of ${total}`,
      previous: "Previous page",
      next: "Next page",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      signatureBadge: "Your signature",
      signatureOnPage: (page: number) => `Your signature goes on page ${page}`,
      goToSignature: "Go to my signature",
      pageHasSignature: "Signature on this page",
      extraSlots: (count: number) =>
        `This document has ${count} signature boxes for you. All of them are marked.`,
      nonPdfTitle: "Preview not available for this file type",
      nonPdfBody:
        "You can still sign it. Ask the sender for a copy if you need to read it in full first.",
    },

    consent: {
      title: "Before you sign",
      checkbox: "I have read this document and agree to sign it",
      hint: "Your electronic signature is legally equivalent to a handwritten one.",
      scrollNote: "Check every page — the signature covers the whole document.",
    },

    method: {
      title: "How do you want to sign?",
      note: "The sender decides which methods are available for this document.",
      requirementLabel: "You need",
      pkcs12: {
        label: "Certificate file (.p12 / .pfx)",
        description: "You hold the certificate file and its password.",
        requirement: "The .p12 or .pfx file and its password",
      },
      mpki: {
        label: "FPT MPKI app",
        description: "You approve the signature on your phone.",
        requirement: "The FPT MPKI app, signed in on your phone",
      },
      signCloud: {
        label: "FPT eSign Cloud",
        description: "You confirm your identity and enter a one-time code.",
        requirement: "Your ID card details and the phone number registered with FPT",
      },
      usbToken: {
        label: "FPT USB Token",
        description: "You sign with the certificate stored on your USB token.",
        requirement:
          "The token plugged into this computer, its PIN, and the FPT-CA Signing Agent running",
      },
      /** Shown on a method the document's file type rules out — USB Token is PDF-only. */
      unsupportedForFormat: "Not available for this file type",
    },

    pkcs12: {
      title: "Certificate file (.p12 / .pfx)",
      fileLabel: "Certificate file",
      chooseFile: "Choose file",
      replaceFile: "Change file",
      noFile: "No file chosen",
      passwordLabel: "File password",
      passwordPlaceholder: "Password protecting the file",
      aliasLabel: "Key name (optional)",
      aliasPlaceholder: "Leave empty for the first key",
      aliasHint: "Only needed if the file holds more than one certificate.",
      privacyNote:
        "The file and password are sent once, to create this signature, and are not stored by this page.",
    },

    mpki: {
      usernameLabel: "MPKI username",
      usernamePlaceholder: "The account you use in the FPT MPKI app",
      loadCredentials: "Find my certificates",
      changeAccount:"Change account",
      loading: "Looking…",
      credentialSelectLabel: "Certificate",
      chooseCredential: "— Choose a certificate —",
      multipleWarning:
        "More than one certificate found. Pick the one you mean — the signature carries that identity.",
      loadFailed: "Your certificates could not be listed",
      empty: "No certificate is registered for that username. Check the spelling.",
      manualHint:
        "You can also type the certificate ID by hand if you know it — leave it empty when you only have one.",
      credentialLabel: "Certificate ID (optional)",
      credentialPlaceholder: "Leave empty if you only have one",
      credentialHint: "Fill this in only if FPT issued you more than one certificate.",
      note: "After you press Sign, keep this page open and approve the request in the app.",
    },

    signCloud: {
      haveCertificate: "I already have an eSign Cloud certificate",
      needCertificate: "I need a new certificate",
      agreementLabel: "Certificate ID (agreementUuid)",
      agreementPlaceholder: "The ID FPT gave you",
      agreementHint: "Sent to you when your certificate was issued.",
      enrollmentTitle: "Certificate registration",
      enrollmentHint:
        "FPT issues a certificate in your name from these details. They go to the certificate authority and are not kept by this page.",
      personalNameLabel: "Full name",
      citizenIdLabel: "ID card number",
      mobileLabel: "Mobile number",
      emailLabel: "Email",
      locationLabel: "City (optional)",
      provinceLabel: "Province (optional)",
      countryLabel: "Country",
      imagesTitle: "ID card photos",
      imagesHint: "Both sides must be readable. A portrait photo is optional.",
      /*
       * One word each. These three sit side by side in a 23.5rem column, and any
       * label long enough to wrap makes its box taller than the other two — the
       * heading above already says these are ID card photos.
       */
      frontLabel: "Front",
      backLabel: "Back",
      faceLabel: "Portrait",
      chooseImage: "Choose photo",
      replaceImage: "Change photo",
      removeImage: "Remove",
      imageTooLarge: "This photo is too large even after resizing. Try a smaller one.",
      imageNotImage: "Choose an image file.",
      imageUnreadable: "This image could not be read. HEIC photos from iPhone often fail — try JPG.",
      required: "Required",
      requiredLegend: "Required",

      /* Registration — the only way to get a certificate ID. */
      enroll: "Request my certificate",
      enrolling: "Sending…",
      enrollFailed: "The certificate could not be requested",
      requiredMissing: "Fill in every field marked * and add both sides of your ID card.",
      enrollHint:
        "FPT checks these details and issues a certificate in your name. You confirm your identity on their page in the next step.",
      agreementIssued: "Certificate requested",
      agreementReadyTitle: "Your certificate is ready",
      agreementRestart: "Start over with different details",
      confirmTitle: "Confirm your identity",
      confirmBody:
        "Open the certificate authority's page and confirm your details there. Come back to this tab when you are done — it checks for you.",
      openSic: "Open the identity check",
      sicWaiting: "Waiting for that page…",
      sicBlocked: "Your browser blocked the pop-up. Use the link below instead.",
      sicOpenManually: "Open the identity check in a new tab",
      checkStatus: "Check my certificate",
      checking: "Checking…",
      checkAgain: "Check again",
      statusFailed: "The certificate status could not be read",
      notReadyYet:
        "Not confirmed yet. Finish the identity check on the certificate authority's page, then check again.",
    },

    /**
     * USB Token — guest-facing copy for the details step. The signing dialog
     * itself is the one shared with `/sign` and keeps `sign.usbToken`.
     */
    usbToken: {
      title: "FPT USB Token",
      checkAgent: "Test the connection",
      agentChecking: "Testing…",
      agentReady: (count: number) =>
        `The Signing Agent answered — ${count} certificate${count === 1 ? "" : "s"} found on your token.`,
      noCertificates:
        "No usable certificate was found. Check that the token is plugged in and that its driver recognises it.",
      errorUnreachable:
        "Cannot reach the FPT-CA Signing Agent at localhost:14211. Install it and make sure it is running, then test again.",
      errorGeneric: "The USB token could not be read.",
      note: "Your browser talks to the Signing Agent on this computer directly. Nothing about the token is sent anywhere.",
      signerNameNote:
        "The name on the signature is the one in the certificate on your token — this page never asks for it.",
      pinNote:
        "Your PIN is only ever typed into the FPT-CA window. This page never asks for it and never stores it.",
    },

    action: {
      signButton: "Sign document",
      signing: "Signing…",
      needConsent: "Confirm you have read the document first.",
      needMethod: "Choose how you want to sign.",
      needFields: "Fill in the fields above.",
      cannotSign: "This tab cannot sign — open your link again.",
      expired: "The session has ended. Open your link again.",
      reloadingDocument: "Fetching the latest version of the document…",
      declineNote: "If you do not want to sign, simply close this page and tell the sender.",
    },

    /** Ai đó ký cùng lúc với bạn: tài liệu đổi giữa chừng, ký lại là xong. */
    stale: {
      title: "The document was just updated",
      body: "Someone signing at the same step finished just before you, so the document changed. The latest version is being loaded — sign again and your signature goes onto that one.",
    },

    resume: {
      title: "You have a signature in progress",
      description:
        "You started signing with eSign Cloud and haven't finished. Continue so you don't have to start over.",
      dismiss: "Dismiss",
      resume: "Continue",
    },

    pending: {
      close: "Close",
      working: "Working…",
      appTitle: "Waiting for your approval",
      appBody:
        "Open the FPT MPKI app on your phone and approve the request. Keep this page open.",
      identityTitle: "Confirm your identity",
      identityBody:
        "Open the certificate authority's page, confirm your details, then come back here and continue.",
      identityDoneTitle: "Ready for the next step",
      identityDoneBody: "Continue to receive your one-time code.",
      openIdentity: "Open identity check",
      continueButton: "I have confirmed — continue",
      continueNote: "This opens the signing transaction at the certificate authority.",
      otpTitle: "Enter your one-time code",
      otpBody:
        "The certificate authority's page asks for the code sent to your phone. Once you finish there, this page picks up the signature.",
      otpReadyTitle: "Open the code page",
      otpReadyBody: "Enter the one-time code to finish signing.",
      openOtp: "Open code page",
      checkResult: "Check result",
      otpNotDone:
        "No signature yet — the code page closed before it finished. Open it again and complete the code.",
      popupBlocked: "Your browser blocked the pop-up. Use the link below instead.",
      expiresIn: (remaining: string) => `Time left: ${remaining}`,
      expired: "Time is up — start again.",
    },

    completed: {
      title: "Signed",
      body: "Your signature has been added to the document and sent back to the sender.",
      documentLabel: "Document",
      signerLabel: "Signed by",
      signedAtLabel: "Signed at",
      download: "Download a copy",
      downloadHint: "For your records. The sender already has the signed document.",
      noCopyNote: "The sender has the signed document. Ask them if you need a copy.",
      closeHint: "You can close this page now.",
    },
  },
};

export type Dictionary = typeof en;
