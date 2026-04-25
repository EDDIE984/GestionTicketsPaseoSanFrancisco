# Diseño ER — Supabase (Sistema de Control de Tickets)

**Fecha:** 2026-04-25  
**Estado:** Aprobado

## Contexto

El sistema actualmente almacena todos los datos en `useState` (en memoria). Se migra a Supabase con PostgreSQL como base de datos persistente. El módulo de Tráfico queda fuera del alcance de esta migración (se implementará en una fase posterior).

## Decisiones clave

- Autenticación manual (tabla propia `usuarios` con `password_hash`), sin Supabase Auth.
- `clientes` es una entidad separada; `facturas` referencia al cliente por `cliente_id`.
- Un evento puede tener múltiples cupones y múltiples entregables (relaciones M:N).
- El cajero elige el cupón activo del evento al registrar cada método de pago.
- Cada factura registra el `usuario_id` del cajero que la creó.
- Todos los PKs son `uuid`.

---

## Modelo Entidad-Relación

### Catálogos base

```sql
usuarios
  id            uuid PK
  nombre        text NOT NULL
  email         text UNIQUE NOT NULL
  password_hash text NOT NULL
  rol           text NOT NULL CHECK (rol IN ('Admin', 'Usuario'))
  activo        boolean DEFAULT true
  created_at    timestamptz DEFAULT now()

clientes
  id            uuid PK
  cedula        text UNIQUE NOT NULL
  nombre        text NOT NULL
  apellido      text NOT NULL
  direccion     text
  telefono      text
  correo        text
  genero        text CHECK (genero IN ('masculino', 'femenino'))
  created_at    timestamptz DEFAULT now()

categorias
  id            uuid PK
  nombre        text UNIQUE NOT NULL
  activo        boolean DEFAULT true

locales
  id            uuid PK
  nombre        text NOT NULL
  categoria_id  uuid NOT NULL REFERENCES categorias(id)
  activo        boolean DEFAULT true

metodos_pago
  id            uuid PK
  nombre        text NOT NULL
  descripcion   text
  activo        boolean DEFAULT true

cupones
  id            uuid PK
  nombre        text NOT NULL
  numero        integer NOT NULL   -- multiplicador de entregables
  activo        boolean DEFAULT true

entregables
  id            uuid PK
  nombre        text NOT NULL
  descripcion   text
  stock         integer NOT NULL DEFAULT 0
  precio_base   numeric(10,2)
  activo        boolean DEFAULT true
```

### Eventos y relaciones M:N

```sql
eventos_campanas
  id             uuid PK
  nombre         text NOT NULL
  fecha_inicio   date NOT NULL
  fecha_fin      date NOT NULL
  valor_minimo   numeric(10,2) NOT NULL
  valor_maximo   numeric(10,2) NOT NULL
  activo         boolean DEFAULT true
  created_at     timestamptz DEFAULT now()

evento_categorias
  evento_id      uuid NOT NULL REFERENCES eventos_campanas(id)
  categoria_id   uuid NOT NULL REFERENCES categorias(id)
  PRIMARY KEY (evento_id, categoria_id)

evento_cupones
  evento_id      uuid NOT NULL REFERENCES eventos_campanas(id)
  cupon_id       uuid NOT NULL REFERENCES cupones(id)
  PRIMARY KEY (evento_id, cupon_id)

evento_entregables
  evento_id      uuid NOT NULL REFERENCES eventos_campanas(id)
  entregable_id  uuid NOT NULL REFERENCES entregables(id)
  PRIMARY KEY (evento_id, entregable_id)
```

### Facturas

```sql
facturas
  id                  uuid PK
  evento_id           uuid NOT NULL REFERENCES eventos_campanas(id)
  cliente_id          uuid NOT NULL REFERENCES clientes(id)
  local_id            uuid NOT NULL REFERENCES locales(id)
  usuario_id          uuid NOT NULL REFERENCES usuarios(id)
  numero_factura      text UNIQUE NOT NULL
  monto_total         numeric(10,2) NOT NULL
  fecha_emision       date NOT NULL
  total_entregables   integer NOT NULL DEFAULT 0
  fecha_registro      timestamptz DEFAULT now()

factura_metodos_pago
  id                      uuid PK
  factura_id              uuid NOT NULL REFERENCES facturas(id)
  metodo_pago_id          uuid NOT NULL REFERENCES metodos_pago(id)
  monto                   numeric(10,2) NOT NULL
  cupon_id                uuid REFERENCES cupones(id)       -- nullable, elegido por cajero
  cupon_numero            integer                           -- snapshot del multiplicador al registrar
  entregables_calculados  integer NOT NULL DEFAULT 0
```

---

## Diagrama de relaciones

```
usuarios ──────────────────────────────────────── facturas
clientes ──────────────────────────────────────── facturas
locales ────────── categorias                      facturas
                                                   facturas ── factura_metodos_pago ── metodos_pago
eventos_campanas ── evento_categorias ── categorias            factura_metodos_pago ── cupones
eventos_campanas ── evento_cupones ──── cupones
eventos_campanas ── evento_entregables ─ entregables
eventos_campanas ──────────────────────────────── facturas
```

---

## Variables de entorno (.env)

El archivo `.env` en la raíz del proyecto debe contener:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Ambos valores se obtienen desde el dashboard de Supabase → Project Settings → API.

---

## Fuera de alcance (fase posterior)

- Módulo de Tráfico (tráfico peatonal y vehicular desde Excel)
- Row Level Security (RLS) — se configura en una fase de seguridad dedicada
