import { createClient } from '@supabase/supabase-js';

export function createServerSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getAppUrl(request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');

  const host = request.headers['x-forwarded-host'] ?? request.headers.host;
  const protocol = request.headers['x-forwarded-proto'] ?? 'http';
  return `${protocol}://${host}`;
}
