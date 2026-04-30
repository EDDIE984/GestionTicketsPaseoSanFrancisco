-- ============================================================
-- Parametrizaciones de correo
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS parametrizaciones_correo (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_remitente  TEXT NOT NULL,
  correo_remitente  TEXT NOT NULL,
  host_smtp         TEXT NOT NULL,
  puerto_smtp       INTEGER NOT NULL DEFAULT 587,
  usuario_smtp      TEXT NOT NULL,
  password_smtp     TEXT NOT NULL,
  seguridad         TEXT NOT NULL DEFAULT 'tls' CHECK (seguridad IN ('none', 'tls', 'ssl')),
  responder_a       TEXT,
  asunto_prueba     TEXT,
  activo            BOOLEAN NOT NULL DEFAULT true,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
