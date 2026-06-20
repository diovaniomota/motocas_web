import Image from 'next/image'

const CONTACT_PHONE = '(48) 99844-8042'
const CONTACT_EMAIL = 'contato@sosmotocas.com.br'

export default function PublicFooter() {
  return (
    <footer className="bg-black border-t border-white/10 px-8 py-10 text-center">
      <Image src="/logo.png" alt="Motocas" width={150} height={60} className="object-contain mx-auto mb-5" />
      <p className="text-white/70 text-sm leading-relaxed max-w-lg mx-auto mb-4">
        Aluguel de motos, peças e atendimento com mais clareza em uma experiência mais elegante.
      </p>
      <div className="flex flex-wrap justify-center gap-5 mb-5">
        <span className="text-sm font-bold" style={{ color: '#7CFF68' }}>{CONTACT_PHONE}</span>
        <span className="text-sm font-semibold text-white/70">{CONTACT_EMAIL}</span>
      </div>
      <p className="text-white/54 text-xs">© 2026 MOTOCAS - Todos os direitos reservados</p>
    </footer>
  )
}
