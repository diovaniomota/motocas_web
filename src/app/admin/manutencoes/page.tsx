'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, Button, Modal, Input, Select, Textarea, ConfirmDialog, EmptyState, StatusBadge,
  formatCurrency, formatDate,
} from '@/components/ui'
import { manutencaoService, motoService } from '@/lib/services'
import type { Manutencao, Moto } from '@/types'
import { MANUTENCAO_STATUS } from '@/types'
import { Plus, Wrench, Trash2, Play, CheckCircle2 } from 'lucide-react'

export default function ManutencoesPage() {
  const [items, setItems] = useState<Manutencao[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Manutencao | null>(null)
  const [form, setForm] = useState({
    moto_id: '', tipo_manutencao: 'preventiva', descricao: '', valor_orcado: '',
    oficina: '', responsavel: '', data_inicio: '', data_previsao_termino: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [m, mt] = await Promise.all([manutencaoService.getManutencoes(), motoService.getMotos()])
    setItems(m); setMotos(mt); setLoading(false)
  }

  function openNew() {
    setForm({ moto_id: '', tipo_manutencao: 'preventiva', descricao: '', valor_orcado: '', oficina: '', responsavel: '', data_inicio: '', data_previsao_termino: '' })
    setModalOpen(true)
  }

  async function save() {
    if (!form.moto_id || !form.descricao) return
    setSaving(true)
    const moto = motos.find((m) => m.id === Number(form.moto_id))
    const valor = Number(form.valor_orcado) || 0
    await manutencaoService.createManutencao({
      moto_id: Number(form.moto_id), moto_nome: moto?.nomemoto,
      tipo_manutencao: form.tipo_manutencao, descricao: form.descricao,
      valor_orcado: valor, valor_final: valor, oficina: form.oficina, responsavel: form.responsavel,
      status: 'agendada', data_inicio: form.data_inicio || null, data_previsao_termino: form.data_previsao_termino || null,
    })
    setSaving(false); setModalOpen(false); load()
  }

  async function iniciar(m: Manutencao) {
    await manutencaoService.updateManutencao(m.id, { status: 'em_andamento' }); load()
  }
  async function concluir(m: Manutencao) {
    await manutencaoService.updateManutencao(m.id, { status: 'concluida', data_fim: new Date().toISOString().split('T')[0] }); load()
  }
  async function confirmDelete() {
    if (toDelete) { await manutencaoService.deleteManutencao(toDelete.id); load() }
  }

  const tipoLabel: Record<string, string> = { preventiva: 'Preventiva', corretiva: 'Corretiva', revisao: 'Revisão' }

  return (
    <>
      <AdminHeader title="Manutenções" subtitle={`${items.length} registro(s)`}
        action={<Button onClick={openNew}><Plus size={16} /> Nova Manutenção</Button>} />

      <main className="flex-1 p-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Wrench size={48} />} title="Nenhuma manutenção registrada" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((m) => {
              const st = MANUTENCAO_STATUS[m.status] || { label: m.status, color: '#6B7280' }
              return (
                <div key={m.id} className="rounded-xl border border-white/10 bg-[#111] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">{m.moto_nome || 'Moto'}</p>
                        <StatusBadge label={st.label} color={st.color} />
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#39FF14' }}>{tipoLabel[m.tipo_manutencao || ''] || m.tipo_manutencao}</p>
                      <p className="text-sm text-white/60 mt-2">{m.descricao}</p>
                    </div>
                    <p className="font-bold text-white whitespace-nowrap">{formatCurrency(m.valor_orcado)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-white/50">
                    <div>Oficina: <span className="text-white/80">{m.oficina || '-'}</span></div>
                    <div>Responsável: <span className="text-white/80">{m.responsavel || '-'}</span></div>
                    <div>Início: <span className="text-white/80">{formatDate(m.data_inicio)}</span></div>
                    <div>Previsão: <span className="text-white/80">{formatDate(m.data_previsao_termino)}</span></div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5 flex-wrap">
                    {m.status === 'agendada' && <Button variant="outline" onClick={() => iniciar(m)} className="!py-1.5 !px-3 text-xs"><Play size={14} /> Iniciar</Button>}
                    {m.status === 'em_andamento' && <Button variant="outline" onClick={() => concluir(m)} className="!py-1.5 !px-3 text-xs"><CheckCircle2 size={14} /> Concluir</Button>}
                    <Button variant="ghost" onClick={() => setToDelete(m)} className="!py-1.5 !px-3 text-xs text-red-400"><Trash2 size={14} /> Excluir</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Manutenção" maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Moto" required value={form.moto_id} onChange={(v) => setForm({ ...form, moto_id: v })}
            options={[{ value: '', label: 'Selecione...' }, ...motos.map((m) => ({ value: String(m.id), label: `${m.nomemoto || 'Moto'} ${m.placamoto || ''}` }))]} />
          <Select label="Tipo" value={form.tipo_manutencao} onChange={(v) => setForm({ ...form, tipo_manutencao: v })}
            options={[{ value: 'preventiva', label: 'Preventiva' }, { value: 'corretiva', label: 'Corretiva' }, { value: 'revisao', label: 'Revisão' }]} />
          <div className="sm:col-span-2"><Textarea label="Descrição" required value={form.descricao} onChange={(v) => setForm({ ...form, descricao: v })} /></div>
          <Input label="Valor Orçado" type="number" value={form.valor_orcado} onChange={(v) => setForm({ ...form, valor_orcado: v })} placeholder="0,00" />
          <Input label="Oficina" value={form.oficina} onChange={(v) => setForm({ ...form, oficina: v })} />
          <Input label="Responsável" value={form.responsavel} onChange={(v) => setForm({ ...form, responsavel: v })} />
          <Input label="Data Início" type="date" value={form.data_inicio} onChange={(v) => setForm({ ...form, data_inicio: v })} />
          <Input label="Previsão Término" type="date" value={form.data_previsao_termino} onChange={(v) => setForm({ ...form, data_previsao_termino: v })} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Criar</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Excluir Manutenção" danger confirmLabel="Excluir" message="Deseja excluir este registro de manutenção?" />
    </>
  )
}
