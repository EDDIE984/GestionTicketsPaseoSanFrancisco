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
  const [aceptaPublicidad, setAceptaPublicidad] = useState(false);
  const aceptaProteccionDatos = true;
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [preferenciasGuardadas, setPreferenciasGuardadas] = useState<{
    aceptaPublicidad: boolean;
    aceptaProteccionDatos: boolean;
  } | null>(null);

  const hayCambiosSinGuardar = Boolean(
    guardado &&
    preferenciasGuardadas &&
    aceptaPublicidad !== preferenciasGuardadas.aceptaPublicidad
  );

  useEffect(() => {
    const cargar = async () => {
      if (!token) {
        setError('Enlace inválido');
        setCargando(false);
        return;
      }

      try {
        const consentimiento = await fetchConsentimiento(token);
        const yaFueGuardado = Boolean(consentimiento.fecha_aceptacion);
        setData(consentimiento);
        setAceptaPublicidad(yaFueGuardado ? Boolean(consentimiento.acepta_publicidad) : false);
        setGuardado(yaFueGuardado);
        setPreferenciasGuardadas(yaFueGuardado
          ? {
              aceptaPublicidad: Boolean(consentimiento.acepta_publicidad),
              aceptaProteccionDatos: true,
            }
          : null);
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

    setError('');
    setGuardando(true);
    try {
      await guardarConsentimiento(token, aceptaPublicidad, aceptaProteccionDatos);
      setGuardado(true);
      setPreferenciasGuardadas({ aceptaPublicidad, aceptaProteccionDatos });
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
              Revisa tus datos y confirma el consentimiento para completar el registro.
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
                  <div className="min-w-0">
                    <p className="text-slate-500">Nombre</p>
                    <p className="break-words font-medium text-slate-900">{data.nombre}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500">Correo</p>
                    <p className="break-all font-medium text-slate-900">{data.correo}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500">Teléfono</p>
                    <p className="break-words font-medium text-slate-900">{data.telefono || 'No registrado'}</p>
                  </div>
                </div>

                {guardado && !hayCambiosSinGuardar && (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    Tus preferencias se guardaron correctamente. No necesitas realizar ninguna otra acción.
                  </div>
                )}

                {hayCambiosSinGuardar && (
                  <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-800">
                    Tienes cambios sin guardar. Guarda nuevamente para actualizar tus preferencias.
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                    <Checkbox
                      id="publicidad"
                      checked={aceptaPublicidad}
                      onCheckedChange={(checked) => setAceptaPublicidad(Boolean(checked))}
                    />
                    <Label htmlFor="publicidad" className="cursor-pointer leading-relaxed text-slate-800">
                      Acepto recibir material publicitario sobre productos y servicios, y autorizo que se realicen
                      procesos de perfilamiento sobre mis datos para el envío de publicidad personalizada.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                    <Checkbox
                      id="proteccionDatos"
                      checked
                      disabled
                      aria-readonly="true"
                    />
                    <div className="space-y-3">
                      <Label htmlFor="proteccionDatos" className="cursor-default leading-relaxed text-slate-800">
                        He leído y acepto la política de protección de datos
                      </Label>
                      <p className="text-xs text-slate-500">Esta aceptación es obligatoria para completar el registro y no puede modificarse.</p>
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
                          Ver consentimiento
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <Button onClick={enviar} disabled={guardando || (guardado && !hayCambiosSinGuardar)}>
                    {guardando && <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />}
                    {guardado
                      ? hayCambiosSinGuardar
                        ? 'Guardar cambios'
                        : 'Preferencias guardadas'
                      : 'Enviar aceptación'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
