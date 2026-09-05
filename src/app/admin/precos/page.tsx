'use client'

// Tabela de preços da locação.
//
// A tabela `alugueis` já vinha preenchida (Diária 60, Fim de Semana 180,
// Semanal 400, Mensal 1200) e nenhuma tela lia nem escrevia nela — todo valor
// de cobrança era digitado à mão. Esta é a tela que faltava para mexer no
// preço sem abrir o banco.

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { Spinner, Button, Modal, Input, ConfirmDialog, EmptyState, formatCurrency } from '@/components/ui'
import { precoService } from '@/lib/services'
import { registrarEvento } from '@/lib/eventos'
import { maskMoeda, moedaParaNumero } from '@/lib/mascaras'
import type { TipoAluguel } from '@/types'
import { Plus, Tag, Pencil, Trash2, Loader2 } from 'lucide-react'

const G = '#39FF14'

export default function PrecosPage() {
  const [tipos, setTipos] = useState<TipoAluguel[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<TipoAluguel | null>(null)
  const [novo, setNovo] = useState(false)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [aRemover, setARemover] = useState<TipoAluguel | null>(null)

  useEffect(() => {
    void (async () => {
      try { setTipos(await precoService.getTipos()) } finally { setLoading(false) }
    })()
  }, [])

  async function recarregar() {
    setTipos(await precoService.getTipos())
  }

  function abrirNovo() {
    setNome(''); setValor(''); setEditando(null); setNovo(true)
  }

  function abrirEdicao(t: TipoAluguel) {
    setNome(t.tipo_aluguel ?? '')
    setValor(maskMoeda(String(Math.round(Number(t.valor_aluguel || 0) * 100))))
    setNovo(false); setEditando(t)
  }

  async function salvar() {
    const numero = moedaParaNumero(valor)
    if (!nome.trim()) { alert('Informe o nome do pacote.'); return }
    if (numero <= 0) { alert('Informe um valor maior que zero.'); return }

    setSalvando(true)
    try {
      // o banco guarda como TEXT; mantenho o formato simples que já estava lá
      const ok = await precoService.salvarTipo({
        id: editando?.id,
        tipo_aluguel: nome.trim(),
        valor_aluguel: String(numero),
      })
      if (!ok) { alert('Não foi possível salvar.'); return }

      void registrarEvento({
        tabela: 'alugueis',
        registroId: editando?.id ?? nome.trim(),
        acao: editando ? 'alterou_preco' : 'criou_preco',
        descricao: `${nome.trim()} — ${formatCurrency(numero)}`,
        dados: editando ? { de: Number(editando.valor_aluguel || 0), para: numero } : { valor: numero },
      })

      setEditando(null); setNovo(false)
      await recarregar()
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarRemocao() {
    if (!aRemover) return
    await precoService.removerTipo(aRemover.id)
    void registrarEvento({
      tabela: 'alugueis', registroId: aRemover.id, acao: 'removeu_preco',
      descricao: `Pacote "${aRemover.tipo_aluguel}" removido`,
      dados: { valor: Number(aRemover.valor_aluguel || 0) },
    })
    setARemover(null)
    await recarregar()
  }

  const aberto = novo || !!editando

  return (
    <>
      <AdminHeader title="Preços" subtitle={`${tipos.length} pacote(s) de locação`}
        action={<Button onClick={abrirNovo}><Plus size={16} /> Novo pacote</Button>} />

      <main className="flex-1 p-6">
        <p className="text-white/50 text-sm mb-5 max-w-2xl">
          Estes pacotes aparecem como atalho ao gerar cobrança e ao confirmar pagamento.
          O valor é o total da locação no período, não uma diária a multiplicar.
        </p>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : tipos.length === 0 ? (
          <EmptyState icon={<Tag size={48} />} title="Nenhum pacote cadastrado" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tipos.map((t) => (
              <div key={t.id} className="rounded-2xl border border-white/10 bg-[#111] p-5">
                <div className="flex items-start gap-2">
                  <Tag size={16} style={{ color: G }} className="mt-0.5 shrink-0" />
                  <p className="text-white font-bold text-sm leading-snug">{t.tipo_aluguel}</p>
                </div>
                <p className="text-2xl font-extrabold mt-3" style={{ color: G }}>
                  {formatCurrency(Number(t.valor_aluguel || 0))}
                </p>
                <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                  <Button variant="outline" onClick={() => abrirEdicao(t)} className="!py-1.5 !px-3 text-xs">
                    <Pencil size={13} /> Editar
                  </Button>
                  <Button variant="ghost" onClick={() => setARemover(t)} className="!py-1.5 !px-3 text-xs text-red-400">
                    <Trash2 size={13} /> Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={aberto} onClose={() => { if (!salvando) { setEditando(null); setNovo(false) } }}
        title={editando ? 'Editar pacote' : 'Novo pacote'} maxWidth="max-w-md">
        <div className="space-y-4">
          <Input label="Nome do pacote" value={nome} onChange={setNome}
            placeholder="Diária, Semanal, Mensal..." required />
          <Input label="Valor total (R$)" inputMode="decimal" value={valor}
            onChange={(v) => setValor(maskMoeda(v))} placeholder="0,00" required />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => { setEditando(null); setNovo(false) }} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 size={16} className="animate-spin" />} Salvar
          </Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!aRemover} onClose={() => setARemover(null)} onConfirm={confirmarRemocao}
        title="Remover pacote" danger confirmLabel="Remover"
        message={`Remover "${aRemover?.tipo_aluguel}" da tabela de preços?`} />
    </>
  )
}
