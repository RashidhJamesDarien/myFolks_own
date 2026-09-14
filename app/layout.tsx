import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  title: "myFolks — Find common ground",
  description: "Find common ground with myFolks.",
  icons: {
    icon: "/myFolks_logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={workSans.variable}>{children}</body>
    </html>
  );
}