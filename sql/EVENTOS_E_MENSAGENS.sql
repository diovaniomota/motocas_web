-- ═══════════════════════════════════════════════════════════════
-- Trilha de auditoria + log de mensagens enviadas
--
-- Duas ausências que se somavam:
--   • ninguém sabia se a mensagem de WhatsApp chegou ao cliente (o envio é
--     best-effort e falhava calado — foi assim que o bug do 9º dígito
--     passou despercebido: HTTP 200 e mensagem em lugar nenhum);
--   • não havia como responder "quem aprovou isso, e quando".
--
-- Rode no SQL Editor do Supabase. É idempotente.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Eventos (quem fez o quê, sobre qual registro) ──────────
CREATE TABLE IF NOT EXISTS public.eventos (
    id            BIGSERIAL PRIMARY KEY,
    -- registro_id é TEXT porque as tabelas do sistema misturam bigint e uuid
    tabela        TEXT NOT NULL,
    registro_id   TEXT NOT NULL,
    acao          TEXT NOT NULL,
    descricao     TEXT,
    usuario_email TEXT,
    usuario_uid   UUID,
    dados         JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- a timeline de um registro é sempre "desta tabela, deste id, mais recente primeiro"
CREATE INDEX IF NOT EXISTS eventos_registro_idx
    ON public.eventos (tabela, registro_id, created_at DESC);


-- ── 2. Mensagens enviadas ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mensagens_enviadas (
    id              BIGSERIAL PRIMARY KEY,
    canal           TEXT NOT NULL DEFAULT 'whatsapp',
    template        TEXT,
    destinatario    TEXT NOT NULL,
    solicitacao_id  BIGINT,
    -- 'enviada' | 'falhou'
    status          TEXT NOT NULL,
    erro            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mensagens_solicitacao_idx
    ON public.mensagens_enviadas (solicitacao_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mensagens_falhas_idx
    ON public.mensagens_enviadas (created_at DESC)
    WHERE status = 'falhou';


-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_enviadas ENABLE ROW LEVEL SECURITY;

-- Eventos: só quem está logado lê e escreve. Nada de anônimo aqui.
DROP POLICY IF EXISTS "eventos_leitura_autenticada" ON public.eventos;
CREATE POLICY "eventos_leitura_autenticada" ON public.eventos
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "eventos_escrita_autenticada" ON public.eventos;
CREATE POLICY "eventos_escrita_autenticada" ON public.eventos
    FOR INSERT TO authenticated WITH CHECK (true);

-- Mensagens: leitura só logado, mas a inserção precisa aceitar anônimo —
-- o formulário público do site dispara a mensagem de "solicitação recebida"
-- sem ninguém logado, e é justamente esse envio que mais precisa de registro.
DROP POLICY IF EXISTS "mensagens_leitura_autenticada" ON public.mensagens_enviadas;
CREATE POLICY "mensagens_leitura_autenticada" ON public.mensagens_enviadas
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mensagens_registro_publico" ON public.mensagens_enviadas;
CREATE POLICY "mensagens_registro_publico" ON public.mensagens_enviadas
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Ninguém edita nem apaga: log que se reescreve não serve de log.
-- Sem policy de UPDATE/DELETE, o RLS nega as duas por padrão.
