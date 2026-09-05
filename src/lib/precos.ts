// ─── Preços para a área pública ───
//
// A tabela `alugueis` já vinha preenchida e o site não mostrava valor nenhum:
// todo visitante tinha que perguntar "quanto custa?" no WhatsApp, e a maioria
// só fechava a aba.
//
// O carregamento é compartilhado entre todos os cards por uma promise em
// cache: sem isso, uma grade com 8 motos faria 8 consultas idênticas.
import { precoService } from './services'
import type { TipoAluguel } from '@/types'

let cache: Promise<TipoAluguel[]> | null = null

export function carregarPrecos(): Promise<TipoAluguel[]> {
  cache ??= precoService.getTipos().catch(() => [])
  return cache
}

const valorDe = (t: TipoAluguel) => Number(t.valor_aluguel || 0)

/** Pacote de diária, que é o que faz sentido estampar no card.
 *  Sem ele, cai no mais barato da tabela. */
export function precoDiaria(tipos: TipoAluguel[]): TipoAluguel | null {
  if (tipos.length === 0) return null
  const diaria = tipos.find((t) =>
    (t.tipo_aluguel || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().includes('diaria'))
  return diaria ?? tipos.reduce((menor, t) => (valorDe(t) < valorDe(menor) ? t : menor), tipos[0])
}

export const formatarPreco = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
