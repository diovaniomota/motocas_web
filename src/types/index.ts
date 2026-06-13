// ─── Tipos espelhando os models do Flutter (lib/models) ───
// Tabelas Supabase usam snake_case; aqui mantemos os nomes das colunas.

export interface Moto {
  id: number
  nomemoto?: string | null
  renavanmoto?: string | null
  cormoto?: string | null
  placamoto?: string | null
  anomoto?: string | null
  kmatualmoto?: string | null
  estado_id?: number | null
  estado_nome?: string | null
  id_cliente?: number | null
  cliente_nome?: string | null
  foto_url?: string | null
}

export interface Cliente {
  id: number
  nome?: string | null
  cpf?: string | null
  rg?: string | null
  telefone?: string | null
  email?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  data_nascimento?: string | null
  cnh?: string | null
  validade_cnh?: string | null
  observacoes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface Locacao {
  id: number
  cliente_id?: number | null
  cliente_nome?: string | null
  moto_id?: number | null
  moto_nome?: string | null
  moto_placa?: string | null
  data_inicio: string
  data_fim: string
  data_retorno_real?: string | null
  valor_diaria?: number | null
  valor_total?: number | null
  valor_pago?: number | null
  valor_pendente?: number | null
  valor_manutencao?: number | null
  forma_pagamento?: string | null
  status: string // ativa, finalizada, cancelada, atrasada
  km_inicial?: number | null
  km_final?: number | null
  km_rodados?: number | null
  observacoes?: string | null
  observacoes_finalizacao?: string | null
  checklist_entrada_id?: number | null
  checklist_saida_id?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface Manutencao {
  id: number
  moto_id?: number | null
  moto_nome?: string | null
  locacao_id?: number | null
  tipo_manutencao?: string | null // preventiva, corretiva, revisao
  descricao?: string | null
  data_inicio?: string | null
  data_fim?: string | null
  data_previsao_termino?: string | null
  valor_orcado?: number | null
  valor_final?: number | null
  oficina?: string | null
  responsavel?: string | null
  status: string // agendada, em_andamento, concluida, cancelada
  pecas_trocadas?: string | null
  observacoes?: string | null
  km_manutencao?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface Infracao {
  id: number
  moto_id?: number | null
  moto_nome?: string | null
  locacao_id?: number | null
  tipo_infracao?: string | null
  descricao?: string | null
  data_infracao?: string | null
  valor_multa?: number | null
  numero_auto?: string | null
  status: string // pendente, paga, contestada, absorvida
  observacoes?: string | null
  data_pagamento?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface Checklist {
  id: number
  moto_id?: number | null
  moto_nome?: string | null
  locacao_id?: number | null
  tipo: string // entrada, saida, rotina
  data_checklist?: string | null
  km_atual?: number | null
  responsavel?: string | null
  pneu_dianteiro?: boolean | null
  pneu_traseiro?: boolean | null
  freios?: boolean | null
  farois?: boolean | null
  setas?: boolean | null
  retrovisores?: boolean | null
  painel?: boolean | null
  bateria?: boolean | null
  nivel_oleo?: boolean | null
  documentos?: boolean | null
  suporte_celular?: boolean | null
  observacoes?: string | null
  avarias_fotos?: string | null
  assinatura_cliente?: string | null
  assinatura_responsavel?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export const CHECKLIST_ITENS = [
  { key: 'pneu_dianteiro', label: 'Pneu Dianteiro' },
  { key: 'pneu_traseiro', label: 'Pneu Traseiro' },
  { key: 'freios', label: 'Freios' },
  { key: 'farois', label: 'Faróis' },
  { key: 'setas', label: 'Setas' },
  { key: 'retrovisores', label: 'Retrovisores' },
  { key: 'painel', label: 'Painel' },
  { key: 'bateria', label: 'Bateria' },
  { key: 'nivel_oleo', label: 'Nível de Óleo' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'suporte_celular', label: 'Suporte Celular' },
] as const

export interface Peca {
  id: number
  nome: string
  descricao?: string | null
  categoria: string
  preco: number
  estoque: number
  foto_url?: string | null
  ativo: boolean
  created_at?: string | null
  updated_at?: string | null
}

export const CATEGORIAS_PECA: Record<string, string> = {
  capacetes: 'Capacetes',
  luvas: 'Luvas',
  jaquetas: 'Jaquetas',
  pecas_motor: 'Peças de Motor',
  pneus: 'Pneus',
  acessorios: 'Acessórios',
  oleos: 'Óleos',
  manutencao: 'Manutenção',
}

export interface PedidoPeca {
  id: number
  peca_id: number
  cliente_email: string
  cliente_nome: string
  cliente_telefone: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  status: string
  observacoes?: string | null
  endereco_entrega?: string | null
  created_at?: string | null
  updated_at?: string | null
  link_pagamento?: string | null
  pagarme_order_id?: string | null
  pagamento_liberado?: boolean | null
  pagamento_pago?: boolean | null
  data_pagamento?: string | null
  metodo_pagamento?: string | null
}

export interface SolicitacaoAluguel {
  id?: number
  moto_nome: string
  moto_id?: number | null
  nome_completo: string
  telefone: string
  email: string
  rg?: string | null
  cpf?: string | null
  cnh?: string | null
  validade_cnh?: string | null
  profissao?: string | null
  estado_civil?: string | null
  endereco?: string | null
  cep?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  complemento?: string | null
  data_nascimento?: string | null
  cliente_id?: number | null
  data_retirada: string
  data_devolucao: string
  local_retirada?: string | null
  quilometragem_diaria_estimada?: string | null
  como_conheceu?: string | null
  observacoes?: string | null
  numero_dias?: number | null
  valor_estimado?: number | null
  status: string // pendente, em_analise, aprovada, gerar_contrato, rejeitada, convertida
  created_at?: string | null
  updated_at?: string | null
  atendido_por?: string | null
  data_atendimento?: string | null
  notas_internas?: string | null
  locacao_id?: number | null
  valor_diaria?: number | null
  valor_total?: number | null
  pagamento_liberado?: boolean | null
  pagamento_pago?: boolean | null
  link_pagamento?: string | null
  pix_qr_code?: string | null
  pix_qr_code_url?: string | null
  pagarme_order_id?: string | null
  data_liberacao_pagamento?: string | null
  data_pagamento?: string | null
  termo_aceito?: boolean | null
  data_aceite_termo?: string | null
  termo_pdf_url?: string | null
  observacao_rejeicao?: string | null
  foto_cnh_url?: string | null
  foto_cliente_url?: string | null
}

export interface Notificacao {
  id: number
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  referencia_id?: number | null
  referencia_tipo?: string | null
  created_at?: string | null
}

export interface ItemCarrinho {
  peca_id: number
  peca_nome: string
  peca_foto?: string | null
  preco_unitario: number
  quantidade: number
  estoque_disponivel: number
}

// ─── Helpers de status (espelham os getters statusFormatado do Flutter) ───

export const LOCACAO_STATUS: Record<string, { label: string; color: string }> = {
  aguardando_retirada: { label: 'Aguardando Retirada', color: '#F59E0B' },
  ativa: { label: 'Ativa', color: '#3B82F6' },
  finalizada: { label: 'Finalizada', color: '#6B7280' },
  cancelada: { label: 'Cancelada', color: '#EF4444' },
  atrasada: { label: 'Atrasada', color: '#EF4444' },
}

export const MANUTENCAO_STATUS: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: '#F59E0B' },
  em_andamento: { label: 'Em Andamento', color: '#3B82F6' },
  concluida: { label: 'Concluída', color: '#22C55E' },
  cancelada: { label: 'Cancelada', color: '#EF4444' },
}

export const INFRACAO_STATUS: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: '#F59E0B' },
  paga: { label: 'Paga', color: '#22C55E' },
  contestada: { label: 'Contestada', color: '#3B82F6' },
  absorvida: { label: 'Absorvida', color: '#8B5CF6' },
}

export const SOLICITACAO_STATUS: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: '#F59E0B' },
  em_analise: { label: 'Em Análise', color: '#8B5CF6' },
  aprovada: { label: 'Aprovada', color: '#22C55E' },
  gerar_contrato: { label: 'Gerar Contrato', color: '#3B82F6' },
  rejeitada: { label: 'Rejeitada', color: '#EF4444' },
  convertida: { label: 'Convertida em Locação', color: '#6B7280' },
}

export const PEDIDO_STATUS: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: '#F59E0B' },
  em_analise: { label: 'Em Análise', color: '#3B82F6' },
  aprovado: { label: 'Aprovado', color: '#22C55E' },
  enviado: { label: 'Enviado', color: '#A855F7' },
  entregue: { label: 'Entregue', color: '#22C55E' },
  cancelado: { label: 'Cancelado', color: '#EF4444' },
}
