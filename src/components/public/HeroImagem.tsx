'use client'

// Foto de fundo do hero — pessoa real pilotando.
//
// A URL vem do app_settings (`hero_imagem`), não do código: assim a Motocas
// troca a foto sem depender de deploy, e enquanto não houver foto o hero
// simplesmente fica como está hoje, sem buraco nem placeholder feio.
//
// O movimento é de propósito discreto: um zoom lento e um parallax curto no
// scroll. Foto de gente sorrindo já carrega a emoção; efeito demais só
// atrapalha a leitura do título.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HeroImagem() {
  const [url, setUrl] = useState<string | null>(null)
  const [deslocamento, setDeslocamento] = useState(0)

  useEffect(() => {
    let vivo = true
    void (async () => {
      try {
        const { data } = await supabase.from('app_settings')
          .select('value').eq('key', 'hero_imagem').maybeSingle()
        const valor = (data?.value ?? '').trim()
        if (vivo && valor) setUrl(valor)
      } catch { /* sem configuração: hero segue sem foto */ }
    })()
    return () => { vivo = false }
  }, [])

  useEffect(() => {
    if (!url) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // parallax curto: a foto sobe mais devagar que a página
    const rolou = () => setDeslocamento(Math.min(window.scrollY, 700) * 0.15)
    window.addEventListener('scroll', rolou, { passive: true })
    return () => window.removeEventListener('scroll', rolou)
  }, [url])

  if (!url) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute inset-0 hero-zoom"
        style={{ transform: `translate3d(0, ${deslocamento}px, 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover object-[70%_center]"
        />
      </div>

      {/* O texto do hero é alinhado à esquerda: o degradê escurece esse lado
          para o título continuar legível sobre qualquer foto. */}
      <div className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(3,3,3,0.96) 0%, rgba(3,3,3,0.88) 34%, rgba(3,3,3,0.45) 62%, rgba(3,3,3,0.30) 100%)',
        }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(3,3,3,0.55) 0%, transparent 30%, rgba(5,5,5,0.9) 100%)' }} />
    </div>
  )
}
