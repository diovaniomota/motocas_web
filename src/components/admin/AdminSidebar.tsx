'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, FileText, Users, Bike, AlertTriangle, Wrench,
  ClipboardCheck, Mail, Package, ShoppingCart, MessageCircle, LogOut,
} from 'lucide-react'
import { clsx } from 'clsx'
import { supabase } from '@/lib/supabase'

const ACCENT = '#39FF14'

const sections = [
  {
    title: 'Operação',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/locacoes', label: 'Locações', icon: FileText },
      { href: '/admin/clientes', label: 'Clientes', icon: Users },
      { href: '/admin/motos', label: 'Motos', icon: Bike },
      { href: '/admin/infracoes', label: 'Infrações', icon: AlertTriangle },
      { href: '/admin/manutencoes', label: 'Manutenções', icon: Wrench },
      { href: '/admin/checklists', label: 'Checklists', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Atendimento e Loja',
    items: [
      { href: '/admin/solicitacoes', label: 'Solicitações', icon: Mail },
      { href: '/admin/pecas', label: 'Peças', icon: Package },
      { href: '/admin/pedidos', label: 'Pedidos de Peças', icon: ShoppingCart },
      { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
    ],
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 border-r border-white/10"
      style={{ backgroundColor: '#050505' }}>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <Image src="/logo.png" alt="Motocas" width={150} height={48} className="object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href)
                return (
                  <Link key={href} href={href}
                    className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active ? 'text-black' : 'text-white/70 hover:bg-white/5 hover:text-white')}
                    style={active ? { backgroundColor: ACCENT } : {}}>
                    <Icon size={18} className="shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
