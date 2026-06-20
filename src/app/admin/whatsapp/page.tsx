'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  MessageCircle, Send, Search, Settings, Wifi, WifiOff,
  QrCode, Loader2, X, CheckCheck, Check, Phone, RefreshCw,
  ChevronLeft, Image as ImageIcon, Smile,
} from 'lucide-react'

/* ────────────────────────────────────────────────
   TIPOS
──────────────────────────────────────────────── */
interface Config {
  apiUrl: string
  apiKey: string
  instance: string
}

interface Chat {
  id: string
  name: string
  lastMessage: string
  lastTime: string
  unread: number
  avatar?: string
  isGroup: boolean
}

interface Message {
  id: string
  fromMe: boolean
  body: string
  timestamp: number
  status?: 'sent' | 'delivered' | 'read'
  type?: string
}

type ConnectionState = 'idle' | 'connecting' | 'qr' | 'connected' | 'error'

/* ────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────── */
function fmtTime(ts: number | string): string {
  const d = new Date(typeof ts === 'number' ? ts * 1000 : ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function cfg(): Config | null {
  try {
    const raw = localStorage.getItem('wa_evo_config')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/* ────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
──────────────────────────────────────────────── */
export default function WhatsAppPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [state, setState] = useState<ConnectionState>('idle')
  const [qrBase64, setQrBase64] = useState<string>('')
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [texto, setTexto] = useState('')
  const [search, setSearch] = useState('')
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* carregar config salva */
  useEffect(() => {
    const saved = cfg()
    if (saved) { setConfig(saved); }
  }, [])

  /* scroll bottom nas mensagens */
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* ── API helpers ── */
  const api = useCallback(async (path: string, opts?: RequestInit) => {
    if (!config) throw new Error('Sem configuração')
    const res = await fetch(`${config.apiUrl.replace(/\/$/, '')}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        apikey: config.apiKey,
        ...(opts?.headers || {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [config])

  /* ── verificar status de conexão ── */
  const checkConnection = useCallback(async () => {
    try {
      const data = await api(`/instance/connectionState/${config!.instance}`)
      const connected = data?.instance?.state === 'open' || data?.state === 'open'
      if (connected) {
        setState('connected')
        if (qrPollRef.current) clearInterval(qrPollRef.current)
      }
      return connected
    } catch { return false }
  }, [api, config])

  /* ── buscar QR code ── */
  const fetchQr = useCallback(async () => {
    try {
      const data = await api(`/instance/connect/${config!.instance}`)
      const base64 = data?.base64 || data?.qrcode?.base64 || data?.qr
      if (base64) { setQrBase64(base64); setState('qr') }
    } catch { setState('error') }
  }, [api, config])

  /* ── conectar instância ── */
  const connect = useCallback(async () => {
    if (!config) return
    setState('connecting')
    try {
      // Tenta verificar estado atual primeiro
      const connected = await checkConnection()
      if (connected) return

      // Tenta criar instância (ignorar erro se já existe)
      try {
        await api('/instance/create', {
          method: 'POST',
          body: JSON.stringify({
            instanceName: config.instance,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        })
      } catch { /* instância já existe, ok */ }

      await fetchQr()

      // Polling para verificar quando conectar via QR
      qrPollRef.current = setInterval(async () => {
        const ok = await checkConnection()
        if (ok) {
          if (qrPollRef.current) clearInterval(qrPollRef.current)
        } else {
          await fetchQr() // atualiza QR se expirou
        }
      }, 20000)
    } catch { setState('error') }
  }, [config, checkConnection, fetchQr, api])

  /* ── ao ter config, verificar conexão ── */
  useEffect(() => {
    if (config) connect()
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [config]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── carregar chats quando conectado ── */
  const loadChats = useCallback(async () => {
    if (!config || state !== 'connected') return
    setLoadingChats(true)
    try {
      const data = await api(`/chat/findChats/${config.instance}`)
      const list: Chat[] = (Array.isArray(data) ? data : data?.chats || []).map((c: Record<string, unknown>) => ({
        id: String(c.id || c.remoteJid || ''),
        name: String(c.name || c.pushName || c.id || ''),
        lastMessage: String(c.lastMessage?.message?.conversation || c.lastMessage?.body || ''),
        lastTime: fmtTime(Number(c.updatedAt || c.lastMessage?.messageTimestamp || Date.now() / 1000)),
        unread: Number(c.unreadCount || 0),
        isGroup: String(c.id || '').includes('@g.us'),
      }))
      setChats(list)
    } catch { /* silencioso */ }
    setLoadingChats(false)
  }, [api, config, state])

  useEffect(() => {
    if (state === 'connected') {
      loadChats()
      pollRef.current = setInterval(loadChats, 15000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [state, loadChats])

  /* ── carregar mensagens do chat ── */
  const loadMessages = useCallback(async (chat: Chat) => {
    if (!config) return
    setLoadingMsgs(true)
    try {
      const data = await api(`/message/findMessages/${config.instance}?where[key.remoteJid]=${chat.id}&limit=50`)
      const msgs: Message[] = (Array.isArray(data) ? data : data?.messages?.records || data?.messages || [])
        .map((m: Record<string, unknown>) => ({
          id: String((m.key as Record<string, unknown>)?.id || m.id || Math.random()),
          fromMe: Boolean((m.key as Record<string, unknown>)?.fromMe ?? m.fromMe),
          body: String(m.message?.conversation || m.message?.extendedTextMessage?.text || m.body || ''),
          timestamp: Number(m.messageTimestamp || m.timestamp || Date.now() / 1000),
          type: String(m.messageType || m.type || 'text'),
          status: 'delivered',
        }))
        .filter((m: Message) => m.body)
        .sort((a: Message, b: Message) => a.timestamp - b.timestamp)
      setMessages(msgs)
    } catch { setMessages([]) }
    setLoadingMsgs(false)
  }, [api, config])

  useEffect(() => {
    if (activeChat) loadMessages(activeChat)
  }, [activeChat, loadMessages])

  /* ── enviar mensagem ── */
  async function enviar() {
    if (!texto.trim() || !activeChat || !config) return
    const msg = texto.trim()
    setTexto('')
    setSending(true)
    const tmp: Message = {
      id: `tmp_${Date.now()}`,
      fromMe: true,
      body: msg,
      timestamp: Date.now() / 1000,
      status: 'sent',
    }
    setMessages((p) => [...p, tmp])
    try {
      await api(`/message/sendText/${config.instance}`, {
        method: 'POST',
        body: JSON.stringify({ number: activeChat.id, text: msg }),
      })
    } catch { /* msg ainda aparece localmente */ }
    setSending(false)
    setTimeout(() => loadMessages(activeChat), 1500)
  }

  const filtered = chats.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <>
      <AdminHeader
        title="WhatsApp"
        subtitle="Central de atendimento via Evolution API"
        action={
          <div className="flex items-center gap-2">
            {/* Status */}
            <StatusBadge state={state} />

            {state === 'connected' && (
              <button onClick={loadChats} title="Atualizar"
                className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                <RefreshCw size={15} />
              </button>
            )}

            <button onClick={() => setShowSetup(true)} title="Configurações"
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <Settings size={15} />
            </button>
          </div>
        }
      />

      <main className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 81px)' }}>

        {/* ── Sem configuração ── */}
        {!config && !showSetup && (
          <div className="flex-1 flex items-center justify-center bg-[#050505]">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.2)' }}>
                <MessageCircle size={36} style={{ color: '#39FF14' }} />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">Configurar Evolution API</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Conecte sua instância do Evolution API para gerenciar o WhatsApp diretamente aqui.
              </p>
              <button onClick={() => setShowSetup(true)}
                className="px-6 py-3 rounded-xl font-bold text-black text-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#39FF14' }}>
                Configurar agora
              </button>
            </div>
          </div>
        )}

        {/* ── QR Code ── */}
        {config && (state === 'qr' || state === 'connecting') && (
          <div className="flex-1 flex items-center justify-center bg-[#050505]">
            <div className="text-center">
              {state === 'connecting' ? (
                <>
                  <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: '#39FF14' }} />
                  <p className="text-white font-semibold">Conectando à instância...</p>
                </>
              ) : (
                <>
                  <QrCode size={28} className="mx-auto mb-4" style={{ color: '#39FF14' }} />
                  <h2 className="text-white font-bold text-lg mb-1">Escaneie o QR Code</h2>
                  <p className="text-white/50 text-sm mb-6">Abra o WhatsApp no celular → Dispositivos Conectados</p>
                  {qrBase64 ? (
                    <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                        alt="QR Code WhatsApp"
                        className="w-64 h-64 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-64 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto">
                      <Loader2 size={32} className="animate-spin" style={{ color: '#39FF14' }} />
                    </div>
                  )}
                  <p className="text-white/30 text-xs mt-4">QR code atualiza automaticamente a cada 20s</p>
                  <button onClick={fetchQr} className="mt-3 text-xs font-semibold" style={{ color: '#39FF14' }}>
                    Atualizar QR
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Erro ── */}
        {config && state === 'error' && (
          <div className="flex-1 flex items-center justify-center bg-[#050505]">
            <div className="text-center">
              <WifiOff size={40} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-white font-bold text-lg mb-2">Falha na conexão</h2>
              <p className="text-white/50 text-sm mb-4">Verifique a URL e a chave da API nas configurações.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={connect}
                  className="px-5 py-2.5 rounded-xl font-bold text-black text-sm hover:opacity-90"
                  style={{ backgroundColor: '#39FF14' }}>
                  Tentar novamente
                </button>
                <button onClick={() => setShowSetup(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-white text-sm border border-white/20 hover:bg-white/5">
                  Configurações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Chat Interface ── */}
        {config && state === 'connected' && (
          <>
            {/* Lista de conversas */}
            <div className="w-80 shrink-0 border-r border-white/8 flex flex-col bg-[#0a0a0a]">
              {/* Header da lista */}
              <div className="p-3 border-b border-white/8">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar conversa..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/8 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto">
                {loadingChats && chats.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin" style={{ color: '#39FF14' }} />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageCircle size={32} className="mx-auto mb-2 text-white/20" />
                    <p className="text-white/40 text-sm">Nenhuma conversa</p>
                  </div>
                ) : filtered.map((c) => (
                  <button key={c.id} onClick={() => setActiveChat(c)}
                    className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/4 transition-colors flex items-center gap-3"
                    style={activeChat?.id === c.id ? { backgroundColor: 'rgba(57,255,20,0.07)' } : {}}>
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-black"
                      style={{ backgroundColor: stringToColor(c.name) }}>
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-white text-sm truncate">{c.name}</p>
                        <span className="text-white/30 text-xs shrink-0 ml-1">{c.lastTime}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-white/40 truncate">{c.lastMessage || 'Sem mensagens'}</p>
                        {c.unread > 0 && (
                          <span className="ml-1 shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-black"
                            style={{ backgroundColor: '#39FF14' }}>{c.unread > 9 ? '9+' : c.unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Área da conversa */}
            <div className="flex-1 flex flex-col bg-[#050505]">
              {!activeChat ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: 'rgba(57,255,20,0.08)' }}>
                      <MessageCircle size={28} style={{ color: '#39FF14' }} />
                    </div>
                    <p className="text-white/50 text-sm">Selecione uma conversa</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header da conversa */}
                  <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-3 bg-[#0c0c0c]">
                    <button className="lg:hidden p-1 text-white/60 hover:text-white"
                      onClick={() => setActiveChat(null)}>
                      <ChevronLeft size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black"
                      style={{ backgroundColor: stringToColor(activeChat.name) }}>
                      {initials(activeChat.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{activeChat.name}</p>
                      <p className="text-white/40 text-xs">{activeChat.isGroup ? 'Grupo' : 'Contato'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => loadMessages(activeChat)} title="Atualizar mensagens"
                        className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                        <RefreshCw size={15} />
                      </button>
                      <button title="Ligar" className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                        <Phone size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Mensagens */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-1.5"
                    style={{ background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
                    {loadingMsgs ? (
                      <div className="flex justify-center py-10">
                        <Loader2 size={24} className="animate-spin" style={{ color: '#39FF14' }} />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-white/30 text-sm">Nenhuma mensagem</p>
                      </div>
                    ) : messages.map((m) => (
                      <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[72%] px-4 py-2 rounded-2xl text-sm shadow-md ${m.fromMe
                          ? 'rounded-br-sm text-black'
                          : 'rounded-bl-sm bg-[#1e1e1e] text-white'}`}
                          style={m.fromMe ? { backgroundColor: '#39FF14' } : {}}>
                          {m.type === 'imageMessage' ? (
                            <div className="flex items-center gap-2 text-xs opacity-70">
                              <ImageIcon size={14} /> Imagem
                            </div>
                          ) : (
                            <p className="leading-relaxed break-words">{m.body}</p>
                          )}
                          <div className={`flex items-center justify-end gap-1 mt-1 ${m.fromMe ? 'text-black/50' : 'text-white/30'}`}>
                            <span className="text-[10px]">{fmtTime(m.timestamp)}</span>
                            {m.fromMe && (
                              m.status === 'read'
                                ? <CheckCheck size={12} className="text-blue-400" />
                                : m.status === 'delivered'
                                  ? <CheckCheck size={12} />
                                  : <Check size={12} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-white/8 flex items-center gap-2 bg-[#0c0c0c]">
                    <button className="p-2 text-white/40 hover:text-white transition-colors">
                      <Smile size={20} />
                    </button>
                    <input
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar()}
                      placeholder="Digite uma mensagem..."
                      className="flex-1 px-4 py-2.5 rounded-full bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                    />
                    <button onClick={enviar} disabled={!texto.trim() || sending}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-black transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: '#39FF14' }}>
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Modal de Setup ── */}
      {showSetup && (
        <SetupModal
          current={config}
          onSave={(c) => {
            localStorage.setItem('wa_evo_config', JSON.stringify(c))
            setConfig(c)
            setShowSetup(false)
            setState('idle')
          }}
          onClose={() => setShowSetup(false)}
        />
      )}
    </>
  )
}

/* ────────────────────────────────────────────────
   STATUS BADGE
──────────────────────────────────────────────── */
function StatusBadge({ state }: { state: ConnectionState }) {
  const map: Record<ConnectionState, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: 'Desconectado', color: '#ffffff40', icon: <WifiOff size={13} /> },
    connecting: { label: 'Conectando...', color: '#F59E0B', icon: <Loader2 size={13} className="animate-spin" /> },
    qr: { label: 'Aguardando QR', color: '#F59E0B', icon: <QrCode size={13} /> },
    connected: { label: 'Conectado', color: '#39FF14', icon: <Wifi size={13} /> },
    error: { label: 'Erro', color: '#F87171', icon: <WifiOff size={13} /> },
  }
  const { label, color, icon } = map[state]
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium"
      style={{ color }}>
      {icon}<span>{label}</span>
    </div>
  )
}

/* ────────────────────────────────────────────────
   MODAL DE CONFIGURAÇÃO
──────────────────────────────────────────────── */
function SetupModal({ current, onSave, onClose }: {
  current: Config | null
  onSave: (c: Config) => void
  onClose: () => void
}) {
  const [apiUrl, setApiUrl] = useState(current?.apiUrl ?? '')
  const [apiKey, setApiKey] = useState(current?.apiKey ?? '')
  const [instance, setInstance] = useState(current?.instance ?? 'motocas')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#111] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Configurar Evolution API</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="URL da API" placeholder="https://api.suaempresa.com" value={apiUrl} onChange={setApiUrl} />
          <Field label="API Key" placeholder="sua-chave-secreta" value={apiKey} onChange={setApiKey} type="password" />
          <Field label="Nome da Instância" placeholder="motocas" value={instance} onChange={setInstance} />
        </div>

        <div className="mt-5 p-4 rounded-xl border border-white/8 bg-[#0a0a0a] text-xs text-white/50 leading-relaxed">
          <p className="font-semibold text-white/70 mb-1">Como obter esses dados:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Instale o <strong className="text-white/70">Evolution API</strong> na sua VPS (Docker)</li>
            <li>Copie a URL do painel e a API Key gerada</li>
            <li>Defina um nome para a instância (ex: motocas)</li>
          </ol>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white border border-white/20 hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim(), instance: instance.trim() })}
            disabled={!apiUrl || !apiKey || !instance}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-black hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#39FF14' }}>
            Salvar e Conectar
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
    </div>
  )
}

/* ── Cor determinística por nome ── */
function stringToColor(str: string): string {
  const colors = ['#39FF14', '#00D4AA', '#6C63FF', '#FF6B6B', '#FFD93D', '#4ECDC4', '#A8E063', '#F7971E']
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
