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

CREATE TABLE parametrizaciones_correo (
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


-- ============================================================
-- EVENTOS Y CAMPAÑAS
-- ============================================================

CREATE TABLE eventos_campanas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin    TIMESTAMPTZ NOT NULL,
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
  metodo_pago_id UUID REFERENCES metodos_pago(id) ON DELETE RESTRICT,
  PRIMARY KEY (evento_id, cupon_id)
);

CREATE UNIQUE INDEX evento_cupones_metodo_pago_unique
  ON evento_cupones(evento_id, metodo_pago_id)
  WHERE metodo_pago_id IS NOT NULL;

-- M:N evento ↔ entregables
CREATE TABLE evento_entregables (
  evento_id     UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  entregable_id UUID NOT NULL REFERENCES entregables(id) ON DELETE CASCADE,
  PRIMARY KEY (evento_id, entregable_id)
);

CREATE TABLE evento_reglas_calculo (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id      UUID NOT NULL REFERENCES eventos_campanas(id) ON DELETE CASCADE,
  categoria_id   UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  aplica_todos   BOOLEAN NOT NULL DEFAULT true,
  acumula_saldo  BOOLEAN NOT NULL DEFAULT true,
  valor_minimo   NUMERIC(10,2) NOT NULL CHECK (valor_minimo > 0),
  valor_maximo   NUMERIC(10,2) NOT NULL CHECK (valor_maximo >= 0),
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evento_reglas_valores_validos CHECK (valor_maximo = 0 OR valor_minimo <= valor_maximo)
);

CREATE UNIQUE INDEX evento_reglas_categoria_general_unique
  ON evento_reglas_calculo(evento_id, categoria_id) WHERE aplica_todos = true;

CREATE TABLE evento_regla_locales (
  regla_id UUID NOT NULL REFERENCES evento_reglas_calculo(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  PRIMARY KEY (regla_id, local_id)
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
  numero_factura    TEXT NOT NULL,
  monto_total       NUMERIC(10,2) NOT NULL,
  fecha_emision     DATE NOT NULL,
  total_entregables INTEGER NOT NULL DEFAULT 0,
  tickets_impresos  BOOLEAN NOT NULL DEFAULT false,
  tickets_impresos_at TIMESTAMPTZ,
  fecha_registro    TIMESTAMPTZ NOT NULL DEFAULT now(),
  regla_calculo_id UUID REFERENCES evento_reglas_calculo(id) ON DELETE SET NULL,
  categoria_id_aplicada UUID REFERENCES categorias(id) ON DELETE SET NULL,
  valor_minimo_aplicado NUMERIC(10,2),
  valor_maximo_aplicado NUMERIC(10,2),
  regla_calculo_origen TEXT CHECK (regla_calculo_origen IS NULL OR regla_calculo_origen IN ('general', 'categoria', 'local')),
  acumula_saldo_aplicado BOOLEAN,
  CONSTRAINT facturas_numero_factura_local_evento_unique UNIQUE (numero_factura, local_id, evento_id)
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

CREATE TABLE formularios_consentimiento (
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
  acepta_publicidad        BOOLEAN NOT NULL DEFAULT false,
  acepta_proteccion_datos  BOOLEAN NOT NULL DEFAULT false,
  fecha_aceptacion         TIMESTAMPTZ,
  ip                       TEXT,
  user_agent               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
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
CREATE INDEX idx_eventos_campanas_vigencia ON eventos_campanas(fecha_inicio, fecha_fin);
CREATE INDEX idx_formularios_consentimiento_token ON formularios_consentimiento(token);
CREATE INDEX idx_formularios_consentimiento_cliente_id ON formularios_consentimiento(cliente_id);
