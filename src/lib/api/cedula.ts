export interface DatosCedula {
  cedula?: string;
  nombre?: string;
  genero?: string;
  lugarDomicilio?: string;
  calleDomicilio?: string;
  numeracionDomicilio?: string;
}

const consultaCedulaUrl = (import.meta.env.VITE_CONSULTA_CEDULA_URL as string | undefined) ?? '/api/consulta-cedula';

export async function consultarCedula(cedula: string): Promise<DatosCedula | null> {
  if (!consultaCedulaUrl) {
    throw new Error('ConsultaCedulaConfigMissing');
  }

  const url = new URL(consultaCedulaUrl, window.location.origin);
  url.searchParams.set('Cedula', cedula);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('ConsultaCedulaRequestFailed');
  }

  const data = (await response.json()) as DatosCedula | { data?: DatosCedula } | null;
  if (!data) return null;

  return 'data' in data ? data.data ?? null : data;
}
