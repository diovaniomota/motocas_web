'use client'

// Entrada do cliente no painel, por link no WhatsApp.
//
// Sem senha de propósito: não existia cadastro nem recuperação de senha, e
// construir os dois só criaria fricção e suporte. O cliente informa o telefone
// e recebe o link no canal que já usa para falar com a Motocas.

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { maskPhone, telefoneValido } from '@/lib/mascaras'

const G = '#39FF14'

export default function EntrarClientePage() {
  const [telefone, setTelefone] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)

  async function enviar() {
    if (!telefoneValido(telefone)) { setErro('Informe o telefone com DDD.'); return }
    setEnviando(true); setErro('')
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/acesso-cliente`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ telefone }),
        },
      )
      const dados = await res.json().catch(() => ({}))
      if (!res.ok) { setErro(dados?.error || 'Não foi possível enviar o link.'); return }
      setEnviadoPara(dados.telefone ?? '')
    } catch {
      setErro('Falha de conexão. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviadoPara) {
    return (
      <Moldura>
        <div className="text-center py-6">
          <CheckCircle2 size={52} className="mx-auto mb-4" style={{ color: G }} />
          <h1 className="text-white font-bold text-xl">Link enviado!</h1>
          <p className="text-white/60 text-sm mt-2 leading-relaxed">
            Mandamos um link de acesso no WhatsApp do número terminado em{' '}
            <span className="text-white font-semibold">{enviadoPara}</span>.
            Abra a mensagem e toque no link para entrar.
          </p>
          <p className="text-white/30 text-xs mt-4">
            O link vale por 1 hora. Não chegou? Confira se o número está certo e tente de novo.
          </p>
          <button onClick={() => { setEnviadoPara(null); setTelefone('') }}
            className="mt-6 text-sm font-semibold" style={{ color: G }}>
            Usar outro número
          </button>
        </div>
      </Moldura>
    )
  }

  return (
    <Moldura>
      <h1 className="text-white font-bold text-xl">Acessar meu painel</h1>
      <p className="text-white/60 text-sm mt-1.5 leading-relaxed">
        Informe o telefone que você usou ao solicitar o aluguel. Enviamos um link de
        acesso no seu WhatsApp — sem senha.
      </p>

      <div className="mt-6">
        <label className="block text-sm font-medium text-white/80 mb-1.5">Telefone</label>
        <input
          value={telefone} inputMode="tel" placeholder="(00) 00000-0000"
          onChange={(e) => setTelefone(maskPhone(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter') void enviar() }}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as string]: G }}
        />
      </div>

      {erro && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg mt-4">{erro}</p>}

      <button onClick={enviar} disabled={enviando || !telefoneValido(telefone)}
        className="w-full mt-5 py-3.5 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: G }}>
        {enviando ? <Loader2 size={17} className="animate-spin" /> : <MessageCircle size={17} />}
        {enviando ? 'Enviando...' : 'Receber link no WhatsApp'}
      </button>

      <Link href="/login"
        className="mt-5 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
        <ArrowLeft size={13} /> Entrar com e-mail e senha
      </Link>
    </Moldura>
  )
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#111] p-7">{children}</div>
        <p className="text-center text-white/25 text-xs mt-6">Motocas · Locação e resgate de motos</p>
      </div>
    </main>
  )
}
