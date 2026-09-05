-- ═══════════════════════════════════════════════════════════════
-- Locação a partir da solicitação + vistoria com fotos
--
-- A tabela `locacoes` já previa o fluxo inteiro (origem_solicitacao_id,
-- checklist_entrada_id, checklist_saida_id, data_retorno_real, km_*) e a
-- `checklists` já previa a vistoria (itens, avarias_fotos, assinaturas,
-- valores de reparo). Nada disso estava ligado — 9 solicitações e 0 locações.
--
-- Rode no SQL Editor do Supabase. É idempotente.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Colunas que o código já usava e o banco não tinha ──────
-- O tipo Locacao e a query do dashboard pedem cliente_nome/moto_nome/
-- moto_placa. A consulta falha com 42703; ninguém percebeu porque a tabela
-- está vazia e o erro é engolido. Desnormalizar aqui evita join em toda
-- listagem e mantém o histórico do nome como estava na data da locação.
ALTER TABLE public.locacoes
    ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
    ADD COLUMN IF NOT EXISTS moto_nome    TEXT,
    ADD COLUMN IF NOT EXISTS moto_placa   TEXT;


-- ── 2. Índices para as telas novas ────────────────────────────
-- painel "devolve hoje / atrasadas"
CREATE INDEX IF NOT EXISTS locacoes_status_fim_idx
    ON public.locacoes (status, data_fim);

-- checagem de moto ocupada no período (evita reserva dupla)
CREATE INDEX IF NOT EXISTS locacoes_moto_periodo_idx
    ON public.locacoes (moto_id, data_inicio, data_fim);

-- vistorias de uma locação (entrada e saída)
CREATE INDEX IF NOT EXISTS checklists_locacao_idx
    ON public.checklists (locacao_id, tipo);


-- ── 3. Bucket das fotos de vistoria ───────────────────────────
-- Público na leitura: são fotos da moto, não documento de cliente — e a tela
-- precisa exibir entrada e saída lado a lado sem custo de URL assinada.
-- Escrita só para quem está logado: quem faz vistoria é funcionário.
INSERT INTO storage.buckets (id, name, public)
VALUES ('vistorias', 'vistorias', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "vistorias_leitura" ON storage.objects;
CREATE POLICY "vistorias_leitura" ON storage.objects
    FOR SELECT TO anon, authenticated USING (bucket_id = 'vistorias');

DROP POLICY IF EXISTS "vistorias_escrita_autenticada" ON storage.objects;
CREATE POLICY "vistorias_escrita_autenticada" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vistorias');


-- ═══════════════════════════════════════════════════════════════
-- NÃO fiz aqui, de propósito:
--
-- Existem três tabelas vazias para a mesma ideia — `locacao`, `alugueis` e
-- `historico_locacao` — sobras de versões anteriores. O admin usa `locacoes`.
-- Apagar tabela é irreversível, então deixei a decisão com você:
--
--   DROP TABLE public.locacao, public.alugueis, public.historico_locacao;
--
-- Confira antes que estão mesmo vazias e que nenhum outro projeto
-- (motocas_sistema, motocas_frota) escreve nelas.
-- ═══════════════════════════════════════════════════════════════
