'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import {
  MessageCircle, Settings, Wifi, WifiOff, QrCode, Loader2, X, RefreshCw,
  Copy, Check, AlertTriangle, Info, ToggleLeft, ToggleRight, Save, Database
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

/* ────────────────────────────────────────────────
   TIPOS
──────────────────────────────────────────────── */
interface Config {
  apiUrl: string
  apiKey: string
  instance: string
}

type ConnectionState = 'idle' | 'connecting' | 'qr' | 'connected' | 'error'

type TabType = 'connection' | 'templates'

const sqlSchema = `-- Cria a tabela de configurações
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Adiciona políticas para leitura pública e escrita por admins
CREATE POLICY "Leitura pública para app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar app_settings" ON public.app_settings FOR ALL TO authenticated USING (true);

-- Insere valores padrões das mensagens automáticas
INSERT INTO public.app_settings (key, value) VALUES
('wa_enabled', 'true'),
('template_solicitacao_recebida', '🏍️ *MOTOCAS - Solicitação Recebida!*\n\nOlá *{{nome}}*! 👋\n\nObrigado por solicitar o aluguel da moto *{{moto}}*!\n\n📅 *Período solicitado:*\n• Retirada: {{data_retirada}}\n• Devolução: {{data_devolucao}}\n\n⏳ Sua solicitação está sendo analisada pela nossa equipe.\n\nEm breve você receberá um retorno sobre a disponibilidade e valores.\n\n📞 Dúvidas? Responda esta mensagem!\n\n_Equipe Motocas_'),
('template_solicitacao_aprovada', '🎉 *MOTOCAS - Solicitação APROVADA!*\n\nOlá *{{nome}}*! 👋\n\nÓtima notícia! Sua solicitação de aluguel foi *APROVADA*! ✅\n\n🏍️ *Moto:* {{moto}}\n📅 *Período:* {{data_retirada}} a {{data_devolucao}}\n\n📋 *Próximos passos:*\n1. Aguarde a liberação do pagamento\n2. Efetue o pagamento via PIX\n3. Compareça na data de retirada\n\nEm breve você receberá o link para pagamento!\n\n📞 Dúvidas? Responda esta mensagem!\n\n_Equipe Motocas_'),
('template_solicitacao_rejeitada', '😔 *MOTOCAS - Solicitação não aprovada*\n\nOlá *{{nome}}*,\n\nInfelizmente sua solicitação de aluguel não foi aprovada desta vez.\n\n🏍️ *Moto:* {{moto}}\n📅 *Período:* {{data_retirada}} a {{data_devolucao}}\n\n📝 *Motivo:*\n{{motivo_rejeicao}}\n\nVocê pode fazer uma nova solicitação a qualquer momento!\n\n📞 Dúvidas? Responda esta mensagem.\n\n_Equipe Motocas_'),
('template_contrato_gerado', '📄 *MOTOCAS - Seu Contrato está Pronto!*\n\nOlá *{{nome}}*! 🎉\n\nSeu contrato de locação foi gerado com sucesso!\n\n🏍️ *Moto:* {{moto}}\n📅 *Período:* {{data_retirada}} a {{data_devolucao}}\n\n📎 Segue em anexo o contrato completo.\n\n✅ *Próximo passo:*\nCompareça no local de retirada na data agendada com:\n• Documento com foto (RG/CNH)\n• CNH válida\n\n📞 Dúvidas? Responda esta mensagem!\n\n_Equipe Motocas_'),
('template_pagamento_confirmado', '✅ *MOTOCAS - Pagamento Confirmado!*\n\nOlá *{{nome}}*! 🎉\n\nRecebemos seu pagamento com sucesso!\n\n🏍️ *Moto:* {{moto}}\n📅 *Período:* {{data_retirada}} a {{data_devolucao}}\n💰 *Valor:* R$ {{valor_total}}\n\n📄 *Próximo passo:*\nEstamos gerando seu contrato de locação.\nEm breve você receberá o documento por aqui!\n\n⏳ Aguarde...\n\n📞 Dúvidas? Responda esta mensagem!\n\n_Equipe Motocas_')
ON CONFLICT (key) DO NOTHING;`;

/* ────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────── */
function cfg(): Config | null {
  try {
    const raw = localStorage.getItem('wa_evo_config')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/* ────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
──────────────────────────────────────────────── */
export default function WhatsAppPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [state, setState] = useState<ConnectionState>('idle')
  const [qrBase64, setQrBase64] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabType>('connection')

  // Configurações de mensagens automáticas
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [copiedSql, setCopiedSql] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settings, setSettings] = useState({
    wa_enabled: 'true',
    template_solicitacao_recebida: '',
    template_solicitacao_aprovada: '',
    template_solicitacao_rejeitada: '',
    template_contrato_gerado: '',
    template_pagamento_confirmado: '',
  })

  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* carregar config salva */
  useEffect(() => {
    const saved = cfg()
    if (saved) {
      setConfig(saved)
    }
  }, [])

  /* ── API helpers ── */
  const api = useCallback(async (path: string, opts?: RequestInit) => {
    if (!config) throw new Error('Sem configuração')
    const res = await fetch(`${config.apiUrl.replace(/\/$/, '')}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        apikey: config.apiKey,
        ...(opts?.headers || {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [config])

  /* ── verificar status de conexão ── */
  const checkConnection = useCallback(async () => {
    try {
      const data = await api(`/instance/connectionState/${config!.instance}`)
      const connected = data?.instance?.state === 'open' || data?.state === 'open'
      if (connected) {
        setState('connected')
        if (qrPollRef.current) clearInterval(qrPollRef.current)
      }
      return connected
    } catch { return false }
  }, [api, config])

  /* ── buscar QR code ── */
  const fetchQr = useCallback(async () => {
    try {
      const data = await api(`/instance/connect/${config!.instance}`)
      const base64 = data?.base64 || data?.qrcode?.base64 || data?.qr
      if (base64) {
        setQrBase64(base64)
        setState('qr')
      }
    } catch {
      setState('error')
    }
  }, [api, config])

  /* ── conectar instância ── */
  const connect = useCallback(async () => {
    if (!config) return
    setState('connecting')
    try {
      // Tenta verificar estado atual primeiro
      const connected = await checkConnection()
      if (connected) return

      // Tenta criar instância (ignorar erro se já existe)
      try {
        await api('/instance/create', {
          method: 'POST',
          body: JSON.stringify({
            instanceName: config.instance,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        })
      } catch { /* instância já existe, ok */ }

      await fetchQr()

      // Polling para verificar quando conectar via QR
      qrPollRef.current = setInterval(async () => {
        const ok = await checkConnection()
        if (ok) {
          if (qrPollRef.current) clearInterval(qrPollRef.current)
        } else {
          await fetchQr() // atualiza QR se expirou
        }
      }, 20000)
    } catch {
      setState('error')
    }
  }, [config, checkConnection, fetchQr, api])

  /* ── ao ter config, verificar conexão ── */
  useEffect(() => {
    if (config) connect()
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
    }
  }, [config, connect])

  /* ── Polling para verificar se continua conectado ── */
  useEffect(() => {
    if (state !== 'connected' || !config) return

    const interval = setInterval(async () => {
      try {
        const data = await api(`/instance/connectionState/${config.instance}`)
        const connected = data?.instance?.state === 'open' || data?.state === 'open'
        if (!connected) {
          clearInterval(interval)
          connect()
        }
      } catch { /* ignorar erro temporário de rede */ }
    }, 10000)

    return () => clearInterval(interval)
  }, [state, config, api, connect])

  /* ── carregar configurações do Supabase ── */
  const loadDbSettings = useCallback(async () => {
    setLoadingSettings(true)
    setDbError(null)
    try {
      const keys = [
        'wa_enabled',
        'template_solicitacao_recebida',
        'template_solicitacao_aprovada',
        'template_solicitacao_rejeitada',
        'template_contrato_gerado',
        'template_pagamento_confirmado'
      ]
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', keys)

      if (error) {
        if (error.code === '42P01') {
          setDbError('table_missing')
        } else {
          setDbError(error.message)
        }
        return
      }

      if (data) {
        const map: Record<string, string> = {}
        data.forEach((item) => {
          map[item.key] = item.value
        })
        setSettings({
          wa_enabled: map.wa_enabled ?? 'true',
          template_solicitacao_recebida: map.template_solicitacao_recebida ?? '',
          template_solicitacao_aprovada: map.template_solicitacao_aprovada ?? '',
          template_solicitacao_rejeitada: map.template_solicitacao_rejeitada ?? '',
          template_contrato_gerado: map.template_contrato_gerado ?? '',
          template_pagamento_confirmado: map.template_pagamento_confirmado ?? '',
        })
      }
    } catch (e: any) {
      setDbError(e.message || 'Erro inesperado')
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  /* carregar configs ao iniciar */
  useEffect(() => {
    loadDbSettings()
  }, [loadDbSettings])

  /* ── salvar configurações do Supabase ── */
  async function saveDbSettings() {
    setSavingSettings(true)
    try {
      const payload = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
      }))

      const { error } = await supabase
        .from('app_settings')
        .upsert(payload, { onConflict: 'key' })

      if (error) {
        if (error.code === '42P01') {
          setDbError('table_missing')
        } else {
          alert(`Erro ao salvar: ${error.message}`)
        }
        return
      }

      alert('Configurações salvas com sucesso!')
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message || 'Erro inesperado'}`)
    } finally {
      setSavingSettings(false)
    }
  }

  function handleCopySql() {
    navigator.clipboard.writeText(sqlSchema)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  function appendPlaceholder(field: keyof typeof settings, placeholder: string) {
    setSettings((prev) => ({
      ...prev,
      [field]: prev[field] + ` {{${placeholder}}}`
    }))
  }

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <>
      <AdminHeader
        title="WhatsApp"
        subtitle="Configuração e integração com WhatsApp API"
        action={
          <div className="flex items-center gap-2">
            <StatusBadge state={state} />

            <button onClick={() => setShowSetup(true)} title="Configurações da API"
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <Settings size={15} />
            </button>
          </div>
        }
      />

      <main className="flex-1 flex flex-col bg-[#050505] p-6 overflow-y-auto" style={{ height: 'calc(100vh - 81px)' }}>
        
        {/* Navegação de Abas */}
        <div className="flex border-b border-white/10 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('connection')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'connection'
                ? 'border-[#39FF14] text-[#39FF14]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Conexão da API
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'templates'
                ? 'border-[#39FF14] text-[#39FF14]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Mensagens Automáticas
          </button>
        </div>

        {/* ── CONEXÃO DA API ── */}
        {activeTab === 'connection' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-6">
            {!config && !showSetup ? (
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.2)' }}>
                  <MessageCircle size={36} style={{ color: '#39FF14' }} />
                </div>
                <h2 className="text-white text-xl font-bold mb-2">Configurar WhatsApp API</h2>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                  Conecte sua instância do WhatsApp baseada na biblioteca Baileys para habilitar as notificações.
                </p>
                <button onClick={() => setShowSetup(true)}
                  className="px-6 py-3 rounded-xl font-bold text-black text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#39FF14' }}>
                  Configurar agora
                </button>
              </div>
            ) : state === 'connecting' ? (
              <div className="text-center">
                <Loader2 size={40} className="animate-spin mx-auto mb-4 text-[#39FF14]" />
                <p className="text-white font-semibold">Conectando à instância...</p>
              </div>
            ) : state === 'qr' ? (
              <div className="text-center">
                <QrCode size={32} className="mx-auto mb-4 text-[#39FF14]" />
                <h2 className="text-white font-bold text-lg mb-1">Escaneie o QR Code</h2>
                <p className="text-white/50 text-sm mb-6">Abra o WhatsApp no celular → Dispositivos Conectados</p>
                {qrBase64 ? (
                  <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                      alt="QR Code WhatsApp"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto">
                    <Loader2 size={32} className="animate-spin text-[#39FF14]" />
                  </div>
                )}
                <p className="text-white/30 text-xs mt-4">O QR code atualiza automaticamente a cada 20s</p>
                <button onClick={fetchQr} className="mt-3 text-xs font-semibold text-[#39FF14] hover:underline">
                  Atualizar QR manualmente
                </button>
              </div>
            ) : state === 'connected' ? (
              <div className="text-center max-w-md bg-[#111] p-8 rounded-2xl border border-white/10 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center mx-auto mb-4">
                  <Wifi className="text-[#39FF14]" size={28} />
                </div>
                <h2 className="text-white font-bold text-lg mb-1">WhatsApp Conectado!</h2>
                <p className="text-white/50 text-sm mb-6">
                  Sua API está conectada e pronta. O envio de mensagens do fluxo de aluguel ocorrerá de forma automática em segundo plano.
                </p>
                <div className="flex flex-col gap-2 text-left bg-[#070707] p-4 rounded-xl border border-white/5 mb-6 text-xs text-white/60">
                  <div><span className="font-semibold text-white/40">Instância:</span> {config?.instance}</div>
                  <div className="truncate"><span className="font-semibold text-white/40">Servidor API:</span> {config?.apiUrl}</div>
                </div>
                <button onClick={() => setShowSetup(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-white text-xs border border-white/20 hover:bg-white/5 transition-colors">
                  Alterar Conexão
                </button>
              </div>
            ) : state === 'error' ? (
              <div className="text-center">
                <WifiOff size={40} className="text-red-400 mx-auto mb-4" />
                <h2 className="text-white font-bold text-lg mb-2">Falha na conexão</h2>
                <p className="text-white/50 text-sm mb-6">Verifique a URL e a chave da API nas configurações.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={connect}
                    className="px-5 py-2.5 rounded-xl font-bold text-black text-sm hover:opacity-90"
                    style={{ backgroundColor: '#39FF14' }}>
                    Tentar novamente
                  </button>
                  <button onClick={() => setShowSetup(true)}
                    className="px-5 py-2.5 rounded-xl font-bold text-white text-sm border border-white/20 hover:bg-white/5">
                    Configurações
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-sm">
                <Loader2 size={32} className="animate-spin text-[#39FF14] mx-auto mb-4" />
                <p className="text-white/50 text-sm">Carregando status de conexão...</p>
              </div>
            )}
          </div>
        )}

        {/* ── MENSAGENS AUTOMÁTICAS ── */}
        {activeTab === 'templates' && (
          <div className="max-w-4xl mx-auto w-full pb-12">
            
            {/* Alerta de tabela não configurada no Supabase */}
            {dbError === 'table_missing' && (
              <div className="bg-amber-950/20 border border-amber-500/30 p-5 rounded-2xl mb-6">
                <div className="flex gap-3 items-start">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <h3 className="text-amber-200 font-bold text-sm mb-1">Tabela de Configurações Não Encontrada</h3>
                    <p className="text-white/60 text-xs leading-relaxed mb-4">
                      A tabela `app_settings` não está criada na sua base do Supabase. Para poder editar e salvar as mensagens automáticas, execute o script SQL abaixo no painel do Supabase.
                    </p>
                    <div className="relative bg-black rounded-lg p-4 border border-white/10 font-mono text-[11px] text-white/80 overflow-x-auto max-h-48 mb-4">
                      <pre>{sqlSchema}</pre>
                      <button
                        onClick={handleCopySql}
                        className="absolute top-2 right-2 p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title="Copiar SQL"
                      >
                        {copiedSql ? <Check size={14} className="text-[#39FF14]" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={loadDbSettings}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} />
                      Já executei, verificar novamente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loadingSettings ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[#39FF14] mb-3" />
                <p className="text-white/50 text-sm">Carregando configurações e templates...</p>
              </div>
            ) : dbError && dbError !== 'table_missing' ? (
              <div className="text-center py-10 bg-[#111] rounded-2xl border border-white/10">
                <AlertTriangle className="text-red-400 mx-auto mb-3" size={32} />
                <h3 className="text-white font-bold mb-1">Erro ao carregar banco</h3>
                <p className="text-white/50 text-xs mb-4">{dbError}</p>
                <button onClick={loadDbSettings} className="px-4 py-2 border border-white/10 hover:bg-white/5 text-white text-xs rounded-lg transition-colors">
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Switch de Ativação Geral */}
                <div className="flex items-center justify-between bg-[#111] p-5 rounded-2xl border border-white/10">
                  <div>
                    <h3 className="text-white font-bold text-sm">Mensagens Automáticas de WhatsApp</h3>
                    <p className="text-white/50 text-xs mt-0.5">Ative ou desative o envio automatizado nas etapas de aluguel</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, wa_enabled: prev.wa_enabled === 'true' ? 'false' : 'true' }))}
                    className="p-1 rounded-full text-white/80 hover:text-white transition-colors"
                  >
                    {settings.wa_enabled === 'true' ? (
                      <ToggleRight size={38} className="text-[#39FF14]" />
                    ) : (
                      <ToggleLeft size={38} className="text-white/30" />
                    )}
                  </button>
                </div>

                {/* Templates Forms */}
                <div className="space-y-6">
                  
                  {/* Template 1: Recebida */}
                  <TemplateCard
                    title="1. Solicitação Recebida"
                    description="Enviada ao cliente e ao administrador no momento em que uma nova solicitação de aluguel é enviada pelo site."
                    value={settings.template_solicitacao_recebida}
                    onChange={(val) => setSettings(prev => ({ ...prev, template_solicitacao_recebida: val }))}
                    placeholders={['nome', 'moto', 'data_retirada', 'data_devolucao']}
                    onPlaceholderClick={(p) => appendPlaceholder('template_solicitacao_recebida', p)}
                  />

                  {/* Template 2: Aprovada */}
                  <TemplateCard
                    title="2. Solicitação Aprovada"
                    description="Enviada ao cliente quando o administrador aprova a locação e o pagamento fica liberado."
                    value={settings.template_solicitacao_aprovada}
                    onChange={(val) => setSettings(prev => ({ ...prev, template_solicitacao_aprovada: val }))}
                    placeholders={['nome', 'moto', 'data_retirada', 'data_devolucao']}
                    onPlaceholderClick={(p) => appendPlaceholder('template_solicitacao_aprovada', p)}
                  />

                  {/* Template 3: Rejeitada */}
                  <TemplateCard
                    title="3. Solicitação Recusada"
                    description="Enviada ao cliente quando o administrador rejeita/cancela a proposta de aluguel."
                    value={settings.template_solicitacao_rejeitada}
                    onChange={(val) => setSettings(prev => ({ ...prev, template_solicitacao_rejeitada: val }))}
                    placeholders={['nome', 'moto', 'data_retirada', 'data_devolucao', 'motivo_rejeicao']}
                    onPlaceholderClick={(p) => appendPlaceholder('template_solicitacao_rejeitada', p)}
                  />

                  {/* Template 4: Contrato Gerado */}
                  <TemplateCard
                    title="4. Contrato Gerado"
                    description="Enviada ao cliente assim que o contrato PDF da locação é assinado ou disponibilizado."
                    value={settings.template_contrato_gerado}
                    onChange={(val) => setSettings(prev => ({ ...prev, template_contrato_gerado: val }))}
                    placeholders={['nome', 'moto', 'data_retirada', 'data_devolucao']}
                    onPlaceholderClick={(p) => appendPlaceholder('template_contrato_gerado', p)}
                  />

                  {/* Template 5: Pagamento Confirmado */}
                  <TemplateCard
                    title="5. Pagamento Confirmado"
                    description="Enviada ao cliente confirmando o recebimento da transação financeira."
                    value={settings.template_pagamento_confirmado}
                    onChange={(val) => setSettings(prev => ({ ...prev, template_pagamento_confirmado: val }))}
                    placeholders={['nome', 'moto', 'data_retirada', 'data_devolucao', 'valor_total']}
                    onPlaceholderClick={(p) => appendPlaceholder('template_pagamento_confirmado', p)}
                  />

                </div>

                {/* Botão de Gravar */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={saveDbSettings}
                    disabled={savingSettings}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: '#39FF14' }}
                  >
                    {savingSettings ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Salvar Configurações
                  </button>
                </div>

              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal de Setup ── */}
      {showSetup && (
        <SetupModal
          current={config}
          onSave={(c) => {
            localStorage.setItem('wa_evo_config', JSON.stringify(c))
            setConfig(c)
            setShowSetup(false)
            setState('idle')
          }}
          onClose={() => setShowSetup(false)}
        />
      )}
    </>
  )
}

/* ────────────────────────────────────────────────
   STATUS BADGE
──────────────────────────────────────────────── */
function StatusBadge({ state }: { state: ConnectionState }) {
  const map: Record<ConnectionState, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: 'Desconectado', color: '#ffffff40', icon: <WifiOff size={13} /> },
    connecting: { label: 'Conectando...', color: '#F59E0B', icon: <Loader2 size={13} className="animate-spin" /> },
    qr: { label: 'Aguardando QR', color: '#F59E0B', icon: <QrCode size={13} /> },
    connected: { label: 'Conectado', color: '#39FF14', icon: <Wifi size={13} /> },
    error: { label: 'Erro', color: '#F87171', icon: <WifiOff size={13} /> },
  }
  const { label, color, icon } = map[state]
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium"
      style={{ color }}>
      {icon}<span>{label}</span>
    </div>
  )
}

/* ────────────────────────────────────────────────
   TEMPLATE CARD
──────────────────────────────────────────────── */
interface TemplateCardProps {
  title: string
  description: string
  value: string
  onChange: (v: string) => void
  placeholders: string[]
  onPlaceholderClick: (p: string) => void
}

function TemplateCard({ title, description, value, onChange, placeholders, onPlaceholderClick }: TemplateCardProps) {
  return (
    <div className="bg-[#111] p-5 rounded-2xl border border-white/10">
      <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
      <p className="text-white/40 text-[11px] mb-4 leading-relaxed">{description}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite o texto da mensagem automática..."
        rows={6}
        className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors font-mono leading-relaxed resize-y"
      />
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <span className="text-[10px] text-white/30 uppercase font-semibold mr-1 flex items-center gap-1">
          <Info size={10} /> Placeholders:
        </span>
        {placeholders.map((p) => (
          <button
            key={p}
            onClick={() => onPlaceholderClick(p)}
            className="px-2 py-1 rounded bg-[#222] hover:bg-[#333] border border-white/5 hover:border-white/10 text-[10px] text-white/70 hover:text-white font-mono transition-all"
            title={`Inserir {{${p}}}`}
          >
            {`{{${p}}}`}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────
   MODAL DE CONFIGURAÇÃO
──────────────────────────────────────────────── */
function SetupModal({ current, onSave, onClose }: {
  current: Config | null
  onSave: (c: Config) => void
  onClose: () => void
}) {
  const [apiUrl, setApiUrl] = useState(current?.apiUrl ?? 'https://api-wa.sosmotocas.com.br')
  const [apiKey, setApiKey] = useState(current?.apiKey ?? '5fef669ab682646f17bea3576f31d28fe12bcead1fa266b7')
  const [instance, setInstance] = useState(current?.instance ?? 'motocas')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#111] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Configurar WhatsApp API</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="URL da API" placeholder="https://api.suaempresa.com" value={apiUrl} onChange={setApiUrl} />
          <Field label="API Key" placeholder="sua-chave-secreta" value={apiKey} onChange={setApiKey} type="password" />
          <Field label="Nome da Instância" placeholder="motocas" value={instance} onChange={setInstance} />
        </div>

        <div className="mt-5 p-4 rounded-xl border border-white/8 bg-[#0a0a0a] text-xs text-white/50 leading-relaxed">
          <p className="font-semibold text-white/70 mb-1">Configuração de Conexão:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Informe o domínio com protocolo de SSL seguro (<strong className="text-white/70">https://</strong>)</li>
            <li>Use a API Key fornecida para sua instância Baileys</li>
            <li>Informe o identificador correspondente da instância</li>
          </ol>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white border border-white/20 hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim(), instance: instance.trim() })}
            disabled={!apiUrl || !apiKey || !instance}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-black hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#39FF14' }}>
            Salvar e Conectar
          </button>
        </div>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
}

function Field({ label, placeholder, value, onChange, type = 'text' }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
    </div>
  )
}
