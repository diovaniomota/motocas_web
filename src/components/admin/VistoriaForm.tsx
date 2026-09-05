'use client'

// Formulário de vistoria, usado na entrega e na devolução.
//
// Os itens começam todos marcados como OK: na prática o funcionário confere a
// moto e desmarca o que está com problema. Começar tudo desmarcado faria a
// vistoria completa dar 11 cliques e ninguém faria.

import { useRef } from 'react'
import { Camera, X, Check, AlertTriangle } from 'lucide-react'
import { CHECKLIST_ITENS } from '@/types'
import type { DadosVistoria } from '@/lib/entrega'

const G = '#39FF14'

export function vistoriaVazia(responsavel = ''): DadosVistoria {
  return {
    km: 0,
    itens: Object.fromEntries(CHECKLIST_ITENS.map((i) => [i.key, true])),
    observacoes: '',
    fotos: [],
    responsavel,
  }
}

export default function VistoriaForm({
  dados, onChange, kmAnterior,
}: {
  dados: DadosVistoria
  onChange: (d: DadosVistoria) => void
  /** km da entrega, para avisar quando a devolução vier com número menor */
  kmAnterior?: number | null
}) {
  const inputFoto = useRef<HTMLInputElement | null>(null)

  const alterar = (patch: Partial<DadosVistoria>) => onChange({ ...dados, ...patch })
  const alternarItem = (key: string) =>
    alterar({ itens: { ...dados.itens, [key]: !dados.itens[key] } })

  const problemas = CHECKLIST_ITENS.filter((i) => !dados.itens[i.key])
  const kmMenor = kmAnterior != null && dados.km > 0 && dados.km < kmAnterior

  function adicionarFotos(lista: FileList | null) {
    if (!lista) return
    alterar({ fotos: [...dados.fotos, ...Array.from(lista)] })
  }

  return (
    <div className="space-y-5">
      {/* km */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1.5">
          Quilometragem <span className="text-red-400">*</span>
        </label>
        <input
          type="number" inputMode="numeric" min={0} value={dados.km || ''}
          onChange={(e) => alterar({ km: Number(e.target.value) })}
          placeholder="0"
          className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as string]: G }}
        />
        {kmAnterior != null && (
          <p className={`text-xs mt-1 ${kmMenor ? 'text-amber-300' : 'text-white/40'}`}>
            {kmMenor
              ? `Menor que os ${kmAnterior} km da entrega — confira antes de salvar.`
              : `Na entrega a moto estava com ${kmAnterior} km.`}
          </p>
        )}
      </div>

      {/* itens */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/80">Itens conferidos</span>
          <span className="text-xs text-white/40">
            {problemas.length === 0
              ? 'tudo OK'
              : `${problemas.length} com problema`}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CHECKLIST_ITENS.map((item) => {
            const ok = dados.itens[item.key]
            return (
              <button
                key={item.key} type="button" onClick={() => alternarItem(item.key)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors"
                style={{
                  borderColor: ok ? `${G}44` : '#F8717155',
                  backgroundColor: ok ? `${G}10` : '#F8717115',
                  color: ok ? '#D7FFD0' : '#FCA5A5',
                }}
              >
                {ok ? <Check size={13} style={{ color: G }} /> : <AlertTriangle size={13} />}
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-white/30 text-[11px] mt-2">
          Todos começam como OK. Toque no que estiver com problema.
        </p>
      </div>

      {/* fotos */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1.5">
          Fotos da moto {problemas.length > 0 && <span className="text-amber-300">(registre as avarias)</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {dados.fotos.map((f, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button type="button"
                onClick={() => alterar({ fotos: dados.fotos.filter((_, j) => j !== i) })}
                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/70 text-white/80 hover:text-white">
                <X size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => inputFoto.current?.click()}
            className="w-20 h-20 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white hover:border-white/40 transition-colors">
            <Camera size={18} />
            <span className="text-[10px]">Adicionar</span>
          </button>
        </div>
        <input ref={inputFoto} type="file" accept="image/*" multiple capture="environment"
          className="hidden" onChange={(e) => { adicionarFotos(e.target.files); e.target.value = '' }} />
        <p className="text-white/30 text-[11px] mt-2">
          No celular abre a câmera direto. As fotos ficam anexadas ao laudo desta vistoria.
        </p>
      </div>

      {/* observações */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1.5">Observações</label>
        <textarea
          value={dados.observacoes} rows={3}
          onChange={(e) => alterar({ observacoes: e.target.value })}
          placeholder="Riscos, amassados, itens faltando, nível de combustível..."
          className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 resize-none"
          style={{ ['--tw-ring-color' as string]: G }}
        />
      </div>

      {/* responsável */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1.5">
          Vistoriador <span className="text-red-400">*</span>
        </label>
        <input
          value={dados.responsavel}
          onChange={(e) => alterar({ responsavel: e.target.value })}
          placeholder="Quem conferiu a moto"
          className="w-full px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as string]: G }}
        />
      </div>
    </div>
  )
}
