'use client'

// O que a operação precisa saber logo cedo: quem está atrasado, quem devolve
// hoje e o que vem na semana.
//
// Atraso não é detalhe estético: o contrato cobra diária adicional e trata
// mais de 24h sem devolução como apropriação indébita (cláusula 27ª). Quem
// não vê o atraso não cobra e não aciona.

import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarClock, CalendarDays, Loader2, Undo2 } from 'lucide-react'
import { carregarDevolucoes, type Devolucoes } from '@/lib/entrega'
import { formatDate } from '@/components/ui'
import type { Locacao } from '@/types'

const G = '#39FF14'

function diasDe(dataFim: string): number {
  const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00').getTime()
  const fim = new Date(`${dataFim}T12:00:00`).getTime()
  return Math.round((hoje - fim) / 86_400_000)
}

export default function PainelDevolucoes({
  onDevolver, recarregar,
}: {
  onDevolver: (l: Locacao) => void
  /** muda de valor quando a lista de locações muda, para o painel recarregar */
  recarregar?: number
}) {
  const [dados, setDados] = useState<Devolucoes | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // guarda contra o componente sair da tela no meio da consulta
    let vivo = true
    void (async () => {
      setCarregando(true)
      try {
        const d = await carregarDevolucoes()
        if (vivo) setDados(d)
      } catch { /* tabela vazia ou sem acesso */ }
      finally { if (vivo) setCarregando(false) }
    })()
    return () => { vivo = false }
  }, [recarregar])

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-white/40 text-xs py-4">
        <Loader2 size={14} className="animate-spin" /> Carregando devoluções...
      </div>
    )
  }

  const total = (dados?.atrasadas.length ?? 0) + (dados?.hoje.length ?? 0) + (dados?.proximas.length ?? 0)
  if (!dados || total === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Coluna
        titulo="Atrasadas" icone={<AlertTriangle size={15} />} cor="#F87171"
        vazio="Nenhuma moto atrasada"
        itens={dados.atrasadas} onDevolver={onDevolver}
        legenda={(l) => {
          const d = diasDe(l.data_fim)
          return `${d} ${d === 1 ? 'dia' : 'dias'} de atraso`
        }}
      />
      <Coluna
        titulo="Devolvem hoje" icone={<CalendarClock size={15} />} cor={G}
        vazio="Nada previsto para hoje"
        itens={dados.hoje} onDevolver={onDevolver}
        legenda={() => 'vence hoje'}
      />
      <Coluna
        titulo="Próximos 7 dias" icone={<CalendarDays size={15} />} cor="#60A5FA"
        vazio="Nada na semana"
        itens={dados.proximas} onDevolver={onDevolver}
        legenda={(l) => formatDate(l.data_fim)}
      />
    </div>
  )
}

function Coluna({
  titulo, icone, cor, itens, vazio, legenda, onDevolver,
}: {
  titulo: string
  icone: React.ReactNode
  cor: string
  itens: Locacao[]
  vazio: string
  legenda: (l: Locacao) => string
  onDevolver: (l: Locacao) => void
}) {
  return (
    <div className="rounded-2xl border bg-[#111] p-4"
      style={{ borderColor: itens.length ? `${cor}44` : 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: cor }}>{icone}</span>
        <h3 className="text-white font-bold text-sm">{titulo}</h3>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color: cor, backgroundColor: `${cor}1A` }}>
          {itens.length}
        </span>
      </div>

      {itens.length === 0 ? (
        <p className="text-white/25 text-xs py-2">{vazio}</p>
      ) : (
        <ul className="space-y-2">
          {itens.map((l) => (
            <li key={l.id} className="rounded-xl bg-[#0a0a0a] border border-white/5 px-3 py-2.5">
              <p className="text-white text-sm font-semibold truncate">
                {l.cliente_nome || `Locação #${l.id}`}
              </p>
              <p className="text-white/45 text-xs truncate">{l.moto_nome || '—'}</p>
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="text-[11px]" style={{ color: cor }}>{legenda(l)}</span>
                <button onClick={() => onDevolver(l)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-lg px-2 py-1 transition-colors">
                  <Undo2 size={11} /> Devolver
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
