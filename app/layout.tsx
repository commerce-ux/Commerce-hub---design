import type { Metadata } from "next";
import "./globals.css";
import "@cimpress-ui/react/styles.css";

export const metadata: Metadata = {
  title: "Commerce Hub",
  description: "Commerce Hub — Order Management Prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-cim-style-root className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full" style={{ backgroundColor: 'white' }}>
        {children}
      </body>
    </html>
  );
}
