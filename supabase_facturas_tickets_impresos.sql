-- ============================================================
-- Estado de impresión de tickets por factura
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS tickets_impresos BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tickets_impresos_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_facturas_tickets_impresos
  ON facturas(tickets_impresos);
