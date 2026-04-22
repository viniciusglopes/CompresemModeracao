-- CompresemModeracao - Migration SQL
-- Recriar todas as tabelas do sistema de ofertas

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  preco NUMERIC NOT NULL,
  preco_original NUMERIC,
  desconto_percent INTEGER DEFAULT 0,
  plataforma VARCHAR NOT NULL CHECK (plataforma IN ('mercadolivre', 'shopee', 'lomadee', 'aliexpress', 'amazon')),
  link_original TEXT,
  link_afiliado TEXT,
  thumbnail TEXT,
  nicho VARCHAR,
  frete_gratis BOOLEAN DEFAULT false,
  qtd_vendida INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  score_detalhes JSONB,
  produto_id_externo VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(produto_id_externo, plataforma)
);

-- Tabela de disparos
CREATE TABLE IF NOT EXISTS disparos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  canal VARCHAR NOT NULL CHECK (canal IN ('telegram', 'whatsapp')),
  grupo_id VARCHAR NOT NULL,
  grupo_nome VARCHAR,
  mensagem TEXT,
  status VARCHAR DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  erro TEXT,
  disparado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de grupos
CREATE TABLE IF NOT EXISTS grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR NOT NULL,
  canal VARCHAR NOT NULL CHECK (canal IN ('telegram', 'whatsapp')),
  grupo_id VARCHAR NOT NULL,
  nichos JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de configuração de plataformas
CREATE TABLE IF NOT EXISTS config_plataformas (
  plataforma VARCHAR PRIMARY KEY,
  credenciais JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de notificações admin
CREATE TABLE IF NOT EXISTS admin_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR DEFAULT 'info' CHECK (tipo IN ('error', 'rate_limit', 'warning', 'info')),
  titulo TEXT NOT NULL,
  mensagem TEXT,
  plataforma VARCHAR,
  lida BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de logs de API
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma VARCHAR,
  endpoint VARCHAR,
  metodo VARCHAR,
  status VARCHAR,
  http_status INTEGER,
  duracao_ms INTEGER,
  nicho VARCHAR,
  total_encontrados INTEGER,
  salvos INTEGER,
  erro TEXT,
  detalhes JSONB,
  request_json JSONB,
  response_json JSONB,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de clicks
CREATE TABLE IF NOT EXISTS clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  plataforma VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  valor_venda NUMERIC,
  comissao NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_produtos_plataforma ON produtos(plataforma);
CREATE INDEX IF NOT EXISTS idx_produtos_nicho ON produtos(nicho);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_score ON produtos(score DESC);
CREATE INDEX IF NOT EXISTS idx_produtos_created ON produtos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disparos_produto ON disparos(produto_id);
CREATE INDEX IF NOT EXISTS idx_disparos_status ON disparos(status);
CREATE INDEX IF NOT EXISTS idx_disparos_data ON disparos(disparado_em DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_plataforma ON api_logs(plataforma);
CREATE INDEX IF NOT EXISTS idx_api_logs_data ON api_logs(criado_em DESC);

-- Popular config_plataformas com entradas base
INSERT INTO config_plataformas (plataforma, credenciais, ativo) VALUES
  ('mercadolivre', '{}', false),
  ('shopee', '{}', false),
  ('lomadee', '{}', false),
  ('telegram_bot', '{}', false),
  ('evolution_api', '{}', false),
  ('gemini', '{}', false),
  ('cron_state', '{"ml_idx": 0, "shopee_idx": 0, "lomadee_idx": 0}', true),
  ('disparo_auto', '{"score_minimo": 60, "desconto_minimo_ml": 40, "score_minimo_shopee": 60, "hora_inicio": 8, "hora_fim": 22, "intervalo_minutos": 20, "min_produtos": 3, "max_produtos": 10, "ultimo_nicho_idx": 0, "ultimo_disparo": null, "ativo": true}', true)
ON CONFLICT (plataforma) DO NOTHING;

-- Habilitar RLS (Row Level Security) - policies permissivas para anon
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_plataformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- Policies: permitir tudo para authenticated e service_role
CREATE POLICY "Allow all for service role" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON disparos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON grupos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON config_plataformas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON admin_notificacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON api_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON clicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON vendas FOR ALL USING (true) WITH CHECK (true);

-- Policy de leitura pública para produtos (feed público)
CREATE POLICY "Public read produtos" ON produtos FOR SELECT USING (true);
