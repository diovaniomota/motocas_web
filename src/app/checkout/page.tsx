'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/cart'
import { supabase } from '@/lib/supabase'
import { pecaService } from '@/lib/services'
import PublicNavbar from '@/components/public/PublicNavbar'
import PublicFooter from '@/components/public/PublicFooter'
import { CheckCircle2, Loader2, ShoppingBag } from 'lucide-react'

const G = '#39FF14'

export default function CheckoutPage() {
  const router = useRouter()
  const { itens, valorTotal, limparCarrinho } = useCart()
  const [f, setF] = useState({ nome: '', email: '', telefone: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setF((prev) => ({
        ...prev,
        email: user.email || '',
        nome: (user.user_metadata?.nome as string) || '',
        telefone: (user.user_metadata?.telefone as string) || '',
      }))
    })
  }, [])

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function finalizar(e: React.FormEvent) {
    e.preventDefault()
    if (itens.length === 0) return
    setSaving(true); setError('')
    try {
      const endereco = [f.rua, f.numero, f.complemento, f.bairro, f.cidade, f.estado].filter(Boolean).join(', ')
      for (const item of itens) {
        await pecaService.criarPedido({
          peca_id: item.peca_id, cliente_email: f.email, cliente_nome: f.nome, cliente_telefone: f.telefone,
          quantidade: item.quantidade, valor_unitario: item.preco_unitario,
          valor_total: item.preco_unitario * item.quantidade, status: 'pendente', endereco_entrega: endereco,
        })
      }
      limparCarrinho()
      setDone(true)
    } catch {
      setError('Erro ao finalizar pedido. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="bg-black min-h-screen text-white flex flex-col">
        <PublicNavbar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <CheckCircle2 size={64} className="mx-auto mb-4" style={{ color: G }} />
            <h1 className="text-2xl font-extrabold">Pedido realizado!</h1>
            <p className="text-white/60 mt-2">Seu pedido foi enviado e está em análise. Acompanhe pelo painel.</p>
            <div className="flex gap-3 justify-center mt-6">
              <Link href="/cliente/painel" className="px-6 py-3 rounded-xl font-bold text-black" style={{ backgroundColor: G }}>Meus Pedidos</Link>
              <Link href="/" className="px-6 py-3 rounded-xl font-bold border border-white/20">Início</Link>
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="bg-black min-h-screen text-white flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-[1000px] w-full mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold mb-8">Finalizar Compra</h1>

        {itens.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag size={64} className="mx-auto mb-4 opacity-30" style={{ color: G }} />
            <p className="text-white/70 text-lg">Seu carrinho está vazio</p>
            <Link href="/pecas-acessorios" className="inline-block mt-6 px-8 py-3 rounded-xl font-bold text-black" style={{ backgroundColor: G }}>Ver peças</Link>
          </div>
        ) : (
          <form onSubmit={finalizar} className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-bold text-lg">Dados de entrega</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field className="sm:col-span-2" label="Nome completo" value={f.nome} onChange={set('nome')} required />
                <Field label="Email" type="email" value={f.email} onChange={set('email')} required />
                <Field label="Telefone" value={f.telefone} onChange={set('telefone')} required />
                <Field label="CEP" value={f.cep} onChange={set('cep')} />
                <Field label="Rua" value={f.rua} onChange={set('rua')} required />
                <Field label="Número" value={f.numero} onChange={set('numero')} required />
                <Field label="Complemento" value={f.complemento} onChange={set('complemento')} />
                <Field label="Bairro" value={f.bairro} onChange={set('bairro')} required />
                <Field label="Cidade" value={f.cidade} onChange={set('cidade')} required />
                <Field label="UF" value={f.estado} onChange={set('estado')} required />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#171717] p-6 h-fit">
              <h2 className="font-bold text-lg mb-4">Resumo</h2>
              <div className="space-y-2 mb-4">
                {itens.map((i) => (
                  <div key={i.peca_id} className="flex justify-between text-sm text-white/70">
                    <span className="truncate pr-2">{i.quantidade}x {i.peca_nome}</span>
                    <span>R$ {(i.preco_unitario * i.quantidade).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-white text-xl pt-4 border-t border-white/10"><span>Total</span><span>R$ {valorTotal.toFixed(2).replace('.', ',')}</span></div>
              <button type="submit" disabled={saving} className="mt-6 w-full py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: G }}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Processando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </form>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, className }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} required={required}
        className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: G }} />
    </div>
  )
}
