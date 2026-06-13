'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, ArrowLeft, Mail, Lock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou senha incorretos. Verifique suas credenciais.')
      setLoading(false)
      return
    }

    const user = data.user

    // Verificar tipo de usuário na tabela users (igual ao Flutter)
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, ativo')
      .eq('uid', user.id)
      .maybeSingle()

    if (!userData || userData.ativo === false) {
      setError('Usuário não encontrado ou inativo. Contate o administrador.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (userData.is_admin) {
      router.push('/admin/dashboard')
    } else {
      router.push('/cliente/painel')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      {/* Botão Voltar */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium border border-white/30 bg-white/15 hover:bg-white/25 transition-colors"
        >
          <ArrowLeft size={18} />
          Voltar
        </Link>
      </div>

      {/* Card */}
      <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="Motocas"
            width={200}
            height={100}
            className="object-contain"
            priority
          />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-900 text-center">Bem-vindo!</h1>
        <p className="text-gray-500 text-center mt-2 mb-8">Faça login para continuar</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Botão Entrar — verde neon */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-black text-base flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#39FF14' }}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
