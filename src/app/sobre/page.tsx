'use client'

import PublicNavbar from '@/components/public/PublicNavbar'
import PublicFooter from '@/components/public/PublicFooter'
import { SectionHeader } from '@/components/public/PublicCards'

const G = '#39FF14'

export default function SobrePage() {
  return (
    <div className="bg-black min-h-screen text-white">
      <PublicNavbar />
      <section className="py-20 px-6" style={{ backgroundColor: '#0E0E0E' }}>
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Essência da marca" title="Uma operação com cara de marca, não só de sistema" subtitle="A proposta da MOTOCAS é unir mobilidade, atendimento e conveniência em uma experiência mais organizada e mais confiável para o cliente." />
          <div className="mt-9 p-8 rounded-3xl border border-white/8 bg-[#171717] max-w-3xl mx-auto">
            <p className="text-white/70 text-lg leading-loose text-center">
              Há mais de 10 anos no mercado, a MOTOCAS é referência em aluguel de motos e venda de peças e acessórios. Nossa missão é oferecer o melhor serviço com qualidade, segurança e uma experiência mais clara em cada ponto de contato.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-7">
            {[{ n: '10+', l: 'Anos de Experiência' }, { n: '500+', l: 'Clientes Satisfeitos' }, { n: '100+', l: 'Motos Disponíveis' }].map((s) => (
              <div key={s.n} className="w-44 px-5 py-6 rounded-2xl border border-white/8 bg-[#171717] text-center">
                <p className="text-4xl font-extrabold" style={{ color: G }}>{s.n}</p>
                <p className="text-sm text-white/70 mt-2 leading-snug">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  )
}
