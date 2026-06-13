import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Motos disponíveis para aluguel',
  description: 'Veja nossa frota completa de motos disponíveis para aluguel. Escolha o modelo ideal e solicite em poucos cliques.',
  openGraph: {
    title: 'Motos disponíveis para aluguel | Motocas',
    description: 'Frota completa de motos para aluguel com atendimento ágil.',
  },
}

export default function AluguelLayout({ children }: { children: React.ReactNode }) {
  return children
}
