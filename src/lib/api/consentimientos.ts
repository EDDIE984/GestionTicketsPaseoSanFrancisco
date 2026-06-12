export interface ConsentimientoPublico {
  token: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  token_expira_at: string;
  fecha_aceptacion: string | null;
  acepta_publicidad: boolean;
  acepta_proteccion_datos: boolean;
}

export async function enviarConsentimientoCliente(clienteId: string, facturaIds: string[]) {
  const response = await fetch('/api/enviar-consentimiento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clienteId, facturaIds }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail?.hint || data.message || 'No se pudo enviar el correo de consentimiento');
  }

  return response.json() as Promise<{ sent?: boolean; skipped?: boolean; reason?: string }>;
}

export async function fetchConsentimiento(token: string): Promise<ConsentimientoPublico> {
  const response = await fetch(`/api/consentimiento?token=${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw new Error(String(response.status));
  }
  return response.json();
}

export async function guardarConsentimiento(
  token: string,
  aceptaPublicidad: boolean,
  aceptaProteccionDatos: boolean
) {
  const response = await fetch('/api/consentimiento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, aceptaPublicidad, aceptaProteccionDatos }),
  });

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  return response.json();
}
