'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, Button, Modal, Input, Select, Textarea, ConfirmDialog, EmptyState, StatusBadge, formatDate,
} from '@/components/ui'
import { checklistService, motoService } from '@/lib/services'
import type { Checklist, Moto } from '@/types'
import { CHECKLIST_ITENS } from '@/types'
import { Plus, ClipboardCheck, Trash2, Check, X } from 'lucide-react'

type ItemKey = (typeof CHECKLIST_ITENS)[number]['key']

export default function ChecklistsPage() {
  const [items, setItems] = useState<Checklist[]>([])
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Checklist | null>(null)
  const [base, setBase] = useState({ moto_id: '', tipo: 'entrada', km_atual: '', responsavel: '', observacoes: '' })
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [c, m] = await Promise.all([checklistService.getChecklists(), motoService.getMotos()])
    setItems(c); setMotos(m); setLoading(false)
  }

  function openNew() {
    setBase({ moto_id: '', tipo: 'entrada', km_atual: '', responsavel: '', observacoes: '' })
    const init: Record<string, boolean> = {}
    CHECKLIST_ITENS.forEach((i) => { init[i.key] = true })
    setChecks(init)
    setModalOpen(true)
  }

  async function save() {
    if (!base.moto_id) return
    setSaving(true)
    const moto = motos.find((m) => m.id === Number(base.moto_id))
    await checklistService.createChecklist({
      moto_id: Number(base.moto_id), moto_nome: moto?.nomemoto, tipo: base.tipo,
      data_checklist: new Date().toISOString().split('T')[0],
      km_atual: Number(base.km_atual) || 0, responsavel: base.responsavel, observacoes: base.observacoes,
      ...checks,
    })
    setSaving(false); setModalOpen(false); load()
  }
  async function confirmDelete() {
    if (toDelete) { await checklistService.deleteChecklist(toDelete.id); load() }
  }

  function itensOk(c: Checklist) {
    return CHECKLIST_ITENS.filter((i) => c[i.key as ItemKey] === true).length
  }

  return (
    <>
      <AdminHeader title="Checklists" subtitle={`${items.length} checklist(s)`}
        action={<Button onClick={openNew}><Plus size={16} /> Novo Checklist</Button>} />

      <main className="flex-1 p-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<ClipboardCheck size={48} />} title="Nenhum checklist registrado" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((c) => {
              const ok = itensOk(c)
              const tudoOk = ok === CHECKLIST_ITENS.length
              return (
                <div key={c.id} className="rounded-xl border border-white/10 bg-[#111] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white">{c.moto_nome || 'Moto'}</p>
                        <StatusBadge label={c.tipo === 'entrada' ? 'Entrada' : c.tipo === 'saida' ? 'Saída' : 'Rotina'} color="#3B82F6" />
                      </div>
                      <p className="text-xs text-white/40 mt-1">{formatDate(c.data_checklist)} · KM {c.km_atual ?? '-'} · {c.responsavel || 'Sem responsável'}</p>
                    </div>
                    <StatusBadge label={`${ok}/${CHECKLIST_ITENS.length} OK`} color={tudoOk ? '#22C55E' : '#F59E0B'} />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-white/5">
                    {CHECKLIST_ITENS.map((i) => {
                      const v = c[i.key as ItemKey] === true
                      return (
                        <div key={i.key} className="flex items-center gap-1.5 text-xs">
                          {v ? <Check size={13} className="text-green-400" /> : <X size={13} className="text-red-400" />}
                          <span className="text-white/70">{i.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button variant="ghost" onClick={() => setToDelete(c)} className="!py-1.5 !px-3 text-xs text-red-400"><Trash2 size={14} /> Excluir</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Checklist" maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Select label="Moto" required value={base.moto_id} onChange={(v) => setBase({ ...base, moto_id: v })}
            options={[{ value: '', label: 'Selecione...' }, ...motos.map((m) => ({ value: String(m.id), label: `${m.nomemoto || 'Moto'} ${m.placamoto || ''}` }))]} />
          <Select label="Tipo" value={base.tipo} onChange={(v) => setBase({ ...base, tipo: v })}
            options={[{ value: 'entrada', label: 'Entrada' }, { value: 'saida', label: 'Saída' }, { value: 'rotina', label: 'Rotina' }]} />
          <Input label="KM Atual" type="number" value={base.km_atual} onChange={(v) => setBase({ ...base, km_atual: v })} />
          <Input label="Responsável" value={base.responsavel} onChange={(v) => setBase({ ...base, responsavel: v })} />
        </div>
        <p className="text-sm font-medium text-white/80 mb-2">Itens do Checklist</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {CHECKLIST_ITENS.map((i) => (
            <button key={i.key} type="button" onClick={() => setChecks({ ...checks, [i.key]: !checks[i.key] })}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors"
              style={checks[i.key]
                ? { backgroundColor: '#39FF1422', borderColor: '#39FF14', color: '#fff' }
                : { backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              {checks[i.key] ? <Check size={15} className="text-green-400" /> : <X size={15} className="text-red-400" />}
              {i.label}
            </button>
          ))}
        </div>
        <Textarea label="Observações" value={base.observacoes} onChange={(v) => setBase({ ...base, observacoes: v })} />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar Checklist</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Excluir Checklist" danger confirmLabel="Excluir" message="Deseja excluir este checklist?" />
    </>
  )
}
