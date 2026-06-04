-- ============================================================
-- Saldo acumulado por cliente y evento
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS saldo_clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  evento_id   UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  saldo       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saldo_clientes_cliente_evento_key UNIQUE (cliente_id, evento_id)
);

CREATE TABLE IF NOT EXISTS historial_saldo (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  evento_id         UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  factura_id        UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  cupon_aplicado    TEXT,
  saldo_anterior    NUMERIC(10,2) NOT NULL,
  saldo_nuevo       NUMERIC(10,2) NOT NULL,
  tickets_generados INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE historial_saldo
  ADD COLUMN IF NOT EXISTS cupon_aplicado TEXT;

CREATE INDEX IF NOT EXISTS idx_saldo_clientes_cliente_evento
  ON saldo_clientes(cliente_id, evento_id);

CREATE INDEX IF NOT EXISTS idx_historial_saldo_cliente_evento
  ON historial_saldo(cliente_id, evento_id);

CREATE INDEX IF NOT EXISTS idx_historial_saldo_factura_id
  ON historial_saldo(factura_id);

-- Deshabilitar RLS para coincidir con el resto de tablas del proyecto
ALTER TABLE saldo_clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE historial_saldo DISABLE ROW LEVEL SECURITY;
