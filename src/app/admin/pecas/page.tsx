'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, SearchBar, Button, Modal, Input, Select, Textarea, ConfirmDialog, EmptyState, StatusBadge,
  formatCurrency,
} from '@/components/ui'
import { pecaService } from '@/lib/services'
import type { Peca } from '@/types'
import { CATEGORIAS_PECA } from '@/types'
import { Plus, Package, Pencil, Trash2 } from 'lucide-react'

const emptyForm = { nome: '', descricao: '', categoria: 'acessorios', preco: '', estoque: '', foto_url: '' }

export default function PecasAdminPage() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Peca | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Peca | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setPecas(await pecaService.getTodasPecas())
    setLoading(false)
  }

  function openNew() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(p: Peca) {
    setEditing(p)
    setForm({ nome: p.nome, descricao: p.descricao || '', categoria: p.categoria, preco: String(p.preco), estoque: String(p.estoque), foto_url: p.foto_url || '' })
    setModalOpen(true)
  }

  async function save() {
    if (!form.nome) return
    setSaving(true)
    const payload = {
      nome: form.nome, descricao: form.descricao, categoria: form.categoria,
      preco: Number(form.preco) || 0, estoque: Number(form.estoque) || 0, foto_url: form.foto_url || null, ativo: true,
    }
    if (editing) await pecaService.atualizarPeca(editing.id, payload)
    else await pecaService.criarPeca(payload)
    setSaving(false); setModalOpen(false); load()
  }
  async function confirmDelete() {
    if (toDelete) { await pecaService.deletarPeca(toDelete.id); load() }
  }

  const filtered = pecas.filter((p) => !search || p.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <AdminHeader title="Peças" subtitle={`${pecas.length} peça(s) no catálogo`}
        action={<Button onClick={openNew}><Plus size={16} /> Nova Peça</Button>} />

      <main className="flex-1 p-6 space-y-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar peça..." />
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package size={48} />} title="Nenhuma peça cadastrada" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
                <div className="h-32 bg-[#1a1a1a] flex items-center justify-center">
                  {p.foto_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                    : <Package size={40} style={{ color: '#39FF14' }} className="opacity-40" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white text-sm">{p.nome}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#39FF14' }}>{CATEGORIAS_PECA[p.categoria] || p.categoria}</p>
                    </div>
                    {!p.ativo && <StatusBadge label="Inativa" color="#EF4444" />}
                  </div>
                  <p className="font-bold text-white text-lg mt-2">{formatCurrency(p.preco)}</p>
                  <p className="text-xs text-white/50">{p.estoque} em estoque</p>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                    <Button variant="outline" onClick={() => openEdit(p)} className="!py-1.5 !px-3 text-xs flex-1"><Pencil size={13} /> Editar</Button>
                    <button onClick={() => setToDelete(p)} className="p-2 rounded-lg text-white/50 hover:bg-red-500/20 hover:text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Peça' : 'Nova Peça'} maxWidth="max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Input label="Nome" required value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} /></div>
          <Select label="Categoria" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })}
            options={Object.entries(CATEGORIAS_PECA).map(([value, label]) => ({ value, label }))} />
          <Input label="Preço" type="number" value={form.preco} onChange={(v) => setForm({ ...form, preco: v })} placeholder="0,00" />
          <Input label="Estoque" type="number" value={form.estoque} onChange={(v) => setForm({ ...form, estoque: v })} />
          <Input label="URL da Foto" value={form.foto_url} onChange={(v) => setForm({ ...form, foto_url: v })} placeholder="https://..." />
          <div className="sm:col-span-2"><Textarea label="Descrição" value={form.descricao} onChange={(v) => setForm({ ...form, descricao: v })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Desativar Peça" danger confirmLabel="Desativar" message={`Desativar "${toDelete?.nome}"?`} />
    </>
  )
}
