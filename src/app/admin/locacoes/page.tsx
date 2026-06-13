'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, Button, Modal, Input, Select, Textarea, ConfirmDialog, EmptyState, StatusBadge,
  formatCurrency, formatDate,
} from '@/components/ui'
import { locacaoService, clienteService, motoService } from '@/lib/services'
import { exportToCSV } from '@/lib/csv'
import type { Locacao, Cliente, Moto } from '@/types'
import { LOCACAO_STATUS } from '@/types'
import { Plus, FileText, Trash2, CheckCircle2, XCircle, Download } from 'lucide-react'

export default function LocacoesPage() {
  const [locacoes, setLocacoes] = useState<Locacao[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Locacao | null>(null)
  const [form, setForm] = useState({
    cliente_id: '', moto_id: '', data_inicio: '', data_fim: '',
    valor_diaria: '', valor_pago: '', forma_pagamento: 'pix', km_inicial: '', observacoes: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [l, c, m] = await Promise.all([
      locacaoService.getLocacoes(), clienteService.getClientes(), motoService.getMotos(),
    ])
    setLocacoes(l); setClientes(c); setMotos(m); setLoading(false)
  }

  function openNew() {
    setForm({ cliente_id: '', moto_id: '', data_inicio: '', data_fim: '', valor_diaria: '', valor_pago: '', forma_pagamento: 'pix', km_inicial: '', observacoes: '' })
    setModalOpen(true)
  }

  async function save() {
    if (!form.cliente_id || !form.moto_id || !form.data_inicio || !form.data_fim) return
    setSaving(true)
    const cliente = clientes.find((c) => c.id === Number(form.cliente_id))
    const moto = motos.find((m) => m.id === Number(form.moto_id))
    const dias = Math.max(1, Math.ceil((new Date(form.data_fim).getTime() - new Date(form.data_inicio).getTime()) / 86400000) + 1)
    const vDiaria = Number(form.valor_diaria) || 0
    const total = vDiaria * dias
    await locacaoService.createLocacao({
      cliente_id: Number(form.cliente_id), cliente_nome: cliente?.nome,
      moto_id: Number(form.moto_id), moto_nome: moto?.nomemoto, moto_placa: moto?.placamoto,
      data_inicio: form.data_inicio, data_fim: form.data_fim,
      valor_diaria: vDiaria, valor_total: total, valor_pago: Number(form.valor_pago) || 0,
      valor_pendente: total - (Number(form.valor_pago) || 0),
      forma_pagamento: form.forma_pagamento, km_inicial: Number(form.km_inicial) || null,
      observacoes: form.observacoes, status: 'ativa',
    })
    setSaving(false); setModalOpen(false); load()
  }

  async function finalizar(l: Locacao) {
    await locacaoService.updateLocacao(l.id, { status: 'finalizada', data_retorno_real: new Date().toISOString().split('T')[0] })
    load()
  }
  async function cancelar(l: Locacao) {
    await locacaoService.updateLocacao(l.id, { status: 'cancelada' }); load()
  }
  async function confirmDelete() {
    if (toDelete) { await locacaoService.deleteLocacao(toDelete.id); load() }
  }

  const filtered = locacoes.filter((l) => {
    if (filtro !== 'todas' && l.status !== filtro) return false
    if (dataInicio && l.data_inicio < dataInicio) return false
    if (dataFim && l.data_inicio > dataFim) return false
    return true
  })

  function handleExport() {
    exportToCSV(filtered, `locacoes_${new Date().toISOString().split('T')[0]}`, [
      { key: 'id', label: 'ID' },
      { key: 'cliente_nome', label: 'Cliente' },
      { key: 'moto_nome', label: 'Moto' },
      { key: 'moto_placa', label: 'Placa' },
      { key: 'data_inicio', label: 'Início' },
      { key: 'data_fim', label: 'Fim' },
      { key: 'valor_total', label: 'Valor Total' },
      { key: 'valor_pago', label: 'Valor Pago' },
      { key: 'valor_pendente', label: 'Valor Pendente' },
      { key: 'status', label: 'Status' },
    ])
  }

  return (
    <>
      <AdminHeader title="Locações" subtitle={`${locacoes.length} locação(ões)`}
        action={<Button onClick={openNew}><Plus size={16} /> Nova Locação</Button>} />

      <main className="flex-1 p-6 space-y-5">
        {/* Filtros status */}
        <div className="flex gap-2 flex-wrap">
          {['todas', 'ativa', 'atrasada', 'finalizada', 'cancelada'].map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
              style={filtro === f ? { backgroundColor: '#39FF14', color: '#000' } : { backgroundColor: '#1a1a1a', color: 'rgba(255,255,255,0.6)' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Filtros data + export */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Data início (de)</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white focus:outline-none focus:border-[#39FF14]" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Data início (até)</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white focus:outline-none focus:border-[#39FF14]" />
          </div>
          {(dataInicio || dataFim) && (
            <button onClick={() => { setDataInicio(''); setDataFim('') }}
              className="px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 bg-[#1a1a1a] transition-colors">
              Limpar datas
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
          <EmptyState icon={<FileText size={48} />} title="Nenhuma locação encontrada" />
        ) : (
          <div className="space-y-4">
            {filtered.map((l) => {
              const st = LOCACAO_STATUS[l.status] || { label: l.status, color: '#6B7280' }
              return (
                <div key={l.id} className="rounded-xl border border-white/10 bg-[#111] p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg text-white">{l.cliente_nome || 'Cliente'}</p>
                        <StatusBadge label={st.label} color={st.color} />
                      </div>
                      <p className="text-sm text-white/60 mt-1">{l.moto_nome} {l.moto_placa ? `· ${l.moto_placa}` : ''}</p>
                      <p className="text-xs text-white/40 mt-1">{formatDate(l.data_inicio)} → {formatDate(l.data_fim)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{formatCurrency(l.valor_total)}</p>
                      {l.valor_pendente ? <p className="text-xs text-red-400">Pendente: {formatCurrency(l.valor_pendente)}</p> : null}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5 flex-wrap">
                    {l.status === 'ativa' && (
                      <>
                        <Button variant="outline" onClick={() => finalizar(l)} className="!py-1.5 !px-3 text-xs"><CheckCircle2 size={14} /> Finalizar</Button>
                        <Button variant="outline" onClick={() => cancelar(l)} className="!py-1.5 !px-3 text-xs"><XCircle size={14} /> Cancelar</Button>
                      </>
                    )}
                    <Button variant="ghost" onClick={() => setToDelete(l)} className="!py-1.5 !px-3 text-xs text-red-400"><Trash2 size={14} /> Excluir</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Locação" maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Cliente" required value={form.cliente_id} onChange={(v) => setForm({ ...form, cliente_id: v })}
            options={[{ value: '', label: 'Selecione...' }, ...clientes.map((c) => ({ value: String(c.id), label: c.nome || `Cliente ${c.id}` }))]} />
          <Select label="Moto" required value={form.moto_id} onChange={(v) => setForm({ ...form, moto_id: v })}
            options={[{ value: '', label: 'Selecione...' }, ...motos.map((m) => ({ value: String(m.id), label: `${m.nomemoto || 'Moto'} ${m.placamoto || ''}` }))]} />
          <Input label="Data Início" type="date" required value={form.data_inicio} onChange={(v) => setForm({ ...form, data_inicio: v })} />
          <Input label="Data Fim" type="date" required value={form.data_fim} onChange={(v) => setForm({ ...form, data_fim: v })} />
          <Input label="Valor Diária" type="number" value={form.valor_diaria} onChange={(v) => setForm({ ...form, valor_diaria: v })} placeholder="0,00" />
          <Input label="Valor Pago" type="number" value={form.valor_pago} onChange={(v) => setForm({ ...form, valor_pago: v })} placeholder="0,00" />
          <Select label="Forma de Pagamento" value={form.forma_pagamento} onChange={(v) => setForm({ ...form, forma_pagamento: v })}
            options={[{ value: 'pix', label: 'PIX' }, { value: 'dinheiro', label: 'Dinheiro' }, { value: 'cartao', label: 'Cartão' }, { value: 'boleto', label: 'Boleto' }]} />
          <Input label="KM Inicial" type="number" value={form.km_inicial} onChange={(v) => setForm({ ...form, km_inicial: v })} />
          <div className="sm:col-span-2"><Textarea label="Observações" value={form.observacoes} onChange={(v) => setForm({ ...form, observacoes: v })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Criar Locação</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Excluir Locação" danger confirmLabel="Excluir"
        message={`Excluir a locação de "${toDelete?.cliente_nome}"?`} />
    </>
  )
}
