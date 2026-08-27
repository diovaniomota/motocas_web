'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, Button, Modal, Input, Textarea, ConfirmDialog, EmptyState, StatusBadge,
  formatDate, formatCurrency,
} from '@/components/ui'
import { solicitacaoService, authService } from '@/lib/services'
import { exportToCSV } from '@/lib/csv'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import type { SolicitacaoAluguel } from '@/types'
import { SOLICITACAO_STATUS } from '@/types'
import { Mail, Phone, Bike, Calendar, Check, X, Trash2, User, Download, FileSignature, Wallet } from 'lucide-react'

function waParams(s: SolicitacaoAluguel, extra?: Record<string, string>) {
  return {
    nome: s.nome_completo,
    moto: s.moto_nome,
    data_retirada: formatDate(s.data_retirada),
    data_devolucao: formatDate(s.data_devolucao),
    ...extra,
  }
}

export default function SolicitacoesPage() {
  const [items, setItems] = useState<SolicitacaoAluguel[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [detail, setDetail] = useState<SolicitacaoAluguel | null>(null)
  const [rejecting, setRejecting] = useState<SolicitacaoAluguel | null>(null)
  const [motivo, setMotivo] = useState('')
  const [toDelete, setToDelete] = useState<SolicitacaoAluguel | null>(null)
  const [confirmingPayment, setConfirmingPayment] = useState<SolicitacaoAluguel | null>(null)
  const [valorPago, setValorPago] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setItems(await solicitacaoService.getSolicitacoes())
    setLoading(false)
  }

  async function aprovar(s: SolicitacaoAluguel) {
    const user = await authService.getCurrentUser()
    const ok = await solicitacaoService.aprovarSolicitacao(s.id!, user?.email || 'admin')
    if (ok) void sendWhatsAppNotification('template_solicitacao_aprovada', s.telefone, waParams(s))
    setDetail(null); load()
  }
  async function confirmReject() {
    if (!rejecting) return
    const user = await authService.getCurrentUser()
    const ok = await solicitacaoService.rejeitarSolicitacao(rejecting.id!, motivo, user?.email || 'admin')
    if (ok) {
      void sendWhatsAppNotification('template_solicitacao_rejeitada', rejecting.telefone, waParams(rejecting, { motivo_rejeicao: motivo }))
    }
    setRejecting(null); setMotivo(''); setDetail(null); load()
  }
  async function confirmDelete() {
    if (toDelete) { await solicitacaoService.deletarSolicitacao(toDelete.id!); load() }
  }
  async function marcarContratoGerado(s: SolicitacaoAluguel) {
    const ok = await solicitacaoService.marcarContratoGerado(s.id!)
    if (ok) void sendWhatsAppNotification('template_contrato_gerado', s.telefone, waParams(s))
    load()
  }
  async function confirmarPagamento() {
    if (!confirmingPayment) return
    const valor = Number(valorPago.replace(',', '.'))
    if (!valor || valor <= 0) return
    const ok = await solicitacaoService.confirmarPagamento(confirmingPayment.id!, valor)
    if (ok) {
      void sendWhatsAppNotification('template_pagamento_confirmado', confirmingPayment.telefone,
        waParams(confirmingPayment, { valor_total: formatCurrency(valor) }))
    }
    setConfirmingPayment(null); setValorPago(''); load()
  }

  const filtered = items.filter((s) => {
    if (filtro !== 'todas' && s.status !== filtro) return false
    const dt = s.created_at?.split('T')[0] ?? ''
    if (dataInicio && dt < dataInicio) return false
    if (dataFim && dt > dataFim) return false
    return true
  })

  function handleExport() {
    exportToCSV(filtered, `solicitacoes_${new Date().toISOString().split('T')[0]}`, [
      { key: 'id', label: 'ID' },
      { key: 'nome_completo', label: 'Nome' },
      { key: 'email', label: 'Email' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'cpf', label: 'CPF' },
      { key: 'moto_nome', label: 'Moto' },
      { key: 'data_retirada', label: 'Retirada' },
      { key: 'data_devolucao', label: 'Devolução' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Criado em' },
    ])
  }

  return (
    <>
      <AdminHeader title="Solicitações" subtitle={`${items.length} solicitação(ões) de aluguel`} />

      <main className="flex-1 p-6 space-y-5">
        {/* Filtros status */}
        <div className="flex gap-2 flex-wrap">
          {['todas', 'pendente', 'em_analise', 'aprovada', 'gerar_contrato', 'rejeitada', 'convertida'].map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
              style={filtro === f ? { backgroundColor: '#39FF14', color: '#000' } : { backgroundColor: '#1a1a1a', color: 'rgba(255,255,255,0.6)' }}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Filtros data + export */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">De</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white focus:outline-none focus:border-[#39FF14]" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Até</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white focus:outline-none focus:border-[#39FF14]" />
          </div>
          {(dataInicio || dataFim) && (
            <button onClick={() => { setDataInicio(''); setDataFim('') }}
              className="px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 bg-[#1a1a1a] transition-colors">
              Limpar
            </button>
          )}
          <div className="ml-auto">
            <Button variant="outline" onClick={handleExport}>
              <Download size={15} /> Exportar CSV ({filtered.length})
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Mail size={48} />} title="Nenhuma solicitação encontrada" />
        ) : (
          <div className="space-y-4">
            {filtered.map((s) => {
              const st = SOLICITACAO_STATUS[s.status] || { label: s.status, color: '#6B7280' }
              return (
                <div key={s.id} className="rounded-xl border border-white/10 bg-[#111] p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">{s.nome_completo}</p>
                        <StatusBadge label={st.label} color={st.color} />
                      </div>
                      <p className="text-sm text-white/60 flex items-center gap-1.5"><Bike size={13} style={{ color: '#39FF14' }} /> {s.moto_nome}</p>
                      <p className="text-sm text-white/60 flex items-center gap-1.5"><Phone size={13} style={{ color: '#39FF14' }} /> {s.telefone}</p>
                      <p className="text-sm text-white/60 flex items-center gap-1.5"><Mail size={13} style={{ color: '#39FF14' }} /> {s.email}</p>
                      <p className="text-sm text-white/60 flex items-center gap-1.5"><Calendar size={13} style={{ color: '#39FF14' }} /> {formatDate(s.data_retirada)} → {formatDate(s.data_devolucao)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5 flex-wrap">
                    <Button variant="outline" onClick={() => setDetail(s)} className="!py-1.5 !px-3 text-xs"><User size={14} /> Detalhes</Button>
                    {s.status === 'pendente' && (
                      <>
                        <Button variant="primary" onClick={() => aprovar(s)} className="!py-1.5 !px-3 text-xs"><Check size={14} /> Aprovar</Button>
                        <Button variant="outline" onClick={() => setRejecting(s)} className="!py-1.5 !px-3 text-xs"><X size={14} /> Rejeitar</Button>
                      </>
                    )}
                    {(s.status === 'aprovada' || s.status === 'gerar_contrato') && !s.pagamento_pago && (
                      <Button variant="outline"
                        onClick={() => { setConfirmingPayment(s); setValorPago(s.valor_total ? String(s.valor_total) : '') }}
                        className="!py-1.5 !px-3 text-xs"><Wallet size={14} /> Confirmar Pagamento</Button>
                    )}
                    {s.status === 'aprovada' && (
                      <Button variant="outline" onClick={() => marcarContratoGerado(s)} className="!py-1.5 !px-3 text-xs"><FileSignature size={14} /> Marcar Contrato Gerado</Button>
                    )}
                    <Button variant="ghost" onClick={() => setToDelete(s)} className="!py-1.5 !px-3 text-xs text-red-400"><Trash2 size={14} /> Excluir</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Detalhes */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalhes da Solicitação" maxWidth="max-w-2xl">
        {detail && (
          <div className="space-y-3 text-sm">
            {([
              ['Nome', detail.nome_completo], ['Email', detail.email], ['Telefone', detail.telefone],
              ['CPF', detail.cpf], ['RG', detail.rg], ['CNH', detail.cnh],
              ['Profissão', detail.profissao], ['Estado Civil', detail.estado_civil],
              ['Moto', detail.moto_nome], ['Retirada', formatDate(detail.data_retirada)],
              ['Devolução', formatDate(detail.data_devolucao)], ['Local Retirada', detail.local_retirada],
              ['Como conheceu', detail.como_conheceu], ['Endereço', [detail.rua, detail.numero, detail.bairro, detail.cidade, detail.estado].filter(Boolean).join(', ')],
              ['Observações', detail.observacoes],
            ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <span className="text-white/50">{k}</span>
                <span className="text-white text-right">{v}</span>
              </div>
            ))}
            {detail.status === 'pendente' && (
              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={() => aprovar(detail)} className="flex-1"><Check size={16} /> Aprovar</Button>
                <Button variant="outline" onClick={() => setRejecting(detail)} className="flex-1"><X size={16} /> Rejeitar</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Rejeição */}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Rejeitar Solicitação" maxWidth="max-w-md">
        <Textarea label="Motivo da rejeição" value={motivo} onChange={setMotivo} placeholder="Descreva o motivo..." rows={4} />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setRejecting(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmReject}>Rejeitar</Button>
        </div>
      </Modal>

      {/* Confirmar Pagamento */}
      <Modal open={!!confirmingPayment} onClose={() => setConfirmingPayment(null)} title="Confirmar Pagamento" maxWidth="max-w-md">
        <Input label="Valor recebido (R$)" type="number" step="0.01" min="0" value={valorPago} onChange={setValorPago} placeholder="0,00" required />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setConfirmingPayment(null)}>Cancelar</Button>
          <Button variant="primary" onClick={confirmarPagamento} disabled={!valorPago || Number(valorPago.replace(',', '.')) <= 0}>Confirmar</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Excluir Solicitação" danger confirmLabel="Excluir" message={`Excluir a solicitação de "${toDelete?.nome_completo}"?`} />
    </>
  )
}
