// ─── Entrega e devolução da moto ───
//
// Junta as pontas que o banco já previa e ninguém tinha ligado:
// solicitação → locação (origem_solicitacao_id) → vistoria de entrada
// (checklist_entrada_id) → devolução com vistoria de saída e acerto.
//
// A vistoria com foto não é enfeite: o contrato que o cliente assina diz, no
// parágrafo único da cláusula 1ª, que "o presente contrato é acompanhado de
// laudo de vistoria". Sem ela, a locadora promete por escrito um documento
// que não existe — e perde a discussão de avaria.
import { supabase } from './supabase'
import { registrarEvento } from './eventos'
import { locacaoService, checklistService, clienteService } from './services'
import type { SolicitacaoAluguel, Locacao, Checklist } from '@/types'

const BUCKET = 'vistorias'

export interface DadosVistoria {
  km: number
  itens: Record<string, boolean>
  observacoes: string
  fotos: File[]
  responsavel: string
}

/* ── fotos ───────────────────────────────────────────────── */

/** Sobe as fotos e devolve as URLs públicas. Uma foto que falha não derruba a
 *  vistoria inteira — melhor registrar a entrega com 3 das 4 fotos do que
 *  perder tudo e o funcionário desistir de fazer vistoria. */
export async function subirFotos(fotos: File[], prefixo: string): Promise<string[]> {
  const urls: string[] = []
  for (const [i, foto] of fotos.entries()) {
    const ext = foto.name.split('.').pop()?.toLowerCase() || 'jpg'
    const caminho = `${prefixo}/${Date.now()}-${i}.${ext}`
    const { error } = await supabase.storage.from(BUCKET)
      .upload(caminho, foto, { contentType: foto.type || 'image/jpeg', upsert: true })
    if (error) {
      console.error('[vistoria] falha ao subir foto:', error.message)
      continue
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)
    urls.push(data.publicUrl)
  }
  return urls
}

/** avarias_fotos é uma coluna TEXT; guardamos JSON e lemos com tolerância
 *  porque registros antigos podem ter qualquer coisa ali. */
export function lerFotos(valor: string | null | undefined): string[] {
  if (!valor) return []
  try {
    const v = JSON.parse(valor)
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return valor.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

/* ── disponibilidade ─────────────────────────────────────── */

/** Locação ativa que ocupa a moto no período, se houver.
 *  Dois períodos se sobrepõem quando um começa antes do outro terminar. */
export async function motoOcupada(
  motoId: number, inicio: string, fim: string, ignorarLocacaoId?: number,
): Promise<Locacao | null> {
  let q = supabase.from('locacoes').select('*')
    .eq('moto_id', motoId)
    .in('status', ['ativa', 'atrasada'])
    .lte('data_inicio', fim)
    .gte('data_fim', inicio)
  if (ignorarLocacaoId) q = q.neq('id', ignorarLocacaoId)

  const { data } = await q.limit(1)
  return data?.[0] ?? null
}

/* ── entrega ─────────────────────────────────────────────── */

/** Encontra o cliente pelo CPF (ou e-mail) e cria se não existir.
 *  Locação sem cliente vinculado vira dado solto: nenhuma tela consegue
 *  responder "o que esse cliente já alugou". */
async function vincularCliente(s: SolicitacaoAluguel): Promise<number | null> {
  const cpf = (s.cpf ?? '').replace(/\D/g, '')

  if (cpf) {
    const { data } = await supabase.from('clientes').select('id').eq('cpf', cpf).maybeSingle()
    if (data?.id) return data.id
  }
  if (s.email) {
    const { data } = await supabase.from('clientes').select('id').eq('email', s.email).maybeSingle()
    if (data?.id) return data.id
  }

  const novo = await clienteService.createCliente({
    nome: s.nome_completo, cpf: cpf || null, rg: s.rg ?? null, cnh: s.cnh ?? null,
    validade_cnh: s.validade_cnh ?? null, telefone: s.telefone, email: s.email,
    cep: s.cep ?? null, endereco: s.rua ?? null, numero_endereco: s.numero ?? null,
    bairro: s.bairro ?? null, cidade: s.cidade ?? null, estado: s.estado ?? null,
    atividade: s.profissao ?? null,
  })
  return novo?.id ?? null
}

export interface ResultadoEntrega {
  locacao: Locacao
  checklist: Checklist | null
}

/** Cria a locação a partir da solicitação e registra a vistoria de entrada. */
export async function entregarMoto(
  s: SolicitacaoAluguel, v: DadosVistoria,
): Promise<ResultadoEntrega> {
  if (!s.moto_id) throw new Error('Esta solicitação não tem moto vinculada.')

  const conflito = await motoOcupada(s.moto_id, s.data_retirada, s.data_devolucao)
  if (conflito) {
    throw new Error(
      `Esta moto já está em locação ativa de ${conflito.data_inicio} a ${conflito.data_fim}.`,
    )
  }

  const clienteId = await vincularCliente(s)

  const dias = Math.max(1, Math.round(
    (new Date(`${s.data_devolucao}T12:00:00`).getTime()
      - new Date(`${s.data_retirada}T12:00:00`).getTime()) / 86_400_000,
  ))
  const valorTotal = s.valor_total ?? 0
  const valorDiaria = s.valor_diaria ?? (valorTotal ? valorTotal / dias : 0)

  const locacao = await locacaoService.createLocacao({
    cliente_id: clienteId,
    cliente_nome: s.nome_completo,
    moto_id: s.moto_id,
    moto_nome: s.moto_nome,
    data_inicio: s.data_retirada,
    data_fim: s.data_devolucao,
    valor_diaria: valorDiaria || null,
    valor_total: valorTotal || null,
    // o pagamento já foi confirmado antes da entrega
    valor_pago: s.pagamento_pago ? valorTotal : 0,
    valor_pendente: s.pagamento_pago ? 0 : valorTotal,
    status: 'ativa',
    km_inicial: v.km,
    observacoes: v.observacoes || null,
    origem_solicitacao_id: s.id,
    origem: 'solicitacao',
  })
  if (!locacao) throw new Error('Não foi possível criar a locação.')

  const fotos = await subirFotos(v.fotos, `locacao-${locacao.id}/entrada`)
  const checklist = await checklistService.createChecklist({
    moto_id: s.moto_id,
    moto_nome: s.moto_nome,
    locacao_id: locacao.id,
    tipo: 'entrada',
    data_checklist: new Date().toISOString().slice(0, 10),
    km_atual: v.km,
    responsavel: v.responsavel,
    observacoes: v.observacoes || null,
    avarias_fotos: JSON.stringify(fotos),
    ...v.itens,
  })

  if (checklist) {
    await locacaoService.updateLocacao(locacao.id, { checklist_entrada_id: checklist.id })
  }

  await supabase.from('solicitacoes_aluguel')
    .update({ status: 'convertida', locacao_id: locacao.id })
    .eq('id', s.id!)

  await registrarEvento({
    tabela: 'solicitacoes_aluguel', registroId: s.id!, acao: 'entregou_moto',
    descricao: `Moto entregue — locação #${locacao.id} criada com vistoria de entrada`,
    dados: { locacao_id: locacao.id, km: v.km, fotos: fotos.length },
  })

  return { locacao, checklist }
}

/* ── devolução ───────────────────────────────────────────── */

export interface AcertoDevolucao {
  diasAtraso: number
  valorAtraso: number
  valorReparos: number
  totalExtra: number
}

/** Calcula o que ainda se deve cobrar na devolução: diárias de atraso mais
 *  os reparos apontados na vistoria de saída. */
export function calcularAcerto(
  locacao: Locacao, dataRetorno: string, valorReparos: number,
): AcertoDevolucao {
  const fim = new Date(`${locacao.data_fim}T12:00:00`).getTime()
  const real = new Date(`${dataRetorno}T12:00:00`).getTime()
  const diasAtraso = Math.max(0, Math.round((real - fim) / 86_400_000))
  const valorAtraso = diasAtraso * (locacao.valor_diaria ?? 0)
  return {
    diasAtraso,
    valorAtraso,
    valorReparos,
    totalExtra: valorAtraso + valorReparos,
  }
}

/** Encerra a locação: vistoria de saída, km rodado e acerto de contas. */
export async function devolverMoto(
  locacao: Locacao,
  v: DadosVistoria & { dataRetorno: string; valorReparos: number },
): Promise<AcertoDevolucao> {
  const fotos = await subirFotos(v.fotos, `locacao-${locacao.id}/saida`)

  const checklist = await checklistService.createChecklist({
    moto_id: locacao.moto_id,
    moto_nome: locacao.moto_nome,
    locacao_id: locacao.id,
    tipo: 'saida',
    data_checklist: v.dataRetorno,
    km_atual: v.km,
    responsavel: v.responsavel,
    observacoes: v.observacoes || null,
    avarias_fotos: JSON.stringify(fotos),
    ...v.itens,
  })

  const acerto = calcularAcerto(locacao, v.dataRetorno, v.valorReparos)
  const kmRodados = locacao.km_inicial != null ? Math.max(0, v.km - locacao.km_inicial) : null

  await locacaoService.updateLocacao(locacao.id, {
    status: 'finalizada',
    data_retorno_real: v.dataRetorno,
    km_final: v.km,
    km_rodados: kmRodados,
    valor_manutencao: v.valorReparos || null,
    valor_pendente: (locacao.valor_pendente ?? 0) + acerto.totalExtra,
    observacoes_finalizacao: v.observacoes || null,
    ...(checklist ? { checklist_saida_id: checklist.id } : {}),
  })

  // km da moto acompanha a devolução, senão a próxima vistoria parte de um número velho
  if (locacao.moto_id) {
    await supabase.from('motos').update({ kmatualmoto: String(v.km) }).eq('id', locacao.moto_id)
  }

  await registrarEvento({
    tabela: 'locacoes', registroId: locacao.id, acao: 'devolveu_moto',
    descricao: acerto.totalExtra > 0
      ? `Moto devolvida com ${acerto.diasAtraso} dia(s) de atraso e cobranças extras`
      : 'Moto devolvida sem pendências',
    dados: { ...acerto, km_final: v.km, km_rodados: kmRodados },
  })

  return acerto
}

/* ── painel de devoluções ────────────────────────────────── */

export interface Devolucoes {
  atrasadas: Locacao[]
  hoje: Locacao[]
  proximas: Locacao[]
}

/** Locações em aberto separadas pelo que a operação precisa saber de manhã. */
export async function carregarDevolucoes(): Promise<Devolucoes> {
  const hojeIso = new Date().toISOString().slice(0, 10)
  const limite = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)

  const { data } = await supabase.from('locacoes').select('*')
    .in('status', ['ativa', 'atrasada'])
    .order('data_fim', { ascending: true })

  const abertas = data ?? []
  return {
    atrasadas: abertas.filter((l) => l.data_fim < hojeIso),
    hoje: abertas.filter((l) => l.data_fim === hojeIso),
    proximas: abertas.filter((l) => l.data_fim > hojeIso && l.data_fim <= limite),
  }
}
