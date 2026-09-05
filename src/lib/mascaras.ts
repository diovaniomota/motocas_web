// ─── Máscaras de campos brasileiros ───
//
// Exibimos formatado e gravamos só os dígitos, mantendo o formato dos
// registros antigos e evitando lixo digitado. Registros criados antes das
// máscaras têm dados inválidos (um CPF com 17 dígitos derrubou a cobrança
// na Pagar.me), por isso as telas que consomem esses dados também validam.

export const digitos = (v: string) => v.replace(/\D/g, '')

export function maskCpf(v: string): string {
  const d = digitos(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function maskPhone(v: string): string {
  const d = digitos(v).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  // 10 dígitos = fixo (4+4), 11 = celular (5+4)
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskCep(v: string): string {
  const d = digitos(v).slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

export const maskCnh = (v: string) => digitos(v).slice(0, 11)
export const maskUf = (v: string) => v.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2)

/** Valida CPF de verdade, com dígitos verificadores.
 *
 *  Só conferir o tamanho não basta: a Pagar.me recusa transação de cartão com
 *  `validation_error | customer | Invalid CPF` quando os dígitos não fecham —
 *  mas aceita PIX com o mesmo CPF, então o problema passa despercebido até
 *  alguém tentar pagar com cartão. E o CPF também vai impresso no contrato. */
export function cpfValido(v: string): boolean {
  const d = digitos(v)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // 111.111.111-11 e afins passam na conta

  for (const ate of [9, 10]) {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i)
    const dv = ((soma * 10) % 11) % 10
    if (dv !== Number(d[ate])) return false
  }
  return true
}
export const telefoneValido = (v: string) => [10, 11].includes(digitos(v).length)
