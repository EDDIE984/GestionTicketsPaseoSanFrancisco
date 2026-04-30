export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed' });
  }

  const cedulaParam = request.query.Cedula ?? request.query.cedula;
  const cedula = Array.isArray(cedulaParam) ? cedulaParam[0] : cedulaParam;

  if (!cedula) {
    return response.status(400).json({ message: 'Cedula is required' });
  }

  const consultaCedulaUrl =
    process.env.CONSULTA_CEDULA_URL ??
    'http://nessoftfact-001-site6.atempurl.com/api/ConsultasDatos/ConsultaCedulaV2';
  const consultaCedulaApiKey = process.env.CONSULTA_CEDULA_API_KEY;

  if (!consultaCedulaUrl || !consultaCedulaApiKey) {
    return response.status(500).json({ message: 'Consulta cedula API is not configured' });
  }

  try {
    const url = new URL(consultaCedulaUrl);
    url.searchParams.set('Cedula', cedula);
    url.searchParams.set('Apikey', consultaCedulaApiKey);

    const apiResponse = await fetch(url.toString());
    const text = await apiResponse.text();
    const contentType = apiResponse.headers.get('content-type') ?? 'application/json';

    response.setHeader('Content-Type', contentType);
    return response.status(apiResponse.status).send(text);
  } catch {
    return response.status(502).json({ message: 'No se pudo consultar la cedula' });
  }
}
