import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tanym",
  description: "Редактор для романов и длинной прозы с AI и структурой проекта",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full overflow-hidden flex flex-col">{children}</body>
    </html>
  );
}
