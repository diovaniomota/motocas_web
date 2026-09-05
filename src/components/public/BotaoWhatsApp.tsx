'use client'

// Botão fixo de WhatsApp.
//
// O único link de WhatsApp do site estava na seção de contato, no fim da
// página. Para negócio local no Brasil esse botão é o que mais converte — e a
// API já está rodando.
//
// `assunto` monta a mensagem já preenchida: abrir a conversa vazia obriga o
// visitante a explicar do zero o que ele estava vendo.

import { MessageCircle } from 'lucide-react'

const TELEFONE = '5548998448042'

export function linkWhatsApp(assunto?: string): string {
  const texto = assunto
    ? `Olá! Vim pelo site e tenho interesse em ${assunto}.`
    : 'Olá! Vim pelo site da Motocas e gostaria de mais informações.'
  return `https://wa.me/${TELEFONE}?text=${encodeURIComponent(texto)}`
}

export default function BotaoWhatsApp({ assunto }: { assunto?: string }) {
  return (
    <a
      href={linkWhatsApp(assunto)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 pl-4 pr-5 py-3.5 rounded-full font-bold text-sm text-black shadow-2xl hover:scale-105 transition-transform"
      style={{ backgroundColor: '#25D366', boxShadow: '0 8px 30px rgba(37,211,102,0.45)' }}
    >
      <MessageCircle size={20} />
      <span className="hidden sm:inline">Falar no WhatsApp</span>
    </a>
  )
}
