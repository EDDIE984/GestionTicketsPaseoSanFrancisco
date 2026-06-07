import { createServerSupabase } from './_supabase.js';
import { buildMailTransport, sendMail } from './_mail.js';

function getErrorHint(error) {
  const code = error?.code;
  const responseCode = error?.responseCode;
  const status = error?.status;

  if (code === 'GRAPH_AUTH') {
    return 'No se pudo autenticar con Microsoft 365. Verifica el Tenant ID, Client ID y Client Secret.';
  }
  if (code === 'GRAPH_SEND') {
    if (status === 403) return 'La aplicación no tiene permiso Mail.Send o el consentimiento del administrador no fue concedido.';
    if (status === 404) return 'El correo remitente no existe en el tenant de Microsoft 365.';
    return 'Error al enviar por Microsoft Graph. Revisa las credenciales y permisos configurados.';
  }
  if (code === 'EAUTH' || responseCode === 535) {
    return 'Revisa el usuario SMTP, la contraseña o si tu proveedor requiere una contraseña de aplicación.';
  }
  if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || code === 'ESOCKET') {
    return 'No se pudo conectar al servidor SMTP. Revisa host, puerto, SSL/TLS y reglas de firewall.';
  }
  if (code === 'EENVELOPE' || responseCode === 550 || responseCode === 553) {
    return 'El servidor rechazó el remitente o destinatario. Revisa los correos configurados.';
  }
  if (responseCode === 530 || responseCode === 534) {
    return 'El servidor requiere autenticación o una configuración de seguridad diferente.';
  }

  return 'Revisa los datos de correo configurados y vuelve a intentar.';
}

function serializeError(error, phase) {
  return {
    phase,
    message: error?.message ?? 'Error desconocido al enviar el correo de prueba',
    code: error?.code ?? null,
    command: error?.command ?? null,
    responseCode: error?.responseCode ?? null,
    smtpResponse: error?.response ?? null,
    errno: error?.errno ?? null,
    syscall: error?.syscall ?? null,
    address: error?.address ?? null,
    port: error?.port ?? null,
    status: error?.status ?? null,
    name: error?.name ?? null,
    raw: error?.graphError ? JSON.stringify(error.graphError) : null,
    hint: getErrorHint(error),
  };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed' });
  }

  const { destinatario } = request.body ?? {};
  if (!destinatario) {
    return response.status(400).json({ message: 'Ingresa un correo destinatario para la prueba' });
  }

  let phase = 'Inicializando prueba';

  try {
    phase = 'Conectando con Supabase';
    const supabase = createServerSupabase();
    phase = 'Consultando parametrización activa';
    const { data: config, error } = await supabase
      .from('parametrizaciones_correo')
      .select('*')
      .eq('activo', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!config) {
      return response.status(400).json({
        message: 'No existe parametrización de correo activa',
        detail: {
          phase,
          hint: 'Guarda una parametrización marcada como activa antes de probar el envío.',
        },
      });
    }

    if (config.tipo_envio === 'smtp') {
      phase = `Verificando conexión SMTP ${config.host_smtp}:${config.puerto_smtp}`;
      const transporter = buildMailTransport(config);
      await transporter.verify();
    }

    phase = `Enviando correo de prueba a ${destinatario}`;
    await sendMail(config, {
      from: `"${config.nombre_remitente}" <${config.correo_remitente}>`,
      to: destinatario,
      replyTo: config.responder_a ?? config.correo_remitente,
      subject: config.asunto_prueba || 'Correo de prueba del sistema de tickets',
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
          <p>Esta es una prueba de envío de correo.</p>
          <p>Si recibiste este mensaje, la configuración de correo está funcionando correctamente.</p>
        </div>
      `,
      text: 'Esta es una prueba de envío de correo. Si recibiste este mensaje, la configuración de correo está funcionando correctamente.',
    });

    return response.status(200).json({ sent: true, message: `Correo de prueba enviado a ${destinatario}` });
  } catch (error) {
    console.error('Error en prueba de correo', error);
    const detail = serializeError(error, phase);
    return response.status(500).json({
      message: 'No se pudo enviar el correo de prueba',
      detail,
    });
  }
}
