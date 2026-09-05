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
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Fog, Mesh,
  PerspectiveCamera, PlaneGeometry, Points, PointsMaterial, Scene, ShaderMaterial,
  TextureLoader, WebGLRenderer, type Texture,
} from 'three'

const VERDE = 0x39ff14

/* ── recorte do fundo da foto ──────────────────────────────────
   As fotos da frota são de catálogo: perfil lateral em fundo cinza claro de
   estúdio. Em vez de exigir PNG recortado, o próprio shader descarta o que
   for claro E sem cor — a moto é preta com tanque vermelho, então sobra.
   O corte é suave para a borda não ficar serrilhada. */
const FRAGMENTO = `
  varying vec2 vUv;
  uniform sampler2D mapa;
  uniform float opacidade;

  void main() {
    vec4 c = texture2D(mapa, vUv);
    float maxc = max(c.r, max(c.g, c.b));
    float minc = min(c.r, min(c.g, c.b));
    float saturacao = maxc - minc;
    float luz = dot(c.rgb, vec3(0.299, 0.587, 0.114));

    // limiares calibrados na foto real da frota: acima disso sobrava a sombra
    // do estúdio no rodapé e um halo claro em volta da silhueta
    float fundo = smoothstep(0.55, 0.78, luz) * (1.0 - smoothstep(0.05, 0.16, saturacao));
    float a = (1.0 - fundo) * opacidade;
    if (a < 0.01) discard;
    gl_FragColor = vec4(c.rgb, a);
  }
`

const VERTICE = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** Brilho suave sob a moto, para ela não parecer colada no vazio. */
const BRILHO = `
  varying vec2 vUv;
  void main() {
    float d = distance(vUv, vec2(0.5));
    float i = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(0.224, 1.0, 0.078, i * 0.18);
  }
`

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

export default function CenaTres({
  intensidade = 1, moto,
}: {
  intensidade?: number
  /** URL da foto da moto. Sem ela, fica só a malha. */
  moto?: string
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
    let planoMoto: Mesh | null = null
    let planoBrilho: Mesh | null = null
    let textura: Texture | null = null

    if (moto) {
      const carregador = new TextureLoader()
      carregador.setCrossOrigin('anonymous')
      carregador.load(moto, (tex) => {
        textura = tex
        const img = tex.image as { width: number; height: number }
        const proporcao = img.width / Math.max(1, img.height)

        const altura = 7.5
        planoMoto = new Mesh(
          new PlaneGeometry(altura * proporcao, altura),
          new ShaderMaterial({
            uniforms: { mapa: { value: tex }, opacidade: { value: 1 } },
            vertexShader: VERTICE,
            fragmentShader: FRAGMENTO,
            transparent: true,
            side: DoubleSide,
            depthWrite: false,
          }),
        )
        planoMoto.position.set(0, 4.2, 6)
        cena.add(planoMoto)

        planoBrilho = new Mesh(
          new PlaneGeometry(altura * proporcao * 1.1, altura * 0.5),
          new ShaderMaterial({
            uniforms: {},
            vertexShader: VERTICE,
            fragmentShader: BRILHO,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
          }),
        )
        planoBrilho.rotation.x = -Math.PI / 2
        planoBrilho.position.set(0, 0.15, 6)
        cena.add(planoBrilho)
      })
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

      for (let i = 0; i < posicao.count; i++) {
        const x = base[i * 3]
        const z = base[i * 3 + 2]
        // duas ondas cruzadas dão um movimento orgânico, sem parecer repetição
        posicao.setY(i, Math.sin(x * 0.28 + t * 0.7) * 0.8 + Math.cos(z * 0.22 + t * 0.5) * 0.6)
      }
      posicao.needsUpdate = true

      pontos.rotation.y = t * 0.04

      if (planoMoto) {
        // flutua devagar e inclina de leve seguindo o mouse: dá volume sem
        // revelar que é um plano
        planoMoto.position.y = 4.2 + Math.sin(t * 0.8) * 0.22
        planoMoto.rotation.y = mouseX * 0.16
        planoMoto.rotation.z = -mouseX * 0.02
        if (planoBrilho) {
          planoBrilho.position.y = 0.15
          ;(planoBrilho.material as ShaderMaterial).opacity = 1
        }
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

      for (const m of [planoMoto, planoBrilho]) {
        if (!m) continue
        cena.remove(m)
        m.geometry.dispose()
        ;(m.material as ShaderMaterial).dispose()
      }
      textura?.dispose()

      renderer.dispose()
      geometria.dispose()
      pontos.material.dispose()
      if (renderer.domElement.parentNode === alvo) alvo.removeChild(renderer.domElement)
    }
  }, [intensidade, moto])

  return <div ref={container} className="absolute inset-0" aria-hidden="true" />
}
