-- ============================================================
-- Vistas para Power BI
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE OR REPLACE VIEW vw_powerbi_facturas_detalle AS
SELECT
  f.id AS factura_id,
  f.numero_factura,
  f.fecha_emision,
  f.fecha_registro,
  f.monto_total,
  f.total_entregables,
  f.tickets_impresos,
  f.tickets_impresos_at,
  f.evento_id,
  e.nombre AS evento_nombre,
  e.fecha_inicio AS evento_fecha_inicio,
  e.fecha_fin AS evento_fecha_fin,
  f.cliente_id,
  c.cedula AS cliente_cedula,
  c.nombre AS cliente_nombre,
  c.apellido AS cliente_apellido,
  concat_ws(' ', c.nombre, c.apellido) AS cliente_nombre_completo,
  c.genero AS cliente_genero,
  c.telefono AS cliente_telefono,
  c.correo AS cliente_correo,
  f.local_id,
  l.nombre AS local_nombre,
  cat.id AS categoria_id,
  cat.nombre AS categoria_nombre,
  f.usuario_id,
  u.nombre AS usuario_nombre,
  COALESCE(mp.total_pagado, 0) AS total_pagado,
  COALESCE(mp.metodos_pago, '') AS metodos_pago,
  COALESCE(mp.cupones, '') AS cupones,
  COALESCE(mp.entregables_calculados, 0) AS entregables_calculados
FROM facturas f
JOIN eventos_campanas e ON e.id = f.evento_id
JOIN clientes c ON c.id = f.cliente_id
JOIN locales l ON l.id = f.local_id
JOIN categorias cat ON cat.id = l.categoria_id
JOIN usuarios u ON u.id = f.usuario_id
LEFT JOIN (
  SELECT
    fmp.factura_id,
    SUM(fmp.monto) AS total_pagado,
    SUM(fmp.entregables_calculados) AS entregables_calculados,
    string_agg(DISTINCT m.nombre, ', ' ORDER BY m.nombre) AS metodos_pago,
    string_agg(DISTINCT cp.nombre, ', ' ORDER BY cp.nombre) FILTER (WHERE cp.nombre IS NOT NULL) AS cupones
  FROM factura_metodos_pago fmp
  JOIN metodos_pago m ON m.id = fmp.metodo_pago_id
  LEFT JOIN cupones cp ON cp.id = fmp.cupon_id
  GROUP BY fmp.factura_id
) mp ON mp.factura_id = f.id;

CREATE OR REPLACE VIEW vw_powerbi_metodos_pago_detalle AS
SELECT
  fmp.id AS pago_id,
  fmp.factura_id,
  f.numero_factura,
  f.fecha_emision,
  f.fecha_registro,
  f.evento_id,
  e.nombre AS evento_nombre,
  f.cliente_id,
  concat_ws(' ', c.nombre, c.apellido) AS cliente_nombre_completo,
  f.local_id,
  l.nombre AS local_nombre,
  cat.nombre AS categoria_nombre,
  fmp.metodo_pago_id,
  m.nombre AS metodo_pago_nombre,
  fmp.monto,
  fmp.cupon_id,
  cp.nombre AS cupon_nombre,
  fmp.cupon_numero,
  fmp.entregables_calculados
FROM factura_metodos_pago fmp
JOIN facturas f ON f.id = fmp.factura_id
JOIN eventos_campanas e ON e.id = f.evento_id
JOIN clientes c ON c.id = f.cliente_id
JOIN locales l ON l.id = f.local_id
JOIN categorias cat ON cat.id = l.categoria_id
JOIN metodos_pago m ON m.id = fmp.metodo_pago_id
LEFT JOIN cupones cp ON cp.id = fmp.cupon_id;

CREATE OR REPLACE VIEW vw_powerbi_consentimientos AS
SELECT
  fc.id AS consentimiento_id,
  fc.cliente_id,
  fc.cedula,
  fc.nombre AS cliente_nombre_completo,
  fc.correo,
  fc.telefono,
  array_length(fc.factura_ids, 1) AS cantidad_facturas_asociadas,
  fc.correo_enviado_at,
  fc.formulario_enviado_at,
  fc.fecha_aceptacion,
  fc.token_expira_at,
  fc.acepta_publicidad,
  fc.acepta_proteccion_datos,
  CASE
    WHEN fc.fecha_aceptacion IS NOT NULL THEN 'Enviado'
    WHEN fc.token_expira_at < now() THEN 'Expirado'
    WHEN fc.correo_enviado_at IS NOT NULL THEN 'Pendiente'
    ELSE 'No enviado'
  END AS estado_formulario,
  fc.created_at,
  fc.updated_at
FROM formularios_consentimiento fc;

CREATE OR REPLACE VIEW vw_powerbi_eventos_configuracion AS
SELECT
  e.id AS evento_id,
  e.nombre AS evento_nombre,
  e.fecha_inicio,
  e.fecha_fin,
  e.valor_minimo,
  e.valor_maximo,
  e.activo,
  e.created_at,
  COALESCE(cats.categorias, '') AS categorias,
  COALESCE(cups.cupones, '') AS cupones,
  COALESCE(ents.entregables, '') AS entregables
FROM eventos_campanas e
LEFT JOIN (
  SELECT
    ec.evento_id,
    string_agg(c.nombre, ', ' ORDER BY c.nombre) AS categorias
  FROM evento_categorias ec
  JOIN categorias c ON c.id = ec.categoria_id
  GROUP BY ec.evento_id
) cats ON cats.evento_id = e.id
LEFT JOIN (
  SELECT
    ec.evento_id,
    string_agg(c.nombre, ', ' ORDER BY c.nombre) AS cupones
  FROM evento_cupones ec
  JOIN cupones c ON c.id = ec.cupon_id
  GROUP BY ec.evento_id
) cups ON cups.evento_id = e.id
LEFT JOIN (
  SELECT
    ee.evento_id,
    string_agg(en.nombre, ', ' ORDER BY en.nombre) AS entregables
  FROM evento_entregables ee
  JOIN entregables en ON en.id = ee.entregable_id
  GROUP BY ee.evento_id
) ents ON ents.evento_id = e.id;

CREATE OR REPLACE VIEW vw_powerbi_saldos_clientes AS
SELECT
  sc.id AS saldo_id,
  sc.cliente_id,
  concat_ws(' ', c.nombre, c.apellido) AS cliente_nombre_completo,
  c.cedula AS cliente_cedula,
  c.telefono AS cliente_telefono,
  c.correo AS cliente_correo,
  sc.evento_id,
  e.nombre AS evento_nombre,
  sc.saldo,
  sc.updated_at,
  sc.metodo_pago_id,
  COALESCE(mp.nombre, 'Saldo histórico sin clasificar') AS metodo_pago_nombre
FROM saldo_clientes sc
JOIN clientes c ON c.id = sc.cliente_id
JOIN eventos_campanas e ON e.id = sc.evento_id
LEFT JOIN metodos_pago mp ON mp.id = sc.metodo_pago_id;

CREATE OR REPLACE VIEW vw_powerbi_historial_saldo AS
SELECT
  hs.id AS historial_id,
  hs.created_at,
  hs.cliente_id,
  concat_ws(' ', c.nombre, c.apellido) AS cliente_nombre_completo,
  hs.evento_id,
  e.nombre AS evento_nombre,
  hs.factura_id,
  f.numero_factura,
  hs.cupon_aplicado,
  hs.saldo_anterior,
  hs.saldo_nuevo,
  hs.tickets_generados,
  hs.metodo_pago_id,
  COALESCE(mp.nombre, 'Sin clasificar') AS metodo_pago_nombre
FROM historial_saldo hs
JOIN clientes c ON c.id = hs.cliente_id
JOIN eventos_campanas e ON e.id = hs.evento_id
JOIN facturas f ON f.id = hs.factura_id
LEFT JOIN metodos_pago mp ON mp.id = hs.metodo_pago_id;

CREATE OR REPLACE VIEW vw_powerbi_resumen_evento_diario AS
SELECT
  f.evento_id,
  e.nombre AS evento_nombre,
  f.fecha_emision,
  COUNT(*) AS cantidad_facturas,
  COUNT(DISTINCT f.cliente_id) AS cantidad_clientes,
  SUM(f.monto_total) AS monto_total,
  SUM(f.total_entregables) AS total_entregables,
  SUM(CASE WHEN f.tickets_impresos THEN 1 ELSE 0 END) AS facturas_con_tickets_impresos
FROM facturas f
JOIN eventos_campanas e ON e.id = f.evento_id
GROUP BY f.evento_id, e.nombre, f.fecha_emision;

CREATE OR REPLACE VIEW vw_powerbi_trafico_ingresos_diarios AS
SELECT
  id AS trafico_id,
  fecha,
  tipo,
  anio,
  mes,
  dia,
  cantidad,
  fuente_archivo,
  uploaded_at,
  created_at
FROM trafico_ingresos_diarios;

CREATE OR REPLACE VIEW vw_powerbi_reversos_facturas AS
SELECT
  r.id AS reverso_id,
  r.factura_ids,
  r.numeros_factura,
  array_length(r.factura_ids, 1) AS cantidad_facturas,
  r.usuario_id,
  u.nombre AS usuario_nombre,
  r.motivo,
  r.created_at
FROM reversos_facturas r
LEFT JOIN usuarios u ON u.id = r.usuario_id;

GRANT SELECT ON
  vw_powerbi_facturas_detalle,
  vw_powerbi_metodos_pago_detalle,
  vw_powerbi_consentimientos,
  vw_powerbi_eventos_configuracion,
  vw_powerbi_saldos_clientes,
  vw_powerbi_historial_saldo,
  vw_powerbi_resumen_evento_diario,
  vw_powerbi_trafico_ingresos_diarios,
  vw_powerbi_reversos_facturas
TO authenticated, service_role;
