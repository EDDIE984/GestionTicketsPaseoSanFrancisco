import crypto from 'node:crypto';
import { createServerSupabase, getAppUrl } from './_supabase.js';
import { buildMailTransport } from './_mail.js';

const EXPIRATION_DAYS = 7;

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed' });
  }

  const { clienteId, facturaIds = [] } = request.body ?? {};
  if (!clienteId) {
    return response.status(400).json({ message: 'clienteId is required' });
  }

  try {
    const supabase = createServerSupabase();

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, cedula, nombre, apellido, telefono, correo')
      .eq('id', clienteId)
      .single();

    if (clienteError || !cliente?.correo) {
      return response.status(400).json({ message: 'Cliente sin correo disponible' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('formularios_consentimiento')
      .select('id, fecha_aceptacion')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.fecha_aceptacion) {
      return response.status(200).json({ skipped: true, reason: 'accepted' });
    }

    const { data: config, error: configError } = await supabase
      .from('parametrizaciones_correo')
      .select('*')
      .eq('activo', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError) throw configError;
    if (!config) {
      return response.status(400).json({ message: 'No existe parametrización de correo activa' });
    }

    const now = new Date();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addDays(now, EXPIRATION_DAYS).toISOString();
    const appUrl = getAppUrl(request);
    const consentimientoUrl = `${appUrl}/consentimiento/${token}`;
    const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.trim();

    const payload = {
      cliente_id: cliente.id,
      factura_ids: facturaIds,
      cedula: cliente.cedula,
      nombre: nombreCompleto,
      correo: cliente.correo,
      telefono: cliente.telefono,
      token,
      token_expira_at: expiresAt,
      correo_enviado_at: null,
      updated_at: now.toISOString(),
    };

    const saveQuery = existing
      ? supabase.from('formularios_consentimiento').update(payload).eq('id', existing.id)
      : supabase.from('formularios_consentimiento').insert(payload);

    const { error: saveError } = await saveQuery;
    if (saveError) throw saveError;

    const transporter = buildMailTransport(config);
    await transporter.sendMail({
      from: `"${config.nombre_remitente}" <${config.correo_remitente}>`,
      to: cliente.correo,
      replyTo: config.responder_a ?? config.correo_remitente,
      subject: config.asunto_prueba || 'Confirma tus preferencias de comunicación',
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
          <p>Hola ${nombreCompleto},</p>
          <p>Para completar tu registro, revisa y confirma tus preferencias en el siguiente enlace:</p>
          <p>
            <a href="${consentimientoUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none;">
              Completar formulario
            </a>
          </p>
          <p>Este enlace estará disponible durante ${EXPIRATION_DAYS} días.</p>
        </div>
      `,
      text: `Hola ${nombreCompleto}, completa el formulario en: ${consentimientoUrl}. Este enlace vence en ${EXPIRATION_DAYS} días.`,
    });

    const { error: sentError } = await supabase
      .from('formularios_consentimiento')
      .update({
        correo_enviado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('token', token);

    if (sentError) throw sentError;

    return response.status(200).json({ sent: true });
  } catch (error) {
    return response.status(500).json({ message: 'No se pudo enviar el consentimiento' });
  }
}
