-- ═══════════════════════════════════════════════════════════════
-- Acesso do cliente ao painel
--
-- Hoje nenhum cliente real consegue entrar: não existe signUp, magic link
-- nem recuperação de senha em nenhum lugar do código. As 5 contas não-admin
-- são de teste, criadas à mão.
--
-- O acesso passa a ser por link enviado no WhatsApp — mesmo padrão da página
-- de assinatura, que já provou funcionar. E o painel deixa de casar dados por
-- comparação de e-mail digitado, passando a usar o vínculo real.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Vínculo entre conta de autenticação e cliente ──────────
-- O painel comparava `email = user.email`. Um gmail.con digitado no
-- formulário e o cliente vê painel vazio achando que perdeu tudo.
ALTER TABLE public.clientes
    ADD COLUMN IF NOT EXISTS auth_uid UUID;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_auth_uid_idx
    ON public.clientes (auth_uid) WHERE auth_uid IS NOT NULL;

-- busca por telefone é como o cliente vai se identificar no login
CREATE INDEX IF NOT EXISTS clientes_telefone_idx ON public.clientes (telefone);
CREATE INDEX IF NOT EXISTS clientes_email_idx ON public.clientes (email);

-- ── 2. Locações do cliente ────────────────────────────────────
CREATE INDEX IF NOT EXISTS locacoes_cliente_idx
    ON public.locacoes (cliente_id, status);

-- ── 3. Configurações do acesso ────────────────────────────────
INSERT INTO public.app_settings (key, value) VALUES
('site_url', 'https://sosmotocas.com.br'),
('template_acesso_painel', '🔐 *MOTOCAS - Acesso ao seu painel*

Olá *{{nome}}*!

Use o link abaixo para entrar no seu painel e acompanhar sua locação:

{{link}}

O link vale por 1 hora e é de uso único.

Se não foi você que pediu, pode ignorar esta mensagem.

_Equipe Motocas_')
ON CONFLICT (key) DO NOTHING;
