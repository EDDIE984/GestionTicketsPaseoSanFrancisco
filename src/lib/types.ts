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
