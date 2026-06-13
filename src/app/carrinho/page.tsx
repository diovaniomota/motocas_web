'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart'
import PublicNavbar from '@/components/public/PublicNavbar'
import PublicFooter from '@/components/public/PublicFooter'
import { ShoppingCart, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'

const G = '#39FF14'

export default function CarrinhoPage() {
  const { itens, valorTotal, atualizarQuantidade, removerItem } = useCart()

  return (
    <div className="bg-black min-h-screen text-white flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-[1000px] w-full mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3"><ShoppingCart style={{ color: G }} /> Seu Carrinho</h1>

        {itens.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag size={64} className="mx-auto mb-4 opacity-30" style={{ color: G }} />
            <p className="text-white/70 text-lg">Seu carrinho está vazio</p>
            <Link href="/pecas-acessorios" className="inline-block mt-6 px-8 py-3 rounded-xl font-bold text-black" style={{ backgroundColor: G }}>Ver peças</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {itens.map((i) => (
                <div key={i.peca_id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-[#171717]">
                  <div className="w-16 h-16 rounded-xl bg-[#1a1a1a] flex items-center justify-center overflow-hidden shrink-0">
                    {i.peca_foto
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={i.peca_foto} alt={i.peca_nome} className="w-full h-full object-cover" />
                      : <ShoppingBag size={24} style={{ color: G }} className="opacity-50" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{i.peca_nome}</p>
                    <p className="text-sm" style={{ color: G }}>R$ {i.preco_unitario.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => atualizarQuantidade(i.peca_id, i.quantidade - 1)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10"><Minus size={14} /></button>
                    <span className="w-8 text-center font-bold">{i.quantidade}</span>
                    <button onClick={() => atualizarQuantidade(i.peca_id, i.quantidade + 1)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removerItem(i.peca_id)} className="p-2 rounded-lg text-white/50 hover:bg-red-500/20 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#171717] p-6 h-fit">
              <h2 className="font-bold text-lg mb-4">Resumo</h2>
              <div className="flex justify-between text-sm text-white/70 mb-2"><span>Itens</span><span>{itens.reduce((s, i) => s + i.quantidade, 0)}</span></div>
              <div className="flex justify-between font-bold text-white text-xl mt-4 pt-4 border-t border-white/10"><span>Total</span><span>R$ {valorTotal.toFixed(2).replace('.', ',')}</span></div>
              <Link href="/checkout" className="block text-center mt-6 w-full py-3 rounded-xl font-bold text-black hover:opacity-90 transition-opacity" style={{ backgroundColor: G }}>Finalizar Compra</Link>
            </div>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}
