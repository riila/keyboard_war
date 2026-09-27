import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KEYBOARD WAR',
  description: '두 손이 무기다. 같은 구절을 상대보다 먼저 베어라. 1:1 타이핑 배틀.',
  openGraph: {
    title: 'KEYBOARD WAR',
    description: '1:1 타이핑 배틀 — 한국어 / English',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#04080a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Noto+Serif+KR:wght@400;600;900&family=Gowun+Batang:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
