'use client'

// Edição de solicitação.
//
// Não existia. Um dado errado no cadastro travava a operação sem conserto pela
// interface: um CPF com 17 dígitos, digitado antes das máscaras, impedia gerar
// cobrança e a única saída tinha sido abrir um campo dentro do modal de
// pagamento. Aqui dá para corrigir qualquer campo, com as mesmas máscaras do
// formulário público e registro do que mudou.

import { useState } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import { solicitacaoService } from '@/lib/services'
import { registrarEvento } from '@/lib/eventos'
import {
  digitos, maskCpf, maskPhone, maskCep, maskCnh, maskUf, cpfValido, telefoneValido,
} from '@/lib/mascaras'
import type { SolicitacaoAluguel } from '@/types'
import { Loader2, Save } from 'lucide-react'

/** Campos editáveis e como cada um é tratado na exibição e na gravação. */
const CAMPOS = [
  { key: 'nome_completo', label: 'Nome completo', larga: true },
  { key: 'telefone', label: 'Telefone', mask: maskPhone, crua: true },
  { key: 'email', label: 'E-mail', larga: true },
  { key: 'cpf', label: 'CPF', mask: maskCpf, crua: true },
  { key: 'rg', label: 'RG' },
  { key: 'cnh', label: 'CNH', mask: maskCnh, crua: true },
  { key: 'profissao', label: 'Profissão' },
  { key: 'estado_civil', label: 'Estado civil' },
  { key: 'cep', label: 'CEP', mask: maskCep, crua: true },
  { key: 'rua', label: 'Rua', larga: true },
  { key: 'numero', label: 'Número' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'UF', mask: maskUf },
  { key: 'complemento', label: 'Complemento', larga: true },
] as const

type Chave = typeof CAMPOS[number]['key']

export default function EditarSolicitacao({
  solicitacao, onClose, onSalvo,
}: {
  solicitacao: SolicitacaoAluguel
  onClose: () => void
  onSalvo: () => void
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const c of CAMPOS) {
      const valor = String((solicitacao as unknown as Record<string, unknown>)[c.key] ?? '')
      inicial[c.key] = 'mask' in c && c.mask ? c.mask(valor) : valor
    }
    return inicial
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k: Chave, mask?: (v: string) => string) => (v: string) =>
    setForm((f) => ({ ...f, [k]: mask ? mask(v) : v }))

  async function salvar() {
    setErro('')
    if (!form.nome_completo.trim()) { setErro('O nome não pode ficar vazio.'); return }
    if (form.cpf && !cpfValido(form.cpf)) { setErro('CPF inválido — confira os números.'); return }
    if (!telefoneValido(form.telefone)) { setErro('Telefone incompleto. Informe DDD + número.'); return }

    // grava dígitos puros nos campos mascarados, mantendo o formato do banco
    const atualizacao: Record<string, string | null> = {}
    for (const c of CAMPOS) {
      const bruto = form[c.key] ?? ''
      atualizacao[c.key] = ('crua' in c && c.crua) ? (digitos(bruto) || null) : (bruto.trim() || null)
    }

    // só o que realmente mudou, para o histórico não virar ruído
    const mudancas: Record<string, { de: unknown; para: unknown }> = {}
    for (const [k, v] of Object.entries(atualizacao)) {
      const antes = (solicitacao as unknown as Record<string, unknown>)[k] ?? null
      if (String(antes ?? '') !== String(v ?? '')) mudancas[k] = { de: antes, para: v }
    }

    if (Object.keys(mudancas).length === 0) { onClose(); return }

    setSalvando(true)
    try {
      const ok = await solicitacaoService.atualizarStatus(solicitacao.id!, atualizacao)
      if (!ok) { setErro('Não foi possível salvar.'); return }

      await registrarEvento({
        tabela: 'solicitacoes_aluguel', registroId: solicitacao.id!, acao: 'editou',
        descricao: `Editou ${Object.keys(mudancas).length} campo(s): ${Object.keys(mudancas).join(', ')}`,
        dados: mudancas,
      })
      onSalvo()
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open onClose={() => !salvando && onClose()} title="Editar solicitação" maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CAMPOS.map((c) => (
          <div key={c.key} className={'larga' in c && c.larga ? 'sm:col-span-2' : ''}>
            <Input
              label={c.label}
              value={form[c.key] ?? ''}
              onChange={set(c.key, 'mask' in c ? c.mask : undefined)}
              inputMode={'crua' in c && c.crua ? 'numeric' : undefined}
            />
          </div>
        ))}
      </div>

      {erro && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg mt-4">{erro}</p>}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button variant="primary" onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar alterações
        </Button>
      </div>
    </Modal>
  )
}
