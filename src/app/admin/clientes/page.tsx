'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  Spinner, SearchBar, Button, Modal, Input, ConfirmDialog, EmptyState,
} from '@/components/ui'
import { clienteService } from '@/lib/services'
import type { Cliente } from '@/types'
import { exportToCSV } from '@/lib/csv'
import { Plus, Users, Phone, Mail, MapPin, Pencil, Trash2, CreditCard, Download } from 'lucide-react'

const emptyForm = {
  nome: '', cpf: '', rg: '', telefone: '', email: '',
  endereco: '', cidade: '', estado: '', cep: '', cnh: '', validade_cnh: '',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Cliente | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setClientes(await clienteService.getClientes())
    setLoading(false)
  }

  function openNew() {
    setEditing(null); setForm(emptyForm); setModalOpen(true)
  }
  function openEdit(c: Cliente) {
    setEditing(c)
    setForm({
      nome: c.nome || '', cpf: c.cpf || '', rg: c.rg || '', telefone: c.telefone || '',
      email: c.email || '', endereco: c.endereco || '', cidade: c.cidade || '',
      estado: c.estado || '', cep: c.cep || '', cnh: c.cnh || '', validade_cnh: c.validade_cnh || '',
    })
    setModalOpen(true)
  }

  async function save() {
    if (!form.nome) return
    setSaving(true)
    const payload = { ...form, validade_cnh: form.validade_cnh || null }
    if (editing) await clienteService.updateCliente(editing.id, payload)
    else await clienteService.createCliente(payload)
    setSaving(false)
    setModalOpen(false)
    load()
  }

  async function confirmDelete() {
    if (toDelete) { await clienteService.deleteCliente(toDelete.id); load() }
  }

  const filtered = clientes.filter((c) =>
    !search ||
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <AdminHeader title="Clientes" subtitle={`${clientes.length} cliente(s) cadastrado(s)`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCSV(filtered, `clientes_${new Date().toISOString().split('T')[0]}`, [
              { key: 'nome', label: 'Nome' }, { key: 'cpf', label: 'CPF' }, { key: 'telefone', label: 'Telefone' },
              { key: 'email', label: 'Email' }, { key: 'cidade', label: 'Cidade' }, { key: 'estado', label: 'Estado' },
            ])}><Download size={15} /> CSV</Button>
            <Button onClick={openNew}><Plus size={16} /> Novo Cliente</Button>
          </div>
        } />

      <main className="flex-1 p-6 space-y-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome, CPF ou email..." />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={48} />} title="Nenhum cliente encontrado" subtitle="Cadastre o primeiro cliente." />
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-[#0d0d0d]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide hidden sm:table-cell">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide hidden md:table-cell">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide hidden lg:table-cell">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide hidden xl:table-cell">Cidade</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((c) => (
                  <tr key={c.id} className="bg-[#111] hover:bg-[#161616] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-black text-xs shrink-0"
                          style={{ backgroundColor: '#39FF14' }}>
                          {(c.nome || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{c.nome || 'Sem nome'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60 hidden sm:table-cell">
                      <span className="flex items-center gap-1.5"><CreditCard size={12} className="shrink-0" />{c.cpf || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60 hidden md:table-cell">
                      <span className="flex items-center gap-1.5"><Phone size={12} className="shrink-0" />{c.telefone || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60 hidden lg:table-cell">
                      <span className="flex items-center gap-1.5"><Mail size={12} className="shrink-0" />{c.email || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60 hidden xl:table-cell">
                      <span className="flex items-center gap-1.5"><MapPin size={12} className="shrink-0" />{c.cidade || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setToDelete(c)} className="p-1.5 rounded-lg text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Cliente' : 'Novo Cliente'} maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Input label="Nome Completo" required value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Nome completo do cliente" /></div>
          <Input label="CPF" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} placeholder="000.000.000-00" />
          <Input label="RG" value={form.rg} onChange={(v) => setForm({ ...form, rg: v })} />
          <Input label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} placeholder="(00) 00000-0000" />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <div className="sm:col-span-2"><Input label="Endereço" value={form.endereco} onChange={(v) => setForm({ ...form, endereco: v })} /></div>
          <Input label="Cidade" value={form.cidade} onChange={(v) => setForm({ ...form, cidade: v })} />
          <Input label="Estado" value={form.estado} onChange={(v) => setForm({ ...form, estado: v })} placeholder="UF" />
          <Input label="CEP" value={form.cep} onChange={(v) => setForm({ ...form, cep: v })} />
          <Input label="CNH" value={form.cnh} onChange={(v) => setForm({ ...form, cnh: v })} />
          <Input label="Validade CNH" type="date" value={form.validade_cnh} onChange={(v) => setForm({ ...form, validade_cnh: v })} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title="Deletar Cliente" danger confirmLabel="Deletar"
        message={`Tem certeza que deseja deletar "${toDelete?.nome}"? Esta ação não pode ser desfeita.`} />
    </>
  )
}
