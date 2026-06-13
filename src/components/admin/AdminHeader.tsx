'use client'

import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { notificacaoService } from '@/lib/services'
import { supabase } from '@/lib/supabase'

interface AdminHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

interface ToastItem {
  id: number
  message: string
}

export default function AdminHeader({ title, subtitle, action }: AdminHeaderProps) {
  const [naoLidas, setNaoLidas] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  useEffect(() => {
    notificacaoService.contarNaoLidas().then(setNaoLidas).catch(() => {})

    // Realtime: novas solicitações
    const chanSol = supabase
      .channel('admin-solicitacoes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitacoes_aluguel' }, (payload) => {
        const nome = (payload.new as { nome_completo?: string }).nome_completo || 'Alguém'
        addToast(`Nova solicitação de ${nome}`)
        setNaoLidas((n) => n + 1)
      })
      .subscribe()

    // Realtime: novos pedidos
    const chanPed = supabase
      .channel('admin-pedidos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos_pecas' }, (payload) => {
        const nome = (payload.new as { cliente_nome?: string }).cliente_nome || 'Cliente'
        addToast(`Novo pedido de ${nome}`)
        setNaoLidas((n) => n + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(chanSol)
      supabase.removeChannel(chanPed)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addToast(message: string) {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }

  return (
    <>
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {action}
          <button
            onClick={() => { setNaoLidas(0); notificacaoService.marcarTodasComoLidas().catch(() => {}) }}
            className="relative p-2 rounded-lg hover:bg-white/10 text-white/70 transition-colors"
            title={naoLidas > 0 ? `${naoLidas} não lidas` : 'Sem novas notificações'}>
            <Bell size={20} />
            {naoLidas > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-black"
                style={{ backgroundColor: '#39FF14' }}>
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id}
            className="toast-enter flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white text-sm shadow-xl">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#39FF14' }} />
            {t.message}
          </div>
        ))}
      </div>
    </>
  )
}
