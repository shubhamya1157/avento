import type { Metadata } from "next";
import Providers from "@/app/component/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avento | Ready to move!",
  description: "Build by shubham yadav",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col bg-black text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
