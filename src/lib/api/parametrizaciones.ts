import { supabase } from '@/lib/supabase';
import type { ParametrizacionCorreo } from '@/lib/types';

const SELECT_COLUMNS =
  'id, nombre_remitente, correo_remitente, host_smtp, puerto_smtp, usuario_smtp, password_smtp, seguridad, responder_a, asunto_prueba, activo, updated_at';

interface ProbarCorreoErrorDetail {
  phase?: string;
  message?: string;
  code?: string | null;
  command?: string | null;
  responseCode?: number | null;
  smtpResponse?: string | null;
  errno?: string | number | null;
  syscall?: string | null;
  address?: string | null;
  port?: number | null;
  name?: string | null;
  hint?: string;
  status?: number;
  raw?: string;
}

export class ProbarCorreoError extends Error {
  detail?: ProbarCorreoErrorDetail;

  constructor(message: string, detail?: ProbarCorreoErrorDetail) {
    super(message);
    this.name = 'ProbarCorreoError';
    this.detail = detail;
  }
}

export async function fetchParametrizacionCorreo(): Promise<ParametrizacionCorreo | null> {
  const { data, error } = await supabase
    .from('parametrizaciones_correo')
    .select(SELECT_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ParametrizacionCorreo | null;
}

export async function saveParametrizacionCorreo(
  payload: Omit<ParametrizacionCorreo, 'id' | 'updated_at'>,
  id?: string
): Promise<ParametrizacionCorreo> {
  const values = {
    ...payload,
    responder_a: payload.responder_a || null,
    asunto_prueba: payload.asunto_prueba || null,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabase
        .from('parametrizaciones_correo')
        .update(values)
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single()
    : supabase
        .from('parametrizaciones_correo')
        .insert(values)
        .select(SELECT_COLUMNS)
        .single();

  const { data, error } = await query;
  if (error) throw error;
  return data as ParametrizacionCorreo;
}

export async function probarParametrizacionCorreo(destinatario: string): Promise<{ message: string }> {
  const response = await fetch('/api/probar-correo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinatario }),
  });

  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!response.ok) {
    const detail = typeof data.detail === 'object'
      ? data.detail
      : data.detail
        ? { message: String(data.detail) }
        : raw
          ? { message: raw }
          : undefined;
    const notFoundHint = response.status === 404
      ? 'La ruta /api/probar-correo no está disponible en el servidor actual. Si estás en local con npm run dev, usa Vercel Dev para levantar las funciones /api.'
      : undefined;
    const enrichedDetail = {
      ...(detail ?? {}),
      hint: detail?.hint ?? notFoundHint,
      status: response.status,
      raw,
    };
    throw new ProbarCorreoError(
      data.message || enrichedDetail.message || `No se pudo enviar el correo de prueba (HTTP ${response.status})`,
      enrichedDetail
    );
  }

  return data;
}
