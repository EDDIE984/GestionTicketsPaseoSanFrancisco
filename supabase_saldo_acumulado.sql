-- ============================================================
-- Saldo acumulado por cliente y evento
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS saldo_clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  evento_id   UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  metodo_pago_id UUID REFERENCES metodos_pago(id) ON DELETE RESTRICT,
  saldo       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saldo_clientes_cliente_evento_metodo_key UNIQUE (cliente_id, evento_id, metodo_pago_id)
);

CREATE TABLE IF NOT EXISTS historial_saldo (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  evento_id         UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  factura_id        UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  metodo_pago_id    UUID REFERENCES metodos_pago(id) ON DELETE RESTRICT,
  cupon_aplicado    TEXT,
  saldo_anterior    NUMERIC(10,2) NOT NULL,
  saldo_nuevo       NUMERIC(10,2) NOT NULL,
  tickets_generados INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE historial_saldo
  ADD COLUMN IF NOT EXISTS cupon_aplicado TEXT;

ALTER TABLE saldo_clientes
  ADD COLUMN IF NOT EXISTS metodo_pago_id UUID REFERENCES metodos_pago(id) ON DELETE RESTRICT;

ALTER TABLE historial_saldo
  ADD COLUMN IF NOT EXISTS metodo_pago_id UUID REFERENCES metodos_pago(id) ON DELETE RESTRICT;

-- Los saldos anteriores permanecen con metodo_pago_id NULL como "saldo histórico
-- sin clasificar". No se consumen automáticamente para evitar asignarlos a un
-- método incorrecto. Los movimientos que sí pueden identificarse con certeza se
-- etiquetan para mejorar el historial.
UPDATE historial_saldo hs
SET metodo_pago_id = identificados.metodo_pago_id
FROM (
  SELECT factura_id, MIN(metodo_pago_id::text)::uuid AS metodo_pago_id
  FROM factura_metodos_pago
  GROUP BY factura_id
  HAVING COUNT(DISTINCT metodo_pago_id) = 1
) identificados
WHERE hs.factura_id = identificados.factura_id
  AND hs.metodo_pago_id IS NULL;

ALTER TABLE saldo_clientes
  DROP CONSTRAINT IF EXISTS saldo_clientes_cliente_evento_key;

ALTER TABLE saldo_clientes
  DROP CONSTRAINT IF EXISTS saldo_clientes_cliente_evento_metodo_key;

ALTER TABLE saldo_clientes
  ADD CONSTRAINT saldo_clientes_cliente_evento_metodo_key
  UNIQUE NULLS NOT DISTINCT (cliente_id, evento_id, metodo_pago_id);

CREATE INDEX IF NOT EXISTS idx_saldo_clientes_cliente_evento
  ON saldo_clientes(cliente_id, evento_id);

CREATE INDEX IF NOT EXISTS idx_saldo_clientes_cliente_evento_metodo
  ON saldo_clientes(cliente_id, evento_id, metodo_pago_id);

CREATE INDEX IF NOT EXISTS idx_historial_saldo_cliente_evento
  ON historial_saldo(cliente_id, evento_id);

CREATE INDEX IF NOT EXISTS idx_historial_saldo_factura_id
  ON historial_saldo(factura_id);

CREATE INDEX IF NOT EXISTS idx_historial_saldo_metodo_pago_id
  ON historial_saldo(metodo_pago_id);

-- Deshabilitar RLS para coincidir con el resto de tablas del proyecto
ALTER TABLE saldo_clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE historial_saldo DISABLE ROW LEVEL SECURITY;

-- Actualiza un saldo y registra su historial dentro de la misma transacción.
-- El bloqueo por cliente/campaña/método evita que dos cajas consuman el mismo
-- saldo al mismo tiempo.
CREATE OR REPLACE FUNCTION registrar_movimiento_saldo(
  p_cliente_id UUID,
  p_evento_id UUID,
  p_factura_id UUID,
  p_metodo_pago_id UUID,
  p_cupon_aplicado TEXT,
  p_saldo_anterior NUMERIC,
  p_saldo_nuevo NUMERIC,
  p_tickets_generados INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_actual NUMERIC(10,2);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_cliente_id::text || ':' || p_evento_id::text || ':' || p_metodo_pago_id::text,
    0
  ));

  SELECT saldo
  INTO v_saldo_actual
  FROM saldo_clientes
  WHERE cliente_id = p_cliente_id
    AND evento_id = p_evento_id
    AND metodo_pago_id = p_metodo_pago_id
  FOR UPDATE;

  v_saldo_actual := COALESCE(v_saldo_actual, 0.00);
  IF ROUND(v_saldo_actual, 2) <> ROUND(COALESCE(p_saldo_anterior, 0), 2) THEN
    RAISE EXCEPTION 'El saldo de la forma de pago cambió. Actualiza los datos y vuelve a calcular la factura.';
  END IF;

  INSERT INTO saldo_clientes (cliente_id, evento_id, metodo_pago_id, saldo, updated_at)
  VALUES (p_cliente_id, p_evento_id, p_metodo_pago_id, ROUND(p_saldo_nuevo, 2), now())
  ON CONFLICT (cliente_id, evento_id, metodo_pago_id)
  DO UPDATE SET saldo = EXCLUDED.saldo, updated_at = now();

  INSERT INTO historial_saldo (
    cliente_id, evento_id, factura_id, metodo_pago_id, cupon_aplicado,
    saldo_anterior, saldo_nuevo, tickets_generados
  ) VALUES (
    p_cliente_id, p_evento_id, p_factura_id, p_metodo_pago_id, p_cupon_aplicado,
    ROUND(p_saldo_anterior, 2), ROUND(p_saldo_nuevo, 2), p_tickets_generados
  );
END;
$$;

CREATE OR REPLACE FUNCTION registrar_movimientos_saldo_factura(
  p_cliente_id UUID,
  p_evento_id UUID,
  p_factura_id UUID,
  p_movimientos JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movimiento JSONB;
BEGIN
  IF jsonb_typeof(p_movimientos) <> 'array' OR jsonb_array_length(p_movimientos) = 0 THEN
    RAISE EXCEPTION 'No hay movimientos de saldo para registrar';
  END IF;

  FOR v_movimiento IN
    SELECT value
    FROM jsonb_array_elements(p_movimientos)
    ORDER BY value->>'metodo_pago_id'
  LOOP
    PERFORM registrar_movimiento_saldo(
      p_cliente_id,
      p_evento_id,
      p_factura_id,
      (v_movimiento->>'metodo_pago_id')::UUID,
      NULLIF(v_movimiento->>'cupon_aplicado', ''),
      (v_movimiento->>'saldo_anterior')::NUMERIC,
      (v_movimiento->>'saldo_nuevo')::NUMERIC,
      (v_movimiento->>'tickets_generados')::INTEGER
    );
  END LOOP;
END;
$$;
