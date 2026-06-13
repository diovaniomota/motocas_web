'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, Button, Modal, Input, Select, Textarea, ConfirmDialog, EmptyState, StatusBadge,
  formatCurrency, formatDate,
} from '@/components/ui'
import { infracaoService, motoService } from '@/lib/services'
import type { Infracao, Moto } from '@/types'
import { INFRACAO_STATUS } from '@/types'
import { Plus, AlertTriangle, Trash2, DollarSign } from 'lucide-react'

export default function InfracoesPage() {
  const [items, setItems] = useState<Infracao[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Infracao | null>(null)
  const [form, setForm] = useState({
    moto_id: '', tipo_infracao: '', descricao: '', numero_auto: '', valor_multa: '', status: 'pendente', data_infracao: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [i, m] = await Promise.all([infracaoService.getInfracoes(), motoService.getMotos()])
    setItems(i); setMotos(m); setLoading(false)
  }

  function openNew() {
    setForm({ moto_id: '', tipo_infracao: '', descricao: '', numero_auto: '', valor_multa: '', status: 'pendente', data_infracao: '' })
    setModalOpen(true)
  }

  async function save() {
    if (!form.moto_id || !form.tipo_infracao) return
    setSaving(true)
    const moto = motos.find((m) => m.id === Number(form.moto_id))
    await infracaoService.createInfracao({
      moto_id: Number(form.moto_id), moto_nome: moto?.nomemoto,
      tipo_infracao: form.tipo_infracao, descricao: form.descricao, numero_auto: form.numero_auto,
      valor_multa: Number(form.valor_multa) || 0, status: form.status, data_infracao: form.data_infracao || null,
    })
    setSaving(false); setModalOpen(false); load()
  }

  async function marcarPaga(i: Infracao) {
    await infracaoService.updateInfracao(i.id, { status: 'paga', data_pagamento: new Date().toISOString().split('T')[0] }); load()
  }
  async function confirmDelete() {
    if (toDelete) { await infracaoService.deleteInfracao(toDelete.id); load() }
  }

  return (
    <>
      <AdminHeader title="Infrações" subtitle={`${items.length} infração(ões)`}
        action={<Button onClick={openNew}><Plus size={16} /> Nova Infração</Button>} />

      <main className="flex-1 p-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<AlertTriangle size={48} />} title="Nenhuma infração registrada" />
        ) : (
          <div className="space-y-4">
            {items.map((i) => {
              const st = INFRACAO_STATUS[i.status] || { label: i.status, color: '#6B7280' }
              return (
                <div key={i.id} className="rounded-xl border border-white/10 bg-[#111] p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">{i.tipo_infracao}</p>
                        <StatusBadge label={st.label} color={st.color} />
                      </div>
                      <p className="text-sm text-white/60 mt-1">{i.moto_nome} {i.numero_auto ? `· Auto ${i.numero_auto}` : ''}</p>
                      {i.descricao && <p className="text-sm text-white/50 mt-1">{i.descricao}</p>}
                      <p className="text-xs text-white/40 mt-1">{formatDate(i.data_infracao)}</p>
                    </div>
                    <p className="text-xl font-bold" style={{ color: '#F59E0B' }}>{formatCurrency(i.valor_multa)}</p>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                    {i.status === 'pendente' && <Button variant="outline" onClick={() => marcarPaga(i)} className="!py-1.5 !px-3 text-xs"><DollarSign size={14} /> Marcar como Paga</Button>}
                    <Button variant="ghost" onClick={() => setToDelete(i)} className="!py-1.5 !px-3 text-xs text-red-400"><Trash2 size={14} /> Excluir</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Infração" maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Moto" required value={form.moto_id} onChange={(v) => setForm({ ...form, moto_id: v })}
            options={[{ value: '', label: 'Selecione...' }, ...motos.map((m) => ({ value: String(m.id), label: `${m.nomemoto || 'Moto'} ${m.placamoto || ''}` }))]} />
          <Input label="Tipo de Infração" required value={form.tipo_infracao} onChange={(v) => setForm({ ...form, tipo_infracao: v })} placeholder="Ex: Excesso de velocidade" />
          <Input label="Número do Auto" value={form.numero_auto} onChange={(v) => setForm({ ...form, numero_auto: v })} />
          <Input label="Valor da Multa" type="number" value={form.valor_multa} onChange={(v) => setForm({ ...form, valor_multa: v })} placeholder="0,00" />
          <Input label="Data da Infração" type="date" value={form.data_infracao} onChange={(v) => setForm({ ...form, data_infracao: v })} />
          <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
            options={[{ value: 'pendente', label: 'Pendente' }, { value: 'paga', label: 'Paga' }, { value: 'contestada', label: 'Contestada' }, { value: 'absorvida', label: 'Absorvida' }]} />
          <div className="sm:col-span-2"><Textarea label="Descrição" value={form.descricao} onChange={(v) => setForm({ ...form, descricao: v })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Registrar</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Excluir Infração" danger confirmLabel="Excluir" message="Deseja excluir esta infração?" />
    </>
  )
}
