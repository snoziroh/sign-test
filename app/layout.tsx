import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { AppNavbar } from "@/components/shell/app-navbar";
import { getLocale } from "@/lib/i18n/server";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FIS CA Signing Tool",
  description: "Công cụ hỗ trợ ký của FIS CA",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider>
            <ToastProvider>
              <AppNavbar />
              <main className="flex-1">{children}</main>
            </ToastProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
