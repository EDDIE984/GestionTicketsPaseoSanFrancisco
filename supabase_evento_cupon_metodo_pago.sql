-- Asigna automáticamente el cupón de una campaña según el método de pago.
-- La columna comienza nullable para permitir migrar campañas existentes desde la UI.
ALTER TABLE evento_cupones
  ADD COLUMN IF NOT EXISTS metodo_pago_id UUID REFERENCES metodos_pago(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS evento_cupones_metodo_pago_unique
  ON evento_cupones(evento_id, metodo_pago_id)
  WHERE metodo_pago_id IS NOT NULL;
