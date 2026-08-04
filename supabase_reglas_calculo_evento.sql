-- Reglas especiales de cálculo por categoría o local dentro de una campaña
CREATE TABLE IF NOT EXISTS evento_reglas_calculo (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id      UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  categoria_id   UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  aplica_todos   BOOLEAN NOT NULL DEFAULT true,
  acumula_saldo  BOOLEAN NOT NULL DEFAULT true,
  valor_minimo   NUMERIC(10,2) NOT NULL CHECK (valor_minimo > 0),
  valor_maximo   NUMERIC(10,2) NOT NULL CHECK (valor_maximo >= 0),
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evento_reglas_valores_validos
    CHECK (valor_maximo = 0 OR valor_minimo <= valor_maximo)
);

ALTER TABLE evento_reglas_calculo
  ADD COLUMN IF NOT EXISTS aplica_todos BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS acumula_saldo BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS evento_reglas_local_unique;
DROP INDEX IF EXISTS evento_reglas_categoria_general_unique;

CREATE UNIQUE INDEX IF NOT EXISTS evento_reglas_categoria_general_unique
  ON evento_reglas_calculo(evento_id, categoria_id)
  WHERE aplica_todos = true;

CREATE TABLE IF NOT EXISTS evento_regla_locales (
  regla_id UUID NOT NULL REFERENCES evento_reglas_calculo(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  PRIMARY KEY (regla_id, local_id)
);

CREATE INDEX IF NOT EXISTS idx_evento_reglas_evento
  ON evento_reglas_calculo(evento_id);

ALTER TABLE evento_reglas_calculo DISABLE ROW LEVEL SECURITY;

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS regla_calculo_id UUID REFERENCES evento_reglas_calculo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS categoria_id_aplicada UUID REFERENCES categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_minimo_aplicado NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valor_maximo_aplicado NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS regla_calculo_origen TEXT
    CHECK (regla_calculo_origen IS NULL OR regla_calculo_origen IN ('general', 'categoria', 'local')),
  ADD COLUMN IF NOT EXISTS acumula_saldo_aplicado BOOLEAN;
