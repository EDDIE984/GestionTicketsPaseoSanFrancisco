-- ============================================================
-- Trafico peatonal diario
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS trafico_ingresos_diarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha          DATE NOT NULL,
  tipo           TEXT NOT NULL DEFAULT 'peatonal' CHECK (tipo IN ('peatonal')),
  anio           INTEGER NOT NULL,
  mes            INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  dia            INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 31),
  cantidad       INTEGER NOT NULL CHECK (cantidad >= 0),
  fuente_archivo TEXT,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trafico_ingresos_fecha_tipo_key UNIQUE (fecha, tipo)
);

CREATE INDEX IF NOT EXISTS idx_trafico_ingresos_fecha ON trafico_ingresos_diarios(fecha);
CREATE INDEX IF NOT EXISTS idx_trafico_ingresos_anio_mes ON trafico_ingresos_diarios(anio, mes);
CREATE INDEX IF NOT EXISTS idx_trafico_ingresos_tipo ON trafico_ingresos_diarios(tipo);
