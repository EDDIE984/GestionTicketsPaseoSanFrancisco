import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '../api/_mail.js';

function loadEnv() {
  return Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, ''),
        ];
      })
  );
}

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: config, error } = await supabase
  .from('parametrizaciones_correo')
  .select('*')
  .eq('activo', true)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (error) throw error;
if (!config) throw new Error('No existe parametrización de correo activa');

const destinatario = config.responder_a || config.correo_remitente;
console.log(JSON.stringify({
  tipo_envio: config.tipo_envio,
  correo_remitente: config.correo_remitente,
  destinatario_prueba: destinatario,
  tenant_configurado: Boolean(config.ms_tenant_id),
  client_id_configurado: Boolean(config.ms_client_id),
  client_secret_configurado: Boolean(config.ms_client_secret),
}, null, 2));

await sendMail(config, {
  from: `"${config.nombre_remitente}" <${config.correo_remitente}>`,
  to: destinatario,
  replyTo: config.responder_a ?? config.correo_remitente,
  subject: 'Validación de configuración de correo',
  html: '<p>La configuración activa de correo del sistema fue validada correctamente.</p>',
  text: 'La configuración activa de correo del sistema fue validada correctamente.',
});

console.log('Correo de validación enviado correctamente.');
