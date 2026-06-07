-- ============================================================
-- Soporte Microsoft Graph API para envío de correo
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE parametrizaciones_correo
  ADD COLUMN IF NOT EXISTS tipo_envio     TEXT NOT NULL DEFAULT 'smtp'
    CHECK (tipo_envio IN ('smtp', 'graph')),
  ADD COLUMN IF NOT EXISTS ms_tenant_id   TEXT,
  ADD COLUMN IF NOT EXISTS ms_client_id   TEXT,
  ADD COLUMN IF NOT EXISTS ms_client_secret TEXT;

-- Los campos SMTP pasan a ser opcionales cuando se usa Graph API
ALTER TABLE parametrizaciones_correo
  ALTER COLUMN host_smtp     DROP NOT NULL,
  ALTER COLUMN usuario_smtp  DROP NOT NULL,
  ALTER COLUMN password_smtp DROP NOT NULL;
