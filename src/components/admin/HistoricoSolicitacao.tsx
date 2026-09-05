'use client'

// Linha do tempo de uma solicitação: ações do admin e mensagens enviadas
// misturadas em ordem cronológica. As duas coisas juntas porque a pergunta
// que se faz na prática é "o que aconteceu com esse cliente", e não
// "quais eventos" ou "quais mensagens" separadamente.

import { useEffect, useState } from 'react'
import {
  Check, X, FileSignature, Wallet, Link2, Trash2, Pencil,
  MessageCircle, AlertTriangle, Clock, Loader2,
} from 'lucide-react'
import { listarEventos, listarMensagens, type Evento, type MensagemEnviada } from '@/lib/eventos'

const G = '#39FF14'

interface Item {
  quando: string
  titulo: string
  detalhe?: string | null
  autor?: string | null
  icone: React.ReactNode
  cor: string
  falhou?: boolean
}

const ICONES: Record<string, { icone: React.ReactNode; cor: string }> = {
  aprovou: { icone: <Check size={14} />, cor: G },
  rejeitou: { icone: <X size={14} />, cor: '#F87171' },
  gerou_contrato: { icone: <FileSignature size={14} />, cor: '#60A5FA' },
  gerou_cobranca: { icone: <Link2 size={14} />, cor: '#F59E0B' },
  confirmou_pagamento: { icone: <Wallet size={14} />, cor: G },
  corrigiu_cpf: { icone: <Pencil size={14} />, cor: '#A78BFA' },
  excluiu: { icone: <Trash2 size={14} />, cor: '#F87171' },
}

/** "há 3 minutos", "há 2 dias" — data cheia fica no title do elemento. */
function quandoRelativo(iso: string): string {
  const segundos = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (segundos < 60) return 'agora há pouco'
  const minutos = Math.round(segundos / 60)
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas}h`
  const dias = Math.round(horas / 24)
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function deEvento(e: Evento): Item {
  const { icone, cor } = ICONES[e.acao] ?? { icone: <Clock size={14} />, cor: '#9CA3AF' }
  return {
    quando: e.created_at,
    titulo: e.descricao || e.acao,
    autor: e.usuario_email,
    icone, cor,
  }
}

function deMensagem(m: MensagemEnviada): Item {
  const nome = (m.template ?? '').replace(/^template_/, '').replace(/_/g, ' ')
  return {
    quando: m.created_at,
    titulo: m.status === 'enviada'
      ? `WhatsApp enviado para ${m.destinatario}`
      : `WhatsApp NÃO enviado para ${m.destinatario}`,
    detalhe: m.status === 'falhou' ? m.erro : nome || null,
    icone: m.status === 'enviada' ? <MessageCircle size={14} /> : <AlertTriangle size={14} />,
    cor: m.status === 'enviada' ? '#34D399' : '#F87171',
    falhou: m.status === 'falhou',
  }
}

export default function HistoricoSolicitacao({ solicitacaoId }: { solicitacaoId: number }) {
  const [itens, setItens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    void (async () => {
      setCarregando(true)
      try {
        const [eventos, mensagens] = await Promise.all([
          listarEventos('solicitacoes_aluguel', solicitacaoId),
          listarMensagens(solicitacaoId),
        ])
        const todos = [...eventos.map(deEvento), ...mensagens.map(deMensagem)]
        todos.sort((a, b) => b.quando.localeCompare(a.quando))
        setItens(todos)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao carregar o histórico')
      } finally {
        setCarregando(false)
      }
    })()
  }, [solicitacaoId])

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-white/40 text-xs py-3">
        <Loader2 size={14} className="animate-spin" /> Carregando histórico...
      </div>
    )
  }

  if (erro) {
    return (
      <p className="text-xs text-amber-300 bg-amber-500/10 px-3 py-2 rounded-lg">
        {erro} — a tabela de histórico já foi criada no banco?
      </p>
    )
  }

  if (itens.length === 0) {
    return <p className="text-white/30 text-xs py-2">Nada registrado ainda para esta solicitação.</p>
  }

  return (
    <ol className="space-y-3">
      {itens.map((i, idx) => (
        <li key={idx} className="flex gap-3">
          <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center border"
            style={{ color: i.cor, borderColor: `${i.cor}55`, backgroundColor: `${i.cor}14` }}>
            {i.icone}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm leading-snug ${i.falhou ? 'text-red-300' : 'text-white/85'}`}>
              {i.titulo}
            </p>
            {i.detalhe && (
              <p className="text-white/40 text-xs mt-0.5 break-words">{i.detalhe}</p>
            )}
            <p className="text-white/30 text-[11px] mt-0.5" title={new Date(i.quando).toLocaleString('pt-BR')}>
              {quandoRelativo(i.quando)}{i.autor ? ` · ${i.autor}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
