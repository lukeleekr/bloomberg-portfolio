import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '이용훈 / Luke Lee | Portfolio Terminal',
  description: '10년차 금융 시장 전문가 × Aspiring AI Engineer. Bloomberg Terminal 스타일 포트폴리오.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
