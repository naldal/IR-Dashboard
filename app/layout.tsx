import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IR실 증시 대시보드",
  description: "위메이드 및 주요 게임사 증시 현황 대시보드",
  openGraph: {
    title: "📊 IR실 증시 대시보드",
    description: "위메이드 및 주요 게임사 증시 현황 및 투자자별 매매 동향",
    url: "https://ir-dashboard-zeta.vercel.app", // 배포된 본인의 Vercel 주소
    siteName: "IR Dashboard",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
