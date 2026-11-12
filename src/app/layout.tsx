import type { Metadata } from "next";
import { cookies } from "next/headers";
import { I18nProvider, type Lang } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "우아세차 관리자",
  description: "Wooa Carwash admin",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang: Lang = (await cookies()).get("wooa_lang")?.value === "en" ? "en" : "ko";
  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full">
        <I18nProvider initial={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
