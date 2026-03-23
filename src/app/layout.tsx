import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "GAIN",
  description: "Level up your life",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-[family-name:var(--font-geist)] antialiased`} style={{ overscrollBehavior: 'none' }}>
        {children}
      </body>
    </html>
  );
}
