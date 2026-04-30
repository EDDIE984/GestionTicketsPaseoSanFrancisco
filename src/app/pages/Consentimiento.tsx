import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { fetchConsentimiento, guardarConsentimiento, type ConsentimientoPublico } from '@/lib/api/consentimientos';

const POLITICA_URL =
  'https://paseosanfrancisco.ec/wp-content/uploads/2026/03/politica-tratamiento-datos-paseo-act-1.pdf';

export function Consentimiento() {
  const { token } = useParams();
  const [data, setData] = useState<ConsentimientoPublico | null>(null);
  const [aceptaPublicidad, setAceptaPublicidad] = useState(true);
  const [aceptaProteccionDatos, setAceptaProteccionDatos] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      if (!token) {
        setError('Enlace inválido');
        setCargando(false);
        return;
      }

      try {
        const consentimiento = await fetchConsentimiento(token);
        setData(consentimiento);
        setAceptaPublicidad(consentimiento.acepta_publicidad ?? true);
        setAceptaProteccionDatos(consentimiento.acepta_proteccion_datos ?? true);
        setGuardado(Boolean(consentimiento.fecha_aceptacion));
      } catch (err) {
        const status = err instanceof Error ? err.message : '';
        setError(status === '410' ? 'Este enlace expiró.' : 'No pudimos cargar el formulario.');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [token]);

  const enviar = async () => {
    if (!token) return;
    if (!aceptaProteccionDatos) {
      setError('Debes aceptar la política de protección de datos para continuar.');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      await guardarConsentimiento(token, aceptaPublicidad, aceptaProteccionDatos);
      setGuardado(true);
    } catch {
      setError('No pudimos guardar tu aceptación. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-3 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Protección de datos</h1>
            <p className="text-sm text-slate-600">Paseo San Francisco</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Confirmación de preferencias</CardTitle>
            <CardDescription>
              Revisa tus datos y confirma la autorización para completar el registro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {cargando && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-5 text-slate-700">
                <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
                Cargando formulario...
              </div>
            )}

            {!cargando && error && !data && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {data && (
              <>
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-slate-500">Nombre</p>
                    <p className="font-medium text-slate-900">{data.nombre}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Correo</p>
                    <p className="font-medium text-slate-900">{data.correo}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Teléfono</p>
                    <p className="font-medium text-slate-900">{data.telefono || 'No registrado'}</p>
                  </div>
                </div>

                {guardado ? (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    Tu aceptación fue registrada correctamente.
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                        <Checkbox
                          id="publicidad"
                          checked={aceptaPublicidad}
                          onCheckedChange={(checked) => setAceptaPublicidad(Boolean(checked))}
                        />
                        <Label htmlFor="publicidad" className="cursor-pointer leading-relaxed text-slate-800">
                          Acepto recibir material publicitario relacionado con productos y servicios relevantes de terceros,
                          por e-mail (opcional)
                        </Label>
                      </div>

                      <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                        <Checkbox
                          id="proteccionDatos"
                          checked={aceptaProteccionDatos}
                          onCheckedChange={(checked) => setAceptaProteccionDatos(Boolean(checked))}
                        />
                        <Label htmlFor="proteccionDatos" className="cursor-pointer leading-relaxed text-slate-800">
                          He leído y acepto la política de protección de datos
                        </Label>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-3">
                        <a
                          href={POLITICA_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                          Ver política
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <a
                          href={POLITICA_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                          Abrir documento
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      <Button onClick={enviar} disabled={guardando || !aceptaProteccionDatos}>
                        {guardando && <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />}
                        Enviar aceptación
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
