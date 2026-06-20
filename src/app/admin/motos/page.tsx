'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, SearchBar, Button, Modal, Input, ConfirmDialog, EmptyState, StatusBadge,
} from '@/components/ui'
import { motoService } from '@/lib/services'
import { supabase } from '@/lib/supabase'
import MotoQRModal from '@/components/admin/MotoQRModal'
import type { Moto } from '@/types'
import { Plus, Bike, Pencil, Trash2, Upload, Loader2, QrCode, Search } from 'lucide-react'

const emptyForm = {
  nomemoto: '', placamoto: '', anomoto: '', cormoto: '', kmatualmoto: '', renavanmoto: '', foto_url: '',
}

export default function MotosPage() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Moto | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [consultaErro, setConsultaErro] = useState('')
  const [toDelete, setToDelete] = useState<Moto | null>(null)
  const [qrMoto, setQrMoto] = useState<Moto | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setMotos(await motoService.getMotos())
    setLoading(false)
  }

  function openNew() { setEditing(null); setForm(emptyForm); setSaveError(''); setConsultaErro(''); setModalOpen(true) }
  function openEdit(m: Moto) {
    setEditing(m)
    setSaveError('')
    setConsultaErro('')
    setForm({
      nomemoto: m.nomemoto || '', placamoto: m.placamoto || '', anomoto: m.anomoto || '',
      cormoto: m.cormoto || '', kmatualmoto: m.kmatualmoto || '', renavanmoto: m.renavanmoto || '', foto_url: m.foto_url || '',
    })
    setModalOpen(true)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('motos').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('motos').getPublicUrl(path)
      setForm((f) => ({ ...f, foto_url: data.publicUrl }))
    } catch {
      alert('Erro ao enviar imagem. Verifique se o bucket "motos" existe no Supabase Storage.')
    } finally {
      setUploading(false)
    }
  }

  async function consultarPlaca() {
    const placa = form.placamoto.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (placa.length !== 7) { setConsultaErro('Placa deve ter 7 caracteres.'); return }
    setConsultando(true)
    setConsultaErro('')
    try {
      const token = process.env.NEXT_PUBLIC_WDAPI_TOKEN
      const res = await fetch(`https://wdapi2.com.br/consulta/${placa}/${token}`)
      const data = await res.json()
      if (data.error || data.erro) throw new Error('Placa não encontrada na base de dados.')
      const anoFormatado = data.anoModelo && data.ano ? `${data.ano}/${data.anoModelo}` : (data.ano || data.anoModelo || '')
      setForm((f) => ({
        ...f,
        nomemoto: f.nomemoto || `${data.marca || ''} ${data.modelo || ''}`.trim(),
        cormoto: f.cormoto || (data.cor || ''),
        anomoto: f.anomoto || anoFormatado,
        renavanmoto: f.renavanmoto || (data.renavam || ''),
      }))
    } catch (e) {
      setConsultaErro((e as Error).message || 'Erro ao consultar placa.')
    } finally {
      setConsultando(false)
    }
  }

  async function save() {
    if (!form.nomemoto) return
    setSaving(true)
    setSaveError('')
    try {
      if (editing) {
        const ok = await motoService.updateMoto(editing.id, form)
        if (!ok) throw new Error('Não foi possível salvar. Verifique sua conexão e tente novamente.')
      } else {
        await motoService.createMoto({ ...form, estado_id: 1 })
      }
      setModalOpen(false)
      load()
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (toDelete) { await motoService.deleteMoto(toDelete.id); load() }
  }

  const filtered = motos.filter((m) =>
    !search || m.nomemoto?.toLowerCase().includes(search.toLowerCase()) || m.placamoto?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <AdminHeader title="Motos" subtitle={`${motos.length} moto(s) na frota`}
        action={<Button onClick={openNew}><Plus size={16} /> Nova Moto</Button>} />

      <main className="flex-1 p-6 space-y-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome ou placa..." />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Bike size={48} />} title="Nenhuma moto encontrada" subtitle="Cadastre a primeira moto da frota." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => {
              const disponivel = m.id_cliente == null
              return (
                <div key={m.id} className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
                  <div className="h-40 bg-[#1a1a1a] relative flex items-center justify-center">
                    {m.foto_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.foto_url} alt={m.nomemoto || ''} className="w-full h-full object-cover" />
                      : <Bike size={56} style={{ color: '#39FF14' }} className="opacity-40" />}
                    <div className="absolute top-3 left-3">
                      <StatusBadge label={disponivel ? 'Disponível' : 'Alugada'} color={disponivel ? '#22C55E' : '#F59E0B'} />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-white">{m.nomemoto} {m.anomoto}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#39FF14' }}>{m.placamoto || 'Sem placa'} · {m.cormoto || '-'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setQrMoto(m)} title="Gerar QR Code" className="p-2 rounded-lg text-white/50 hover:bg-white/10 hover:text-[#39FF14]"><QrCode size={15} /></button>
                        <button onClick={() => openEdit(m)} className="p-2 rounded-lg text-white/50 hover:bg-white/10 hover:text-white"><Pencil size={15} /></button>
                        <button onClick={() => setToDelete(m)} className="p-2 rounded-lg text-white/50 hover:bg-red-500/20 hover:text-red-400"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-xs">
                      <div><span className="text-white/40">KM:</span> <span className="text-white/80">{m.kmatualmoto || '-'}</span></div>
                      <div><span className="text-white/40">Renavam:</span> <span className="text-white/80">{m.renavanmoto || '-'}</span></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Moto' : 'Nova Moto'} maxWidth="max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Input label="Nome da Moto" required value={form.nomemoto} onChange={(v) => setForm({ ...form, nomemoto: v })} placeholder="Ex: Honda CG 160" /></div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Placa</label>
            <div className="flex gap-2">
              <Input label="" value={form.placamoto}
                onChange={(v) => { setForm({ ...form, placamoto: v }); setConsultaErro('') }}
                placeholder="ABC-1234" />
              <button type="button" onClick={consultarPlaca} disabled={consultando}
                title="Consultar dados do veículo pela placa"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-sm border border-white/20 text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: '#39FF1440' }}>
                {consultando ? <Loader2 size={16} className="animate-spin" style={{ color: '#39FF14' }} /> : <Bike size={16} style={{ color: '#39FF14' }} />}
                {consultando ? '' : 'Consultar'}
              </button>
            </div>
            {consultaErro && <p className="text-xs text-red-400 mt-1">{consultaErro}</p>}
          </div>
          <Input label="Ano" value={form.anomoto} onChange={(v) => setForm({ ...form, anomoto: v })} />
          <Input label="Cor" value={form.cormoto} onChange={(v) => setForm({ ...form, cormoto: v })} />
          <Input label="KM Atual" value={form.kmatualmoto} onChange={(v) => setForm({ ...form, kmatualmoto: v })} />
          <Input label="Renavam" value={form.renavanmoto} onChange={(v) => setForm({ ...form, renavanmoto: v })} />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-1.5">Foto da Moto</label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <Input label="" value={form.foto_url} onChange={(v) => setForm({ ...form, foto_url: v })} placeholder="URL da imagem ou use o botão de upload" />
              </div>
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm cursor-pointer border border-white/20 text-white hover:bg-white/5 transition-colors mt-0 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'Enviando...' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
            {form.foto_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.foto_url} alt="Preview" className="mt-2 h-24 w-auto rounded-lg object-cover border border-white/10" />
            )}
          </div>
        </div>
        {saveError && <p className="text-sm text-red-400 mt-2">{saveError}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Deletar Moto" danger confirmLabel="Deletar"
        message={`Tem certeza que deseja deletar "${toDelete?.nomemoto}"?`} />

      <MotoQRModal moto={qrMoto} onClose={() => setQrMoto(null)} />
    </>
  )
}
