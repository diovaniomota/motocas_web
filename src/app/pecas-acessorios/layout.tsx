import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Peças e Acessórios para Motos',
  description: 'Encontre peças e acessórios para a sua moto. Grande variedade em estoque com entrega rápida.',
  openGraph: {
    title: 'Peças e Acessórios para Motos | Motocas',
    description: 'Peças e acessórios para moto com entrega rápida.',
  },
}

export default function PecasLayout({ children }: { children: React.ReactNode }) {
  return children
}
