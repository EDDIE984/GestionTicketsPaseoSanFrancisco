-- ============================================================
-- Reverso atomico de facturas registradas antes de imprimir
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS reversos_facturas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_ids      UUID[] NOT NULL,
  numeros_factura  TEXT[] NOT NULL,
  usuario_id       UUID REFERENCES usuarios(id),
  motivo           TEXT,
  snapshot         JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reversos_facturas DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION reversar_facturas_registro(
  p_factura_ids UUID[],
  p_usuario_id UUID DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_count INTEGER;
  v_found_count INTEGER;
  v_printed_numbers TEXT;
  v_missing_saldo_count INTEGER;
  v_later_saldo_count INTEGER;
  v_snapshot JSONB;
  v_numeros TEXT[];
  v_reverso_id UUID;
BEGIN
  SELECT COUNT(DISTINCT id)
  INTO v_requested_count
  FROM unnest(COALESCE(p_factura_ids, ARRAY[]::UUID[])) AS id
  WHERE id IS NOT NULL;

  IF v_requested_count = 0 THEN
    RAISE EXCEPTION 'No hay facturas para reversar';
  END IF;

  CREATE TEMP TABLE tmp_facturas_reverso ON COMMIT DROP AS
  SELECT f.*
  FROM facturas f
  JOIN (
    SELECT DISTINCT id
    FROM unnest(p_factura_ids) AS id
    WHERE id IS NOT NULL
  ) ids ON ids.id = f.id;

  PERFORM 1
  FROM facturas f
  JOIN tmp_facturas_reverso t ON t.id = f.id
  FOR UPDATE OF f;

  SELECT COUNT(*) INTO v_found_count FROM tmp_facturas_reverso;
  IF v_found_count <> v_requested_count THEN
    RAISE EXCEPTION 'Una o mas facturas ya no existen';
  END IF;

  SELECT string_agg(numero_factura, ', ')
  INTO v_printed_numbers
  FROM tmp_facturas_reverso
  WHERE tickets_impresos = true;

  IF v_printed_numbers IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede reversar porque los tickets ya fueron impresos: %', v_printed_numbers;
  END IF;

  SELECT COUNT(*)
  INTO v_missing_saldo_count
  FROM tmp_facturas_reverso f
  LEFT JOIN historial_saldo h ON h.factura_id = f.id
  WHERE h.id IS NULL;

  IF v_missing_saldo_count > 0 THEN
    RAISE EXCEPTION 'No se puede reversar porque falta historial de saldo';
  END IF;

  WITH selected_pairs AS (
    SELECT cliente_id, evento_id, MIN(created_at) AS min_selected_at
    FROM historial_saldo
    WHERE factura_id IN (SELECT id FROM tmp_facturas_reverso)
    GROUP BY cliente_id, evento_id
  )
  SELECT COUNT(*)
  INTO v_later_saldo_count
  FROM selected_pairs sp
  WHERE EXISTS (
    SELECT 1
    FROM historial_saldo h
    WHERE h.cliente_id = sp.cliente_id
      AND h.evento_id = sp.evento_id
      AND h.factura_id NOT IN (SELECT id FROM tmp_facturas_reverso)
      AND h.created_at > sp.min_selected_at
  );

  IF v_later_saldo_count > 0 THEN
    RAISE EXCEPTION 'No se puede reversar porque existe un movimiento de saldo posterior';
  END IF;

  PERFORM 1
  FROM saldo_clientes s
  JOIN (
    SELECT DISTINCT ON (h.cliente_id, h.evento_id)
      h.cliente_id,
      h.evento_id,
      h.saldo_anterior
    FROM historial_saldo h
    WHERE h.factura_id IN (SELECT id FROM tmp_facturas_reverso)
    ORDER BY h.cliente_id, h.evento_id, h.created_at ASC, h.id ASC
  ) p ON p.cliente_id = s.cliente_id AND p.evento_id = s.evento_id
  FOR UPDATE OF s;

  SELECT jsonb_agg(
    jsonb_build_object(
      'factura', to_jsonb(f),
      'metodos_pago', COALESCE(mp.rows, '[]'::JSONB),
      'historial_saldo', COALESCE(hs.rows, '[]'::JSONB)
    )
    ORDER BY f.fecha_registro
  )
  INTO v_snapshot
  FROM tmp_facturas_reverso f
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) AS rows
    FROM factura_metodos_pago m
    WHERE m.factura_id = f.id
  ) mp ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(to_jsonb(h) ORDER BY h.created_at, h.id) AS rows
    FROM historial_saldo h
    WHERE h.factura_id = f.id
  ) hs ON true;

  SELECT array_agg(numero_factura ORDER BY fecha_registro)
  INTO v_numeros
  FROM tmp_facturas_reverso;

  INSERT INTO reversos_facturas (
    factura_ids,
    numeros_factura,
    usuario_id,
    motivo,
    snapshot
  )
  VALUES (
    (SELECT array_agg(id ORDER BY fecha_registro) FROM tmp_facturas_reverso),
    v_numeros,
    p_usuario_id,
    NULLIF(BTRIM(COALESCE(p_motivo, '')), ''),
    COALESCE(v_snapshot, '[]'::JSONB)
  )
  RETURNING id INTO v_reverso_id;

  WITH primeras AS (
    SELECT DISTINCT ON (h.cliente_id, h.evento_id)
      h.cliente_id,
      h.evento_id,
      h.saldo_anterior
    FROM historial_saldo h
    WHERE h.factura_id IN (SELECT id FROM tmp_facturas_reverso)
    ORDER BY h.cliente_id, h.evento_id, h.created_at ASC, h.id ASC
  )
  UPDATE saldo_clientes s
  SET saldo = p.saldo_anterior,
      updated_at = now()
  FROM primeras p
  WHERE s.cliente_id = p.cliente_id
    AND s.evento_id = p.evento_id;

  UPDATE formularios_consentimiento fc
  SET factura_ids = COALESCE(
        ARRAY(
          SELECT item.factura_id
          FROM unnest(fc.factura_ids) AS item(factura_id)
          WHERE item.factura_id NOT IN (SELECT id FROM tmp_facturas_reverso)
        ),
        ARRAY[]::UUID[]
      ),
      updated_at = now()
  WHERE fc.factura_ids && (SELECT array_agg(id) FROM tmp_facturas_reverso);

  DELETE FROM facturas
  WHERE id IN (SELECT id FROM tmp_facturas_reverso);

  RETURN jsonb_build_object(
    'reverso_id', v_reverso_id,
    'facturas_reversadas', v_found_count,
    'numeros_factura', v_numeros
  );
END;
$$;
