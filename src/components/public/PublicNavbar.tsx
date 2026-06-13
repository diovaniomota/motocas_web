'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ShoppingCart, Menu, X } from 'lucide-react'
import { useCart } from '@/lib/cart'

const G = '#39FF14'

const links = [
  { label: 'Início', href: '/#inicio' },
  { label: 'Aluguel', href: '/aluguel' },
  { label: 'Peças', href: '/pecas-acessorios' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Carreiras', href: '/carreiras' },
  { label: 'Contato', href: '/#contato' },
]

export default function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const { quantidadeTotal } = useCart()

  return (
    <header className="sticky top-0 z-50 bg-black/98 border-b border-white/10">
      <div className="max-w-[1320px] mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/"><Image src="/logo.png" alt="Motocas" width={160} height={50} className="object-contain" /></Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="px-4 py-2 text-white text-base font-medium rounded-xl hover:bg-white/10 transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/carrinho" className="relative p-2 text-white hover:text-green-400 transition-colors">
            <ShoppingCart size={22} />
            {quantidadeTotal > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-black" style={{ backgroundColor: G }}>
                {quantidadeTotal}
              </span>
            )}
          </Link>
          <Link href="/cliente/painel" className="px-5 py-2 rounded-xl font-bold text-sm border transition-colors"
            style={{ color: G, borderColor: G + 'CC', background: 'rgba(57,255,20,0.03)' }}>Meus Pedidos</Link>
          <Link href="/login" className="px-5 py-2 rounded-xl font-extrabold text-sm text-black hover:opacity-90 transition-opacity" style={{ backgroundColor: G }}>Login</Link>
        </div>

        <div className="flex md:hidden items-center gap-3">
          <Link href="/carrinho" className="relative p-2 text-white">
            <ShoppingCart size={22} />
            {quantidadeTotal > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-black" style={{ backgroundColor: G }}>{quantidadeTotal}</span>}
          </Link>
          <button onClick={() => setOpen(!open)} className="p-2 text-white">{open ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-[#0d0d0d] border-t border-white/10 px-6 py-4 flex flex-col gap-2">
          {links.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="py-2 text-white text-base font-medium">{l.label}</Link>
          ))}
          <div className="border-t border-white/10 pt-3 mt-2 flex flex-col gap-2">
            <Link href="/cliente/painel" className="py-2 font-bold" style={{ color: G }}>Meus Pedidos</Link>
            <Link href="/login" className="py-2 font-extrabold text-black rounded-xl px-4 text-center" style={{ backgroundColor: G }}>Login</Link>
          </div>
        </div>
      )}
    </header>
  )
}
