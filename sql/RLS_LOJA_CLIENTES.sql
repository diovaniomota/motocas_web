-- ════════════════════════════════════════════════════════════════════════
--  RLS — Tabelas da loja/clientes
--  Tabelas: pecas, pedidos_pecas, clientes, locacoes
--  (notificacoes NÃO entra: já está corretamente protegida — só authenticated)
--
--  CONTEXTO (confirmado pelo diagnóstico)
--  As policies atuais têm furos: operações de ADMIN (insert/update/delete) em
--  pecas e pedidos_pecas estão atribuídas ao role {public} — ou seja, qualquer
--  anon (anon key é pública) pode editar/apagar peças e alterar pedidos.
--  clientes e locacoes estão totalmente abertas ("permitir tudo para public").
--
--  Mapa de uso REAL no código (web + apps):
--    • pecas.........: site/app leem o catálogo de ATIVAS (anon SELECT ativo=true).
--                      Admin gerencia (authenticated).
--    • pedidos_pecas.: checkout do site é ANÔNIMO e faz insert().select()
--                      → anon: INSERT + SELECT. Admin gerencia status (auth).
--    • clientes......: só admin cria/edita; painel do cliente lê LOGADO.
--                      → anon NÃO acessa (protege CPF/RG/telefone).
--    • locacoes......: ninguém lê como anon → anon NÃO acessa (protege financeiro).
--
--  Resultado:
--    • authenticated (admin + cliente logado) → acesso TOTAL.
--    • anon → só o mínimo: ler peças ativas, criar/ler pedido no checkout.
--
--  COMO USAR
--    1) Rode o BLOCO 0 (diagnóstico) e veja as policies atuais.
--    2) Rode o BLOCO 1 (aplicar). Remove as policies furadas e cria as novas.
--    3) TESTE: catálogo de peças (site/app), finalizar pedido sem login,
--       painel do cliente (logado), painel admin (peças/pedidos/clientes/locações).
--    4) Se algo quebrar, rode o BLOCO 2 (rollback).
--
--  ⚠️  Pré-requisito: painel admin e painel do cliente precisam estar LOGADOS
--      (role authenticated). Fluxos anônimos cobertos: catálogo e checkout.
-- ════════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
--  BLOCO 0 · DIAGNÓSTICO (não altera nada — rode primeiro)
-- ──────────────────────────────────────────────────────────────────────
SELECT tablename, rowsecurity AS rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('pecas','pedidos_pecas','clientes','locacoes')
ORDER BY tablename;

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pecas','pedidos_pecas','clientes','locacoes')
ORDER BY tablename, policyname;


-- ──────────────────────────────────────────────────────────────────────
--  BLOCO 1 · APLICAR RLS + POLICIES
-- ──────────────────────────────────────────────────────────────────────

-- Remove TODAS as policies atuais dessas 4 tabelas (limpeza independente do
-- nome — inclui as policies furadas atribuídas a {public}).
-- OBS: notificacoes está de fora de propósito; não é tocada.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('pecas','pedidos_pecas','clientes','locacoes')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ========================= PEÇAS =========================
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;

-- Admin: gerencia tudo
DROP POLICY IF EXISTS loja_pecas_admin_all ON public.pecas;
CREATE POLICY loja_pecas_admin_all ON public.pecas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Catálogo público: anon vê apenas peças ATIVAS (mantém o comportamento atual)
DROP POLICY IF EXISTS loja_pecas_anon_select ON public.pecas;
CREATE POLICY loja_pecas_anon_select ON public.pecas
  FOR SELECT TO anon USING (ativo = true);

-- ====================== PEDIDOS DE PEÇAS ======================
ALTER TABLE public.pedidos_pecas ENABLE ROW LEVEL SECURITY;

-- Admin: gerencia/atualiza status dos pedidos
DROP POLICY IF EXISTS loja_pedidos_admin_all ON public.pedidos_pecas;
CREATE POLICY loja_pedidos_admin_all ON public.pedidos_pecas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Checkout anônimo cria o pedido...
DROP POLICY IF EXISTS loja_pedidos_anon_insert ON public.pedidos_pecas;
CREATE POLICY loja_pedidos_anon_insert ON public.pedidos_pecas
  FOR INSERT TO anon WITH CHECK (true);

-- ...e o insert().select() do site precisa ler a linha recém-criada.
-- (anon não tem login, então a leitura não é restrita por dono — igual ao atual.)
DROP POLICY IF EXISTS loja_pedidos_anon_select ON public.pedidos_pecas;
CREATE POLICY loja_pedidos_anon_select ON public.pedidos_pecas
  FOR SELECT TO anon USING (true);

-- ========================= CLIENTES =========================
-- Sem acesso anon (protege dados pessoais). Só admin/cliente logado.
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loja_clientes_auth_all ON public.clientes;
CREATE POLICY loja_clientes_auth_all ON public.clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ========================= LOCAÇÕES =========================
-- Sem acesso anon (protege dados financeiros). Só admin logado.
ALTER TABLE public.locacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loja_locacoes_auth_all ON public.locacoes;
CREATE POLICY loja_locacoes_auth_all ON public.locacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────────────
--  BLOCO 2 · ROLLBACK (use só se algo quebrar após o BLOCO 1)
-- ──────────────────────────────────────────────────────────────────────
-- Remove as policies granulares e recria uma policy "permitir tudo para
-- public" em cada tabela — voltando ao estado aberto anterior.
--
-- DROP POLICY IF EXISTS loja_pecas_admin_all     ON public.pecas;
-- DROP POLICY IF EXISTS loja_pecas_anon_select   ON public.pecas;
-- DROP POLICY IF EXISTS loja_pedidos_admin_all   ON public.pedidos_pecas;
-- DROP POLICY IF EXISTS loja_pedidos_anon_insert ON public.pedidos_pecas;
-- DROP POLICY IF EXISTS loja_pedidos_anon_select ON public.pedidos_pecas;
-- DROP POLICY IF EXISTS loja_clientes_auth_all   ON public.clientes;
-- DROP POLICY IF EXISTS loja_locacoes_auth_all   ON public.locacoes;
--
-- CREATE POLICY "Permitir tudo" ON public.pecas
--   FOR ALL TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "Permitir tudo" ON public.pedidos_pecas
--   FOR ALL TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "Permitir tudo" ON public.clientes
--   FOR ALL TO public USING (true) WITH CHECK (true);
-- CREATE POLICY "Permitir tudo" ON public.locacoes
--   FOR ALL TO public USING (true) WITH CHECK (true);
