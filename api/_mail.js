import nodemailer from 'nodemailer';

export function buildMailTransport(config) {
  return nodemailer.createTransport({
    host: config.host_smtp,
    port: Number(config.puerto_smtp),
    secure: config.seguridad === 'ssl',
    auth: {
      user: config.usuario_smtp,
      pass: config.password_smtp,
    },
    requireTLS: config.seguridad === 'tls',
  });
}

async function getGraphToken(config) {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.ms_client_id,
    client_secret: config.ms_client_secret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${config.ms_tenant_id}/oauth2/v2.0/token`,
    { method: 'POST', body: params }
  );

  const data = await res.json();

  if (!res.ok) {
    const err = Object.assign(
      new Error(data.error_description || data.error || 'No se pudo obtener token de Microsoft'),
      { graphError: data, status: res.status, code: 'GRAPH_AUTH' }
    );
    throw err;
  }

  return data.access_token;
}

async function sendMailGraph(config, { to, replyTo, subject, html, text }) {
  const token = await getGraphToken(config);

  const message = {
    message: {
      subject,
      body: { contentType: 'HTML', content: html || text || '' },
      toRecipients: [{ emailAddress: { address: to } }],
      from: {
        emailAddress: { name: config.nombre_remitente, address: config.correo_remitente },
      },
      ...(replyTo
        ? { replyTo: [{ emailAddress: { address: replyTo } }] }
        : {}),
    },
    saveToSentItems: false,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.correo_remitente)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    }
  );

  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch { /* vacío */ }
    const err = Object.assign(
      new Error(body?.error?.message || 'Error al enviar correo por Microsoft Graph'),
      { graphError: body, status: res.status, code: 'GRAPH_SEND' }
    );
    throw err;
  }
}

export async function sendMail(config, { from, to, replyTo, subject, html, text }) {
  if (config.tipo_envio === 'graph') {
    return sendMailGraph(config, { to, replyTo, subject, html, text });
  }

  const transporter = buildMailTransport(config);
  return transporter.sendMail({ from, to, replyTo, subject, html, text });
}
