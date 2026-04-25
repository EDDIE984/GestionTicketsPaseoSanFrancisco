# Conexión Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar todos los módulos CRUD del sistema a Supabase reemplazando el estado en memoria por persistencia real.

**Architecture:** Cada entidad tiene su propio archivo API en `src/lib/api/`. Los componentes CRUD cargan datos con `useEffect` al montar y llaman las funciones API en sus handlers. El patrón es: dialog cierra inmediatamente → API call en background → estado se actualiza al responder.

**Tech Stack:** React + TypeScript, Supabase JS v2, Web Crypto API (SHA-256 para passwords), Vite

---

## File Structure

**Crear:**
- `src/lib/types.ts` — interfaces TypeScript que mapean el schema de Supabase
- `src/lib/hash.ts` — utilidad SHA-256 para passwords
- `src/lib/api/categorias.ts`
- `src/lib/api/locales.ts`
- `src/lib/api/cupones.ts`
- `src/lib/api/entregables.ts`
- `src/lib/api/metodos-pago.ts`
- `src/lib/api/usuarios.ts`
- `src/lib/api/eventos-campanas.ts`
- `src/lib/api/clientes.ts`
- `src/lib/api/facturas.ts`

**Modificar:**
- `src/app/pages/crud/CategoriasCRUD.tsx`
- `src/app/pages/crud/LocalesCRUD.tsx`
- `src/app/pages/crud/CuponesCRUD.tsx`
- `src/app/pages/crud/EntregablesCRUD.tsx`
- `src/app/pages/crud/MetodosPagoCRUD.tsx`
- `src/app/pages/crud/UsuariosCRUD.tsx`
- `src/app/pages/EventosCampanas.tsx`
- `src/app/pages/Registro.tsx`
- `src/app/components/AuthProvider.tsx`
- `src/app/pages/Login.tsx`

---

## Task 1: TypeScript types + utilidad hash

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/hash.ts`

- [ ] **Step 1: Crear `src/lib/types.ts`**

```typescript
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  rol: 'Admin' | 'Usuario';
  activo: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  genero: 'masculino' | 'femenino' | null;
  created_at: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Local {
  id: string;
  nombre: string;
  categoria_id: string;
  activo: boolean;
}

export interface MetodoPago {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Cupon {
  id: string;
  nombre: string;
  numero: number;
  activo: boolean;
}

export interface Entregable {
  id: string;
  nombre: string;
  descripcion: string | null;
  stock: number;
  precio_base: number | null;
  activo: boolean;
}

export interface EventoCampana {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
  created_at: string;
  // IDs derivados de las tablas pivote al hacer fetch
  categoria_ids: string[];
  cupon_ids: string[];
  entregable_ids: string[];
}

export interface Factura {
  id: string;
  evento_id: string;
  cliente_id: string;
  local_id: string;
  usuario_id: string;
  numero_factura: string;
  monto_total: number;
  fecha_emision: string;
  total_entregables: number;
  fecha_registro: string;
}

export interface FacturaMetodoPago {
  id: string;
  factura_id: string;
  metodo_pago_id: string;
  monto: number;
  cupon_id: string | null;
  cupon_numero: number | null;
  entregables_calculados: number;
}

// Vista enriquecida de factura para la pantalla de Registro
export interface FacturaVista extends Factura {
  clientes: Cliente;
  eventos_campanas: { nombre: string; valor_minimo: number };
  locales: { nombre: string };
  usuarios: { nombre: string; email: string };
  factura_metodos_pago: Array<
    FacturaMetodoPago & {
      metodos_pago: { nombre: string };
      cupones: { nombre: string } | null;
    }
  >;
}
```

- [ ] **Step 2: Crear `src/lib/hash.ts`**

```typescript
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

- [ ] **Step 3: Verificar que compila**

```bash
npm run build
```
Esperado: build exitoso sin errores de tipos.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/hash.ts
git commit -m "feat: add Supabase TypeScript types and password hash utility"
```

---

## Task 2: API + CRUD Categorías

**Files:**
- Create: `src/lib/api/categorias.ts`
- Modify: `src/app/pages/crud/CategoriasCRUD.tsx`

- [ ] **Step 1: Crear `src/lib/api/categorias.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { Categoria } from '@/lib/types';

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createCategoria(
  payload: Omit<Categoria, 'id'>
): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoria(
  id: string,
  payload: Partial<Omit<Categoria, 'id'>>
): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Reemplazar `src/app/pages/crud/CategoriasCRUD.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { Categoria } from '@/lib/types';
import {
  fetchCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '@/lib/api/categorias';

export function CategoriasCRUD() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    fetchCategorias()
      .then(setCategorias)
      .catch(() => toast.error('Error al cargar categorías'));
  }, []);

  const handleAdd = async (categoria: Omit<Categoria, 'id'>) => {
    try {
      const created = await createCategoria(categoria);
      setCategorias((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear la categoría');
    }
  };

  const handleEdit = async (id: string | number, categoria: Partial<Categoria>) => {
    try {
      const updated = await updateCategoria(String(id), categoria);
      setCategorias((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      toast.error('Error al actualizar la categoría');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteCategoria(String(id));
      setCategorias((prev) => prev.filter((c) => c.id !== String(id)));
    } catch {
      toast.error('Error al eliminar la categoría');
    }
  };

  const renderForm = (
    item: Partial<Categoria> | null,
    onChange: (field: keyof Categoria, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre de la categoría"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="activo"
          defaultChecked={item?.activo ?? true}
          onCheckedChange={(checked) => onChange('activo', checked)}
        />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Categorías"
      description="Gestiona las categorías de eventos"
      data={categorias}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        {
          key: 'activo',
          label: 'Estado',
          render: (item) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.activo ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm}
      getItemId={(item) => item.id}
    />
  );
}
```

- [ ] **Step 3: Verificar en dev server**

```bash
npm run dev
```
Ir a `/configuracion/categorias`. Debe cargar las categorías de Supabase. Probar agregar, editar y eliminar.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/categorias.ts src/app/pages/crud/CategoriasCRUD.tsx
git commit -m "feat: connect CategoriasCRUD to Supabase"
```

---

## Task 3: API + CRUD Cupones

**Files:**
- Create: `src/lib/api/cupones.ts`
- Modify: `src/app/pages/crud/CuponesCRUD.tsx`

- [ ] **Step 1: Crear `src/lib/api/cupones.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { Cupon } from '@/lib/types';

export async function fetchCupones(): Promise<Cupon[]> {
  const { data, error } = await supabase
    .from('cupones')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createCupon(
  payload: Omit<Cupon, 'id'>
): Promise<Cupon> {
  const { data, error } = await supabase
    .from('cupones')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCupon(
  id: string,
  payload: Partial<Omit<Cupon, 'id'>>
): Promise<Cupon> {
  const { data, error } = await supabase
    .from('cupones')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCupon(id: string): Promise<void> {
  const { error } = await supabase.from('cupones').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Reemplazar `src/app/pages/crud/CuponesCRUD.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { Cupon } from '@/lib/types';
import { fetchCupones, createCupon, updateCupon, deleteCupon } from '@/lib/api/cupones';

export function CuponesCRUD() {
  const [cupones, setCupones] = useState<Cupon[]>([]);

  useEffect(() => {
    fetchCupones()
      .then(setCupones)
      .catch(() => toast.error('Error al cargar cupones'));
  }, []);

  const handleAdd = async (cupon: Omit<Cupon, 'id'>) => {
    try {
      const created = await createCupon(cupon);
      setCupones((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el cupón');
    }
  };

  const handleEdit = async (id: string | number, cupon: Partial<Cupon>) => {
    try {
      const updated = await updateCupon(String(id), cupon);
      setCupones((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      toast.error('Error al actualizar el cupón');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteCupon(String(id));
      setCupones((prev) => prev.filter((c) => c.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el cupón');
    }
  };

  const renderForm = (
    item: Partial<Cupon> | null,
    onChange: (field: keyof Cupon, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del cupón"
        />
      </div>
      <div>
        <Label htmlFor="numero">Número (multiplicador)</Label>
        <Input
          id="numero"
          type="number"
          defaultValue={item?.numero ?? ''}
          onChange={(e) => onChange('numero', parseInt(e.target.value) || 0)}
          placeholder="1"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="activo"
          defaultChecked={item?.activo ?? true}
          onCheckedChange={(checked) => onChange('activo', checked)}
        />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Cupones"
      description="Administra los cupones del sistema"
      data={cupones}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'numero', label: 'Multiplicador' },
        {
          key: 'activo',
          label: 'Estado',
          render: (item) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.activo ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm}
      getItemId={(item) => item.id}
    />
  );
}
```

- [ ] **Step 3: Verificar en dev server** — ir a `/configuracion/cupones`, probar CRUD completo.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/cupones.ts src/app/pages/crud/CuponesCRUD.tsx
git commit -m "feat: connect CuponesCRUD to Supabase"
```

---

## Task 4: API + CRUD Entregables

**Files:**
- Create: `src/lib/api/entregables.ts`
- Modify: `src/app/pages/crud/EntregablesCRUD.tsx`

- [ ] **Step 1: Crear `src/lib/api/entregables.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { Entregable } from '@/lib/types';

export async function fetchEntregables(): Promise<Entregable[]> {
  const { data, error } = await supabase
    .from('entregables')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createEntregable(
  payload: Omit<Entregable, 'id'>
): Promise<Entregable> {
  const { data, error } = await supabase
    .from('entregables')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntregable(
  id: string,
  payload: Partial<Omit<Entregable, 'id'>>
): Promise<Entregable> {
  const { data, error } = await supabase
    .from('entregables')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntregable(id: string): Promise<void> {
  const { error } = await supabase.from('entregables').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Reemplazar `src/app/pages/crud/EntregablesCRUD.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { Entregable } from '@/lib/types';
import {
  fetchEntregables,
  createEntregable,
  updateEntregable,
  deleteEntregable,
} from '@/lib/api/entregables';

export function EntregablesCRUD() {
  const [entregables, setEntregables] = useState<Entregable[]>([]);

  useEffect(() => {
    fetchEntregables()
      .then(setEntregables)
      .catch(() => toast.error('Error al cargar entregables'));
  }, []);

  const handleAdd = async (entregable: Omit<Entregable, 'id'>) => {
    try {
      const created = await createEntregable(entregable);
      setEntregables((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el entregable');
    }
  };

  const handleEdit = async (id: string | number, entregable: Partial<Entregable>) => {
    try {
      const updated = await updateEntregable(String(id), entregable);
      setEntregables((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch {
      toast.error('Error al actualizar el entregable');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteEntregable(String(id));
      setEntregables((prev) => prev.filter((e) => e.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el entregable');
    }
  };

  const renderForm = (
    item: Partial<Entregable> | null,
    onChange: (field: keyof Entregable, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del producto"
        />
      </div>
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          defaultValue={item?.descripcion || ''}
          onChange={(e) => onChange('descripcion', e.target.value)}
          placeholder="Descripción del producto"
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="stock">Stock</Label>
        <Input
          id="stock"
          type="number"
          defaultValue={item?.stock ?? ''}
          onChange={(e) => onChange('stock', parseInt(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
      <div>
        <Label htmlFor="precio_base">Precio Base</Label>
        <Input
          id="precio_base"
          type="number"
          step="0.01"
          defaultValue={item?.precio_base ?? ''}
          onChange={(e) => onChange('precio_base', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="activo"
          defaultChecked={item?.activo ?? true}
          onCheckedChange={(checked) => onChange('activo', checked)}
        />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Entregables"
      description="Administra productos entregables"
      data={entregables}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'stock', label: 'Stock' },
        {
          key: 'precio_base',
          label: 'Precio Base',
          render: (item) => `$${(item.precio_base ?? 0).toFixed(2)}`,
        },
        {
          key: 'activo',
          label: 'Estado',
          render: (item) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.activo ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm}
      getItemId={(item) => item.id}
    />
  );
}
```

- [ ] **Step 3: Verificar en dev server** — ir a `/configuracion/entregables`, probar CRUD.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/entregables.ts src/app/pages/crud/EntregablesCRUD.tsx
git commit -m "feat: connect EntregablesCRUD to Supabase"
```

---

## Task 5: API + CRUD Métodos de Pago

**Files:**
- Create: `src/lib/api/metodos-pago.ts`
- Modify: `src/app/pages/crud/MetodosPagoCRUD.tsx`

- [ ] **Step 1: Crear `src/lib/api/metodos-pago.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { MetodoPago } from '@/lib/types';

export async function fetchMetodosPago(): Promise<MetodoPago[]> {
  const { data, error } = await supabase
    .from('metodos_pago')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createMetodoPago(
  payload: Omit<MetodoPago, 'id'>
): Promise<MetodoPago> {
  const { data, error } = await supabase
    .from('metodos_pago')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMetodoPago(
  id: string,
  payload: Partial<Omit<MetodoPago, 'id'>>
): Promise<MetodoPago> {
  const { data, error } = await supabase
    .from('metodos_pago')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMetodoPago(id: string): Promise<void> {
  const { error } = await supabase.from('metodos_pago').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Reemplazar `src/app/pages/crud/MetodosPagoCRUD.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { MetodoPago } from '@/lib/types';
import {
  fetchMetodosPago,
  createMetodoPago,
  updateMetodoPago,
  deleteMetodoPago,
} from '@/lib/api/metodos-pago';

export function MetodosPagoCRUD() {
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  useEffect(() => {
    fetchMetodosPago()
      .then(setMetodosPago)
      .catch(() => toast.error('Error al cargar métodos de pago'));
  }, []);

  const handleAdd = async (metodoPago: Omit<MetodoPago, 'id'>) => {
    try {
      const created = await createMetodoPago(metodoPago);
      setMetodosPago((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el método de pago');
    }
  };

  const handleEdit = async (id: string | number, metodoPago: Partial<MetodoPago>) => {
    try {
      const updated = await updateMetodoPago(String(id), metodoPago);
      setMetodosPago((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      toast.error('Error al actualizar el método de pago');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteMetodoPago(String(id));
      setMetodosPago((prev) => prev.filter((m) => m.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el método de pago');
    }
  };

  const renderForm = (
    item: Partial<MetodoPago> | null,
    onChange: (field: keyof MetodoPago, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del método de pago"
        />
      </div>
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          defaultValue={item?.descripcion || ''}
          onChange={(e) => onChange('descripcion', e.target.value)}
          placeholder="Descripción"
          rows={3}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="activo"
          defaultChecked={item?.activo ?? true}
          onCheckedChange={(checked) => onChange('activo', checked)}
        />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Métodos de Pago"
      description="Gestiona los métodos de pago disponibles"
      data={metodosPago}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
        {
          key: 'activo',
          label: 'Estado',
          render: (item) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.activo ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm}
      getItemId={(item) => item.id}
    />
  );
}
```

- [ ] **Step 3: Verificar en dev server** — ir a `/configuracion/metodos-pago`, probar CRUD.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/metodos-pago.ts src/app/pages/crud/MetodosPagoCRUD.tsx
git commit -m "feat: connect MetodosPagoCRUD to Supabase"
```

---

## Task 6: API + CRUD Locales

**Files:**
- Create: `src/lib/api/locales.ts`
- Modify: `src/app/pages/crud/LocalesCRUD.tsx`

- [ ] **Step 1: Crear `src/lib/api/locales.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { Local } from '@/lib/types';

export async function fetchLocales(): Promise<Local[]> {
  const { data, error } = await supabase
    .from('locales')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createLocal(
  payload: Omit<Local, 'id'>
): Promise<Local> {
  const { data, error } = await supabase
    .from('locales')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLocal(
  id: string,
  payload: Partial<Omit<Local, 'id'>>
): Promise<Local> {
  const { data, error } = await supabase
    .from('locales')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLocal(id: string): Promise<void> {
  const { error } = await supabase.from('locales').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Reemplazar `src/app/pages/crud/LocalesCRUD.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import type { Local, Categoria } from '@/lib/types';
import { fetchLocales, createLocal, updateLocal, deleteLocal } from '@/lib/api/locales';
import { fetchCategorias } from '@/lib/api/categorias';

export function LocalesCRUD() {
  const [locales, setLocales] = useState<Local[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    fetchLocales()
      .then(setLocales)
      .catch(() => toast.error('Error al cargar locales'));
    fetchCategorias()
      .then(setCategorias)
      .catch(() => toast.error('Error al cargar categorías'));
  }, []);

  const getCategoriaNombre = (categoriaId: string) =>
    categorias.find((c) => c.id === categoriaId)?.nombre || 'Sin categoría';

  const handleAdd = async (local: Omit<Local, 'id'>) => {
    try {
      const created = await createLocal(local);
      setLocales((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el local');
    }
  };

  const handleEdit = async (id: string | number, local: Partial<Local>) => {
    try {
      const updated = await updateLocal(String(id), local);
      setLocales((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch {
      toast.error('Error al actualizar el local');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteLocal(String(id));
      setLocales((prev) => prev.filter((l) => l.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el local');
    }
  };

  const renderForm = (
    item: Partial<Local> | null,
    onChange: (field: keyof Local, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del local comercial"
        />
      </div>
      <div>
        <Label htmlFor="categoria">Categoría</Label>
        <Select
          defaultValue={item?.categoria_id}
          onValueChange={(value) => onChange('categoria_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categorias.filter((c) => c.activo).map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="activo"
          defaultChecked={item?.activo ?? true}
          onCheckedChange={(checked) => onChange('activo', checked)}
        />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Locales Comerciales"
      description="Administra los locales comerciales"
      data={locales}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        {
          key: 'categoria_id',
          label: 'Categoría',
          render: (item) => getCategoriaNombre(item.categoria_id),
        },
        {
          key: 'activo',
          label: 'Estado',
          render: (item) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.activo ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm}
      getItemId={(item) => item.id}
    />
  );
}
```

- [ ] **Step 3: Verificar en dev server** — ir a `/configuracion/locales`, probar CRUD, confirmar que el select de categorías carga desde DB.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/locales.ts src/app/pages/crud/LocalesCRUD.tsx
git commit -m "feat: connect LocalesCRUD to Supabase"
```

---

## Task 7: API + CRUD Usuarios (con hashing de password)

**Files:**
- Create: `src/lib/api/usuarios.ts`
- Modify: `src/app/pages/crud/UsuariosCRUD.tsx`

- [ ] **Step 1: Crear `src/lib/api/usuarios.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import { sha256 } from '@/lib/hash';
import type { Usuario } from '@/lib/types';

export async function fetchUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol, activo, created_at')
    .order('nombre');
  if (error) throw error;
  return data as Usuario[];
}

export async function createUsuario(payload: {
  nombre: string;
  email: string;
  password: string;
  rol: 'Admin' | 'Usuario';
  activo: boolean;
}): Promise<Usuario> {
  const password_hash = await sha256(payload.password);
  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      nombre: payload.nombre,
      email: payload.email,
      password_hash,
      rol: payload.rol,
      activo: payload.activo,
    })
    .select('id, nombre, email, rol, activo, created_at')
    .single();
  if (error) throw error;
  return data as Usuario;
}

export async function updateUsuario(
  id: string,
  payload: {
    nombre?: string;
    email?: string;
    password?: string;
    rol?: 'Admin' | 'Usuario';
    activo?: boolean;
  }
): Promise<Usuario> {
  const updates: Record<string, any> = { ...payload };
  delete updates.password;
  if (payload.password && payload.password.trim() !== '') {
    updates.password_hash = await sha256(payload.password);
  }
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .select('id, nombre, email, rol, activo, created_at')
    .single();
  if (error) throw error;
  return data as Usuario;
}

export async function deleteUsuario(id: string): Promise<void> {
  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  if (error) throw error;
}

export async function findUsuarioByEmail(email: string): Promise<(Usuario & { password_hash: string }) | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('activo', true)
    .single();
  if (error) return null;
  return data;
}
```

- [ ] **Step 2: Reemplazar `src/app/pages/crud/UsuariosCRUD.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import type { Usuario } from '@/lib/types';
import {
  fetchUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from '@/lib/api/usuarios';

// Tipo de formulario con campo password en texto plano
interface UsuarioForm extends Omit<Usuario, 'password_hash' | 'created_at'> {
  password?: string;
}

export function UsuariosCRUD() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    fetchUsuarios()
      .then(setUsuarios)
      .catch(() => toast.error('Error al cargar usuarios'));
  }, []);

  const handleAdd = async (form: Omit<UsuarioForm, 'id'>) => {
    if (!form.password?.trim()) {
      toast.error('La contraseña es obligatoria');
      return;
    }
    try {
      const created = await createUsuario({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rol: form.rol as 'Admin' | 'Usuario',
        activo: form.activo ?? true,
      });
      setUsuarios((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el usuario');
    }
  };

  const handleEdit = async (id: string | number, form: Partial<UsuarioForm>) => {
    try {
      const updated = await updateUsuario(String(id), {
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rol: form.rol as 'Admin' | 'Usuario' | undefined,
        activo: form.activo,
      });
      setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      toast.error('Error al actualizar el usuario');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteUsuario(String(id));
      setUsuarios((prev) => prev.filter((u) => u.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el usuario');
    }
  };

  const renderForm = (
    item: Partial<UsuarioForm> | null,
    onChange: (field: keyof UsuarioForm, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del usuario"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          defaultValue={item?.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div>
        <Label htmlFor="password">
          Contraseña {item?.id ? '(dejar vacío para no cambiar)' : '*'}
        </Label>
        <Input
          id="password"
          type="password"
          onChange={(e) => onChange('password', e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div>
        <Label htmlFor="rol">Rol</Label>
        <Select
          defaultValue={item?.rol || 'Usuario'}
          onValueChange={(value) => onChange('rol', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Usuario">Usuario</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="activo"
          defaultChecked={item?.activo ?? true}
          onCheckedChange={(checked) => onChange('activo', checked)}
        />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Usuarios"
      description="Administra los usuarios del sistema"
      data={usuarios as any}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Email' },
        { key: 'rol', label: 'Rol' },
        {
          key: 'activo',
          label: 'Estado',
          render: (item: any) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.activo ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd as any}
      onEdit={handleEdit as any}
      onDelete={handleDelete}
      renderForm={renderForm as any}
      getItemId={(item: any) => item.id}
    />
  );
}
```

- [ ] **Step 3: Verificar en dev server** — ir a `/configuracion/usuarios`. Crear un usuario con contraseña. Verificar en Supabase Dashboard → Table Editor que `password_hash` tiene 64 caracteres hex.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/usuarios.ts src/app/pages/crud/UsuariosCRUD.tsx
git commit -m "feat: connect UsuariosCRUD to Supabase with SHA-256 password hashing"
```

---

## Task 8: API + CRUD Eventos y Campañas (M:N)

**Files:**
- Create: `src/lib/api/eventos-campanas.ts`
- Modify: `src/app/pages/EventosCampanas.tsx`

- [ ] **Step 1: Crear `src/lib/api/eventos-campanas.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { EventoCampana } from '@/lib/types';

type RawEvento = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
  created_at: string;
  evento_categorias: { categoria_id: string }[];
  evento_cupones: { cupon_id: string }[];
  evento_entregables: { entregable_id: string }[];
};

function mapRawEvento(raw: RawEvento): EventoCampana {
  return {
    ...raw,
    categoria_ids: raw.evento_categorias.map((r) => r.categoria_id),
    cupon_ids: raw.evento_cupones.map((r) => r.cupon_id),
    entregable_ids: raw.evento_entregables.map((r) => r.entregable_id),
  };
}

export async function fetchEventos(): Promise<EventoCampana[]> {
  const { data, error } = await supabase
    .from('eventos_campanas')
    .select(`
      *,
      evento_categorias(categoria_id),
      evento_cupones(cupon_id),
      evento_entregables(entregable_id)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RawEvento[]).map(mapRawEvento);
}

export async function createEvento(payload: {
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
  categoria_ids: string[];
  cupon_ids: string[];
  entregable_ids: string[];
}): Promise<EventoCampana> {
  const { categoria_ids, cupon_ids, entregable_ids, ...eventoData } = payload;

  const { data: evento, error } = await supabase
    .from('eventos_campanas')
    .insert(eventoData)
    .select()
    .single();
  if (error) throw error;

  await insertPivots(evento.id, categoria_ids, cupon_ids, entregable_ids);

  return {
    ...evento,
    categoria_ids,
    cupon_ids,
    entregable_ids,
  };
}

export async function updateEvento(
  id: string,
  payload: {
    nombre?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    valor_minimo?: number;
    valor_maximo?: number;
    activo?: boolean;
    categoria_ids?: string[];
    cupon_ids?: string[];
    entregable_ids?: string[];
  }
): Promise<EventoCampana> {
  const { categoria_ids, cupon_ids, entregable_ids, ...eventoData } = payload;

  const { data: evento, error } = await supabase
    .from('eventos_campanas')
    .update(eventoData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  if (categoria_ids !== undefined || cupon_ids !== undefined || entregable_ids !== undefined) {
    await deletePivots(id);
    await insertPivots(
      id,
      categoria_ids ?? [],
      cupon_ids ?? [],
      entregable_ids ?? []
    );
  }

  const updated = await fetchEventoById(id);
  return updated;
}

export async function deleteEvento(id: string): Promise<void> {
  // Las tablas pivote tienen ON DELETE CASCADE, se eliminan automáticamente
  const { error } = await supabase.from('eventos_campanas').delete().eq('id', id);
  if (error) throw error;
}

async function fetchEventoById(id: string): Promise<EventoCampana> {
  const { data, error } = await supabase
    .from('eventos_campanas')
    .select(`
      *,
      evento_categorias(categoria_id),
      evento_cupones(cupon_id),
      evento_entregables(entregable_id)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapRawEvento(data as RawEvento);
}

async function deletePivots(eventoId: string): Promise<void> {
  await Promise.all([
    supabase.from('evento_categorias').delete().eq('evento_id', eventoId),
    supabase.from('evento_cupones').delete().eq('evento_id', eventoId),
    supabase.from('evento_entregables').delete().eq('evento_id', eventoId),
  ]);
}

async function insertPivots(
  eventoId: string,
  categoriaIds: string[],
  cuponIds: string[],
  entregableIds: string[]
): Promise<void> {
  const ops: Promise<any>[] = [];
  if (categoriaIds.length > 0) {
    ops.push(
      supabase.from('evento_categorias').insert(
        categoriaIds.map((id) => ({ evento_id: eventoId, categoria_id: id }))
      )
    );
  }
  if (cuponIds.length > 0) {
    ops.push(
      supabase.from('evento_cupones').insert(
        cuponIds.map((id) => ({ evento_id: eventoId, cupon_id: id }))
      )
    );
  }
  if (entregableIds.length > 0) {
    ops.push(
      supabase.from('evento_entregables').insert(
        entregableIds.map((id) => ({ evento_id: eventoId, entregable_id: id }))
      )
    );
  }
  await Promise.all(ops);
}
```

- [ ] **Step 2: Reemplazar `src/app/pages/EventosCampanas.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import type { EventoCampana, Categoria, Cupon, Entregable } from '@/lib/types';
import {
  fetchEventos,
  createEvento,
  updateEvento,
  deleteEvento,
} from '@/lib/api/eventos-campanas';
import { fetchCategorias } from '@/lib/api/categorias';
import { fetchCupones } from '@/lib/api/cupones';
import { fetchEntregables } from '@/lib/api/entregables';

export function EventosCampanas() {
  const [eventos, setEventos] = useState<EventoCampana[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);

  useEffect(() => {
    fetchEventos().then(setEventos).catch(() => toast.error('Error al cargar eventos'));
    fetchCategorias().then(setCategorias).catch(() => {});
    fetchCupones().then(setCupones).catch(() => {});
    fetchEntregables().then(setEntregables).catch(() => {});
  }, []);

  const handleAdd = async (form: Omit<EventoCampana, 'id' | 'created_at'>) => {
    try {
      const created = await createEvento({
        nombre: form.nombre,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        valor_minimo: form.valor_minimo,
        valor_maximo: form.valor_maximo,
        activo: form.activo ?? true,
        categoria_ids: form.categoria_ids ?? [],
        cupon_ids: form.cupon_ids ?? [],
        entregable_ids: form.entregable_ids ?? [],
      });
      setEventos((prev) => [created, ...prev]);
    } catch {
      toast.error('Error al crear el evento');
    }
  };

  const handleEdit = async (id: string | number, form: Partial<EventoCampana>) => {
    try {
      const updated = await updateEvento(String(id), form);
      setEventos((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch {
      toast.error('Error al actualizar el evento');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteEvento(String(id));
      setEventos((prev) => prev.filter((e) => e.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el evento');
    }
  };

  const renderForm = (
    item: Partial<EventoCampana> | null,
    onChange: (field: keyof EventoCampana, value: any) => void
  ) => {
    const [localCategorias, setLocalCategorias] = React.useState<string[]>(item?.categoria_ids ?? []);
    const [localCupones, setLocalCupones] = React.useState<string[]>(item?.cupon_ids ?? []);
    const [localEntregables, setLocalEntregables] = React.useState<string[]>(item?.entregable_ids ?? []);

    React.useEffect(() => {
      setLocalCategorias(item?.categoria_ids ?? []);
      setLocalCupones(item?.cupon_ids ?? []);
      setLocalEntregables(item?.entregable_ids ?? []);
    }, [item?.id]);

    const toggleCategoria = (id: string, checked: boolean) => {
      const updated = checked ? [...localCategorias, id] : localCategorias.filter((x) => x !== id);
      setLocalCategorias(updated);
      onChange('categoria_ids', updated);
    };
    const toggleCupon = (id: string, checked: boolean) => {
      const updated = checked ? [...localCupones, id] : localCupones.filter((x) => x !== id);
      setLocalCupones(updated);
      onChange('cupon_ids', updated);
    };
    const toggleEntregable = (id: string, checked: boolean) => {
      const updated = checked ? [...localEntregables, id] : localEntregables.filter((x) => x !== id);
      setLocalEntregables(updated);
      onChange('entregable_ids', updated);
    };

    return (
      <form className="p-2 md:p-4">
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              defaultValue={item?.nombre || ''}
              onChange={(e) => onChange('nombre', e.target.value)}
              placeholder="Nombre del evento o campaña"
            />
          </div>

          {/* Categorías */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Categorías participantes</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const all = categorias.filter((c) => c.activo).map((c) => c.id);
                  setLocalCategorias(all);
                  onChange('categoria_ids', all);
                }}
              >
                Seleccionar todas
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categorias.filter((c) => c.activo).map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-primary/40 hover:bg-accent/60 cursor-pointer">
                  <Checkbox
                    checked={localCategorias.includes(c.id)}
                    onCheckedChange={(checked) => toggleCategoria(c.id, !!checked)}
                  />
                  <span className="text-sm font-medium">{c.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
              <Input
                id="fecha_inicio"
                type="date"
                defaultValue={item?.fecha_inicio || ''}
                onChange={(e) => onChange('fecha_inicio', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha_fin">Fecha Fin</Label>
              <Input
                id="fecha_fin"
                type="date"
                defaultValue={item?.fecha_fin || ''}
                onChange={(e) => onChange('fecha_fin', e.target.value)}
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor_minimo">Valor Mínimo de Participación</Label>
              <Input
                id="valor_minimo"
                type="number"
                step="0.01"
                defaultValue={item?.valor_minimo ?? ''}
                onChange={(e) => onChange('valor_minimo', parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_maximo">Valor Máximo por Factura</Label>
              <Input
                id="valor_maximo"
                type="number"
                step="0.01"
                defaultValue={item?.valor_maximo ?? ''}
                onChange={(e) => onChange('valor_maximo', parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Cupones */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-border">
            <Label className="text-base font-semibold mb-4 block">Cupones del evento</Label>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cupones.filter((c) => c.activo).map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-primary/40 hover:bg-accent/60 cursor-pointer">
                  <Checkbox
                    checked={localCupones.includes(c.id)}
                    onCheckedChange={(checked) => toggleCupon(c.id, !!checked)}
                  />
                  <span className="text-sm font-medium">{c.nombre} (x{c.numero})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Entregables */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-border">
            <Label className="text-base font-semibold mb-4 block">Entregables del evento</Label>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {entregables.filter((e) => e.activo).map((e) => (
                <label key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-primary/40 hover:bg-accent/60 cursor-pointer">
                  <Checkbox
                    checked={localEntregables.includes(e.id)}
                    onCheckedChange={(checked) => toggleEntregable(e.id, !!checked)}
                  />
                  <span className="text-sm font-medium">{e.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </form>
    );
  };

  const getCategoriaNames = (evento: EventoCampana) =>
    evento.categoria_ids
      .map((id) => categorias.find((c) => c.id === id)?.nombre)
      .filter(Boolean)
      .join(', ') || '—';

  return (
    <CRUDTemplate
      title="Eventos y Campañas"
      description="Gestiona todos los eventos y campañas del sistema"
      data={eventos}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'fecha_inicio', label: 'Fecha Inicio' },
        { key: 'fecha_fin', label: 'Fecha Fin' },
        {
          key: 'categoria_ids',
          label: 'Categorías',
          render: (item) => getCategoriaNames(item),
        },
        {
          key: 'valor_minimo',
          label: 'Valor Mínimo',
          render: (item) => `$${item.valor_minimo.toFixed(2)}`,
        },
        {
          key: 'valor_maximo',
          label: 'Valor Máximo',
          render: (item) => `$${item.valor_maximo.toFixed(2)}`,
        },
      ]}
      onAdd={handleAdd as any}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm as any}
      getItemId={(item) => item.id}
    />
  );
}
```

- [ ] **Step 3: Verificar en dev server** — ir a `/configuracion/eventos-campanas`. Crear un evento con múltiples categorías, cupones y entregables. Verificar en Supabase que las tablas pivote se poblaron correctamente.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/eventos-campanas.ts src/app/pages/EventosCampanas.tsx
git commit -m "feat: connect EventosCampanas to Supabase with M:N relations"
```

---

## Task 9: API Clientes + Facturas + Registro

**Files:**
- Create: `src/lib/api/clientes.ts`
- Create: `src/lib/api/facturas.ts`
- Modify: `src/app/pages/Registro.tsx`

- [ ] **Step 1: Crear `src/lib/api/clientes.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

export async function upsertCliente(
  data: Omit<Cliente, 'id' | 'created_at'>
): Promise<Cliente> {
  const { data: existing } = await supabase
    .from('clientes')
    .select('*')
    .eq('cedula', data.cedula)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from('clientes')
      .update({
        nombre: data.nombre,
        apellido: data.apellido,
        direccion: data.direccion,
        telefono: data.telefono,
        correo: data.correo,
        genero: data.genero,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  const { data: created, error } = await supabase
    .from('clientes')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return created;
}
```

- [ ] **Step 2: Crear `src/lib/api/facturas.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { Factura, FacturaMetodoPago, FacturaVista } from '@/lib/types';

export async function createFactura(
  facturaData: Omit<Factura, 'id' | 'fecha_registro'>,
  metodosPago: Array<Omit<FacturaMetodoPago, 'id' | 'factura_id'>>
): Promise<Factura> {
  const { data: factura, error: facturaError } = await supabase
    .from('facturas')
    .insert(facturaData)
    .select()
    .single();
  if (facturaError) throw facturaError;

  if (metodosPago.length > 0) {
    const rows = metodosPago.map((m) => ({ ...m, factura_id: factura.id }));
    const { error: metodosError } = await supabase
      .from('factura_metodos_pago')
      .insert(rows);
    if (metodosError) throw metodosError;
  }

  return factura;
}

export async function fetchFacturasDelDia(): Promise<FacturaVista[]> {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('facturas')
    .select(`
      *,
      clientes(*),
      eventos_campanas(nombre, valor_minimo),
      locales(nombre),
      usuarios(nombre, email),
      factura_metodos_pago(
        *,
        metodos_pago(nombre),
        cupones(nombre)
      )
    `)
    .gte('fecha_registro', `${today}T00:00:00`)
    .lt('fecha_registro', `${tomorrow}T00:00:00`)
    .order('fecha_registro', { ascending: false });

  if (error) throw error;
  return data as FacturaVista[];
}

export async function fetchEventosActivos() {
  const { data, error } = await supabase
    .from('eventos_campanas')
    .select(`
      id, nombre, valor_minimo, valor_maximo, activo,
      evento_cupones(cupon_id, cupones(id, nombre, numero))
    `)
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return data as Array<{
    id: string;
    nombre: string;
    valor_minimo: number;
    valor_maximo: number;
    activo: boolean;
    evento_cupones: Array<{
      cupon_id: string;
      cupones: { id: string; nombre: string; numero: number };
    }>;
  }>;
}
```

- [ ] **Step 3: Actualizar `src/app/pages/Registro.tsx`**

Reemplazar los bloques de datos hardcodeados y los handlers. Los cambios principales son:

**3a — Cambiar imports y estado inicial al inicio del componente:**

Reemplazar:
```typescript
// Datos de cupones con su número multiplicador
const cuponesDisponibles = [ ... ];
// Datos de ejemplo de eventos/campañas activos
const eventosActivos = [ ... ];
// Datos de locales comerciales activos
const localesDisponibles = [ ... ];
// Datos de métodos de pago disponibles
const metodosPagoDisponibles = [ ... ];
```

Por importaciones al inicio del archivo (agregar junto a los otros imports):
```typescript
import { useAuth } from '@/app/components/AuthContext';
import { upsertCliente } from '@/lib/api/clientes';
import { createFactura, fetchFacturasDelDia, fetchEventosActivos } from '@/lib/api/facturas';
import { fetchLocales } from '@/lib/api/locales';
import { fetchMetodosPago } from '@/lib/api/metodos-pago';
import type { FacturaVista } from '@/lib/types';
```

**3b — Reemplazar los tipos locales de `MetodoPago` y `Factura` en el archivo por estos:**

```typescript
interface MetodoPagoLocal {
  id: string;
  nombre: string;
  monto: number;
  cuponId?: string;
  cuponNombre?: string;
  cuponNumero?: number;
  entregablesCalculados?: number;
}

interface EventoActivo {
  id: string;
  nombre: string;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
  evento_cupones: Array<{
    cupon_id: string;
    cupones: { id: string; nombre: string; numero: number };
  }>;
}

interface LocalDisponible {
  id: string;
  nombre: string;
  activo: boolean;
}

interface MetodoPagoDisponible {
  id: string;
  nombre: string;
  activo: boolean;
}
```

**3c — Reemplazar el inicio de la función `Registro()` — los `useState` de datos de referencia y agregar `useEffect` de carga:**

```typescript
export function Registro() {
  const { user } = useAuth();

  // Datos de referencia cargados de Supabase
  const [eventosActivos, setEventosActivos] = useState<EventoActivo[]>([]);
  const [localesDisponibles, setLocalesDisponibles] = useState<LocalDisponible[]>([]);
  const [metodosPagoDisponibles, setMetodosPagoDisponibles] = useState<MetodoPagoDisponible[]>([]);
  const [facturas, setFacturas] = useState<FacturaVista[]>([]);

  useEffect(() => {
    fetchEventosActivos().then(setEventosActivos).catch(() => toast.error('Error al cargar eventos'));
    fetchLocales().then((data) => setLocalesDisponibles(data.filter((l) => l.activo))).catch(() => {});
    fetchMetodosPago().then((data) => setMetodosPagoDisponibles(data.filter((m) => m.activo))).catch(() => {});
    fetchFacturasDelDia().then(setFacturas).catch(() => toast.error('Error al cargar facturas'));
  }, []);
```

**3d — Reemplazar `registrarFacturas` para llamar a Supabase:**

Localizar la función `registrarFacturas` y reemplazarla con:

```typescript
  const registrarFacturas = async () => {
    if (facturasPendientes.length === 0) {
      toast.error('No hay facturas pendientes por registrar');
      return;
    }
    if (!user) {
      toast.error('Debes iniciar sesión para registrar facturas');
      return;
    }

    try {
      const registradas: FacturaVista[] = [];

      for (const fp of facturasPendientes) {
        // 1. Upsert cliente
        const cliente = await upsertCliente({
          cedula: fp.cedula,
          nombre: fp.nombre,
          apellido: fp.apellido,
          direccion: fp.direccion,
          telefono: fp.telefono,
          correo: fp.correo,
          genero: fp.genero as 'masculino' | 'femenino',
        });

        // 2. Crear factura
        const factura = await createFactura(
          {
            evento_id: String(fp.eventoId),
            cliente_id: cliente.id,
            local_id: String(fp.localId),
            usuario_id: user.id,
            numero_factura: fp.numeroFactura,
            monto_total: fp.montoTotal,
            fecha_emision: fp.fechaEmision,
            total_entregables: fp.totalEntregables,
          },
          fp.metodosPago.map((m) => ({
            metodo_pago_id: String(m.id),
            monto: m.monto,
            cupon_id: m.cuponId ? String(m.cuponId) : null,
            cupon_numero: m.cuponNumero ?? null,
            entregables_calculados: m.entregablesCalculados ?? 0,
          }))
        );

        registradas.push({ ...factura } as any);
      }

      // Recargar facturas del día
      const actualizadas = await fetchFacturasDelDia();
      setFacturas(actualizadas);

      setFacturasActuales(facturasPendientes);
      setFacturasPendientes([]);
      setMostrarDialogoTickets(true);
      limpiarCliente();
    } catch {
      toast.error('Error al registrar las facturas');
    }
  };
```

**3e — Actualizar el selector de cupones para mostrar los cupones del evento seleccionado:**

Localizar el bloque del `Select` de cupón (alrededor de línea 789) y reemplazar el contenido del `SelectContent`:

```typescript
<SelectContent>
  <SelectItem value="none">Sin cupón</SelectItem>
  {eventoId &&
    eventosActivos
      .find((e) => e.id === eventoId)
      ?.evento_cupones.map(({ cupones }) => (
        <SelectItem key={cupones.id} value={cupones.id}>
          {cupones.nombre} (x{cupones.numero})
        </SelectItem>
      ))}
</SelectContent>
```

**3f — Actualizar `agregarMetodoPago` para usar IDs de tipo string:**

Localizar la línea que busca el cupón:
```typescript
const cupon = cuponesDisponibles.find((c) => c.id.toString() === cuponSeleccionado);
```
Reemplazar por:
```typescript
const eventoCupones = eventosActivos.find((e) => e.id === eventoId)?.evento_cupones ?? [];
const cupon = eventoCupones.find((ec) => ec.cupones.id === cuponSeleccionado)?.cupones;
```

Y la línea que asigna `cuponId`:
```typescript
cuponId = cupon.id;
```
Queda igual (ya es string).

Y la línea:
```typescript
const valorMinimo = evento?.valorMinimo || 1;
```
Cambiar a:
```typescript
const valorMinimo = evento?.valor_minimo || 1;
```

- [ ] **Step 4: Actualizar `AuthContext.tsx` para incluir `id` en `AuthUser`**

En `src/app/components/AuthContext.tsx`, actualizar la interfaz:

```typescript
export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  rol: 'Admin' | 'Usuario';
}
```

- [ ] **Step 5: Verificar que compila**

```bash
npm run build
```

- [ ] **Step 6: Verificar en dev server** — ir a `/registro`, seleccionar evento y local, registrar una factura de prueba. Verificar en Supabase Dashboard que se crearon filas en `clientes`, `facturas` y `factura_metodos_pago`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/clientes.ts src/lib/api/facturas.ts src/app/pages/Registro.tsx src/app/components/AuthContext.tsx
git commit -m "feat: connect Registro to Supabase — clientes upsert + facturas + metodos_pago"
```

---

## Task 10: Auth — Login conectado a Supabase

**Files:**
- Modify: `src/app/pages/Login.tsx`
- Modify: `src/app/components/AuthProvider.tsx`

- [ ] **Step 1: Actualizar `src/app/pages/Login.tsx`**

Reemplazar el contenido del archivo manteniendo el mismo diseño visual pero conectando al DB:

```typescript
import { useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { sha256 } from '@/lib/hash';
import { findUsuarioByEmail } from '@/lib/api/usuarios';
import type { AuthUser } from '@/app/components/AuthContext';
import logoUrl from '@/images/LogoPSFBlanco.svg';

export function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const usuario = await findUsuarioByEmail(email.trim());
      if (!usuario) {
        setError('Correo o contraseña incorrectos');
        return;
      }

      const hash = await sha256(password.trim());
      if (hash !== usuario.password_hash) {
        setError('Correo o contraseña incorrectos');
        return;
      }

      onLogin({
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      });
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo */}
      <div
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ background: '#2563eb' }} />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-10" style={{ background: '#2563eb' }} />
        <div className="relative z-10 flex flex-col items-center gap-8 px-12 text-center">
          <img src={logoUrl} alt="Logo" className="w-64 drop-shadow-lg" />
          <div className="space-y-2">
            <h1 className="text-white text-2xl font-semibold tracking-wide">
              Sistema de Control de Tickets
            </h1>
            <p className="text-slate-400 text-sm">Gestión integral de Tickets</p>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div
            className="flex md:hidden items-center justify-center rounded-xl py-6"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
          >
            <img src={logoUrl} alt="Logo" className="w-48" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Bienvenido</h2>
            <p className="text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-base font-medium"
              style={{ background: '#2563eb' }}
            >
              {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400">
            © 2022 PaseoSanFrancisco · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Actualizar `src/app/components/AuthProvider.tsx`**

```typescript
import { useState } from 'react';
import { AuthContext, AuthUser } from './AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = (user: AuthUser) => setUser(user);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3: Crear el primer usuario admin en Supabase**

Antes de probar el login, crear un usuario en Supabase Dashboard → SQL Editor:

```sql
INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
VALUES (
  'Administrador',
  'admin@onewayec.com',
  -- SHA-256 de 'admin123' (calcular con: https://emn178.github.io/online-tools/sha256.html)
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'Admin',
  true
);
```

> Nota: el hash `240be518...` corresponde a `admin123`. Cambiar la contraseña después del primer login.

- [ ] **Step 4: Verificar en dev server** — ir a `/`, ingresar con `admin@onewayec.com` / `admin123`. Debe autenticar contra la DB.

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/Login.tsx src/app/components/AuthProvider.tsx
git commit -m "feat: connect Login to Supabase with SHA-256 password verification"
```

---

## Verificación final

- [ ] **Correr build de producción**

```bash
npm run build
```
Esperado: build exitoso sin errores de TypeScript.

- [ ] **Smoke test completo**
  1. Login con usuario de DB
  2. Crear una categoría → aparece en lista
  3. Crear un local con esa categoría
  4. Crear un cupón y un entregable
  5. Crear un evento con múltiples categorías, cupones y entregables
  6. Ir a Registro → seleccionar evento, registrar una factura con 2 métodos de pago
  7. Verificar en Supabase que existen filas en: `clientes`, `facturas`, `factura_metodos_pago`

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat: complete Supabase integration for all CRUD modules"
```
