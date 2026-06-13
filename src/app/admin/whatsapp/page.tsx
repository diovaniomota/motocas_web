'use client'

import { useEffect, useRef, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { Spinner, EmptyState } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, Search } from 'lucide-react'

interface Chat {
  chat_id: string
  nome?: string | null
  ultima_mensagem?: string | null
  updated_at?: string | null
}

interface Mensagem {
  id: string
  chat_id: string
  message_body?: string | null
  from_me?: boolean | null
  created_at?: string | null
}

export default function WhatsAppPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [texto, setTexto] = useState('')
  const [search, setSearch] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadChats() }, [])

  useEffect(() => {
    if (!activeChat) return
    loadMensagens(activeChat)
    const channel = supabase
      .channel(`whatsapp_messages_${activeChat}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `chat_id=eq.${activeChat}` },
        (payload) => setMensagens((prev) => [...prev, payload.new as Mensagem]))
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [activeChat])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])

  async function loadChats() {
    setLoading(true)
    const { data } = await supabase.from('whatsapp_chats').select('*').order('updated_at', { ascending: false })
    setChats((data as Chat[]) || [])
    setLoading(false)
  }

  async function loadMensagens(chatId: string) {
    setLoadingMsg(true)
    const { data } = await supabase.from('whatsapp_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true })
    setMensagens((data as Mensagem[]) || [])
    setLoadingMsg(false)
  }

  async function enviar() {
    if (!texto.trim() || !activeChat) return
    const msg = texto
    setTexto('')
    await supabase.from('whatsapp_messages').insert({ chat_id: activeChat, message_body: msg, from_me: true, created_at: new Date().toISOString() })
  }

  const filtered = chats.filter((c) => !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.chat_id.includes(search))

  return (
    <>
      <AdminHeader title="WhatsApp" subtitle="Central de atendimento" />
      <main className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 81px)' }}>
        {/* Lista de chats */}
        <div className="w-80 shrink-0 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversa..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-white/40 text-sm py-10">Nenhuma conversa</p>
            ) : filtered.map((c) => (
              <button key={c.chat_id} onClick={() => setActiveChat(c.chat_id)}
                className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                style={activeChat === c.chat_id ? { backgroundColor: 'rgba(57,255,20,0.08)' } : {}}>
                <p className="font-semibold text-white text-sm truncate">{c.nome || c.chat_id}</p>
                <p className="text-xs text-white/40 truncate mt-0.5">{c.ultima_mensagem || 'Sem mensagens'}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Conversa */}
        <div className="flex-1 flex flex-col bg-[#050505]">
          {!activeChat ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<MessageCircle size={56} />} title="Selecione uma conversa" subtitle="Escolha um chat à esquerda para começar." />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-2">
                {loadingMsg ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : mensagens.map((m) => (
                  <div key={m.id} className={`flex ${m.from_me ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%] px-4 py-2 rounded-2xl text-sm"
                      style={m.from_me ? { backgroundColor: '#39FF14', color: '#000' } : { backgroundColor: '#1a1a1a', color: '#fff' }}>
                      {m.message_body}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="p-4 border-t border-white/10 flex gap-2">
                <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviar()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none" />
                <button onClick={enviar} className="w-11 h-11 rounded-full flex items-center justify-center text-black" style={{ backgroundColor: '#39FF14' }}>
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
