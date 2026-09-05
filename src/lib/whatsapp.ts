// ─── Disparo de mensagens automáticas de WhatsApp (templates em app_settings) ───
import { supabase } from './supabase'

export type WaTemplateKey =
  | 'template_solicitacao_recebida'
  | 'template_solicitacao_aprovada'
  | 'template_solicitacao_rejeitada'
  | 'template_contrato_gerado'
  | 'template_pagamento_confirmado'
  | 'template_link_pagamento'

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  // já tem DDI 55: DDD (2) + celular (9) = 13, ou DDD (2) + fixo (8) = 12
  if (digits.length === 12 || digits.length === 13) return digits
  // sem DDI: DDD (2) + celular (9) = 11, ou DDD (2) + fixo (8) = 10
  // (checar o tamanho, não só o prefixo "55" — DDD 55 é Santa Maria/RS e colidiria com o DDI)
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

function renderTemplate(template: string, params: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => params[key] ?? match)
}

async function sendText(apiUrl: string, apiKey: string, instance: string, number: string, text: string): Promise<void> {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ number, text }),
  })
  if (!res.ok) {
    console.error(`[WhatsApp] Falha ao enviar mensagem (HTTP ${res.status}) para ${number}`)
  }
}

/**
 * Dispara uma mensagem automática de WhatsApp para um template configurado em app_settings.
 * Nunca lança erro — falhas (WhatsApp desligado, API fora do ar, template vazio) são
 * apenas logadas, pois o envio é um efeito colateral best-effort do fluxo de negócio.
 */
export async function sendWhatsAppNotification(
  templateKey: WaTemplateKey,
  telefone: string,
  params: Record<string, string>,
  opts?: { alsoNotifyAdmin?: boolean }
): Promise<void> {
  try {
    const keys = ['wa_enabled', templateKey, 'wa_api_url', 'wa_api_key', 'wa_instance']
    if (opts?.alsoNotifyAdmin) keys.push('wa_admin_number')

    const { data } = await supabase.from('app_settings').select('key, value').in('key', keys)
    const map: Record<string, string> = {}
    for (const row of data || []) map[row.key] = row.value ?? ''

    if (map.wa_enabled !== 'true') return

    const apiUrl = map.wa_api_url
    const apiKey = map.wa_api_key
    const instance = map.wa_instance
    const template = map[templateKey]
    if (!apiUrl || !apiKey || !instance || !template) return

    const text = renderTemplate(template, params)

    const number = normalizePhone(telefone)
    if (number) await sendText(apiUrl, apiKey, instance, number, text)

    if (opts?.alsoNotifyAdmin && map.wa_admin_number) {
      const adminNumber = normalizePhone(map.wa_admin_number)
      if (adminNumber) await sendText(apiUrl, apiKey, instance, adminNumber, text)
    }
  } catch (e) {
    console.error('[WhatsApp] Falha ao enviar notificação automática:', e)
  }
}
