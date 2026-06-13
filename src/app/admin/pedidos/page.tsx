'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, Button, Modal, Select, EmptyState, StatusBadge, formatCurrency, formatDate,
} from '@/components/ui'
import { pecaService } from '@/lib/services'
import { exportToCSV } from '@/lib/csv'
import type { PedidoPeca } from '@/types'
import { PEDIDO_STATUS } from '@/types'
import { ShoppingCart, User, Phone, Mail, Package, Pencil, Download } from 'lucide-react'

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoPeca[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [editing, setEditing] = useState<PedidoPeca | null>(null)
  const [novoStatus, setNovoStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setPedidos(await pecaService.getTodosPedidos())
    setLoading(false)
  }

  async function salvarStatus() {
    if (!editing) return
    setSaving(true)
    await pecaService.atualizarStatusPedido(editing.id, novoStatus)
    setSaving(false); setEditing(null); load()
  }

  const filtered = pedidos.filter((p) => {
    if (filtro !== 'todos' && p.status !== filtro) return false
    if (dataInicio && p.created_at && p.created_at.split('T')[0] < dataInicio) return false
    if (dataFim && p.created_at && p.created_at.split('T')[0] > dataFim) return false
    return true
  })

  function handleExport() {
    exportToCSV(filtered, `pedidos_${new Date().toISOString().split('T')[0]}`, [
      { key: 'id', label: 'ID' },
      { key: 'cliente_nome', label: 'Cliente' },
      { key: 'cliente_email', label: 'Email' },
      { key: 'cliente_telefone', label: 'Telefone' },
      { key: 'quantidade', label: 'Quantidade' },
      { key: 'valor_total', label: 'Valor Total' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Data' },
    ])
  }

  return (
    <>
      <AdminHeader title="Pedidos de Peças" subtitle={`${pedidos.length} pedido(s)`} />

      <main className="flex-1 p-6 space-y-5">
        {/* Filtros status */}
        <div className="flex gap-2 flex-wrap">
          {['todos', 'pendente', 'em_analise', 'aprovado', 'enviado', 'entregue', 'cancelado'].map((f) => (
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
          <EmptyState icon={<ShoppingCart size={48} />} title="Nenhum pedido encontrado" />
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => {
              const st = PEDIDO_STATUS[p.status] || { label: p.status, color: '#6B7280' }
              return (
                <div key={p.id} className="rounded-xl border border-white/10 bg-[#111] p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">Pedido #{p.id}</p>
                        <StatusBadge label={st.label} color={st.color} />
                      </div>
                      <p className="text-sm text-white/60 flex items-center gap-1.5"><User size={13} style={{ color: '#39FF14' }} /> {p.cliente_nome}</p>
                      <p className="text-sm text-white/60 flex items-center gap-1.5"><Phone size={13} style={{ color: '#39FF14' }} /> {p.cliente_telefone}</p>
                      <p className="text-sm text-white/60 flex items-center gap-1.5"><Mail size={13} style={{ color: '#39FF14' }} /> {p.cliente_email}</p>
                      <p className="text-sm text-white/60 flex items-center gap-1.5"><Package size={13} style={{ color: '#39FF14' }} /> Qtd: {p.quantidade}</p>
                      <p className="text-xs text-white/40">{formatDate(p.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{formatCurrency(p.valor_total)}</p>
                      <Button variant="outline" onClick={() => { setEditing(p); setNovoStatus(p.status) }} className="!py-1.5 !px-3 text-xs mt-2"><Pencil size={13} /> Status</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Pedido #${editing?.id}`} maxWidth="max-w-sm">
        <Select label="Status do Pedido" value={novoStatus} onChange={setNovoStatus}
          options={Object.entries(PEDIDO_STATUS).map(([value, { label }]) => ({ value, label }))} />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
          <Button onClick={salvarStatus} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </>
  )
}
