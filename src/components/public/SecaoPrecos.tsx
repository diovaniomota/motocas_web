'use client'

// Tabela de preços na home.
//
// Os valores já estavam cadastrados e não apareciam em lugar nenhum do site.
// Quem não vê preço pergunta no WhatsApp — ou, mais comum, fecha a aba.

import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import { carregarPrecos, formatarPreco } from '@/lib/precos'
import { linkWhatsApp } from './BotaoWhatsApp'
import type { TipoAluguel } from '@/types'

const G = '#39FF14'

export default function SecaoPrecos() {
  const [tipos, setTipos] = useState<TipoAluguel[]>([])

  useEffect(() => {
    let vivo = true
    void carregarPrecos().then((t) => { if (vivo) setTipos(t) })
    return () => { vivo = false }
  }, [])

  // sem preço cadastrado a seção some, em vez de mostrar um bloco vazio
  if (tipos.length === 0) return null

  return (
    <section id="precos" className="py-20 px-6" style={{ backgroundColor: '#0E0E0E' }}>
      <div className="max-w-[1320px] mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={18} style={{ color: G }} />
          <span className="text-xs font-extrabold tracking-widest" style={{ color: G }}>PREÇOS</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
          Quanto custa alugar
        </h2>
        <p className="text-white/60 text-base max-w-[640px] mb-10">
          Valores por período, sem taxa escondida. A retirada é feita na loja, com contrato
          assinado pelo celular.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tipos.map((t) => (
            <div key={t.id} className="rounded-2xl border border-white/10 bg-[#171717] p-6 flex flex-col">
              <p className="text-white/60 text-sm font-semibold">{t.tipo_aluguel}</p>
              <p className="text-4xl font-extrabold mt-2" style={{ color: G }}>
                {formatarPreco(Number(t.valor_aluguel || 0))}
              </p>
              <a href={linkWhatsApp(`alugar no plano ${t.tipo_aluguel}`)}
                target="_blank" rel="noopener noreferrer"
                className="mt-5 py-2.5 rounded-xl font-bold text-xs text-center text-white/80 border border-white/15 hover:bg-white/5 transition-colors">
                Falar sobre este plano
              </a>
            </div>
          ))}
        </div>

        <p className="text-white/35 text-xs mt-6">
          Para alugar é preciso ter 18 anos, CNH válida na categoria do veículo e estar apto
          a conduzir com segurança.
        </p>
      </div>
    </section>
  )
}
