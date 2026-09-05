'use client'

// Cena 3D de fundo: a malha em perspectiva e, opcionalmente, a moto flutuando
// sobre ela.
//
// A moto entra na MESMA cena em vez de um segundo canvas — dois contextos
// WebGL na mesma página é o dobro de custo para o mesmo resultado.
//
// Importa peça por peça em vez de `import * as THREE`: assim o bundler
// descarta o resto da biblioteca, que é a maior parte dela.
import { useEffect, useRef } from 'react'
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide,
  EdgesGeometry, ExtrudeGeometry, Fog, Group, LineBasicMaterial, LineSegments, Mesh,
  MeshBasicMaterial, PerspectiveCamera, Points, PointsMaterial, Scene, Shape,
  SphereGeometry, TorusGeometry, TubeGeometry, Vector3, WebGLRenderer,
} from 'three'
import {
  CAPACETE, FORMAS, LARGURA, PILOTO, RAIOS_POR_RODA, RODA_ARO_INTERNO, RODA_FRENTE,
  RODA_RAIO, RODA_TRAS, RODA_TUBO, TRACOS,
} from './motoPerfil'

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

/** Monta a moto em neon a partir do perfil: volumes extrudados com aresta
 *  acesa, linhas como tubos e rodas como toros. Devolve o grupo e as rodas,
 *  que giram por fora. */
function construirMoto(cor: number) {
  const grupo = new Group()
  const descartaveis: { dispose(): void }[] = []

  const preenchimento = new MeshBasicMaterial({
    color: cor, transparent: true, opacity: 0.16, side: DoubleSide, depthWrite: false,
  })
  const aresta = new LineBasicMaterial({ color: cor, transparent: true, opacity: 0.95 })
  const solido = new MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.9 })
  descartaveis.push(preenchimento, aresta, solido)

  // volumes: tanque, banco, motor, farol, paralama
  for (const forma of FORMAS) {
    const shape = new Shape()
    forma.pontos.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)))
    shape.closePath()

    const geo = new ExtrudeGeometry(shape, { depth: LARGURA * 2, bevelEnabled: false })
    geo.translate(0, 0, -LARGURA)
    descartaveis.push(geo)

    grupo.add(new Mesh(geo, preenchimento))

    const contorno = new EdgesGeometry(geo)
    descartaveis.push(contorno)
    grupo.add(new LineSegments(contorno, aresta))
  }

  // linhas: quadro, garfo, escape. Duplicadas nos dois lados para terem volume
  for (const traco of TRACOS) {
    const curva = new CatmullRomCurve3(traco.pontos.map(([x, y]) => new Vector3(x, y, 0)))
    const geo = new TubeGeometry(curva, 24, traco.grossura, 6, false)
    descartaveis.push(geo)
    for (const z of [-LARGURA * 0.75, LARGURA * 0.75]) {
      const m = new Mesh(geo, solido)
      m.position.z = z
      grupo.add(m)
    }
  }

  // piloto: um tom mais claro para destacar da moto
  const pele = new MeshBasicMaterial({ color: 0x8cff6a, transparent: true, opacity: 0.92 })
  descartaveis.push(pele)

  const corpoPiloto = new Group()
  for (const parte of PILOTO) {
    const curva = new CatmullRomCurve3(parte.pontos.map(([x, y]) => new Vector3(x, y, 0)))
    const geo = new TubeGeometry(curva, 20, parte.grossura, 6, false)
    descartaveis.push(geo)
    for (const z of [-LARGURA * 0.5, LARGURA * 0.5]) {
      const m = new Mesh(geo, pele)
      m.position.z = z
      corpoPiloto.add(m)
    }
  }

  const capacete = new SphereGeometry(CAPACETE.raio, 16, 12)
  descartaveis.push(capacete)
  const cabeca = new Mesh(capacete, pele)
  cabeca.position.set(CAPACETE.centro[0], CAPACETE.centro[1], 0)
  corpoPiloto.add(cabeca)

  grupo.add(corpoPiloto)

  // rodas
  const rodas: Group[] = []
  for (const [cx, cy] of [RODA_TRAS, RODA_FRENTE]) {
    const roda = new Group()

    const pneu = new TorusGeometry(RODA_RAIO, RODA_TUBO, 8, 40)
    const aro = new TorusGeometry(RODA_ARO_INTERNO, RODA_TUBO * 0.45, 6, 28)
    descartaveis.push(pneu, aro)
    roda.add(new Mesh(pneu, solido), new Mesh(aro, solido))

    const raio = new BoxGeometry(RODA_RAIO * 1.7, RODA_TUBO * 0.5, RODA_TUBO * 0.5)
    descartaveis.push(raio)
    for (let i = 0; i < RAIOS_POR_RODA; i++) {
      const m = new Mesh(raio, solido)
      m.rotation.z = (i * Math.PI) / RAIOS_POR_RODA
      roda.add(m)
    }

    roda.position.set(cx, cy, 0)
    grupo.add(roda)
    rodas.push(roda)
  }

  // o perfil é desenhado com o chão em y=0; centraliza para girar pelo meio.
  // Com o piloto o conjunto vai até ~2.24 de altura, daí o deslocamento maior
  grupo.position.y = -1.12

  const externo = new Group()
  externo.add(grupo)

  return { objeto: externo, rodas, piloto: corpoPiloto, descartaveis }
}

export default function CenaTres({
  intensidade = 1, comMoto = false,
}: {
  intensidade?: number
  /** liga a moto em neon na cena; sem ela fica só a malha */
  comMoto?: boolean
}) {
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
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      return // driver sem WebGL: a seção fica sem o fundo, e só
    }
    renderer.setClearColor(0x000000, 0)
    // teto no pixel ratio: em tela retina o custo dobra sem ganho visível aqui
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    alvo.appendChild(renderer.domElement)

    /* ── a moto ── */
    let moto: ReturnType<typeof construirMoto> | null = null
    if (comMoto) {
      moto = construirMoto(VERDE)
      // à direita e um pouco à frente, longe do texto do hero
      moto.objeto.position.set(6.2, 3.4, 4)
      moto.objeto.scale.setScalar(2.4)
      cena.add(moto.objeto)
    }

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

      // a malha corre em direção à câmera e reaparece no fundo: é isso que dá
      // a sensação de estrada passando, muito mais que girar no próprio eixo
      const comprimento = LINHAS * ESPACO
      const avanco = (t * 5.5) % comprimento

      for (let i = 0; i < posicao.count; i++) {
        const x = base[i * 3]
        let z = base[i * 3 + 2] + avanco
        if (z > comprimento / 2) z -= comprimento
        posicao.setZ(i, z)
        // duas ondas cruzadas dão um movimento orgânico, sem parecer repetição
        posicao.setY(i, Math.sin(x * 0.28 + t * 0.7) * 0.8 + Math.cos(z * 0.22 + t * 0.5) * 0.6)
      }
      posicao.needsUpdate = true

      if (moto) {
        // rodas girando rápido, no sentido de quem anda para a frente
        for (const roda of moto.rodas) roda.rotation.z = -t * 6

        // sobe e desce como quem passa por ondulação da pista, com um
        // repique curto por cima para não virar um balanço de berço
        const solavanco = Math.sin(t * 2.4) * 0.06 + Math.sin(t * 5.7) * 0.02
        moto.objeto.position.y = 3.5 + Math.sin(t * 0.9) * 0.18 + solavanco

        // leve cabeceio: nariz sobe ao acelerar, desce ao aliviar
        moto.objeto.rotation.z = Math.sin(t * 0.6) * 0.05 + solavanco * 0.35

        // oscila em torno do eixo vertical para revelar volume, sem nunca
        // mostrar a moto de frente (onde o perfil não existe)
        moto.objeto.rotation.y = -0.32 + Math.sin(t * 0.35) * 0.22 + mouseX * 0.12

        // o piloto acompanha o solavanco com atraso, como corpo de verdade
        moto.piloto.rotation.z = -solavanco * 0.5
      }

      camera.position.x += (mouseX * 2.2 - camera.position.x) * 0.03
      camera.position.y += (6 - mouseY * 1.4 - camera.position.y) * 0.03
      camera.lookAt(0, 2, 0)

      renderer.render(cena, camera)
    }
    frame = requestAnimationFrame(animar)

    return () => {
      cancelAnimationFrame(frame)
      observador.disconnect()
      window.removeEventListener('pointermove', moveu)
      window.removeEventListener('resize', medir)

      if (moto) {
        cena.remove(moto.objeto)
        for (const d of moto.descartaveis) d.dispose()
      }

      renderer.dispose()
      geometria.dispose()
      pontos.material.dispose()
      if (renderer.domElement.parentNode === alvo) alvo.removeChild(renderer.domElement)
    }
  }, [intensidade, comMoto])

  return <div ref={container} className="absolute inset-0" aria-hidden="true" />
}
