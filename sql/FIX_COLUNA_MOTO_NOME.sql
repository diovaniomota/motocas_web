-- ════════════════════════════════════════════════════════════════════════
--  FIX — coluna moto_nome ausente em manutencoes / infracoes / checklists
--
--  PROBLEMA (encontrado no teste end-to-end)
--  O código (web admin e app de frota) grava o campo "moto_nome" nessas 3
--  tabelas, mas a coluna NÃO existe no banco. Resultado: criar manutenção,
--  infração ou checklist FALHA com:
--      column "moto_nome" of relation "<tabela>" does not exist
--
--  As tabelas têm apenas moto_id (FK). O moto_nome é um campo denormalizado
--  que o front-end usa para exibir o nome sem precisar de join — e que os
--  types (Manutencao, Infracao, Checklist) já declaram. Ou seja, a coluna
--  deveria existir; só não foi criada na migração.
--
--  SOLUÇÃO
--  Adicionar a coluna (TEXT, nullable) nas 3 tabelas e preencher os registros
--  existentes a partir da moto vinculada.
--
--  Rode no Supabase: SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Adiciona a coluna (idempotente)
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS moto_nome TEXT;
ALTER TABLE public.infracoes   ADD COLUMN IF NOT EXISTS moto_nome TEXT;
ALTER TABLE public.checklists  ADD COLUMN IF NOT EXISTS moto_nome TEXT;

-- 2) Preenche registros já existentes com o nome da moto (se houver)
UPDATE public.manutencoes m
   SET moto_nome = mo.nomemoto
  FROM public.motos mo
 WHERE m.moto_id = mo.id
   AND m.moto_nome IS NULL;

UPDATE public.infracoes i
   SET moto_nome = mo.nomemoto
  FROM public.motos mo
 WHERE i.moto_id = mo.id
   AND i.moto_nome IS NULL;

UPDATE public.checklists c
   SET moto_nome = mo.nomemoto
  FROM public.motos mo
 WHERE c.moto_id = mo.id
   AND c.moto_nome IS NULL;

-- 3) Conferência
SELECT 'manutencoes' AS tabela, count(*) AS total, count(moto_nome) AS com_nome FROM public.manutencoes
UNION ALL
SELECT 'infracoes',   count(*), count(moto_nome) FROM public.infracoes
UNION ALL
SELECT 'checklists',  count(*), count(moto_nome) FROM public.checklists;
