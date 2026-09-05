// ─── Trilha de auditoria e log de mensagens ───
//
// Registrar nunca pode derrubar a ação principal: se o log falhar, a aprovação
// da solicitação continua valendo. Por isso tudo aqui engole o erro e apenas
// avisa no console — o oposto do que fazemos com o envio em si, que agora
// deixa rastro justamente para falha não passar despercebida.
import { supabase } from './supabase'

export interface Evento {
  id: number
  tabela: string
  registro_id: string
  acao: string
  descricao: string | null
  usuario_email: string | null
  dados: Record<string, unknown> | null
  created_at: string
}

export interface MensagemEnviada {
  id: number
  canal: string
  template: string | null
  destinatario: string
  solicitacao_id: number | null
  status: 'enviada' | 'falhou'
  erro: string | null
  created_at: string
}

/** Registra uma ação do usuário logado sobre um registro. */
export async function registrarEvento(e: {
  tabela: string
  registroId: number | string
  acao: string
  descricao?: string
  dados?: Record<string, unknown>
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('eventos').insert({
      tabela: e.tabela,
      registro_id: String(e.registroId),
      acao: e.acao,
      descricao: e.descricao ?? null,
      usuario_email: user?.email ?? null,
      usuario_uid: user?.id ?? null,
      dados: e.dados ?? null,
    })
  } catch (err) {
    console.error('[eventos] falha ao registrar:', err)
  }
}

/** Registra o resultado de um envio de mensagem. Chamado pelo motor de WhatsApp. */
export async function registrarMensagem(m: {
  template?: string
  destinatario: string
  solicitacaoId?: number | null
  status: 'enviada' | 'falhou'
  erro?: string
}): Promise<void> {
  try {
    await supabase.from('mensagens_enviadas').insert({
      canal: 'whatsapp',
      template: m.template ?? null,
      destinatario: m.destinatario,
      solicitacao_id: m.solicitacaoId ?? null,
      status: m.status,
      erro: m.erro ?? null,
    })
  } catch (err) {
    console.error('[mensagens] falha ao registrar:', err)
  }
}

export async function listarEventos(tabela: string, registroId: number | string): Promise<Evento[]> {
  const { data } = await supabase
    .from('eventos').select('*')
    .eq('tabela', tabela).eq('registro_id', String(registroId))
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function listarMensagens(solicitacaoId: number): Promise<MensagemEnviada[]> {
  const { data } = await supabase
    .from('mensagens_enviadas').select('*')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Mensagens que falharam, para o admin ver que alguém ficou sem aviso. */
export async function falhasRecentes(limite = 20): Promise<MensagemEnviada[]> {
  const { data } = await supabase
    .from('mensagens_enviadas').select('*')
    .eq('status', 'falhou')
    .order('created_at', { ascending: false })
    .limit(limite)
  return data ?? []
}
