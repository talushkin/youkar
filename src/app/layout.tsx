import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouKar - יוקאר קריוקי",
  description: "עמוד בקשות ותשלום של יוקאר - קבוצת WA קריוקי",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0f1929]">{children}</body>
    </html>
  );
}
