// ─── Chamadas às Edge Functions do Supabase ───
//
// O site é export estático, então nada que dependa de chave secreta (service
// role, chave da Pagar.me) pode rodar aqui. Estas funções são a ponte: o
// navegador manda o JWT do usuário logado e a Edge Function decide o que ele
// pode fazer.
import { supabase } from './supabase'

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`

/** `exigirLogin: false` cai para a anon key — que já é um JWT válido e passa
 *  pelo verify_jwt do Supabase. É o caso da página pública de assinatura, onde
 *  quem autoriza é o token do link, não uma sessão. */
async function chamar<T>(funcao: string, body: unknown, exigirLogin = true): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (exigirLogin && !session) throw new Error('Sua sessão expirou. Entre novamente.')

  const bearer = session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const res = await fetch(`${BASE}/${funcao}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  })

  const dados = await res.json().catch(() => ({}))
  if (!res.ok || dados?.success === false) {
    throw new Error(dados?.error || `Falha ao chamar ${funcao} (HTTP ${res.status})`)
  }
  return dados as T
}

/* ───────────── CONTRATO ───────────── */

/** Gera o contrato preenchido e um token de assinatura. Só admin.
 *  O token vira o link que o cliente recebe por WhatsApp. */
export function gerarContrato(solicitacaoId: number) {
  return chamar<{ url: string; token: string; expiraEm: string }>(
    'gerar-contrato', { acao: 'gerar', solicitacaoId },
  )
}

export interface ContratoParaAssinar {
  nome: string
  moto: string
  retirada: string
  devolucao: string
  contratoUrl: string | null
  assinado: boolean
  assinadoUrl: string | null
}

/** Dados do contrato a partir do token do link. Sem login. */
export function consultarContrato(token: string) {
  return chamar<ContratoParaAssinar>('gerar-contrato', { acao: 'consultar', token }, false)
}

/** Regera o contrato com a assinatura desenhada embutida e registra o aceite.
 *  `assinatura` é o dataURL PNG do canvas. Sem login: quem autoriza é o token. */
export function assinarContrato(token: string, assinatura: string) {
  return chamar<{ url: string; assinado: true }>(
    'gerar-contrato', { acao: 'assinar', token, assinatura }, false,
  )
}

/** URL que vai por WhatsApp para o cliente assinar. */
export function linkDeAssinatura(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/assinar?token=${token}`
}

/* ───────────── PAGAMENTO ───────────── */

export interface DadosCobranca {
  solicitacaoId: number
  valor: number
  descricao: string
  cliente: { nome: string; email: string; telefone: string; cpf: string }
}

interface RespostaLink {
  paymentLinkId: string
  checkoutUrl: string
}

/** Só dígitos e com DDI, que é o formato que a Pagar.me espera no telefone. */
function telefonePagarme(bruto: string) {
  const d = bruto.replace(/\D/g, '')
  const semDdi = d.startsWith('55') && d.length > 11 ? d.slice(2) : d
  return { country_code: '55', area_code: semDdi.slice(0, 2), number: semDdi.slice(2) }
}

/** Cria um link de checkout da Pagar.me (PIX, cartão ou boleto na mesma página). */
export function criarLinkPagamento(d: DadosCobranca) {
  // A Pagar.me recusa document com mais de 16 caracteres e devolve um 400 pouco
  // óbvio. Solicitações anteriores às máscaras têm CPF com lixo, então barramos
  // aqui com uma mensagem que diz o que fazer.
  const cpf = d.cliente.cpf.replace(/\D/g, '')
  if (cpf.length !== 11) {
    throw new Error(
      `CPF inválido (${cpf.length} dígitos, esperado 11). Corrija o CPF antes de gerar a cobrança.`,
    )
  }

  return chamar<RespostaLink>('pagarme-create-payment', {
    metodo: 'checkout_link',
    valor: d.valor,
    descricao: d.descricao,
    paymentMethods: ['pix', 'credit_card', 'boleto'],
    metadata: { solicitacao_id: String(d.solicitacaoId) },
    dadosCliente: {
      name: d.cliente.nome,
      email: d.cliente.email,
      document: cpf,
      document_type: 'CPF',
      type: 'individual',
      phones: { mobile_phone: telefonePagarme(d.cliente.telefone) },
    },
  })
}
