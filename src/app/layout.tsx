import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoneyBook 記帳本",
  description: "個人與公司理財管理",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
