'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { solicitacaoService } from '@/lib/services'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { formatDate } from '@/components/ui'
import type { Moto } from '@/types'

const G = '#39FF14'

/* ── Máscaras ──
   Guardamos no formulário o valor formatado (o usuário vê a máscara), mas
   gravamos só os dígitos no banco, mantendo o formato dos registros antigos
   e evitando lixo digitado — foi um apóstrofo colado no telefone que já
   quebrou um envio de WhatsApp. */
const digits = (v: string) => v.replace(/\D/g, '')

function maskCpf(v: string): string {
  const d = digits(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function maskPhone(v: string): string {
  const d = digits(v).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  // 10 dígitos = fixo (4+4), 11 = celular (5+4)
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCep(v: string): string {
  const d = digits(v).slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

const maskCnh = (v: string) => digits(v).slice(0, 11)
const maskUf = (v: string) => v.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2)

export default function SolicitacaoModal({ moto, onClose }: { moto: Moto; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({
    nome: '', cnh: '', validade_cnh: '', cpf: '', profissao: '', estado_civil: '',
    telefone: '', email: '', cep: '', rua: '', numero: '', bairro: '', complemento: '',
    cidade: '', estado: '', data_retirada: '', data_devolucao: '', observacoes: '',
  })

  const set = (k: keyof typeof f, mask?: (v: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: mask ? mask(e.target.value) : e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // um telefone incompleto significa cliente sem nenhuma notificação de WhatsApp
    const tel = digits(f.telefone)
    if (tel.length < 10 || tel.length > 11) { setError('Telefone incompleto. Informe DDD + número.'); return }
    if (digits(f.cpf).length !== 11) { setError('CPF incompleto.'); return }
    if (digits(f.cep).length !== 8) { setError('CEP incompleto.'); return }

    setSaving(true)
    try {
      const res = await solicitacaoService.criarSolicitacao({
        moto_nome: moto.nomemoto || `Moto #${moto.id}`, moto_id: moto.id,
        nome_completo: f.nome, telefone: tel, email: f.email,
        cnh: digits(f.cnh), validade_cnh: f.validade_cnh || null, cpf: digits(f.cpf),
        profissao: f.profissao, estado_civil: f.estado_civil,
        cep: digits(f.cep), rua: f.rua, numero: f.numero, bairro: f.bairro, complemento: f.complemento,
        cidade: f.cidade, estado: f.estado,
        data_retirada: f.data_retirada, data_devolucao: f.data_devolucao,
        observacoes: f.observacoes, status: 'pendente',
      })
      if (!res) throw new Error()
      void sendWhatsAppNotification('template_solicitacao_recebida', res.telefone, {
        nome: res.nome_completo,
        moto: res.moto_nome,
        data_retirada: formatDate(res.data_retirada),
        data_devolucao: formatDate(res.data_devolucao),
      }, { alsoNotifyAdmin: true })
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
              <Field label="CNH *" value={f.cnh} onChange={set('cnh', maskCnh)} inputMode="numeric" placeholder="00000000000" required />
              <Field label="Validade CNH *" type="date" value={f.validade_cnh} onChange={set('validade_cnh')} required />
              <Field label="CPF *" value={f.cpf} onChange={set('cpf', maskCpf)} inputMode="numeric" placeholder="000.000.000-00" required />
              <Field label="Profissão *" value={f.profissao} onChange={set('profissao')} required />
              <Field label="Estado civil *" value={f.estado_civil} onChange={set('estado_civil')} required />
              <Field label="Telefone *" value={f.telefone} onChange={set('telefone', maskPhone)} inputMode="tel" placeholder="(00) 00000-0000" required />
              <Field className="sm:col-span-2" label="Email *" type="email" value={f.email} onChange={set('email')} required />
              <Field label="CEP *" value={f.cep} onChange={set('cep', maskCep)} inputMode="numeric" placeholder="00000-000" required />
              <Field label="Rua *" value={f.rua} onChange={set('rua')} required />
              <Field label="Número *" value={f.numero} onChange={set('numero')} required />
              <Field label="Bairro *" value={f.bairro} onChange={set('bairro')} required />
              <Field label="Cidade *" value={f.cidade} onChange={set('cidade')} required />
              <Field label="UF *" value={f.estado} onChange={set('estado', maskUf)} placeholder="SC" required />
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

function Field({ label, value, onChange, type = 'text', required, className, placeholder, inputMode }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  required?: boolean
  className?: string
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} required={required}
        placeholder={placeholder} inputMode={inputMode}
        className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: '#39FF14' }} />
    </div>
  )
}
