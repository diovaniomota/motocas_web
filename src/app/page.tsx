'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, ShoppingBag, Bike, Phone, Mail, MapPin, ExternalLink } from 'lucide-react'
import { motoService, pecaService } from '@/lib/services'
import type { Moto, Peca } from '@/types'
import PublicNavbar from '@/components/public/PublicNavbar'
import PublicFooter from '@/components/public/PublicFooter'
import { MotoCard, PecaCard, SectionHeader } from '@/components/public/PublicCards'

const G = '#39FF14'
const CONTACT_PHONE = '(48) 99844-8042'
const CONTACT_PHONE_INTL = '5548998448042'
const CONTACT_EMAIL = 'contato@motocas.com.br'

export default function HomePage() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [pecas, setPecas] = useState<Peca[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([motoService.getMotosDisponiveis(), pecaService.getPecasAtivas()])
      .then(([m, p]) => { setMotos(m.slice(0, 8)); setPecas(p.slice(0, 8)) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-black min-h-screen text-white">
      <PublicNavbar />

      {/* HERO */}
      <section id="inicio" className="relative overflow-hidden" style={{ minHeight: 760, background: 'linear-gradient(135deg, #030303, #0A1209, #050505)' }}>
        <div className="absolute top-20 -right-20 w-80 h-80 rounded-full opacity-20" style={{ background: G, filter: 'blur(120px)' }} />
        <div className="absolute -left-10 bottom-10 w-56 h-56 rounded-full bg-white/3" />
        <div className="max-w-[1320px] mx-auto px-6 py-32 relative z-10">
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-white/14 bg-white/8 mb-6">
            <span className="text-xs font-extrabold tracking-widest" style={{ color: G }}>MOBILIDADE COM PRESENÇA</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-none tracking-tight max-w-[760px] mb-5">
            Aluguel de motos, peças e atendimento rápido para quem vive em movimento.
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-[700px] leading-relaxed mb-8">
            A plataforma da MOTOCAS reúne frota disponível, compra de peças, consulta de pedidos e um processo simples para você resolver tudo sem fricção.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            {[{ icon: <Bike size={15} />, label: 'Frota disponível' }, { icon: <ShoppingBag size={15} />, label: 'Peças em estoque' }, { icon: <Zap size={15} />, label: 'Atendimento ágil' }].map((chip) => (
              <div key={chip.label} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/12 bg-white/6 text-sm font-semibold text-white">
                <span style={{ color: G }}>{chip.icon}</span>{chip.label}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mb-12">
            <Link href="/aluguel" className="px-8 py-5 rounded-2xl font-extrabold text-base text-black hover:opacity-90 transition-opacity" style={{ backgroundColor: G }}>VER MOTOS DISPONÍVEIS</Link>
            <Link href="/pecas-acessorios" className="px-7 py-5 rounded-2xl font-bold text-base text-white border border-white/18 bg-white/3 hover:bg-white/8 transition-colors">EXPLORAR PEÇAS</Link>
          </div>
          <div className="flex flex-wrap gap-4">
            {[{ value: '10+', label: 'anos acelerando confiança' }, { value: '500+', label: 'clientes atendidos' }, { value: 'Suporte', label: 'humano e rápido' }].map((m) => (
              <div key={m.value} className="min-w-[160px] px-5 py-5 rounded-2xl border border-white/8 bg-white/5">
                <p className="text-3xl font-extrabold" style={{ color: G }}>{m.value}</p>
                <p className="text-sm text-white/70 font-medium mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALUGUEL */}
      <section className="py-20 px-6" style={{ backgroundColor: '#0B0B0B' }}>
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Frota pronta" title="Motos disponíveis para aluguel" subtitle="Modelos selecionados para quem precisa rodar com agilidade, presença e confiança no dia a dia." />
          <div className="mt-10">
            {loading ? <Loading /> : motos.length === 0 ? <Empty msg="Nenhuma moto disponível no momento" /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">{motos.map((m) => <MotoCard key={m.id} moto={m} />)}</div>
            )}
            <div className="text-center mt-8"><Link href="/aluguel" className="text-sm font-bold" style={{ color: G }}>Ver frota completa →</Link></div>
          </div>
        </div>
      </section>

      {/* PEÇAS */}
      <section className="py-20 px-6 bg-black">
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Loja MOTOCAS" title="Peças e acessórios" subtitle="Uma vitrine com leitura melhor, foco em estoque e um caminho de compra mais claro para o cliente." />
          <div className="mt-10">
            {pecas.length === 0 ? <Empty msg="Nenhuma peça disponível no momento" /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{pecas.map((p) => <PecaCard key={p.id} peca={p} />)}</div>
            )}
            <div className="text-center mt-8"><Link href="/pecas-acessorios" className="text-sm font-bold" style={{ color: G }}>Ver catálogo completo →</Link></div>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section className="py-20 px-6" style={{ backgroundColor: '#0E0E0E' }}>
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Essência da marca" title="Uma operação com cara de marca, não só de sistema" subtitle="A proposta da MOTOCAS é unir mobilidade, atendimento e conveniência em uma experiência mais organizada e mais confiável para o cliente." />
          <div className="mt-9 p-8 rounded-3xl border border-white/8 bg-[#171717] max-w-3xl mx-auto">
            <p className="text-white/70 text-lg leading-loose text-center">Há mais de 10 anos no mercado, a MOTOCAS é referência em aluguel de motos e venda de peças e acessórios. Nossa missão é oferecer o melhor serviço com qualidade, segurança e uma experiência mais clara em cada ponto de contato.</p>
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

      {/* CARREIRAS */}
      <section className="py-20 px-6 bg-black">
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Time MOTOCAS" title="Trabalhe com uma marca que quer crescer com mais presença" subtitle="Se você curte operação, atendimento, motos e gosta de construir algo bem feito, esse é um bom lugar para conversar." />
          <div className="mt-10 max-w-[760px] mx-auto p-9 rounded-3xl border text-center" style={{ background: 'linear-gradient(135deg, #171717, #202020)', borderColor: G + '38' }}>
            <p className="text-white text-lg leading-loose mb-7">Estamos sempre em busca de profissionais talentosos e dedicados. Se você é apaixonado por motos e quer fazer parte de uma equipe dinâmica, envie seu currículo.</p>
            <a href={`https://wa.me/${CONTACT_PHONE_INTL}`} target="_blank" rel="noopener noreferrer" className="inline-block px-11 py-5 rounded-2xl font-extrabold text-base text-black hover:opacity-90 transition-opacity" style={{ backgroundColor: G }}>Entre em Contato</a>
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" className="py-20 px-6" style={{ backgroundColor: '#0B0B0B' }}>
        <div className="max-w-[1320px] mx-auto">
          <SectionHeader eyebrow="Fale com a gente" title="Entre em contato" subtitle="Atendimento humano e rápido para dúvidas, contratos e currículos." />
          <div className="mt-10 max-w-[760px] mx-auto flex flex-col gap-5">
            <ContactItem icon={<Phone size={28} />} label="Telefone" value={CONTACT_PHONE} subtitle="Atendimento comercial e suporte" href={`https://wa.me/${CONTACT_PHONE_INTL}`} />
            <ContactItem icon={<Mail size={28} />} label="E-mail" value={CONTACT_EMAIL} subtitle="Para dúvidas, propostas e currículos" href={`mailto:${CONTACT_EMAIL}`} />
            <ContactItem icon={<MapPin size={28} />} label="Endereço" value="Rua das Motos, 123 - São Paulo, SP" subtitle="Base operacional e atendimento presencial" />
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}

function Loading() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: G, borderTopColor: 'transparent' }} /></div>
}
function Empty({ msg }: { msg: string }) {
  return <p className="text-center text-white/70 text-lg py-16">{msg}</p>
}
function ContactItem({ icon, label, value, subtitle, href }: { icon: React.ReactNode; label: string; value: string; subtitle: string; href?: string }) {
  const inner = (
    <div className="p-6 rounded-2xl border border-white/8 bg-[#171717] flex items-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#39FF1419' }}><span style={{ color: G }}>{icon}</span></div>
      <div className="flex-1">
        <p className="text-white/70 text-sm">{label}</p>
        <p className="text-white text-xl font-extrabold mt-1">{value}</p>
        <p className="text-white/54 text-xs mt-1.5">{subtitle}</p>
      </div>
      {href && <ExternalLink size={18} className="text-white/54 shrink-0" />}
    </div>
  )
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:brightness-110 transition-all">{inner}</a> : <div>{inner}</div>
}
