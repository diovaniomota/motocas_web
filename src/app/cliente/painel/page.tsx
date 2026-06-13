'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  LogOut, Mail, ListChecks, ShoppingCart, ReceiptText,
  PlusCircle, ClipboardList, Search, CheckCircle2,
  ShoppingBag, Calendar, DollarSign, Package,
} from 'lucide-react'
import { clsx } from 'clsx'

const G = '#39FF14'

interface Solicitacao {
  id: string
  status: string
  observacao?: string
  valor_total?: number
  pagamento_pago?: boolean
  pagamento_liberado?: boolean
  created_at: string
  motos?: { nomemoto: string; placamoto: string }
}

interface Peca {
  id: string
  nome: string
  preco: number
  estoque: number
  foto_url?: string
  categorias?: { nome: string }
}

interface PedidoPeca {
  id: string
  status: string
  valor_total: number
  quantidade?: number
  created_at: string
}

const PEDIDO_STATUS: Record<string, { label: string; color: string }> = {
  pendente:   { label: 'Pendente',   color: 'orange'  },
  em_analise: { label: 'Em Análise', color: '#8B5CF6' },
  aprovado:   { label: 'Aprovado',   color: G         },
  enviado:    { label: 'Enviado',    color: '#A855F7' },
  entregue:   { label: 'Entregue',   color: '#22C55E' },
  cancelado:  { label: 'Cancelado',  color: '#EF4444' },
}

const SOL_STATUS: Record<string, { label: string; color: string }> = {
  pendente:   { label: 'Pendente',   color: 'orange'  },
  em_analise: { label: 'Em Análise', color: '#8B5CF6' },
  aprovada:   { label: 'Aprovada',   color: G         },
  rejeitada:  { label: 'Rejeitada',  color: '#EF4444' },
  ativa:      { label: 'Ativa',      color: '#3B82F6' },
  finalizada: { label: 'Finalizada', color: '#6B7280' },
}

export default function PainelClientePage() {
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [pecas, setPecas] = useState<Peca[]>([])
  const [pedidos, setPedidos] = useState<PedidoPeca[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setUserEmail(user.email || '')

    const { data: userData } = await supabase
      .from('clientes').select('nome').eq('email', user.email).maybeSingle()
    setUserName(userData?.nome || user.email?.split('@')[0] || 'Cliente')

    const [solRes, pecasRes, pedRes] = await Promise.all([
      supabase.from('solicitacoes_aluguel')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false }),
      supabase.from('pecas').select('*').eq('ativo', true).gt('estoque', 0).limit(20),
      supabase.from('pedidos_pecas')
        .select('id, status, valor_total, quantidade, created_at')
        .eq('cliente_email', user.email)
        .order('created_at', { ascending: false }),
    ])

    setSolicitacoes((solRes.data || []) as Solicitacao[])
    setPecas((pecasRes.data || []) as Peca[])
    setPedidos((pedRes.data || []) as PedidoPeca[])
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const tabs = [
    { label: 'Solicitações',  icon: <ListChecks  size={20} /> },
    { label: 'Loja de Peças', icon: <ShoppingCart size={20} /> },
    { label: 'Meus Pedidos',  icon: <ReceiptText  size={20} /> },
  ]

  // stats
  const pendentes   = solicitacoes.filter(s => s.status === 'pendente').length
  const emAnalise   = solicitacoes.filter(s => s.status === 'em_analise').length
  const aprovadas   = solicitacoes.filter(s => s.status === 'aprovada').length
  const total       = solicitacoes.length

  // solicitações com pagamento liberado
  const comPagamento = solicitacoes.filter(s =>
    s.status === 'aprovada' && s.valor_total && s.valor_total > 0 && !s.pagamento_pago
  )
  const outras = solicitacoes.filter(s =>
    !(s.status === 'aprovada' && s.valor_total && s.valor_total > 0 && !s.pagamento_pago)
  )

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 border-b border-white/10"
        style={{ background: 'linear-gradient(to bottom, #000, #1a1a1a)' }}>
        <div className="max-w-[1200px] mx-auto px-6 sm:px-12 h-24 flex items-center justify-between">
          <Image src="/logo.png" alt="Motocas" width={150} height={50} className="object-contain" />
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-2 text-base text-white">
              <span style={{ color: G }}>👤</span>
              {userName}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-base font-medium transition-opacity hover:opacity-80"
              style={{ color: G }}
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 sm:px-12 py-10">

        {/* ── HEADER ── */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Meu Painel</h1>
          <p className="text-white/70 text-base sm:text-lg mt-2">Acompanhe suas solicitações de aluguel</p>
          {userEmail && (
            <div className="flex items-center gap-2 mt-2">
              <Mail size={16} style={{ color: G }} />
              <span className="text-sm" style={{ color: G }}>{userEmail}</span>
            </div>
          )}
        </div>

        {/* ── TABS ── */}
        <div className="rounded-xl border border-white/10 mb-8 overflow-hidden"
          style={{ backgroundColor: '#1a1a1a' }}>
          {/* Mobile: coluna */}
          <div className="flex flex-col sm:hidden">
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setTab(i)}
                className={clsx('flex items-center gap-3 px-4 py-4 text-sm font-medium transition-colors border-b border-white/10 last:border-0',
                  tab === i ? 'font-bold' : 'text-white/70 hover:text-white')}
                style={tab === i ? { color: G, backgroundColor: `${G}26` } : {}}>
                <span style={tab === i ? { color: G } : {}}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
          {/* Desktop: linha */}
          <div className="hidden sm:flex">
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setTab(i)}
                className={clsx('flex-1 flex items-center justify-center gap-3 py-4 px-6 text-base font-medium transition-colors border-r border-white/10 last:border-0',
                  tab === i ? 'font-bold' : 'text-white/70 hover:text-white')}
                style={tab === i ? { color: G, backgroundColor: `${G}26` } : {}}>
                <span style={tab === i ? { color: G } : {}}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTEÚDO ── */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full border-2 animate-spin"
              style={{ borderColor: G, borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            {/* ── TAB 0: SOLICITAÇÕES ── */}
            {tab === 0 && (
              <div className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Total"      value={total}     icon={<ClipboardList size={32} />} color="#3B82F6" />
                  <StatCard label="Pendentes"  value={pendentes} icon={<ListChecks    size={32} />} color="orange"  />
                  <StatCard label="Em Análise" value={emAnalise} icon={<Search        size={32} />} color="#8B5CF6" />
                  <StatCard label="Aprovadas"  value={aprovadas} icon={<CheckCircle2  size={32} />} color={G}       />
                </div>

                {/* Botão Nova Solicitação */}
                <div className="flex justify-center">
                  <Link href="/"
                    className="flex items-center gap-3 px-10 py-5 rounded-xl font-bold text-lg text-black hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: G }}>
                    <PlusCircle size={22} />
                    Nova Solicitação de Aluguel
                  </Link>
                </div>

                {/* Lista */}
                {solicitacoes.length === 0 ? (
                  <EmptyState icon={<ListChecks size={64} />}
                    title="Nenhuma solicitação ainda"
                    subtitle="Clique no botão acima para solicitar o aluguel de uma moto." />
                ) : (
                  <div className="space-y-4">
                    {/* Pagamentos liberados em destaque */}
                    {comPagamento.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 mb-4"
                          style={{ backgroundColor: `${G}1a`, borderColor: G }}>
                          <DollarSign size={28} style={{ color: G }} />
                          <span className="text-xl font-bold" style={{ color: G }}>
                            💰 Pagamento Liberado!
                          </span>
                        </div>
                        {comPagamento.map(s => <PagamentoCard key={s.id} sol={s} />)}
                      </div>
                    )}

                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Minhas Solicitações</h2>
                    {outras.map(s => <SolicitacaoCard key={s.id} sol={s} />)}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 1: LOJA ── */}
            {tab === 1 && (
              <div>
                {pecas.length === 0 ? (
                  <EmptyState icon={<ShoppingCart size={64} />}
                    title="Nenhuma peça disponível"
                    subtitle="Novas peças serão adicionadas em breve." />
                ) : (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Catálogo de Peças</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {pecas.map(p => <PecaCard key={p.id} peca={p} />)}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB 2: PEDIDOS ── */}
            {tab === 2 && (
              <div>
                {pedidos.length === 0 ? (
                  <EmptyState icon={<ReceiptText size={64} />}
                    title="Nenhum pedido realizado"
                    subtitle="Visite a loja para fazer seu primeiro pedido." />
                ) : (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Meus Pedidos de Peças</h2>
                    <div className="space-y-4">
                      {pedidos.map(p => <PedidoCard key={p.id} pedido={p} />)}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ── SUB-COMPONENTES ── */

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-4 sm:p-6 rounded-2xl border flex flex-col items-center gap-2 text-center"
      style={{ backgroundColor: '#1a1a1a', borderColor: `${color}4D` }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-3xl sm:text-4xl font-bold text-white">{value}</span>
      <span className="text-xs sm:text-sm text-white/70">{label}</span>
    </div>
  )
}

function SolicitacaoCard({ sol }: { sol: Solicitacao }) {
  const st = SOL_STATUS[sol.status] || { label: sol.status, color: '#6B7280' }
  return (
    <div className="p-4 sm:p-6 rounded-2xl border mb-4" style={{ backgroundColor: '#1a1a1a', borderColor: `${st.color}4D` }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-lg text-white">
            {sol.motos?.nomemoto || 'Moto'}{sol.motos?.placamoto ? ` · ${sol.motos.placamoto}` : ''}
          </p>
          {sol.observacao && <p className="text-sm text-white/60 mt-1">{sol.observacao}</p>}
          <p className="text-xs text-white/40 mt-2">
            {new Date(sol.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <StatusChip label={st.label} color={st.color} />
      </div>
    </div>
  )
}

function PagamentoCard({ sol }: { sol: Solicitacao }) {
  const G = '#39FF14'
  return (
    <div className="mb-4 rounded-2xl border-[3px] overflow-hidden"
      style={{ backgroundColor: '#1a1a1a', borderColor: G, boxShadow: `0 4px 20px ${G}4D` }}>
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${G}33, ${G}0D)` }}>
        <div className="flex items-center gap-3 mb-3">
          <DollarSign size={24} style={{ color: G }} />
          <span className="font-bold text-lg" style={{ color: G }}>Pagamento Aguardando</span>
        </div>
        <p className="font-bold text-2xl text-white">
          {sol.motos?.nomemoto || 'Moto'}{sol.motos?.placamoto ? ` · ${sol.motos.placamoto}` : ''}
        </p>
        {sol.valor_total && (
          <p className="text-3xl font-extrabold mt-2" style={{ color: G }}>
            R$ {sol.valor_total.toFixed(2).replace('.', ',')}
          </p>
        )}
      </div>
    </div>
  )
}

function PecaCard({ peca }: { peca: Peca }) {
  const G = '#39FF14'
  return (
    <div className="rounded-xl border overflow-hidden flex flex-col" style={{ backgroundColor: '#1a1a1a', borderColor: `${G}4D` }}>
      <div className="h-24 sm:h-28 bg-[#111] flex items-center justify-center overflow-hidden">
        {peca.foto_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={peca.foto_url} alt={peca.nome} className="w-full h-full object-cover" />
          : <Package size={40} style={{ color: G }} className="opacity-50" />}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-sm text-white leading-snug line-clamp-2">{peca.nome}</p>
        {peca.categorias && <p className="text-xs mt-0.5" style={{ color: G }}>{peca.categorias.nome}</p>}
        <p className="font-bold text-base sm:text-lg text-white mt-auto pt-2">
          R$ {peca.preco.toFixed(2).replace('.', ',')}
        </p>
        <button className="mt-2 w-full py-2 rounded-lg font-bold text-xs text-black hover:opacity-90 transition-opacity"
          style={{ backgroundColor: G }}>
          Comprar
        </button>
      </div>
    </div>
  )
}

function PedidoCard({ pedido }: { pedido: PedidoPeca }) {
  const st = PEDIDO_STATUS[pedido.status] || { label: pedido.status, color: '#6B7280' }
  return (
    <div className="p-4 sm:p-6 rounded-xl border" style={{ backgroundColor: '#1a1a1a', borderColor: st.color + '99' }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="font-bold text-lg sm:text-xl text-white">Pedido #{pedido.id.slice(0, 8)}</p>
        <StatusChip label={st.label} color={st.color} />
      </div>
      <div className="border-t border-white/10 pt-3 space-y-2">
        {pedido.quantidade != null && (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <ShoppingBag size={16} style={{ color: '#39FF14' }} />
            Quantidade: {pedido.quantidade}
          </div>
        )}
        <div className="flex items-center gap-2 text-base font-bold text-white">
          <DollarSign size={16} style={{ color: '#39FF14' }} />
          Total: R$ {pedido.valor_total.toFixed(2).replace('.', ',')}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Calendar size={14} style={{ color: '#39FF14' }} />
          {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>
  )
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full border shrink-0"
      style={{ color, borderColor: color, backgroundColor: `${color}33` }}>
      {label}
    </span>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 opacity-30" style={{ color: '#39FF14' }}>{icon}</div>
      <p className="text-white font-bold text-xl">{title}</p>
      <p className="text-white/50 text-sm mt-2">{subtitle}</p>
    </div>
  )
}
