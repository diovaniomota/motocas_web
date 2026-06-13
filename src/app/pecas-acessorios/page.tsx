'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { pecaService } from '@/lib/services'
import type { Peca } from '@/types'
import { CATEGORIAS_PECA } from '@/types'
import PublicNavbar from '@/components/public/PublicNavbar'
import PublicFooter from '@/components/public/PublicFooter'
import { PecaCard, SectionHeader } from '@/components/public/PublicCards'

const G = '#39FF14'

export default function PecasAcessoriosPage() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('todas')

  useEffect(() => {
    pecaService.getPecasAtivas().then(setPecas).catch(console.error).finally(() => setLoading(false))
  }, [])

  const categorias = useMemo(() => {
    const set = new Set(pecas.map((p) => p.categoria))
    return ['todas', ...Array.from(set)]
  }, [pecas])

  const filtered = cat === 'todas' ? pecas : pecas.filter((p) => p.categoria === cat)

  return (
    <div className="bg-black min-h-screen text-white">
      <PublicNavbar />
      <section className="py-16 px-6" style={{ background: 'linear-gradient(135deg, #030303, #0A1209, #050505)' }}>
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Loja MOTOCAS" title="Peças e acessórios" subtitle="Encontre capacetes, peças de motor, óleos e muito mais com compra rápida." />
        </div>
      </section>
      <section className="py-16 px-6 bg-black">
        <div className="max-w-[1320px] mx-auto">
          {!loading && categorias.length > 1 && (
            <div className="flex gap-2 flex-wrap justify-center mb-10">
              {categorias.map((c) => (
                <button key={c} onClick={() => setCat(c)} className="px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors"
                  style={cat === c ? { backgroundColor: G, color: '#000' } : { backgroundColor: '#171717', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {c === 'todas' ? 'Todas' : (CATEGORIAS_PECA[c] || c)}
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: G, borderTopColor: 'transparent' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20"><ShoppingBag size={56} className="mx-auto mb-4 opacity-30" style={{ color: G }} /><p className="text-white/70 text-lg">Nenhuma peça disponível</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{filtered.map((p) => <PecaCard key={p.id} peca={p} />)}</div>
          )}
        </div>
      </section>
      <PublicFooter />
    </div>
  )
}
