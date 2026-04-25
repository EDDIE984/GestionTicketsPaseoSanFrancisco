-- ============================================================
-- Sistema de Control de Tickets — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- CATÁLOGOS BASE
-- ============================================================

CREATE TABLE usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('Admin', 'Usuario')),
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula     TEXT UNIQUE NOT NULL,
  nombre     TEXT NOT NULL,
  apellido   TEXT NOT NULL,
  direccion  TEXT,
  telefono   TEXT,
  correo     TEXT,
  genero     TEXT CHECK (genero IN ('masculino', 'femenino')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categorias (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE locales (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  activo       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE metodos_pago (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE cupones (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  numero INTEGER NOT NULL,  -- multiplicador de entregables
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE entregables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  stock       INTEGER NOT NULL DEFAULT 0,
  precio_base NUMERIC(10,2),
  activo      BOOLEAN NOT NULL DEFAULT true
);


-- ============================================================
-- EVENTOS Y CAMPAÑAS
-- ============================================================

CREATE TABLE eventos_campanas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  valor_minimo NUMERIC(10,2) NOT NULL,
  valor_maximo NUMERIC(10,2) NOT NULL,
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- M:N evento ↔ categorias
CREATE TABLE evento_categorias (
  evento_id    UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (evento_id, categoria_id)
);

-- M:N evento ↔ cupones
CREATE TABLE evento_cupones (
  evento_id UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  cupon_id  UUID NOT NULL REFERENCES cupones(id) ON DELETE CASCADE,
  PRIMARY KEY (evento_id, cupon_id)
);

-- M:N evento ↔ entregables
CREATE TABLE evento_entregables (
  evento_id     UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  entregable_id UUID NOT NULL REFERENCES entregables(id) ON DELETE CASCADE,
  PRIMARY KEY (evento_id, entregable_id)
);


-- ============================================================
-- FACTURAS
-- ============================================================

CREATE TABLE facturas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id         UUID NOT NULL REFERENCES eventos_campanas(id),
  cliente_id        UUID NOT NULL REFERENCES clientes(id),
  local_id          UUID NOT NULL REFERENCES locales(id),
  usuario_id        UUID NOT NULL REFERENCES usuarios(id),
  numero_factura    TEXT UNIQUE NOT NULL,
  monto_total       NUMERIC(10,2) NOT NULL,
  fecha_emision     DATE NOT NULL,
  total_entregables INTEGER NOT NULL DEFAULT 0,
  fecha_registro    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE factura_metodos_pago (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id             UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  metodo_pago_id         UUID NOT NULL REFERENCES metodos_pago(id),
  monto                  NUMERIC(10,2) NOT NULL,
  cupon_id               UUID REFERENCES cupones(id),  -- nullable, elegido por cajero
  cupon_numero           INTEGER,                       -- snapshot del multiplicador al registrar
  entregables_calculados INTEGER NOT NULL DEFAULT 0
);


-- ============================================================
-- ÍNDICES para consultas frecuentes
-- ============================================================

CREATE INDEX idx_facturas_evento_id    ON facturas(evento_id);
CREATE INDEX idx_facturas_cliente_id   ON facturas(cliente_id);
CREATE INDEX idx_facturas_usuario_id   ON facturas(usuario_id);
CREATE INDEX idx_facturas_local_id     ON facturas(local_id);
CREATE INDEX idx_facturas_fecha_emision ON facturas(fecha_emision);
CREATE INDEX idx_fmp_factura_id        ON factura_metodos_pago(factura_id);
CREATE INDEX idx_clientes_cedula       ON clientes(cedula);
