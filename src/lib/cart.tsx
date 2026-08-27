'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ItemCarrinho, Peca } from '@/types'

interface CartContextType {
  itens: ItemCarrinho[]
  quantidadeTotal: number
  valorTotal: number
  adicionarItem: (peca: Peca, quantidade?: number) => void
  removerItem: (pecaId: number) => void
  atualizarQuantidade: (pecaId: number, qtd: number) => void
  limparCarrinho: () => void
}

const CartContext = createContext<CartContextType | null>(null)
const STORAGE_KEY = 'motocas_carrinho'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItens(JSON.parse(raw))
    } catch { /* noop */ }
  }, [])

  function persist(novos: ItemCarrinho[]) {
    setItens(novos)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novos))
  }

  function adicionarItem(peca: Peca, quantidade = 1) {
    const existe = itens.find((i) => i.peca_id === peca.id)
    if (existe) {
      persist(itens.map((i) => i.peca_id === peca.id ? { ...i, quantidade: i.quantidade + quantidade } : i))
    } else {
      persist([...itens, {
        peca_id: peca.id, peca_nome: peca.nome, peca_foto: peca.foto_url,
        preco_unitario: peca.preco, quantidade, estoque_disponivel: peca.estoque,
      }])
    }
  }

  function removerItem(pecaId: number) {
    persist(itens.filter((i) => i.peca_id !== pecaId))
  }

  function atualizarQuantidade(pecaId: number, qtd: number) {
    if (qtd <= 0) { removerItem(pecaId); return }
    persist(itens.map((i) => i.peca_id === pecaId ? { ...i, quantidade: qtd } : i))
  }

  function limparCarrinho() { persist([]) }

  const quantidadeTotal = itens.reduce((s, i) => s + i.quantidade, 0)
  const valorTotal = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)

  return (
    <CartContext.Provider value={{ itens, quantidadeTotal, valorTotal, adicionarItem, removerItem, atualizarQuantidade, limparCarrinho }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}
