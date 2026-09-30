-- Aprovacao manual de ofertas (pedido da Camilla, 30/09/2026)
--
-- Em vez de disparo automatico, a Camilla marca na tela /admin/aprovar quais
-- produtos vao para os grupos. So sai o que estiver com aprovacao_status='aprovado'.
--
-- Migration ADITIVA: so ADD COLUMN / CREATE INDEX, nada e apagado ou alterado.
-- Todos os produtos existentes nascem 'pendente' => nada e liberado sem clique.
-- RLS: as tabelas ja tem RLS/politicas proprias; colunas novas herdam o que existe.

-- ── produtos ────────────────────────────────────────────────────────────────
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS aprovacao_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_por text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produtos_aprovacao_status_check'
  ) THEN
    ALTER TABLE public.produtos
      ADD CONSTRAINT produtos_aprovacao_status_check
      CHECK (aprovacao_status IN ('pendente', 'aprovado', 'rejeitado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_produtos_aprovacao
  ON public.produtos (aprovacao_status, aprovado_em);

-- ── produtos_garimpados (capturados dos grupos de WhatsApp) ─────────────────
-- nicho: categoria escolhida na tela (o garimpado nao tinha coluna de nicho)
-- produto_id: linha de `produtos` criada quando o garimpado e aprovado
ALTER TABLE public.produtos_garimpados
  ADD COLUMN IF NOT EXISTS nicho text,
  ADD COLUMN IF NOT EXISTS aprovacao_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS produto_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produtos_garimpados_aprovacao_status_check'
  ) THEN
    ALTER TABLE public.produtos_garimpados
      ADD CONSTRAINT produtos_garimpados_aprovacao_status_check
      CHECK (aprovacao_status IN ('pendente', 'aprovado', 'rejeitado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_garimpados_aprovacao
  ON public.produtos_garimpados (aprovacao_status, criado_em DESC);
