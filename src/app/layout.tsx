import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/cart'

const inter = Inter({ subsets: ['latin'] })

const SITE_URL = 'https://motocas.com.br'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Motocas — Aluguel de motos e peças',
    template: '%s | Motocas',
  },
  description: 'Aluguel de motos, peças e acessórios com atendimento ágil. Frota disponível, processo simples e suporte humano.',
  keywords: ['aluguel de motos', 'motos', 'peças para moto', 'acessórios para moto', 'Motocas'],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'Motocas',
    title: 'Motocas — Aluguel de motos e peças',
    description: 'Aluguel de motos, peças e acessórios com atendimento ágil.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`} suppressHydrationWarning>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}
