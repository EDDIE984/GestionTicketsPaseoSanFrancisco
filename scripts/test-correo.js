import fs from 'node:fs';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { buildMailTransport } from '../api/_mail.js';

function loadDotEnv() {
  if (!fs.existsSync('.env')) return;

  const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function serializeError(error) {
  return {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    command: error?.command,
    responseCode: error?.responseCode,
    response: error?.response,
    errno: error?.errno,
    syscall: error?.syscall,
    address: error?.address,
    port: error?.port,
  };
}

function getDestinatario() {
  const cliValue = process.argv[2];
  return cliValue || process.env.CORREO_PRUEBA || '';
}

async function main() {
  loadDotEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const destinatario = getDestinatario();

  if (!supabaseUrl) {
    throw new Error('Falta SUPABASE_URL o VITE_SUPABASE_URL en .env');
  }

  if (!serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env');
  }

  if (!destinatario) {
    throw new Error('Indica el destinatario: npm run test:correo -- correo@dominio.com');
  }

  console.log('Consultando parametrización activa...');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: config, error } = await supabase
    .from('parametrizaciones_correo')
    .select('*')
    .eq('activo', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!config) {
    throw new Error('No existe parametrización de correo activa');
  }

  console.log(`SMTP: ${config.host_smtp}:${config.puerto_smtp} (${config.seguridad})`);
  console.log(`Remitente: ${config.nombre_remitente} <${config.correo_remitente}>`);
  console.log(`Destinatario: ${destinatario}`);

  const transporter = buildMailTransport(config);

  console.log('Verificando conexión SMTP...');
  await transporter.verify();

  console.log('Enviando correo de prueba...');
  const info = await transporter.sendMail({
    from: `"${config.nombre_remitente}" <${config.correo_remitente}>`,
    to: destinatario,
    replyTo: config.responder_a ?? config.correo_remitente,
    subject: config.asunto_prueba || 'Correo de prueba del sistema de tickets',
    html: '<p>Esta es una prueba de envío de correo desde el sistema de tickets.</p>',
    text: 'Esta es una prueba de envío de correo desde el sistema de tickets.',
  });

  console.log('Correo enviado correctamente.');
  console.log(`Message ID: ${info.messageId}`);
}

main().catch((error) => {
  console.error('No se pudo enviar el correo de prueba.');
  console.error(JSON.stringify(serializeError(error), null, 2));
  process.exit(1);
});
