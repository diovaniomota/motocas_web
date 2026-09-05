'use client'

// A locação em curso, do ponto de vista de quem está com a moto.
//
// O painel mostrava pedido de aluguel e pedido de peças, mas não o aluguel em
// si — justamente o que o locatário quer saber ao abrir: qual moto está com
// ele, até quando, e quanto falta para devolver.

import { useEffect, useState } from 'react'
import {
  Bike, Calendar, FileText, Camera, AlertTriangle, Clock,
  Loader2, Gauge, CalendarPlus,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { lerFotos } from '@/lib/entrega'
import { registrarEvento } from '@/lib/eventos'
import type { Locacao, Checklist, SolicitacaoAluguel, Infracao } from '@/types'

const G = '#39FF14'

const brl = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const dataBr = (v: string | null | undefined) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '—'

/** Dias até a devolução. Negativo = atrasado. */
function diasRestantes(dataFim: string): number {
  const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00').getTime()
  return Math.round((new Date(`${dataFim}T12:00:00`).getTime() - hoje) / 86_400_000)
}

export default function MinhaLocacao({ clienteId, email }: { clienteId: number | null; email: string }) {
  const [locacao, setLocacao] = useState<Locacao | null>(null)
  const [vistoria, setVistoria] = useState<Checklist | null>(null)
  const [solicitacao, setSolicitacao] = useState<SolicitacaoAluguel | null>(null)
  const [infracoes, setInfracoes] = useState<Infracao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [pedindoExtensao, setPedindoExtensao] = useState(false)
  const [extensaoPedida, setExtensaoPedida] = useState(false)

  useEffect(() => {
    let vivo = true
    void (async () => {
      setCarregando(true)
      try {
        // pelo vínculo real quando existe; e-mail é só a ponte para cadastros antigos
        let q = supabase.from('locacoes').select('*').in('status', ['ativa', 'atrasada'])
        q = clienteId ? q.eq('cliente_id', clienteId) : q.eq('cliente_nome', email)
        const { data: locs } = await q.order('data_fim', { ascending: true }).limit(1)
        const loc = locs?.[0] ?? null
        if (!vivo) return
        setLocacao(loc)

        if (loc) {
          const [{ data: chk }, { data: sol }, { data: inf }] = await Promise.all([
            supabase.from('checklists').select('*')
              .eq('locacao_id', loc.id).eq('tipo', 'entrada').maybeSingle(),
            loc.origem_solicitacao_id
              ? supabase.from('solicitacoes_aluguel').select('*')
                .eq('id', loc.origem_solicitacao_id).maybeSingle()
              : Promise.resolve({ data: null }),
            loc.moto_id
              ? supabase.from('infracoes').select('*')
                .eq('moto_id', loc.moto_id)
                .gte('data_infracao', loc.data_inicio)
                .lte('data_infracao', loc.data_retorno_real ?? loc.data_fim)
              : Promise.resolve({ data: [] }),
          ])
          if (!vivo) return
          setVistoria(chk ?? null)
          setSolicitacao(sol ?? null)
          setInfracoes((inf as Infracao[]) ?? [])
        }
      } catch { /* sem locação ainda */ }
      finally { if (vivo) setCarregando(false) }
    })()
    return () => { vivo = false }
  }, [clienteId, email])

  async function pedirExtensao() {
    if (!locacao) return
    setPedindoExtensao(true)
    try {
      await registrarEvento({
        tabela: 'locacoes', registroId: locacao.id, acao: 'pediu_extensao',
        descricao: `${locacao.cliente_nome ?? 'Cliente'} pediu para estender a locação`,
        dados: { data_fim_atual: locacao.data_fim },
      })
      setExtensaoPedida(true)
    } finally {
      setPedindoExtensao(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-white/40 text-sm py-16 justify-center">
        <Loader2 size={16} className="animate-spin" /> Carregando sua locação...
      </div>
    )
  }

  if (!locacao) {
    return (
      <div className="text-center py-20">
        <Bike size={44} className="mx-auto mb-4 opacity-30" style={{ color: G }} />
        <p className="text-white font-bold text-lg">Nenhuma locação em andamento</p>
        <p className="text-white/50 text-sm mt-2">
          Quando você retirar uma moto, os detalhes aparecem aqui.
        </p>
      </div>
    )
  }

  const dias = diasRestantes(locacao.data_fim)
  const atrasada = dias < 0
  const fotos = lerFotos(vistoria?.avarias_fotos)
  const contrato = solicitacao?.termo_pdf_url || solicitacao?.contrato_pdf_url

  return (
    <div className="space-y-4">
      {/* aviso de prazo */}
      <div className="rounded-2xl border p-5"
        style={{
          borderColor: atrasada ? '#F8717166' : dias <= 1 ? '#F59E0B66' : `${G}44`,
          backgroundColor: atrasada ? '#F871711A' : dias <= 1 ? '#F59E0B14' : `${G}10`,
        }}>
        <div className="flex items-center gap-2 mb-1">
          {atrasada ? <AlertTriangle size={18} className="text-red-400" />
            : <Clock size={18} style={{ color: dias <= 1 ? '#F59E0B' : G }} />}
          <span className="font-bold text-sm"
            style={{ color: atrasada ? '#FCA5A5' : dias <= 1 ? '#FCD34D' : G }}>
            {atrasada
              ? `Devolução atrasada em ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
              : dias === 0 ? 'Devolver hoje'
              : dias === 1 ? 'Devolver amanhã'
              : `Faltam ${dias} dias para devolver`}
          </span>
        </div>
        <p className="text-white/60 text-xs">
          Prazo combinado: {dataBr(locacao.data_fim)}
          {atrasada && ' — diárias adicionais podem ser cobradas conforme o contrato.'}
        </p>
      </div>

      {/* a moto */}
      <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bike size={18} style={{ color: G }} />
          <h3 className="text-white font-bold">{locacao.moto_nome || 'Moto'}</h3>
          {locacao.moto_placa && (
            <span className="text-xs font-mono text-white/50 border border-white/10 rounded px-2 py-0.5">
              {locacao.moto_placa}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Campo icone={<Calendar size={13} />} rotulo="Retirada" valor={dataBr(locacao.data_inicio)} />
          <Campo icone={<Calendar size={13} />} rotulo="Devolução" valor={dataBr(locacao.data_fim)} />
          <Campo icone={<Gauge size={13} />} rotulo="KM na entrega"
            valor={locacao.km_inicial != null ? `${locacao.km_inicial} km` : '—'} />
          <Campo icone={<FileText size={13} />} rotulo="Valor" valor={brl(locacao.valor_total)} />
        </div>

        {(locacao.valor_pendente ?? 0) > 0 && (
          <p className="mt-4 text-xs text-amber-300 bg-amber-500/10 px-3 py-2 rounded-lg">
            Em aberto: {brl(locacao.valor_pendente)}
          </p>
        )}
      </div>

      {/* estender */}
      <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <CalendarPlus size={16} style={{ color: G }} /> Precisa de mais dias?
        </h3>
        {extensaoPedida ? (
          <p className="text-white/60 text-xs mt-2">
            Pedido registrado. A Motocas vai te mandar o link de pagamento das diárias
            adicionais pelo WhatsApp.
          </p>
        ) : (
          <>
            <p className="text-white/50 text-xs mt-1 mb-3">
              Avisamos a Motocas e você recebe o link de pagamento no WhatsApp. As diárias
              adicionais são pagas antecipadamente.
            </p>
            <button onClick={pedirExtensao} disabled={pedindoExtensao}
              className="px-4 py-2 rounded-xl font-bold text-black text-xs disabled:opacity-50"
              style={{ backgroundColor: G }}>
              {pedindoExtensao ? 'Enviando...' : 'Quero estender'}
            </button>
          </>
        )}
      </div>

      {/* documentos */}
      <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
        <h3 className="text-white font-bold text-sm mb-3">Documentos da locação</h3>
        {contrato ? (
          <a href={contrato} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white border border-white/20 hover:bg-white/5 transition-colors">
            <FileText size={14} />
            {solicitacao?.termo_aceito ? 'Contrato assinado' : 'Contrato'}
          </a>
        ) : (
          <p className="text-white/30 text-xs">Contrato ainda não disponível.</p>
        )}

        {fotos.length > 0 && (
          <div className="mt-4">
            <p className="text-white/60 text-xs mb-2 flex items-center gap-1.5">
              <Camera size={12} style={{ color: G }} />
              Vistoria de entrega — estado da moto quando você recebeu
            </p>
            <div className="flex flex-wrap gap-2">
              {fotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Vistoria ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* infrações do período */}
      {infracoes.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <h3 className="text-amber-200 font-bold text-sm flex items-center gap-2 mb-1">
            <AlertTriangle size={16} /> Infrações no período da sua locação
          </h3>
          <p className="text-white/50 text-xs mb-3">
            Pelo contrato, multas cometidas durante a locação são de responsabilidade do locatário.
          </p>
          <ul className="space-y-2">
            {infracoes.map((i) => (
              <li key={i.id} className="text-xs text-white/75 flex justify-between gap-3">
                <span className="truncate">
                  {i.descricao || i.tipo_infracao || 'Infração'} · {dataBr(i.data_infracao)}
                </span>
                <span className="font-semibold shrink-0">{brl(i.valor_multa)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Campo({ icone, rotulo, valor }: { icone: React.ReactNode; rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-[#0a0a0a] border border-white/5 px-3 py-2.5">
      <p className="text-white/35 text-[11px] flex items-center gap-1">{icone} {rotulo}</p>
      <p className="text-white font-semibold text-sm mt-0.5">{valor}</p>
    </div>
  )
}
