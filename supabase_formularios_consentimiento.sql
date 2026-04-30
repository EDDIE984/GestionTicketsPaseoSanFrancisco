-- ============================================================
-- Formularios de consentimiento
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS formularios_consentimiento (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id               UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  factura_ids              UUID[] NOT NULL DEFAULT '{}',
  cedula                   TEXT NOT NULL,
  nombre                   TEXT NOT NULL,
  correo                   TEXT NOT NULL,
  telefono                 TEXT,
  token                    TEXT UNIQUE NOT NULL,
  token_expira_at          TIMESTAMPTZ NOT NULL,
  correo_enviado_at        TIMESTAMPTZ,
  formulario_enviado_at    TIMESTAMPTZ,
  acepta_publicidad        BOOLEAN NOT NULL DEFAULT true,
  acepta_proteccion_datos  BOOLEAN NOT NULL DEFAULT false,
  fecha_aceptacion         TIMESTAMPTZ,
  ip                       TEXT,
  user_agent               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formularios_consentimiento_token
  ON formularios_consentimiento(token);

CREATE INDEX IF NOT EXISTS idx_formularios_consentimiento_cliente_id
  ON formularios_consentimiento(cliente_id);
