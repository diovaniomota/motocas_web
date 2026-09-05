'use client'

// Atalhos da tabela de preços (tabela `alugueis`).
//
// Os pacotes são por período — Diária, Fim de Semana, Semanal, Mensal — então
// o valor do pacote é o total da locação, não uma diária a multiplicar. Por
// isso este seletor preenche o campo de total.

import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import { precoService } from '@/lib/services'
import { formatCurrency } from '@/components/ui'
import type { TipoAluguel } from '@/types'

const G = '#39FF14'

export default function SeletorPreco({
  onEscolher, valorAtual,
}: {
  onEscolher: (valor: number, tipo: string) => void
  /** destaca o pacote quando o valor digitado coincide com ele */
  valorAtual?: number
}) {
  const [tipos, setTipos] = useState<TipoAluguel[]>([])

  useEffect(() => {
    let vivo = true
    void (async () => {
      try {
        const t = await precoService.getTipos()
        if (vivo) setTipos(t)
      } catch { /* sem tabela de preços, o seletor só não aparece */ }
    })()
    return () => { vivo = false }
  }, [])

  if (tipos.length === 0) return null

  return (
    <div className="mt-3">
      <p className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
        <Tag size={12} style={{ color: G }} /> Tabela de preços
      </p>
      <div className="flex flex-wrap gap-2">
        {tipos.map((t) => {
          const valor = Number(t.valor_aluguel || 0)
          const ativo = valorAtual != null && Math.abs(valorAtual - valor) < 0.001
          return (
            <button
              key={t.id} type="button"
              onClick={() => onEscolher(valor, t.tipo_aluguel)}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
              style={ativo
                ? { borderColor: G, backgroundColor: `${G}1A`, color: G }
                : { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
            >
              {t.tipo_aluguel} · {formatCurrency(valor)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
