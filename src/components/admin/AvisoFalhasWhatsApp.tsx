'use client'

// Aviso de mensagens que não chegaram ao cliente.
//
// O envio de WhatsApp é best-effort de propósito — não pode derrubar a
// aprovação de uma solicitação. O preço disso é que a falha ficava invisível.
// Este aviso é o contrapeso: a falha não interrompe nada, mas aparece.

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { falhasRecentes, type MensagemEnviada } from '@/lib/eventos'

export default function AvisoFalhasWhatsApp() {
  const [falhas, setFalhas] = useState<MensagemEnviada[]>([])
  const [fechado, setFechado] = useState(false)

  useEffect(() => {
    void (async () => {
      // silencioso: se a tabela ainda não existe, o aviso simplesmente não aparece
      try { setFalhas(await falhasRecentes(5)) } catch { /* ignora */ }
    })()
  }, [])

  if (fechado || falhas.length === 0) return null

  return (
    <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
      <div className="flex gap-3 items-start">
        <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <div className="flex-1 min-w-0">
          <h3 className="text-amber-200 font-bold text-sm">
            {falhas.length === 1
              ? '1 mensagem de WhatsApp não foi entregue'
              : `${falhas.length} mensagens de WhatsApp não foram entregues`}
          </h3>
          <p className="text-white/50 text-xs mt-0.5 mb-3">
            O fluxo seguiu normalmente, mas esses clientes não receberam o aviso.
          </p>
          <ul className="space-y-1.5">
            {falhas.map((f) => (
              <li key={f.id} className="text-xs text-white/70 flex flex-wrap gap-x-2">
                <span className="font-mono text-white/90">{f.destinatario}</span>
                <span className="text-white/35">
                  {new Date(f.created_at).toLocaleString('pt-BR')}
                </span>
                {f.erro && <span className="text-amber-300/80 basis-full">{f.erro}</span>}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={() => setFechado(true)}
          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
