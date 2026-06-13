-- Migração 001: Schema inicial — Linha do Tempo Perfeita
-- Aplicada em: 2026-06-13
-- Projeto Supabase: pvarfuunhbvjyihwhmsf (sa-east-1)

CREATE TABLE timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_cliente TEXT NOT NULL,
  tipo_beneficio TEXT NOT NULL CHECK (tipo_beneficio IN (
    'aposentadoria_rural', 'hibrida', 'demais_rurais'
  )),
  inicio_mes INT NOT NULL CHECK (inicio_mes BETWEEN 1 AND 12),
  inicio_ano INT NOT NULL,
  der_mes INT NOT NULL CHECK (der_mes BETWEEN 1 AND 12),
  der_ano INT NOT NULL,
  modelo_visual TEXT DEFAULT 'horizontal' CHECK (modelo_visual IN ('horizontal','curvas')),
  descricao_irs_prs TEXT DEFAULT '',
  descricao_vinculos TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vinculos_urbanos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
  origem TEXT NOT NULL,
  inicio_mes INT NOT NULL CHECK (inicio_mes BETWEEN 1 AND 12),
  inicio_ano INT NOT NULL,
  fim_mes INT NOT NULL CHECK (fim_mes BETWEEN 1 AND 12),
  fim_ano INT NOT NULL
);

CREATE TABLE provas_retorno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
  data_mes INT NOT NULL CHECK (data_mes BETWEEN 1 AND 12),
  data_ano INT NOT NULL
);

CREATE TABLE instrumentos_ratificadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
  data_mes INT NOT NULL CHECK (data_mes BETWEEN 1 AND 12),
  data_ano INT NOT NULL
);

CREATE TABLE beneficios_incapacidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
  inicio_mes INT NOT NULL CHECK (inicio_mes BETWEEN 1 AND 12),
  inicio_ano INT NOT NULL,
  fim_mes INT NOT NULL CHECK (fim_mes BETWEEN 1 AND 12),
  fim_ano INT NOT NULL
);

-- Row Level Security
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinculos_urbanos ENABLE ROW LEVEL SECURITY;
ALTER TABLE provas_retorno ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrumentos_ratificadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficios_incapacidade ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuário acessa apenas seus próprios dados
CREATE POLICY "own timelines" ON timelines
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own vinculos" ON vinculos_urbanos
  FOR ALL USING (timeline_id IN (SELECT id FROM timelines WHERE user_id = auth.uid()));

CREATE POLICY "own provas" ON provas_retorno
  FOR ALL USING (timeline_id IN (SELECT id FROM timelines WHERE user_id = auth.uid()));

CREATE POLICY "own irs" ON instrumentos_ratificadores
  FOR ALL USING (timeline_id IN (SELECT id FROM timelines WHERE user_id = auth.uid()));

CREATE POLICY "own incapacidades" ON beneficios_incapacidade
  FOR ALL USING (timeline_id IN (SELECT id FROM timelines WHERE user_id = auth.uid()));
