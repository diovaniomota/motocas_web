'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { solicitacaoService } from '@/lib/services'
import type { Moto } from '@/types'

const G = '#39FF14'

export default function SolicitacaoModal({ moto, onClose }: { moto: Moto; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({
    nome: '', cnh: '', validade_cnh: '', cpf: '', profissao: '', estado_civil: '',
    telefone: '', email: '', cep: '', rua: '', numero: '', bairro: '', complemento: '',
    cidade: '', estado: '', data_retirada: '', data_devolucao: '', observacoes: '',
  })

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await solicitacaoService.criarSolicitacao({
        moto_nome: moto.nomemoto || `Moto #${moto.id}`, moto_id: moto.id,
        nome_completo: f.nome, telefone: f.telefone, email: f.email,
        cnh: f.cnh, validade_cnh: f.validade_cnh || null, cpf: f.cpf,
        profissao: f.profissao, estado_civil: f.estado_civil,
        cep: f.cep, rua: f.rua, numero: f.numero, bairro: f.bairro, complemento: f.complemento,
        cidade: f.cidade, estado: f.estado,
        data_retirada: f.data_retirada, data_devolucao: f.data_devolucao,
        observacoes: f.observacoes, status: 'pendente',
      })
      if (!res) throw new Error()
      setDone(true)
    } catch {
      setError('Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#111] rounded-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="font-bold text-lg text-white">Solicitar Aluguel</h3>
            <p className="text-sm" style={{ color: G }}>{moto.nomemoto} {moto.anomoto}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white"><X size={20} /></button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <CheckCircle2 size={56} className="mx-auto mb-4" style={{ color: G }} />
            <p className="text-white font-bold text-xl">Solicitação enviada!</p>
            <p className="text-white/60 text-sm mt-2">Entraremos em contato em breve pelo telefone ou email informado.</p>
            <button onClick={onClose} className="mt-6 px-8 py-3 rounded-xl font-bold text-black" style={{ backgroundColor: G }}>Fechar</button>
          </div>
        ) : (
          <form onSubmit={submit} className="overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="sm:col-span-2" label="Nome completo *" value={f.nome} onChange={set('nome')} required />
              <Field label="CNH *" value={f.cnh} onChange={set('cnh')} required />
              <Field label="Validade CNH *" type="date" value={f.validade_cnh} onChange={set('validade_cnh')} required />
              <Field label="CPF *" value={f.cpf} onChange={set('cpf')} required />
              <Field label="Profissão *" value={f.profissao} onChange={set('profissao')} required />
              <Field label="Estado civil *" value={f.estado_civil} onChange={set('estado_civil')} required />
              <Field label="Telefone *" value={f.telefone} onChange={set('telefone')} required />
              <Field className="sm:col-span-2" label="Email *" type="email" value={f.email} onChange={set('email')} required />
              <Field label="CEP *" value={f.cep} onChange={set('cep')} required />
              <Field label="Rua *" value={f.rua} onChange={set('rua')} required />
              <Field label="Número *" value={f.numero} onChange={set('numero')} required />
              <Field label="Bairro *" value={f.bairro} onChange={set('bairro')} required />
              <Field label="Cidade *" value={f.cidade} onChange={set('cidade')} required />
              <Field label="UF *" value={f.estado} onChange={set('estado')} required />
              <Field className="sm:col-span-2" label="Complemento" value={f.complemento} onChange={set('complemento')} />
              <Field label="Data retirada *" type="date" value={f.data_retirada} onChange={set('data_retirada')} required />
              <Field label="Data devolução *" type="date" value={f.data_devolucao} onChange={set('data_devolucao')} required />
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1.5">Observações</label>
                <textarea value={f.observacoes} onChange={set('observacoes')} rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 resize-none"
                  style={{ ['--tw-ring-color' as string]: G }} />
              </div>
            </div>

            {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-white/20 text-white text-sm font-semibold hover:bg-white/5">Cancelar</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg font-bold text-sm text-black flex items-center gap-2 disabled:opacity-60" style={{ backgroundColor: G }}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, className }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} required={required}
        className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: '#39FF14' }} />
    </div>
  )
}
