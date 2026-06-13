'use client'

import { useEffect, useState } from 'react'
import { Bike } from 'lucide-react'
import { motoService } from '@/lib/services'
import type { Moto } from '@/types'
import PublicNavbar from '@/components/public/PublicNavbar'
import PublicFooter from '@/components/public/PublicFooter'
import { MotoCard, SectionHeader } from '@/components/public/PublicCards'

const G = '#39FF14'

export default function AluguelPage() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    motoService.getMotosDisponiveis().then(setMotos).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-black min-h-screen text-white">
      <PublicNavbar />
      <section className="py-16 px-6" style={{ background: 'linear-gradient(135deg, #030303, #0A1209, #050505)' }}>
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Frota completa" title="Motos disponíveis para aluguel" subtitle="Escolha o modelo ideal e solicite o aluguel em poucos cliques." />
        </div>
      </section>
      <section className="py-16 px-6 bg-black">
        <div className="max-w-[1320px] mx-auto">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: G, borderTopColor: 'transparent' }} /></div>
          ) : motos.length === 0 ? (
            <div className="text-center py-20"><Bike size={56} className="mx-auto mb-4 opacity-30" style={{ color: G }} /><p className="text-white/70 text-lg">Nenhuma moto disponível no momento</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">{motos.map((m) => <MotoCard key={m.id} moto={m} />)}</div>
          )}
        </div>
      </section>
      <PublicFooter />
    </div>
  )
}
