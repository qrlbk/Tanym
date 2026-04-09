import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word AI",
  description: "Microsoft Word Clone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Calibri&family=Noto+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full overflow-hidden flex flex-col">{children}</body>
    </html>
  );
}
