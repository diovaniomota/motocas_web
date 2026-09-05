-- ═══════════════════════════════════════════════════════════════
-- Contrato assinável + link de pagamento Pagar.me
-- Rode no SQL Editor do Supabase antes de usar os botões novos.
-- É idempotente: pode rodar de novo sem quebrar nada.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Token do link de assinatura ────────────────────────────
-- O cliente assina por um link recebido no WhatsApp, sem login
-- (o site não tem cadastro de cliente). O token é a credencial.
ALTER TABLE public.solicitacoes_aluguel
  ADD COLUMN IF NOT EXISTS assinatura_token TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_token_expira TIMESTAMPTZ;

-- busca por token acontece a cada abertura do link
CREATE UNIQUE INDEX IF NOT EXISTS solicitacoes_assinatura_token_idx
  ON public.solicitacoes_aluguel (assinatura_token)
  WHERE assinatura_token IS NOT NULL;


-- ── 2. Bucket dos contratos ───────────────────────────────────
-- PRIVADO de propósito: o PDF tem CPF, RG e endereço do cliente.
-- A Edge Function devolve URL assinada; ninguém lista o bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('termos', 'termos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Nenhuma policy de leitura pública: quem escreve e lê é a Edge
-- Function usando a service role, que ignora RLS por definição.
DROP POLICY IF EXISTS "Leitura pública dos termos" ON storage.objects;


-- ── 3. Dados da LOCADORA que entram no contrato ───────────────
-- O texto herdado do gerador antigo traz dados de exemplo
-- (CNPJ 00.000.000/0001-00, "Rua das Motos, 123 - São Paulo/SP").
-- ⚠️  TROQUE pelos dados reais antes de mandar contrato a cliente.
INSERT INTO public.app_settings (key, value) VALUES
('contrato_locadora', 'MOTOCAS LOCADORA DE MOTOS LTDA, pessoa jurídica de direito privado inscrita no CNPJ n. 00.000.000/0001-00, com sede na Rua das Motos, n. 123 - Centro, São Paulo/SP.'),
('contrato_local', 'São Paulo/SP')
ON CONFLICT (key) DO NOTHING;


-- ── 4. Mensagens de WhatsApp dos passos novos ─────────────────
-- O template de contrato antigo prometia "segue em anexo" sem anexo
-- nenhum. Agora manda o link de assinatura.
INSERT INTO public.app_settings (key, value) VALUES
('template_contrato_gerado', '📄 *MOTOCAS - Contrato pronto para assinar!*

Olá *{{nome}}*! 🎉

Seu contrato de locação da *{{moto}}* está pronto.

📅 *Período:* {{data_retirada}} a {{data_devolucao}}

✍️ *Assine aqui:*
{{link_contrato}}

É só abrir o link, ler o contrato e assinar com o dedo na tela. Leva menos de 2 minutos.

📞 Dúvidas? Responda esta mensagem!

_Equipe Motocas_'),
('template_link_pagamento', '💳 *MOTOCAS - Link de pagamento*

Olá *{{nome}}*! 👋

Seu pagamento da locação da *{{moto}}* já pode ser feito.

📅 *Período:* {{data_retirada}} a {{data_devolucao}}
💰 *Valor:* {{valor_total}}

👉 *Pague aqui:*
{{link_pagamento}}

Você pode pagar por PIX, cartão ou boleto na mesma página.

📞 Dúvidas? Responda esta mensagem!

_Equipe Motocas_')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ═══════════════════════════════════════════════════════════════
-- ⚠️  PENDÊNCIAS DE SEGURANÇA (não corrigidas aqui de propósito,
--     porque mexem em quem consegue usar o site hoje)
--
-- 1. app_settings tem SELECT liberado para anônimo, e é lá que
--    mora a wa_api_key. Qualquer visitante do site consegue ler a
--    chave e disparar WhatsApp em nome da Motocas:
--      curl "$SUPABASE_URL/rest/v1/app_settings?select=*" -H "apikey: <anon>"
--
-- 2. solicitacoes_aluguel também responde a SELECT anônimo, com
--    CPF, RG, telefone e endereço de todos os clientes.
--
-- Os dois casos são estruturais: o site é export estático e fala
-- direto com o banco. A saída é mover essas leituras para Edge
-- Functions (como o contrato e o pagamento agora fazem) e então
-- fechar as policies.
-- ═══════════════════════════════════════════════════════════════
