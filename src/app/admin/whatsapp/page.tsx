'use client'

import { useState, useRef } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  MessageCircle, RefreshCw, Maximize2, Minimize2,
  ExternalLink, Smartphone, Wifi, WifiOff,
} from 'lucide-react'

export default function WhatsAppPage() {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [key, setKey] = useState(0) // força reload do iframe
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function reload() {
    setLoaded(false)
    setError(false)
    setKey((k) => k + 1)
  }

  function openExternal() {
    window.open('https://web.whatsapp.com', '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <AdminHeader
        title="WhatsApp"
        subtitle="Central de atendimento — WhatsApp Web integrado"
        action={
          <div className="flex items-center gap-2">
            {/* Status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium">
              {loaded && !error
                ? <><Wifi size={13} style={{ color: '#39FF14' }} /><span style={{ color: '#39FF14' }}>Conectado</span></>
                : error
                  ? <><WifiOff size={13} className="text-red-400" /><span className="text-red-400">Sem acesso</span></>
                  : <><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /><span className="text-yellow-400">Carregando...</span></>
              }
            </div>

            <button onClick={reload} title="Recarregar"
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <RefreshCw size={15} />
            </button>

            <button onClick={() => setFullscreen((f) => !f)} title={fullscreen ? 'Sair do fullscreen' : 'Fullscreen'}
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button onClick={openExternal} title="Abrir em nova aba"
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <ExternalLink size={15} />
            </button>
          </div>
        }
      />

      <main className={`flex-1 flex flex-col overflow-hidden ${fullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}
        style={fullscreen ? {} : { height: 'calc(100vh - 81px)' }}>

        {/* Aviso de bloqueio / loading */}
        {!loaded && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#050505] pointer-events-none">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(57,255,20,0.12)' }}>
              <MessageCircle size={32} style={{ color: '#39FF14' }} />
            </div>
            <p className="text-white font-semibold text-lg mb-1">Abrindo WhatsApp Web...</p>
            <p className="text-white/40 text-sm">Aguarde alguns segundos</p>
            <div className="mt-6 w-48 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full animate-pulse" style={{ width: '60%', backgroundColor: '#39FF14' }} />
            </div>
          </div>
        )}

        {/* Aviso quando o iframe é bloqueado pelo browser */}
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050505]">
            <div className="max-w-md w-full text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.2)' }}>
                <Smartphone size={36} style={{ color: '#39FF14' }} />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">WhatsApp Web bloqueado pelo navegador</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                O WhatsApp Web não permite ser carregado em iframes por questões de segurança.
                Use o botão abaixo para abrir em uma nova aba ou acesse diretamente.
              </p>

              <button onClick={openExternal}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black text-sm mb-4 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#39FF14' }}>
                <ExternalLink size={16} />
                Abrir WhatsApp Web em nova aba
              </button>

              <div className="mt-6 p-4 rounded-xl border border-white/8 bg-[#111] text-left space-y-3">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Dica para uso contínuo</p>
                <ol className="text-white/50 text-xs space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Abra o WhatsApp Web na nova aba</li>
                  <li>Escaneie o QR Code com seu celular</li>
                  <li>Mantenha a aba aberta ao lado do painel admin</li>
                  <li>Use o atalho de teclado para alternar entre abas</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* iframe do WhatsApp Web */}
        <div className={`flex-1 relative ${error ? 'hidden' : ''}`}>
          <iframe
            key={key}
            ref={iframeRef}
            src="https://web.whatsapp.com"
            title="WhatsApp Web"
            className="w-full h-full border-0"
            style={{ minHeight: 0 }}
            allow="camera; microphone; clipboard-read; clipboard-write; notifications"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
            onLoad={() => {
              try {
                // Tenta verificar se o conteúdo foi bloqueado
                const doc = iframeRef.current?.contentDocument
                if (!doc || doc.location.href === 'about:blank') {
                  setError(true)
                } else {
                  setLoaded(true)
                }
              } catch {
                // Cross-origin = WhatsApp carregou (política de mesma origem)
                setLoaded(true)
              }
            }}
            onError={() => { setError(true) }}
          />
        </div>
      </main>
    </>
  )
}
