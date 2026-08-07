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
  cupon_configuraciones: EventoCuponConfiguracion[];
  entregable_ids: string[];
  reglas_calculo: EventoReglaCalculo[];
}

export interface EventoCuponConfiguracion {
  cupon_id: string;
  metodo_pago_id: string;
}

export interface EventoReglaCalculo {
  id?: string;
  categoria_id: string;
  aplica_todos: boolean;
  local_ids: string[];
  acumula_saldo: boolean;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
}

export interface ParametrizacionCorreo {
  id: string;
  nombre_remitente: string;
  correo_remitente: string;
  tipo_envio: 'smtp' | 'graph';
  // Campos SMTP (nulos cuando tipo_envio = 'graph')
  host_smtp: string | null;
  puerto_smtp: number;
  usuario_smtp: string | null;
  password_smtp: string | null;
  seguridad: 'none' | 'tls' | 'ssl';
  // Campos Microsoft Graph (nulos cuando tipo_envio = 'smtp')
  ms_tenant_id: string | null;
  ms_client_id: string | null;
  ms_client_secret: string | null;
  responder_a: string | null;
  asunto_prueba: string | null;
  activo: boolean;
  updated_at: string;
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
  tickets_impresos: boolean;
  tickets_impresos_at: string | null;
  fecha_registro: string;
  regla_calculo_id?: string | null;
  categoria_id_aplicada?: string | null;
  valor_minimo_aplicado?: number | null;
  valor_maximo_aplicado?: number | null;
  regla_calculo_origen?: 'general' | 'categoria' | 'local' | null;
  acumula_saldo_aplicado?: boolean | null;
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

export interface SaldoCliente {
  id: string;
  cliente_id: string;
  evento_id: string;
  saldo: number;
  updated_at: string;
}

export interface HistorialSaldo {
  id: string;
  cliente_id: string;
  evento_id: string;
  factura_id: string;
  cupon_aplicado: string | null;
  saldo_anterior: number;
  saldo_nuevo: number;
  tickets_generados: number;
  created_at: string;
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
