// ─── Camada de services: espelha lib/services do Flutter ───
import { supabase } from './supabase'
import type {
  Moto, Cliente, Locacao, Manutencao, Infracao, Checklist,
  Peca, PedidoPeca, SolicitacaoAluguel, Notificacao,
} from '@/types'

/* ───────────── MOTOS ───────────── */
export const motoService = {
  async getMotos(): Promise<Moto[]> {
    const { data } = await supabase.from('motos').select('*').order('id', { ascending: false })
    return data || []
  },
  async getMotosDisponiveis(): Promise<Moto[]> {
    const { data } = await supabase.from('motos').select('*').is('id_cliente', null).order('id')
    return data || []
  },
  async getMotoById(id: number): Promise<Moto | null> {
    const { data } = await supabase.from('motos').select('*').eq('id', id).maybeSingle()
    return data
  },
  async createMoto(payload: Partial<Moto>): Promise<Moto | null> {
    const { data } = await supabase.from('motos').insert(payload).select().single()
    return data
  },
  async updateMoto(id: number, updates: Partial<Moto>): Promise<boolean> {
    const { error } = await supabase.from('motos').update(updates).eq('id', id)
    return !error
  },
  async deleteMoto(id: number): Promise<boolean> {
    const { error } = await supabase.from('motos').delete().eq('id', id)
    return !error
  },
}

/* ───────────── CLIENTES ───────────── */
export const clienteService = {
  async getClientes(): Promise<Cliente[]> {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    return data || []
  },
  async getClienteById(id: number): Promise<Cliente | null> {
    const { data } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle()
    return data
  },
  async searchClientes(query: string): Promise<Cliente[]> {
    const { data } = await supabase
      .from('clientes').select('*')
      .or(`nome.ilike.%${query}%,cpf.ilike.%${query}%,email.ilike.%${query}%`)
      .order('nome')
    return data || []
  },
  async createCliente(payload: Partial<Cliente>): Promise<Cliente | null> {
    const { data } = await supabase.from('clientes').insert(payload).select().single()
    return data
  },
  async updateCliente(id: number, updates: Partial<Cliente>): Promise<boolean> {
    const { error } = await supabase.from('clientes').update(updates).eq('id', id)
    return !error
  },
  async deleteCliente(id: number): Promise<boolean> {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    return !error
  },
}

/* ───────────── LOCAÇÕES ───────────── */
export const locacaoService = {
  async getLocacoes(): Promise<Locacao[]> {
    const { data } = await supabase.from('locacoes').select('*').order('created_at', { ascending: false })
    return data || []
  },
  async getLocacoesAtivas(): Promise<Locacao[]> {
    const { data } = await supabase.from('locacoes').select('*').eq('status', 'ativa')
    return data || []
  },
  async getLocacaoById(id: number): Promise<Locacao | null> {
    const { data } = await supabase.from('locacoes').select('*').eq('id', id).maybeSingle()
    return data
  },
  async createLocacao(payload: Partial<Locacao>): Promise<Locacao | null> {
    const { data } = await supabase.from('locacoes').insert(payload).select().single()
    return data
  },
  async updateLocacao(id: number, updates: Partial<Locacao>): Promise<boolean> {
    const { error } = await supabase.from('locacoes').update(updates).eq('id', id)
    return !error
  },
  async deleteLocacao(id: number): Promise<boolean> {
    const { error } = await supabase.from('locacoes').delete().eq('id', id)
    return !error
  },
  async getEstatisticas() {
    const { data } = await supabase.from('locacoes').select('status, valor_total, valor_pendente')
    const locacoes = data || []
    const ativas = locacoes.filter((l) => l.status === 'ativa').length
    const atrasadas = locacoes.filter((l) => l.status === 'atrasada').length
    const receita_total = locacoes.reduce((s, l) => s + (l.valor_total || 0), 0)
    const receita_pendente = locacoes.reduce((s, l) => s + (l.valor_pendente || 0), 0)
    return { ativas, atrasadas, receita_total, receita_pendente, total: locacoes.length }
  },
}

/* ───────────── MANUTENÇÕES ───────────── */
export const manutencaoService = {
  async getManutencoes(): Promise<Manutencao[]> {
    const { data } = await supabase.from('manutencoes').select('*').order('created_at', { ascending: false })
    return data || []
  },
  async createManutencao(payload: Partial<Manutencao>): Promise<Manutencao | null> {
    const { data } = await supabase.from('manutencoes').insert(payload).select().single()
    return data
  },
  async updateManutencao(id: number, updates: Partial<Manutencao>): Promise<boolean> {
    const { error } = await supabase.from('manutencoes').update(updates).eq('id', id)
    return !error
  },
  async deleteManutencao(id: number): Promise<boolean> {
    const { error } = await supabase.from('manutencoes').delete().eq('id', id)
    return !error
  },
  async getEstatisticas() {
    const { data } = await supabase.from('manutencoes').select('status')
    const m = data || []
    return {
      em_andamento: m.filter((x) => x.status === 'em_andamento').length,
      agendadas: m.filter((x) => x.status === 'agendada').length,
      concluidas: m.filter((x) => x.status === 'concluida').length,
      total: m.length,
    }
  },
}

/* ───────────── INFRAÇÕES ───────────── */
export const infracaoService = {
  async getInfracoes(): Promise<Infracao[]> {
    const { data } = await supabase.from('infracoes').select('*').order('created_at', { ascending: false })
    return data || []
  },
  async createInfracao(payload: Partial<Infracao>): Promise<Infracao | null> {
    const { data } = await supabase.from('infracoes').insert(payload).select().single()
    return data
  },
  async updateInfracao(id: number, updates: Partial<Infracao>): Promise<boolean> {
    const { error } = await supabase.from('infracoes').update(updates).eq('id', id)
    return !error
  },
  async deleteInfracao(id: number): Promise<boolean> {
    const { error } = await supabase.from('infracoes').delete().eq('id', id)
    return !error
  },
  async getEstatisticas() {
    const { data } = await supabase.from('infracoes').select('status, valor_multa')
    const i = data || []
    return {
      pendentes: i.filter((x) => x.status === 'pendente').length,
      valor_pendente: i.filter((x) => x.status === 'pendente').reduce((s, x) => s + (x.valor_multa || 0), 0),
      total: i.length,
    }
  },
}

/* ───────────── CHECKLISTS ───────────── */
export const checklistService = {
  async getChecklists(): Promise<Checklist[]> {
    const { data } = await supabase.from('checklists').select('*').order('created_at', { ascending: false })
    return data || []
  },
  async createChecklist(payload: Partial<Checklist>): Promise<Checklist | null> {
    const { data } = await supabase.from('checklists').insert(payload).select().single()
    return data
  },
  async updateChecklist(id: number, updates: Partial<Checklist>): Promise<boolean> {
    const { error } = await supabase.from('checklists').update(updates).eq('id', id)
    return !error
  },
  async deleteChecklist(id: number): Promise<boolean> {
    const { error } = await supabase.from('checklists').delete().eq('id', id)
    return !error
  },
}

/* ───────────── PEÇAS ───────────── */
export const pecaService = {
  async getPecasAtivas(): Promise<Peca[]> {
    const { data } = await supabase.from('pecas').select('*').eq('ativo', true).order('nome')
    return data || []
  },
  async getTodasPecas(): Promise<Peca[]> {
    const { data } = await supabase.from('pecas').select('*').order('nome')
    return data || []
  },
  async getPecaById(id: number): Promise<Peca | null> {
    const { data } = await supabase.from('pecas').select('*').eq('id', id).maybeSingle()
    return data
  },
  async criarPeca(payload: Partial<Peca>): Promise<Peca | null> {
    const { data } = await supabase.from('pecas').insert(payload).select().single()
    return data
  },
  async atualizarPeca(id: number, updates: Partial<Peca>): Promise<boolean> {
    const { error } = await supabase.from('pecas').update(updates).eq('id', id)
    return !error
  },
  async deletarPeca(id: number): Promise<boolean> {
    const { error } = await supabase.from('pecas').update({ ativo: false }).eq('id', id)
    return !error
  },
  async getPedidosPorEmail(email: string): Promise<PedidoPeca[]> {
    const { data } = await supabase
      .from('pedidos_pecas').select('*').eq('cliente_email', email)
      .order('created_at', { ascending: false })
    return data || []
  },
  async getTodosPedidos(status?: string): Promise<PedidoPeca[]> {
    let q = supabase.from('pedidos_pecas').select('*').order('created_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data } = await q
    return data || []
  },
  async criarPedido(payload: Partial<PedidoPeca>): Promise<PedidoPeca | null> {
    const { data } = await supabase.from('pedidos_pecas').insert(payload).select().single()
    return data
  },
  async atualizarStatusPedido(id: number, status: string): Promise<boolean> {
    const { error } = await supabase.from('pedidos_pecas').update({ status }).eq('id', id)
    return !error
  },
}

/* ───────────── SOLICITAÇÕES ───────────── */
export const solicitacaoService = {
  async getSolicitacoes(status?: string): Promise<SolicitacaoAluguel[]> {
    let q = supabase.from('solicitacoes_aluguel').select('*').order('created_at', { ascending: false })
    if (status) q = q.eq('status', status)
    const { data } = await q
    return data || []
  },
  async getSolicitacoesPorEmail(email: string): Promise<SolicitacaoAluguel[]> {
    const { data } = await supabase
      .from('solicitacoes_aluguel').select('*').eq('email', email)
      .order('created_at', { ascending: false })
    return data || []
  },
  async criarSolicitacao(payload: Partial<SolicitacaoAluguel>): Promise<SolicitacaoAluguel | null> {
    const { data } = await supabase.from('solicitacoes_aluguel').insert(payload).select().single()
    return data
  },
  async atualizarStatus(id: number, updates: Partial<SolicitacaoAluguel>): Promise<boolean> {
    const { error } = await supabase.from('solicitacoes_aluguel').update(updates).eq('id', id)
    return !error
  },
  async aprovarSolicitacao(id: number, atendidoPor: string): Promise<boolean> {
    const { error } = await supabase.from('solicitacoes_aluguel')
      .update({ status: 'aprovada', atendido_por: atendidoPor, data_atendimento: new Date().toISOString() })
      .eq('id', id)
    return !error
  },
  async rejeitarSolicitacao(id: number, motivo: string, atendidoPor: string): Promise<boolean> {
    const { error } = await supabase.from('solicitacoes_aluguel')
      .update({ status: 'rejeitada', observacao_rejeicao: motivo, atendido_por: atendidoPor, data_atendimento: new Date().toISOString() })
      .eq('id', id)
    return !error
  },
  async deletarSolicitacao(id: number): Promise<boolean> {
    const { error } = await supabase.from('solicitacoes_aluguel').delete().eq('id', id)
    return !error
  },
  async contarPorStatus(): Promise<Record<string, number>> {
    const { data } = await supabase.from('solicitacoes_aluguel').select('status')
    const counts: Record<string, number> = {}
    for (const row of data || []) counts[row.status] = (counts[row.status] || 0) + 1
    return counts
  },
}

/* ───────────── NOTIFICAÇÕES ───────────── */
export const notificacaoService = {
  async getNotificacoes(limit = 50): Promise<Notificacao[]> {
    const { data } = await supabase
      .from('notificacoes').select('*').order('created_at', { ascending: false }).limit(limit)
    return data || []
  },
  async contarNaoLidas(): Promise<number> {
    const { count } = await supabase
      .from('notificacoes').select('id', { count: 'exact', head: true }).eq('lida', false)
    return count || 0
  },
  async marcarComoLida(id: number): Promise<boolean> {
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    return !error
  },
  async marcarTodasComoLidas(): Promise<boolean> {
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('lida', false)
    return !error
  },
}

/* ───────────── AUTH ───────────── */
export const authService = {
  async getUserType(): Promise<'admin' | 'locador' | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('users').select('is_admin, ativo').eq('uid', user.id).maybeSingle()
    if (!data || data.ativo === false) return null
    return data.is_admin ? 'admin' : 'locador'
  },
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
  async signOut() {
    await supabase.auth.signOut()
  },
}
