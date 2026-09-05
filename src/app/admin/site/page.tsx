'use client'

// Ajustes da página pública.
//
// Existe para a foto do hero poder ser trocada sem deploy e sem abrir o banco.
// Se a Motocas precisar de mim para trocar uma imagem, a funcionalidade não
// está pronta.

import { useEffect, useRef, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { Button, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { registrarEvento } from '@/lib/eventos'
import { ImagePlus, Trash2, Loader2, Save, AlertTriangle } from 'lucide-react'

const G = '#39FF14'
const BUCKET = 'fotos'
const CHAVE = 'hero_imagem'

export default function SitePage() {
  const [url, setUrl] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  const arquivo = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.from('app_settings')
          .select('value').eq('key', CHAVE).maybeSingle()
        setUrl(data?.value ?? '')
      } finally {
        setCarregando(false)
      }
    })()
  }, [])

  async function salvar(novo: string) {
    setSalvando(true)
    setAviso('')
    try {
      const { error } = await supabase.from('app_settings')
        .upsert([{ key: CHAVE, value: novo }], { onConflict: 'key' })
      if (error) { setAviso(`Não foi possível salvar: ${error.message}`); return }

      setUrl(novo)
      void registrarEvento({
        tabela: 'app_settings', registroId: CHAVE,
        acao: novo ? 'alterou_hero' : 'removeu_hero',
        descricao: novo ? 'Foto do hero atualizada' : 'Foto do hero removida',
      })
    } finally {
      setSalvando(false)
    }
  }

  async function enviar(f: File) {
    setEnviando(true)
    setAviso('')
    try {
      const ext = f.name.split('.').pop()?.toLowerCase() || 'jpg'
      const caminho = `hero/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from(BUCKET)
        .upload(caminho, f, { contentType: f.type || 'image/jpeg', upsert: true })
      if (error) { setAviso(`Falha no upload: ${error.message}`); return }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)
      await salvar(data.publicUrl)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <AdminHeader title="Site" subtitle="Ajustes da página pública" />

      <main className="flex-1 p-6">
        <div className="max-w-2xl">
          <h2 className="text-white font-bold text-lg">Foto do topo da home</h2>
          <p className="text-white/55 text-sm mt-1.5 leading-relaxed">
            Aparece atrás do título, com escurecimento à esquerda para o texto
            continuar legível. Funciona melhor com <strong className="text-white/80">foto
            horizontal de alguém pilotando</strong>, com espaço livre do lado esquerdo.
            Sem foto configurada, o topo fica como está hoje.
          </p>

          {carregando ? (
            <div className="py-16 flex justify-center"><Spinner /></div>
          ) : (
            <>
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
                {url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Foto do topo" className="w-full h-56 object-cover object-[70%_center]" />
                    {/* mesma máscara da home, para conferir a legibilidade aqui */}
                    <div className="absolute inset-0" style={{
                      background: 'linear-gradient(90deg, rgba(3,3,3,0.96) 0%, rgba(3,3,3,0.88) 34%, rgba(3,3,3,0.45) 62%, rgba(3,3,3,0.30) 100%)',
                    }} />
                    <div className="absolute inset-0 flex items-center px-6">
                      <p className="text-white font-extrabold text-2xl leading-tight max-w-[55%]">
                        Aluguel de motos, peças e atendimento rápido.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center text-white/30 gap-2">
                    <ImagePlus size={34} />
                    <p className="text-sm">Nenhuma foto configurada</p>
                  </div>
                )}
              </div>

              <p className="text-white/35 text-xs mt-2">
                A prévia acima já mostra o escurecimento aplicado na home — se o título
                ficar difícil de ler aqui, vai ficar lá também.
              </p>

              <div className="flex flex-wrap gap-3 mt-5">
                <Button variant="primary" onClick={() => arquivo.current?.click()} disabled={enviando || salvando}>
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                  {url ? 'Trocar foto' : 'Enviar foto'}
                </Button>
                {url && (
                  <Button variant="ghost" onClick={() => salvar('')} disabled={salvando}
                    className="text-red-400">
                    <Trash2 size={16} /> Remover
                  </Button>
                )}
              </div>

              <input ref={arquivo} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviar(f); e.target.value = '' }} />

              <div className="mt-6">
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  Ou cole o endereço de uma imagem
                </label>
                <div className="flex gap-2">
                  <input value={url} onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#39FF14]" />
                  <Button variant="outline" onClick={() => salvar(url)} disabled={salvando}>
                    {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar
                  </Button>
                </div>
              </div>

              {aviso && (
                <p className="mt-4 text-sm text-amber-300 bg-amber-500/10 px-3 py-2 rounded-lg flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {aviso}
                </p>
              )}

              <p className="text-white/30 text-xs mt-6 leading-relaxed" style={{ borderLeft: `2px solid ${G}44`, paddingLeft: 10 }}>
                Use foto própria, de cliente ou da equipe. Imagem de fabricante ou de banco
                de imagens sem licença comercial é risco jurídico — e foto de gente real da
                Motocas transmite mais do que qualquer stock.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  )
}
