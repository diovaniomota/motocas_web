'use client'

import PublicNavbar from '@/components/public/PublicNavbar'
import PublicFooter from '@/components/public/PublicFooter'
import { SectionHeader } from '@/components/public/PublicCards'

const G = '#39FF14'
const CONTACT_PHONE_INTL = '5548998448042'

export default function CarreirasPage() {
  return (
    <div className="bg-black min-h-screen text-white">
      <PublicNavbar />
      <section className="py-20 px-6 bg-black">
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Time MOTOCAS" title="Trabalhe com uma marca que quer crescer com mais presença" subtitle="Se você curte operação, atendimento, motos e gosta de construir algo bem feito, esse é um bom lugar para conversar." />
          <div className="mt-10 max-w-[760px] mx-auto p-9 rounded-3xl border text-center" style={{ background: 'linear-gradient(135deg, #171717, #202020)', borderColor: G + '38' }}>
            <p className="text-white text-lg leading-loose mb-7">
              Estamos sempre em busca de profissionais talentosos e dedicados. Se você é apaixonado por motos e quer fazer parte de uma equipe dinâmica, envie seu currículo.
            </p>
            <a href={`https://wa.me/${CONTACT_PHONE_INTL}`} target="_blank" rel="noopener noreferrer" className="inline-block px-11 py-5 rounded-2xl font-extrabold text-base text-black hover:opacity-90 transition-opacity" style={{ backgroundColor: G }}>
              Entre em Contato
            </a>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  )
}
