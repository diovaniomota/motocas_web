'use client'

import { useState } from 'react'
import { Zap, ShoppingBag, Check } from 'lucide-react'
import type { Moto, Peca } from '@/types'
import { CATEGORIAS_PECA } from '@/types'
import { useCart } from '@/lib/cart'
import SolicitacaoModal from './SolicitacaoModal'

const G = '#39FF14'

export function MotoCard({ moto }: { moto: Moto }) {
  const [open, setOpen] = useState(false)
  const img = moto.foto_url || 'https://images.unsplash.com/photo-1558981852-426c6c22a060?w=400&h=300&fit=crop'

  return (
    <>
      <div className="rounded-2xl border border-white/8 bg-[#171717] overflow-hidden flex flex-col">
        <div className="relative h-36 bg-gray-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={moto.nomemoto || ''} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />
          <span className="absolute top-2.5 left-2.5 text-xs font-bold px-2.5 py-1.5 rounded-full bg-black/72 border border-white/24" style={{ color: G }}>Disponível</span>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <p className="font-extrabold text-white text-sm truncate">{moto.nomemoto} {moto.anomoto}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: G }}>{moto.placamoto || 'Sem placa'} · {moto.cormoto || '-'}</p>
          <div className="flex items-center gap-2 mt-3 px-2.5 py-2 rounded-xl bg-white/4 text-xs text-white/70">
            <Zap size={12} style={{ color: G }} /> Solicitação rápida
          </div>
          <button onClick={() => setOpen(true)} className="mt-3 w-full py-2.5 rounded-xl font-bold text-xs text-black hover:opacity-90 transition-opacity" style={{ backgroundColor: G }}>
            Solicitar Aluguel
          </button>
        </div>
      </div>
      {open && <SolicitacaoModal moto={moto} onClose={() => setOpen(false)} />}
    </>
  )
}

export function PecaCard({ peca }: { peca: Peca }) {
  const { adicionarItem } = useCart()
  const [added, setAdded] = useState(false)
  const inStock = peca.estoque > 0

  function add() {
    adicionarItem(peca)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#171717] overflow-hidden flex flex-col">
      <div className="relative h-28 bg-gray-900 flex items-center justify-center">
        {peca.foto_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={peca.foto_url} alt={peca.nome} className="w-full h-full object-cover" />
          : <ShoppingBag size={40} style={{ color: G }} className="opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-extrabold text-white text-sm truncate">{peca.nome}</p>
        <p className="text-xs mt-0.5" style={{ color: G }}>{CATEGORIAS_PECA[peca.categoria] || peca.categoria}</p>
        <p className="font-extrabold text-white text-lg mt-1.5">R$ {peca.preco.toFixed(2).replace('.', ',')}</p>
        <p className={`text-xs mt-1 ${inStock ? 'text-white/60' : 'text-red-400'}`}>{inStock ? `${peca.estoque} em estoque` : 'Indisponível'}</p>
        <button disabled={!inStock} onClick={add}
          className="mt-3 w-full py-2 rounded-xl font-bold text-xs text-black hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          style={{ backgroundColor: G }}>
          {added ? <><Check size={14} /> Adicionado</> : inStock ? 'Comprar' : 'Sem Estoque'}
        </button>
      </div>
    </div>
  )
}

export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="max-w-[820px] mx-auto text-center">
      <div className="inline-flex px-4 py-2 rounded-full border mb-5" style={{ backgroundColor: '#39FF1414', borderColor: '#39FF1459' }}>
        <span className="text-xs font-extrabold tracking-widest" style={{ color: G }}>{eyebrow.toUpperCase()}</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">{title}</h2>
      <p className="text-white/70 text-base md:text-lg leading-relaxed">{subtitle}</p>
    </div>
  )
}
