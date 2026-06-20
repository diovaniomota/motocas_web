-- ════════════════════════════════════════════════════════════════════════
--  RLS — App de Frota (motocas_frota)
--  Tabelas: motos, manutencoes, infracoes, checklists
--
--  CONTEXTO
--  O app de frota usa a ANON KEY SEM login (acesso aberto, escolha do projeto).
--  Estado atual (confirmado pelo diagnóstico): cada tabela tem UMA policy
--  "permitir tudo para public" (anon + authenticated, comando ALL). Ou seja, o
--  app de frota JÁ funciona, mas o banco está escancarado: qualquer um com a
--  anon key (que é pública) pode ler, inserir, editar e APAGAR tudo.
--
--  Este script SUBSTITUI essa policy aberta por policies granulares, liberando
--  SOMENTE o necessário:
--    • authenticated (painel admin do site) → acesso TOTAL (não quebra o web)
--    • anon (app de frota + páginas públicas do site):
--        - motos........: SELECT  + UPDATE apenas da coluna kmatualmoto
--        - manutencoes..: SELECT  + INSERT
--        - infracoes....: SELECT  + INSERT
--        - checklists...: SELECT  + INSERT
--
--  COMO USAR
--    1) Rode o BLOCO 0 (diagnóstico) e confira o estado atual.
--    2) Rode o BLOCO 1 (aplicar).
--    3) TESTE o painel admin (criar/editar/excluir moto, manutenção etc.)
--       e o app de frota (escanear, registrar manutenção/multa/checklist, KM).
--    4) Se algo quebrar, rode o BLOCO 2 (rollback).
--
--  ⚠️  Pré-requisito: o painel admin do site PRECISA estar logado (role
--      authenticated). Se o admin acessar sem login (anon), as gravações dele
--      nessas tabelas serão bloqueadas — nesse caso, use o rollback.
-- ════════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
--  BLOCO 0 · DIAGNÓSTICO (não altera nada — rode primeiro)
-- ──────────────────────────────────────────────────────────────────────

-- RLS está ligado em cada tabela?
SELECT tablename, rowsecurity AS rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('motos', 'manutencoes', 'infracoes', 'checklists')
ORDER BY tablename;

-- Policies já existentes nessas tabelas
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('motos', 'manutencoes', 'infracoes', 'checklists')
ORDER BY tablename, policyname;


-- ──────────────────────────────────────────────────────────────────────
--  BLOCO 1 · APLICAR RLS + POLICIES
-- ──────────────────────────────────────────────────────────────────────

-- ========================= MOTOS =========================
ALTER TABLE public.motos ENABLE ROW LEVEL SECURITY;

-- Remove a policy aberta atual ("permitir tudo para public") — é o que mantém
-- o banco escancarado. Sem isso, as policies granulares abaixo não protegem
-- (policies são combinadas com OR).
DROP POLICY IF EXISTS "Permitir tudo em motos" ON public.motos;

-- Admin logado: acesso total (cria/edita/exclui motos pelo painel)
DROP POLICY IF EXISTS frota_motos_admin_all ON public.motos;
CREATE POLICY frota_motos_admin_all ON public.motos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leitura pública: catálogo do site + busca da moto pelo QR no app
DROP POLICY IF EXISTS frota_motos_anon_select ON public.motos;
CREATE POLICY frota_motos_anon_select ON public.motos
  FOR SELECT TO anon USING (true);

-- App de frota: atualizar quilometragem
DROP POLICY IF EXISTS frota_motos_anon_update ON public.motos;
CREATE POLICY frota_motos_anon_update ON public.motos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Segurança a nível de COLUNA: o anon só pode alterar kmatualmoto
-- (a policy acima é por linha; isto impede mexer em placa, dono, etc.)
REVOKE UPDATE ON public.motos FROM anon;
GRANT  UPDATE (kmatualmoto) ON public.motos TO anon;

-- Garante que o role authenticated (admins) e service_role continuem com acesso total
GRANT ALL ON public.motos TO authenticated;
GRANT ALL ON public.motos TO service_role;

-- ====================== MANUTENÇÕES ======================
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

-- Remove a policy aberta atual
DROP POLICY IF EXISTS "all" ON public.manutencoes;

DROP POLICY IF EXISTS frota_manutencoes_admin_all ON public.manutencoes;
CREATE POLICY frota_manutencoes_admin_all ON public.manutencoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS frota_manutencoes_anon_select ON public.manutencoes;
CREATE POLICY frota_manutencoes_anon_select ON public.manutencoes
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS frota_manutencoes_anon_insert ON public.manutencoes;
CREATE POLICY frota_manutencoes_anon_insert ON public.manutencoes
  FOR INSERT TO anon WITH CHECK (true);

-- ======================= INFRAÇÕES =======================
ALTER TABLE public.infracoes ENABLE ROW LEVEL SECURITY;

-- Remove a policy aberta atual
DROP POLICY IF EXISTS "all" ON public.infracoes;

DROP POLICY IF EXISTS frota_infracoes_admin_all ON public.infracoes;
CREATE POLICY frota_infracoes_admin_all ON public.infracoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS frota_infracoes_anon_select ON public.infracoes;
CREATE POLICY frota_infracoes_anon_select ON public.infracoes
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS frota_infracoes_anon_insert ON public.infracoes;
CREATE POLICY frota_infracoes_anon_insert ON public.infracoes
  FOR INSERT TO anon WITH CHECK (true);

-- ======================= CHECKLISTS ======================
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- Remove a policy aberta atual
DROP POLICY IF EXISTS "all" ON public.checklists;

DROP POLICY IF EXISTS frota_checklists_admin_all ON public.checklists;
CREATE POLICY frota_checklists_admin_all ON public.checklists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS frota_checklists_anon_select ON public.checklists;
CREATE POLICY frota_checklists_anon_select ON public.checklists
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS frota_checklists_anon_insert ON public.checklists;
CREATE POLICY frota_checklists_anon_insert ON public.checklists
  FOR INSERT TO anon WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────────────
--  BLOCO 2 · ROLLBACK (use só se algo quebrar após o BLOCO 1)
-- ──────────────────────────────────────────────────────────────────────
-- Remove as policies granulares, restaura o GRANT total do anon em motos e
-- recria as policies "permitir tudo para public" — voltando EXATAMENTE ao
-- estado anterior (banco aberto). Descomente tudo abaixo para rodar.
--
-- DROP POLICY IF EXISTS frota_motos_admin_all         ON public.motos;
-- DROP POLICY IF EXISTS frota_motos_anon_select       ON public.motos;
-- DROP POLICY IF EXISTS frota_motos_anon_update       ON public.motos;
-- DROP POLICY IF EXISTS frota_manutencoes_admin_all   ON public.manutencoes;
-- DROP POLICY IF EXISTS frota_manutencoes_anon_select ON public.manutencoes;
-- DROP POLICY IF EXISTS frota_manutencoes_anon_insert ON public.manutencoes;
-- DROP POLICY IF EXISTS frota_infracoes_admin_all     ON public.infracoes;
-- DROP POLICY IF EXISTS frota_infracoes_anon_select   ON public.infracoes;
-- DROP POLICY IF EXISTS frota_infracoes_anon_insert   ON public.infracoes;
-- DROP POLICY IF EXISTS frota_checklists_admin_all    ON public.checklists;
-- DROP POLICY IF EXISTS frota_checklists_anon_select  ON public.checklists;
-- DROP POLICY IF EXISTS frota_checklists_anon_insert  ON public.checklists;
--
-- GRANT UPDATE ON public.motos TO anon;
--
-- CREATE POLICY "Permitir tudo em motos" ON public.motos
--   FOR ALL TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "all" ON public.manutencoes
--   FOR ALL TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "all" ON public.infracoes
--   FOR ALL TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "all" ON public.checklists
--   FOR ALL TO public USING (true) WITH CHECK (true);
