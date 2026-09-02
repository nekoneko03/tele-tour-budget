import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "遠征費シミュレーター",
  description:
    "チケット・交通・宿泊費を、公演と移動手段から試算できる遠征費シミュレーター。",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#091321" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
