'use client'

// Página pública de assinatura do contrato.
// Quem autoriza é o token que veio no link por WhatsApp — o site não tem
// cadastro de cliente, então não dá para exigir login aqui.

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileText, Loader2, AlertTriangle, Eraser, PenLine } from 'lucide-react'
import { consultarContrato, assinarContrato, type ContratoParaAssinar } from '@/lib/edge-functions'

const G = '#39FF14'

export default function AssinarPage() {
  const [token, setToken] = useState<string | null>(null)
  const [contrato, setContrato] = useState<ContratoParaAssinar | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState<string | null>(null)
  const [temTraco, setTemTraco] = useState(false)
  const [leu, setLeu] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const desenhando = useRef(false)

  /* o token vem da querystring; leitura direta evita o Suspense que o
     useSearchParams exige no export estático */
  useEffect(() => {
    void (async () => {
      const t = new URLSearchParams(window.location.search).get('token')
      if (!t) { setErro('Link inválido. Peça um novo à Motocas.'); setCarregando(false); return }
      setToken(t)
      try {
        const c = await consultarContrato(t)
        setContrato(c)
        if (c.assinado && c.assinadoUrl) setPronto(c.assinadoUrl)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível abrir o contrato.')
      } finally {
        setCarregando(false)
      }
    })()
  }, [])

  /* ── canvas de assinatura ── */
  const prepararCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // resolução real acompanha o tamanho em tela, senão o traço sai serrilhado
    const escala = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * escala
    canvas.height = rect.height * escala
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(escala, escala)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111111'
  }, [])

  useEffect(() => {
    if (!contrato || pronto) return
    prepararCanvas()
    window.addEventListener('resize', prepararCanvas)
    return () => window.removeEventListener('resize', prepararCanvas)
  }, [contrato, pronto, prepararCanvas])

  function posicao(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = posicao(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    desenhando.current = true
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = posicao(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!temTraco) setTemTraco(true)
  }

  function encerrar() { desenhando.current = false }

  function limpar() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTemTraco(false)
  }

  async function enviar() {
    const canvas = canvasRef.current
    if (!canvas || !token) return
    setEnviando(true); setErro('')
    try {
      const { url } = await assinarContrato(token, canvas.toDataURL('image/png'))
      setPronto(url)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar a assinatura.')
    } finally {
      setEnviando(false)
    }
  }

  /* ── telas ── */
  if (carregando) {
    return (
      <Moldura>
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 size={32} className="animate-spin" style={{ color: G }} />
          <p className="text-white/50 text-sm">Carregando seu contrato...</p>
        </div>
      </Moldura>
    )
  }

  if (pronto) {
    return (
      <Moldura>
        <div className="text-center py-10">
          <CheckCircle2 size={56} className="mx-auto mb-4" style={{ color: G }} />
          <h1 className="text-white font-bold text-2xl">Contrato assinado!</h1>
          <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">
            Sua assinatura foi registrada. Guarde uma cópia — a Motocas também recebeu a sua.
          </p>
          <a href={pronto} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl font-bold text-black text-sm"
            style={{ backgroundColor: G }}>
            <FileText size={16} /> Baixar contrato assinado
          </a>
        </div>
      </Moldura>
    )
  }

  if (erro && !contrato) {
    return (
      <Moldura>
        <div className="text-center py-12">
          <AlertTriangle size={44} className="mx-auto mb-4 text-amber-400" />
          <h1 className="text-white font-bold text-xl">Não foi possível abrir o contrato</h1>
          <p className="text-white/60 text-sm mt-2">{erro}</p>
        </div>
      </Moldura>
    )
  }

  return (
    <Moldura>
      <h1 className="text-white font-bold text-2xl">Assinatura do contrato</h1>
      <p className="text-white/60 text-sm mt-1">
        Olá <span className="text-white font-semibold">{contrato?.nome}</span>, seu contrato de locação
        está pronto. Leia com atenção antes de assinar.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
        <Campo rotulo="Moto" valor={contrato?.moto ?? ''} />
        <Campo rotulo="Período" valor={`${contrato?.retirada} → ${contrato?.devolucao}`} />
      </div>

      {contrato?.contratoUrl && (
        <>
          <a href={contrato.contratoUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/20 hover:bg-white/5 transition-colors">
            <FileText size={15} /> Abrir contrato em nova aba
          </a>
          <iframe
            src={contrato.contratoUrl}
            title="Contrato de locação"
            className="w-full h-[420px] mt-4 rounded-xl border border-white/10 bg-white"
          />
        </>
      )}

      <label className="flex items-start gap-3 mt-6 cursor-pointer select-none">
        <input type="checkbox" checked={leu} onChange={(e) => setLeu(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-[#39FF14]" />
        <span className="text-white/70 text-sm leading-relaxed">
          Li o contrato acima e concordo com todas as suas cláusulas.
        </span>
      </label>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm font-semibold flex items-center gap-1.5">
            <PenLine size={15} style={{ color: G }} /> Assine no quadro
          </span>
          <button onClick={limpar} type="button"
            className="text-xs text-white/50 hover:text-white flex items-center gap-1.5">
            <Eraser size={13} /> Limpar
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={encerrar}
          onPointerLeave={encerrar}
          className="w-full h-44 rounded-xl bg-white touch-none cursor-crosshair border-2 border-dashed"
          style={{ borderColor: temTraco ? G : 'rgba(255,255,255,0.2)' }}
        />
        <p className="text-white/30 text-xs mt-2">Use o dedo no celular ou o mouse no computador.</p>
      </div>

      {erro && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg mt-4">{erro}</p>}

      <button
        onClick={enviar}
        disabled={!leu || !temTraco || enviando}
        className="w-full mt-6 py-3.5 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: G }}
      >
        {enviando ? <Loader2 size={17} className="animate-spin" /> : <PenLine size={17} />}
        {enviando ? 'Registrando assinatura...' : 'Assinar contrato'}
      </button>
      {(!leu || !temTraco) && (
        <p className="text-white/30 text-xs text-center mt-2">
          {!leu ? 'Confirme que leu o contrato' : 'Faça sua assinatura no quadro'} para continuar.
        </p>
      )}
    </Moldura>
  )
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050505] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-8">{children}</div>
        <p className="text-center text-white/25 text-xs mt-6">Motocas · Locação e resgate de motos</p>
      </div>
    </main>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-[#0a0a0a] border border-white/5 px-4 py-3">
      <p className="text-white/40 text-xs">{rotulo}</p>
      <p className="text-white font-semibold mt-0.5">{valor}</p>
    </div>
  )
}
