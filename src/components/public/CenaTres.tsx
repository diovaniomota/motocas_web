'use client'

// Cena 3D de fundo — a malha em perspectiva que corre sob o conteúdo.
//
// Só é carregada por Fundo3D, e só quando vale a pena. Aqui dentro pode
// existir three.js à vontade; o custo já foi decidido lá fora.
//
// Importa peça por peça em vez de `import * as THREE`: assim o bundler
// descarta o resto da biblioteca, que é a maior parte dela.
import { useEffect, useRef } from 'react'
import {
  BufferAttribute, BufferGeometry, Color, Fog, Points, PointsMaterial,
  PerspectiveCamera, Scene, WebGLRenderer,
} from 'three'

const VERDE = 0x39ff14

/** Pontos numa grade no plano do chão; a onda é aplicada quadro a quadro. */
function malha(colunas: number, linhas: number, espaco: number) {
  const posicoes = new Float32Array(colunas * linhas * 3)
  let i = 0
  for (let x = 0; x < colunas; x++) {
    for (let z = 0; z < linhas; z++) {
      posicoes[i++] = (x - colunas / 2) * espaco
      posicoes[i++] = 0
      posicoes[i++] = (z - linhas / 2) * espaco
    }
  }
  return posicoes
}

export default function CenaTres({ intensidade = 1 }: { intensidade?: number }) {
  const container = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const alvo = container.current
    if (!alvo) return

    const COLUNAS = 48, LINHAS = 34, ESPACO = 1.5
    const base = malha(COLUNAS, LINHAS, ESPACO)

    const geometria = new BufferGeometry()
    geometria.setAttribute('position', new BufferAttribute(base.slice(), 3))

    const cena = new Scene()
    cena.fog = new Fog(0x000000, 18, 52) // some nas bordas, sem corte seco

    const pontos = new Points(geometria, new PointsMaterial({
      color: new Color(VERDE),
      size: 0.09,
      transparent: true,
      opacity: 0.55 * intensidade,
      sizeAttenuation: true,
      fog: true,
    }))
    cena.add(pontos)

    const camera = new PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.set(0, 6, 22)
    camera.lookAt(0, 0, 0)

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
    } catch {
      return // driver sem WebGL: a seção fica sem o fundo, e só
    }
    renderer.setClearColor(0x000000, 0)
    // teto no pixel ratio: em tela retina o custo dobra sem ganho visível aqui
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    alvo.appendChild(renderer.domElement)

    function medir() {
      if (!alvo) return
      const { clientWidth: w, clientHeight: h } = alvo
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    medir()

    // parallax leve com o mouse: o suficiente para a cena parecer viva
    let mouseX = 0, mouseY = 0
    const moveu = (e: PointerEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', moveu, { passive: true })
    window.addEventListener('resize', medir)

    // só anima o que está na tela e com a aba visível — animação rodando fora
    // de vista é bateria do visitante queimada à toa
    let visivel = true
    const observador = new IntersectionObserver(
      ([e]) => { visivel = e.isIntersecting },
      { threshold: 0 },
    )
    observador.observe(alvo)

    const posicao = geometria.getAttribute('position') as BufferAttribute
    let frame = 0
    const inicio = performance.now()

    function animar(agora: number) {
      frame = requestAnimationFrame(animar)
      if (!visivel || document.hidden) return

      const t = (agora - inicio) / 1000

      for (let i = 0; i < posicao.count; i++) {
        const x = base[i * 3]
        const z = base[i * 3 + 2]
        // duas ondas cruzadas dão um movimento orgânico, sem parecer repetição
        posicao.setY(i, Math.sin(x * 0.28 + t * 0.7) * 0.8 + Math.cos(z * 0.22 + t * 0.5) * 0.6)
      }
      posicao.needsUpdate = true

      pontos.rotation.y = t * 0.04
      camera.position.x += (mouseX * 2.2 - camera.position.x) * 0.03
      camera.position.y += (6 - mouseY * 1.4 - camera.position.y) * 0.03
      camera.lookAt(0, 0, 0)

      renderer.render(cena, camera)
    }
    frame = requestAnimationFrame(animar)

    return () => {
      cancelAnimationFrame(frame)
      observador.disconnect()
      window.removeEventListener('pointermove', moveu)
      window.removeEventListener('resize', medir)
      renderer.dispose()
      geometria.dispose()
      pontos.material.dispose()
      if (renderer.domElement.parentNode === alvo) alvo.removeChild(renderer.domElement)
    }
  }, [intensidade])

  return <div ref={container} className="absolute inset-0" aria-hidden="true" />
}
