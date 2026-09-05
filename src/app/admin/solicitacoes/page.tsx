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
import { gerarContrato, linkDeAssinatura, criarLinkPagamento } from '@/lib/edge-functions'
import { maskCpf, digitos, cpfValido, maskMoeda, moedaParaNumero } from '@/lib/mascaras'
import { registrarEvento } from '@/lib/eventos'
import HistoricoSolicitacao from '@/components/admin/HistoricoSolicitacao'
import AvisoFalhasWhatsApp from '@/components/admin/AvisoFalhasWhatsApp'
import type { SolicitacaoAluguel } from '@/types'
import { SOLICITACAO_STATUS } from '@/types'
import {
  Mail, Phone, Bike, Calendar, Check, X, Trash2, User, Download, FileSignature, Wallet,
  Loader2, FileText, Link2, Copy, History,
} from 'lucide-react'

const TABELA = 'solicitacoes_aluguel'

/** Valor do banco (150) para o texto da máscara ("150,00"). */
function valorParaCampo(v: number | null | undefined) {
  return v ? maskMoeda(String(Math.round(v * 100))) : ''
}

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
  const [processando, setProcessando] = useState<number | null>(null)
  const [cobrando, setCobrando] = useState<SolicitacaoAluguel | null>(null)
  const [valorCobranca, setValorCobranca] = useState('')
  const [cpfCobranca, setCpfCobranca] = useState('')
  const [copiado, setCopiado] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setItems(await solicitacaoService.getSolicitacoes())
    setLoading(false)
  }

  async function aprovar(s: SolicitacaoAluguel) {
    const user = await authService.getCurrentUser()
    const ok = await solicitacaoService.aprovarSolicitacao(s.id!, user?.email || 'admin')
    if (ok) {
      void registrarEvento({ tabela: TABELA, registroId: s.id!, acao: 'aprovou', descricao: 'Solicitação aprovada' })
      void sendWhatsAppNotification('template_solicitacao_aprovada', s.telefone, waParams(s), { solicitacaoId: s.id })
    }
    setDetail(null); load()
  }
  async function confirmReject() {
    if (!rejecting) return
    const user = await authService.getCurrentUser()
    const ok = await solicitacaoService.rejeitarSolicitacao(rejecting.id!, motivo, user?.email || 'admin')
    if (ok) {
      void registrarEvento({
        tabela: TABELA, registroId: rejecting.id!, acao: 'rejeitou',
        descricao: `Solicitação rejeitada: ${motivo}`, dados: { motivo },
      })
      void sendWhatsAppNotification('template_solicitacao_rejeitada', rejecting.telefone,
        waParams(rejecting, { motivo_rejeicao: motivo }), { solicitacaoId: rejecting.id })
    }
    setRejecting(null); setMotivo(''); setDetail(null); load()
  }
  /* Gera o PDF preenchido, cria o token de assinatura e manda o link por WhatsApp.
     O cliente assina em /assinar?token=... sem precisar de conta. */
  async function gerarEEnviarContrato(s: SolicitacaoAluguel) {
    setProcessando(s.id!)
    try {
      const { token } = await gerarContrato(s.id!)
      void registrarEvento({
        tabela: TABELA, registroId: s.id!, acao: 'gerou_contrato',
        descricao: s.contrato_pdf_url ? 'Contrato gerado novamente' : 'Contrato gerado e enviado',
      })
      void sendWhatsAppNotification('template_contrato_gerado', s.telefone,
        waParams(s, { link_contrato: linkDeAssinatura(token) }), { solicitacaoId: s.id })
      await load()
    } catch (e) {
      alert(`Não foi possível gerar o contrato: ${e instanceof Error ? e.message : e}`)
    } finally {
      setProcessando(null)
    }
  }

  /* Cria o link de checkout na Pagar.me (PIX, cartão ou boleto) e envia ao cliente. */
  async function gerarCobranca() {
    if (!cobrando) return
    const valor = moedaParaNumero(valorCobranca)
    if (!valor || valor <= 0) { alert('Informe um valor válido.'); return }
    if (!cpfValido(cpfCobranca)) { alert('Informe um CPF com 11 dígitos.'); return }

    const cpf = digitos(cpfCobranca)
    setProcessando(cobrando.id!)
    try {
      // corrige de vez no cadastro: solicitações antigas guardam CPF com lixo
      if (cpf !== (cobrando.cpf ?? '')) {
        await solicitacaoService.atualizarStatus(cobrando.id!, { cpf })
        void registrarEvento({
          tabela: TABELA, registroId: cobrando.id!, acao: 'corrigiu_cpf',
          descricao: 'CPF corrigido ao gerar a cobrança',
          dados: { de: cobrando.cpf, para: cpf },
        })
      }

      const { checkoutUrl, paymentLinkId } = await criarLinkPagamento({
        solicitacaoId: cobrando.id!,
        valor,
        descricao: `Aluguel ${cobrando.moto_nome}`,
        cliente: {
          nome: cobrando.nome_completo, email: cobrando.email,
          telefone: cobrando.telefone, cpf,
        },
      })
      await solicitacaoService.salvarLinkPagamento(cobrando.id!, checkoutUrl, paymentLinkId, valor)
      void registrarEvento({
        tabela: TABELA, registroId: cobrando.id!, acao: 'gerou_cobranca',
        descricao: `Cobrança de ${formatCurrency(valor)} gerada na Pagar.me`,
        dados: { valor, pagarme_id: paymentLinkId },
      })
      void sendWhatsAppNotification('template_link_pagamento', cobrando.telefone,
        waParams(cobrando, { link_pagamento: checkoutUrl, valor_total: formatCurrency(valor) }),
        { solicitacaoId: cobrando.id })
      setCobrando(null); setValorCobranca('')
      await load()
    } catch (e) {
      alert(`Não foi possível gerar a cobrança: ${e instanceof Error ? e.message : e}`)
    } finally {
      setProcessando(null)
    }
  }

  async function copiarLink(s: SolicitacaoAluguel) {
    if (!s.link_pagamento) return
    await navigator.clipboard.writeText(s.link_pagamento)
    setCopiado(s.id!)
    setTimeout(() => setCopiado(null), 2000)
  }

  async function confirmDelete() {
    if (!toDelete) return
    // registra antes: depois de apagar não sobra de quem era
    await registrarEvento({
      tabela: TABELA, registroId: toDelete.id!, acao: 'excluiu',
      descricao: `Solicitação de ${toDelete.nome_completo} excluída`,
      dados: { nome: toDelete.nome_completo, moto: toDelete.moto_nome, status: toDelete.status },
    })
    await solicitacaoService.deletarSolicitacao(toDelete.id!)
    load()
  }
  async function confirmarPagamento() {
    if (!confirmingPayment) return
    const valor = moedaParaNumero(valorPago)
    if (!valor || valor <= 0) return
    const ok = await solicitacaoService.confirmarPagamento(confirmingPayment.id!, valor)
    if (ok) {
      void registrarEvento({
        tabela: TABELA, registroId: confirmingPayment.id!, acao: 'confirmou_pagamento',
        descricao: `Pagamento de ${formatCurrency(valor)} confirmado manualmente`,
        dados: { valor },
      })
      void sendWhatsAppNotification('template_pagamento_confirmado', confirmingPayment.telefone,
        waParams(confirmingPayment, { valor_total: formatCurrency(valor) }),
        { solicitacaoId: confirmingPayment.id })
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

        <AvisoFalhasWhatsApp />

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
                        {s.termo_aceito && <StatusBadge label="Assinado" color="#39FF14" />}
                        {s.link_pagamento && !s.pagamento_pago && <StatusBadge label="Cobrança enviada" color="#F59E0B" />}
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
                    {(s.status === 'aprovada' || s.status === 'gerar_contrato') && (
                      <>
                        <Button variant="outline" disabled={processando === s.id}
                          onClick={() => gerarEEnviarContrato(s)} className="!py-1.5 !px-3 text-xs">
                          {processando === s.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <FileSignature size={14} />}
                          {s.contrato_pdf_url ? 'Reenviar contrato' : 'Gerar e enviar contrato'}
                        </Button>
                        {(s.termo_pdf_url || s.contrato_pdf_url) && (
                          <a href={s.termo_pdf_url || s.contrato_pdf_url || '#'} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors">
                            <FileText size={14} /> {s.termo_aceito ? 'Ver assinado' : 'Ver contrato'}
                          </a>
                        )}
                      </>
                    )}
                    {(s.status === 'aprovada' || s.status === 'gerar_contrato') && !s.pagamento_pago && (
                      <>
                        {s.link_pagamento ? (
                          <Button variant="outline" onClick={() => copiarLink(s)} className="!py-1.5 !px-3 text-xs">
                            {copiado === s.id ? <Check size={14} /> : <Copy size={14} />}
                            {copiado === s.id ? 'Link copiado!' : 'Copiar link de pagamento'}
                          </Button>
                        ) : (
                          <Button variant="outline" disabled={processando === s.id}
                            onClick={() => {
                              setCobrando(s)
                              setValorCobranca(valorParaCampo(s.valor_total))
                              setCpfCobranca(maskCpf(s.cpf ?? ''))
                            }}
                            className="!py-1.5 !px-3 text-xs">
                            {processando === s.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Link2 size={14} />}
                            Gerar link de pagamento
                          </Button>
                        )}
                        <Button variant="outline"
                          onClick={() => { setConfirmingPayment(s); setValorPago(valorParaCampo(s.valor_total)) }}
                          className="!py-1.5 !px-3 text-xs"><Wallet size={14} /> Confirmar Pagamento</Button>
                      </>
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
            <div className="pt-4 mt-2 border-t border-white/10">
              <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <History size={15} style={{ color: '#39FF14' }} /> Histórico
              </h4>
              {detail.id && <HistoricoSolicitacao solicitacaoId={detail.id} />}
            </div>

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
        <Input label="Valor recebido (R$)" inputMode="decimal" value={valorPago}
          onChange={(v) => setValorPago(maskMoeda(v))} placeholder="0,00" required />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setConfirmingPayment(null)}>Cancelar</Button>
          <Button variant="primary" onClick={confirmarPagamento}
            disabled={moedaParaNumero(valorPago) <= 0}>Confirmar</Button>
        </div>
      </Modal>

      <Modal open={!!cobrando} onClose={() => setCobrando(null)} title="Gerar link de pagamento" maxWidth="max-w-md">
        <p className="text-white/60 text-sm mb-4">
          Cria uma cobrança na Pagar.me para{' '}
          <span className="text-white font-semibold">{cobrando?.nome_completo}</span> e envia o link
          por WhatsApp. O cliente escolhe entre PIX, cartão ou boleto na própria página da Pagar.me.
        </p>
        <Input label="Valor total (R$)" inputMode="decimal" value={valorCobranca}
          onChange={(v) => setValorCobranca(maskMoeda(v))} placeholder="0,00" required />
        <div className="mt-4">
          <Input label="CPF do cliente" value={cpfCobranca}
            onChange={(v) => setCpfCobranca(maskCpf(v))} placeholder="000.000.000-00" required />
          {!cpfValido(cpfCobranca) && (
            <p className="text-amber-300 text-xs mt-2 bg-amber-500/10 px-3 py-2 rounded-lg">
              {cobrando?.cpf
                ? 'O CPF gravado nesta solicitação está inválido — ela foi criada antes de existir máscara no formulário. Corrija aqui e o cadastro é atualizado junto.'
                : 'Esta solicitação não tem CPF. A Pagar.me exige o documento do cliente.'}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setCobrando(null)}>Cancelar</Button>
          <Button variant="primary" onClick={gerarCobranca}
            disabled={moedaParaNumero(valorCobranca) <= 0
              || !cpfValido(cpfCobranca) || processando === cobrando?.id}>
            {processando === cobrando?.id ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            Gerar e enviar
          </Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Excluir Solicitação" danger confirmLabel="Excluir" message={`Excluir a solicitação de "${toDelete?.nome_completo}"?`} />
    </>
  )
}
