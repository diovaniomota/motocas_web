'use client'

// Camada 3D de fundo, usada nas seções de destaque do site.
//
// É aqui que fica a decisão de custo, separada da cena em si:
//
//   • o three.js entra por import dinâmico — não pesa no bundle inicial nem
//     atrasa a primeira pintura, que é o que o Google mede e o que segura o
//     visitante no 4G;
//   • não carrega em tela estreita: no celular custa bateria e quase não
//     aparece atrás do conteúdo;
//   • respeita "prefers-reduced-motion", que é gente com enjoo de movimento
//     pedindo explicitamente para parar;
//   • só começa a carregar quando a seção chega perto da viewport.
//
// Sem nada disso, some a camada e o site continua igual — o conteúdo nunca
// depende dela.

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const CenaTres = dynamic(() => import('./CenaTres'), { ssr: false, loading: () => null })

/** Largura a partir da qual vale a pena. Abaixo disso é celular. */
const LARGURA_MINIMA = 1024

export default function Fundo3D({ intensidade = 1 }: { intensidade?: number }) {
  const marcador = useRef<HTMLDivElement | null>(null)
  const [carregar, setCarregar] = useState(false)

  useEffect(() => {
    if (window.innerWidth < LARGURA_MINIMA) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const alvo = marcador.current
    if (!alvo) return

    const observador = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setCarregar(true)
        observador.disconnect()
      }
    }, { rootMargin: '200px' })

    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  return (
    <div ref={marcador} className="absolute inset-0 overflow-hidden pointer-events-none">
      {carregar && (
        <div className="absolute inset-0 fundo3d-entrada">
          <CenaTres intensidade={intensidade} />
        </div>
      )}
    </div>
  )
}
