import type { Metadata } from "next";

import ReduxProvider from "../components/redux-provider/redux-provider";

import "./globals.css";

import MainLayout from "@/components/main-layout/main-layout";

export const metadata: Metadata = {
  title: "Türk Borsa ve Yatırım Sosyal Medya Platformu",
  description:
    "Türkiye'nin lider borsa sosyal medya platformu ile hisse senetleri, kripto paralar ve diğer yatırım araçları hakkında bilgi alışverişinde bulunun. Analizler, haberler ve yatırım stratejileri ile portföyünüzü güçlendirin.",
  keywords: [
    "borsa",
    "hisse senetleri",
    "kripto paralar",
    "yatırım",
    "analiz",
    "haber",
    "portföy",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col lg:flex-row">
        <ReduxProvider>
          <MainLayout>{children}</MainLayout>
        </ReduxProvider>
      </body>
    </html>
  );
}
