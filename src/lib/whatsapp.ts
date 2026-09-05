// ─── Disparo de mensagens automáticas de WhatsApp (templates em app_settings) ───
import { supabase } from './supabase'
import { registrarMensagem } from './eventos'

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

interface ResultadoEnvio { ok: boolean; erro?: string }

async function sendText(
  apiUrl: string, apiKey: string, instance: string, number: string, text: string,
): Promise<ResultadoEnvio> {
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ number, text }),
    })
    if (res.ok) return { ok: true }

    // o corpo traz o motivo (ex.: "Número não encontrado no WhatsApp"), que é
    // o que o admin precisa ver no histórico — só o status não explica nada
    const corpo = await res.text().catch(() => '')
    return { ok: false, erro: `HTTP ${res.status}${corpo ? ` — ${corpo.slice(0, 300)}` : ''}` }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
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
  opts?: { alsoNotifyAdmin?: boolean; solicitacaoId?: number | null }
): Promise<void> {
  try {
    const keys = ['wa_enabled', templateKey, 'wa_api_url', 'wa_api_key', 'wa_instance']
    if (opts?.alsoNotifyAdmin) keys.push('wa_admin_number')

    const { data } = await supabase.from('app_settings').select('key, value').in('key', keys)
    const map: Record<string, string> = {}
    for (const row of data || []) map[row.key] = row.value ?? ''

    // desligado de propósito: não é falha, não vira registro
    if (map.wa_enabled !== 'true') return

    const registrar = (destinatario: string, r: ResultadoEnvio) => registrarMensagem({
      template: templateKey,
      destinatario,
      solicitacaoId: opts?.solicitacaoId ?? null,
      status: r.ok ? 'enviada' : 'falhou',
      erro: r.erro,
    })

    const apiUrl = map.wa_api_url
    const apiKey = map.wa_api_key
    const instance = map.wa_instance
    const template = map[templateKey]
    if (!apiUrl || !apiKey || !instance || !template) {
      // antes isso era um return mudo: o cliente ficava sem aviso e ninguém sabia
      const falta = !template ? 'template vazio' : 'API do WhatsApp não configurada'
      await registrar(telefone, { ok: false, erro: falta })
      return
    }

    const text = renderTemplate(template, params)

    const number = normalizePhone(telefone)
    if (number) {
      await registrar(number, await sendText(apiUrl, apiKey, instance, number, text))
    } else {
      await registrar(telefone, { ok: false, erro: 'telefone vazio ou inválido' })
    }

    if (opts?.alsoNotifyAdmin && map.wa_admin_number) {
      const adminNumber = normalizePhone(map.wa_admin_number)
      if (adminNumber) {
        await registrar(adminNumber, await sendText(apiUrl, apiKey, instance, adminNumber, text))
      }
    }
  } catch (e) {
    console.error('[WhatsApp] Falha ao enviar notificação automática:', e)
  }
}
