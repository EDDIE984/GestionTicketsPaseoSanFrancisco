-- ============================================================
-- Horas de vigencia para eventos y campañas
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'eventos_campanas'
      AND column_name = 'fecha_inicio'
      AND data_type = 'date'
  ) THEN
    ALTER TABLE eventos_campanas
      ALTER COLUMN fecha_inicio TYPE TIMESTAMPTZ
      USING (fecha_inicio::timestamp AT TIME ZONE 'America/Guayaquil');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'eventos_campanas'
      AND column_name = 'fecha_fin'
      AND data_type = 'date'
  ) THEN
    ALTER TABLE eventos_campanas
      ALTER COLUMN fecha_fin TYPE TIMESTAMPTZ
      USING ((fecha_fin::timestamp + time '23:59:59') AT TIME ZONE 'America/Guayaquil');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_eventos_campanas_vigencia
  ON eventos_campanas(fecha_inicio, fecha_fin);
