import { createServerSupabase } from './_supabase.js';

function isExpired(value) {
  return value ? new Date(value).getTime() < Date.now() : true;
}

export default async function handler(request, response) {
  const supabase = createServerSupabase();

  if (request.method === 'GET') {
    const token = request.query.token;
    if (!token || Array.isArray(token)) {
      return response.status(400).json({ message: 'Token inválido' });
    }

    const { data, error } = await supabase
      .from('formularios_consentimiento')
      .select('token, nombre, correo, telefono, token_expira_at, fecha_aceptacion, acepta_publicidad, acepta_proteccion_datos')
      .eq('token', token)
      .maybeSingle();

    if (error) return response.status(500).json({ message: 'Error al consultar el formulario' });
    if (!data) return response.status(404).json({ message: 'Formulario no encontrado' });
    if (!data.fecha_aceptacion && isExpired(data.token_expira_at)) {
      return response.status(410).json({ message: 'El enlace expiró' });
    }

    return response.status(200).json(data);
  }

  if (request.method === 'POST') {
    const { token, aceptaPublicidad, aceptaProteccionDatos } = request.body ?? {};
    if (!token || !aceptaProteccionDatos) {
      return response.status(400).json({ message: 'Debes aceptar la política de protección de datos' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('formularios_consentimiento')
      .select('id, token_expira_at, fecha_aceptacion')
      .eq('token', token)
      .maybeSingle();

    if (existingError) return response.status(500).json({ message: 'Error al validar el formulario' });
    if (!existing) return response.status(404).json({ message: 'Formulario no encontrado' });
    if (!existing.fecha_aceptacion && isExpired(existing.token_expira_at)) {
      return response.status(410).json({ message: 'El enlace expiró' });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('formularios_consentimiento')
      .update({
        acepta_publicidad: Boolean(aceptaPublicidad),
        acepta_proteccion_datos: true,
        fecha_aceptacion: existing.fecha_aceptacion ?? now,
        formulario_enviado_at: now,
        ip: request.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? request.socket?.remoteAddress ?? null,
        user_agent: request.headers['user-agent'] ?? null,
      })
      .eq('id', existing.id);

    if (updateError) return response.status(500).json({ message: 'Error al guardar el formulario' });
    return response.status(200).json({ saved: true });
  }

  response.setHeader('Allow', 'GET, POST');
  return response.status(405).json({ message: 'Method not allowed' });
}
