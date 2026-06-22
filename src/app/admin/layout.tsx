'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.user) {
          router.push('/login')
          return
        }

        const user = session.user

        // Verificar se é admin
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('uid', user.id)
          .maybeSingle()

        if (error) {
          console.error('Erro de rede ao verificar permissão:', error)
          // Em caso de erro de rede, não deslogamos imediatamente, 
          // mas como segurança, redirecionamos para login.
          // Porém, para evitar deslogar "sozinho", podemos apenas alertar ou tentar novamente.
          // O melhor é mostrar um erro e não dar push('/login').
          alert('Erro ao verificar permissão. Verifique sua conexão.')
          return
        }

        if (!userData?.is_admin) {
          router.push('/login')
          return
        }

        setLoading(false)
      } catch (err) {
        console.error('Erro na autenticação do admin:', err)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: '#39FF14', borderTopColor: 'transparent' }} />
        <p className="text-white/50 text-sm mt-4">Verificando permissões...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-screen bg-black text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-auto">{children}</div>
    </div>
  )
}
