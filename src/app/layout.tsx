import type { Metadata } from "next";
import "./globals.css";

import '@/lib/startup'
export const metadata: Metadata = {
  title: "Quiet Hours Scheduler",
  description: "Peaceful study hours reminder.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
