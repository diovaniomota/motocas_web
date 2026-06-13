import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre a Motocas',
  description: 'Conheça a Motocas — mais de 10 anos acelerando confiança com aluguel de motos e peças de qualidade.',
  openGraph: {
    title: 'Sobre a Motocas',
    description: 'Mais de 10 anos acelerando confiança com aluguel de motos e peças de qualidade.',
  },
}

export default function SobreLayout({ children }: { children: React.ReactNode }) {
  return children
}
