// ─── Perfil da moto, em coordenadas ───
//
// Silhueta de naked 160 vista de lado, no plano XY (x = frente, y = cima).
//
// Duas listas porque a leitura depende das duas: FORMAS são os volumes
// preenchidos (tanque, motor, rabeta) e TRACOS são as linhas finas (quadro,
// garfo, escape). Só com linhas a silhueta lê como bicicleta — o que dá a
// leitura de moto é a massa no meio.
//
// A roda tem raio 0.62 e a moto ~3.3 de comprimento: proporção de moto, não
// de bike, onde a roda é grande em relação ao corpo.

export const RODA_RAIO = 0.50
export const RODA_TUBO = 0.10
export const RODA_ARO_INTERNO = 0.24

export const RODA_TRAS: [number, number] = [-1.20, 0.50]
export const RODA_FRENTE: [number, number] = [1.20, 0.50]

/** Volumes preenchidos: é o que dá peso à silhueta. */
export const FORMAS: { nome: string; pontos: [number, number][] }[] = [
  {
    // banco e rabeta: baixos e retos, terminando em ponta atrás
    nome: 'rabeta',
    pontos: [
      [-1.46, 1.16], [-1.06, 1.21], [-0.64, 1.17], [-0.30, 1.13],
      [-0.26, 1.00], [-0.76, 0.99], [-1.20, 1.00], [-1.43, 1.05],
    ],
  },
  {
    // tanque: o volume alto na frente. O entalhe entre ele e o banco é o que
    // faz a silhueta ler como moto e não como um bloco só
    nome: 'tanque',
    pontos: [
      [-0.30, 1.19], [-0.04, 1.38], [0.28, 1.50], [0.54, 1.44],
      [0.66, 1.26], [0.58, 1.06], [0.20, 1.00], [-0.28, 1.02],
    ],
  },
  {
    // bloco do motor: o volume baixo entre as rodas
    nome: 'motor',
    pontos: [
      [-0.30, 0.99], [0.26, 0.99], [0.34, 0.76], [0.14, 0.55],
      [-0.24, 0.53], [-0.40, 0.78],
    ],
  },
  {
    // farol / frente
    nome: 'farol',
    pontos: [[0.70, 1.56], [0.94, 1.52], [0.98, 1.30], [0.74, 1.32]],
  },
  {
    // paralama dianteiro
    nome: 'paralama',
    pontos: [[0.88, 0.94], [1.22, 1.02], [1.50, 0.90], [1.46, 0.80], [1.20, 0.90], [0.92, 0.84]],
  },
]

/** Linhas finas: quadro, garfo, balança, escape e guidão. */
export const TRACOS: { nome: string; pontos: [number, number][]; grossura: number }[] = [
  {
    nome: 'garfo',
    grossura: 0.055,
    pontos: [[0.76, 1.36], [0.98, 0.94], [1.20, 0.50]],
  },
  {
    nome: 'guidao',
    grossura: 0.042,
    pontos: [[0.48, 1.60], [0.76, 1.56], [0.90, 1.52]],
  },
  {
    nome: 'balanca',
    grossura: 0.05,
    pontos: [[-0.32, 0.80], [-0.76, 0.64], [-1.20, 0.50]],
  },
  {
    nome: 'escape',
    grossura: 0.06,
    pontos: [[0.16, 0.66], [-0.44, 0.48], [-1.04, 0.44], [-1.40, 0.52]],
  },
  {
    nome: 'amortecedor',
    grossura: 0.04,
    pontos: [[-0.40, 0.98], [-0.60, 0.74], [-0.76, 0.62]],
  },
]

/** Quantidade de raios desenhados em cada roda. */
export const RAIOS_POR_RODA = 5

/** Meia-largura da moto: formas e traços são espelhados nesses dois planos. */
export const LARGURA = 0.15


/* ── piloto ──────────────────────────────────────────────────
   Postura de quem está rodando relaxado: tronco levemente à frente, braço
   esticado até o guidão, perna dobrada na pedaleira. O capacete é um círculo
   à parte porque é ele que faz a figura ler como pessoa. */

export const CAPACETE: { centro: [number, number]; raio: number } = {
  centro: [0.12, 2.06],
  raio: 0.175,
}

export const PILOTO: { nome: string; pontos: [number, number][]; grossura: number }[] = [
  {
    // tronco: do quadril no banco até o ombro
    nome: 'tronco',
    grossura: 0.095,
    pontos: [[-0.42, 1.30], [-0.22, 1.58], [-0.02, 1.84]],
  },
  {
    // braço até o guidão
    nome: 'braco',
    grossura: 0.055,
    pontos: [[-0.02, 1.84], [0.34, 1.74], [0.66, 1.60]],
  },
  {
    // coxa e canela, dobradas na pedaleira
    nome: 'perna',
    grossura: 0.07,
    pontos: [[-0.42, 1.30], [-0.04, 1.10], [-0.12, 0.74]],
  },
  {
    // pé apoiado
    nome: 'pe',
    grossura: 0.05,
    pontos: [[-0.20, 0.72], [0.02, 0.72]],
  },
]
