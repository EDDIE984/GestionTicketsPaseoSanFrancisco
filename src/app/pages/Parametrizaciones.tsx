import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Info, LoaderCircle, Mail, Save } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Textarea } from '@/app/components/ui/textarea';
import {
  fetchParametrizacionCorreo,
  ProbarCorreoError,
  probarParametrizacionCorreo,
  saveParametrizacionCorreo,
} from '@/lib/api/parametrizaciones';
import type { ParametrizacionCorreo } from '@/lib/types';

type ParametrizacionCorreoForm = Omit<ParametrizacionCorreo, 'id' | 'updated_at'>;

const emptyForm: ParametrizacionCorreoForm = {
  nombre_remitente: '',
  correo_remitente: '',
  tipo_envio: 'smtp',
  host_smtp: '',
  puerto_smtp: 587,
  usuario_smtp: '',
  password_smtp: '',
  seguridad: 'tls',
  ms_tenant_id: '',
  ms_client_id: '',
  ms_client_secret: '',
  responder_a: '',
  asunto_prueba: '',
  activo: true,
};

function ManualGraph() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-blue-800"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          ¿Cómo obtener las credenciales de Microsoft 365?
        </span>
        {abierto ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>

      {abierto && (
        <div className="border-t border-blue-200 px-4 pb-4 pt-3 text-sm text-blue-900">
          <ol className="space-y-4 list-none">
            <li>
              <p className="font-semibold">Paso 1 — Registrar la aplicación en Azure</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-blue-800">
                <li>Ingresa a <strong>portal.azure.com</strong> con una cuenta administradora</li>
                <li>Ve a <strong>Azure Active Directory → Registros de aplicaciones → Nueva aplicación</strong></li>
                <li>Escribe un nombre (ej. "Sistema de Tickets Correo") y haz clic en <strong>Registrar</strong></li>
                <li>Copia el <strong>Tenant ID</strong> (ID de directorio) y el <strong>Client ID</strong> (ID de aplicación) que aparecen en la pantalla de información general</li>
              </ul>
            </li>

            <li>
              <p className="font-semibold">Paso 2 — Asignar el permiso de envío</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-blue-800">
                <li>En la aplicación creada: <strong>Permisos de API → Agregar permiso → Microsoft Graph → Permisos de aplicación</strong></li>
                <li>Busca y selecciona <strong>Mail.Send</strong> → Agregar permiso</li>
                <li>Haz clic en <strong>"Conceder consentimiento de administrador"</strong> y confirma</li>
              </ul>
            </li>

            <li>
              <p className="font-semibold">Paso 3 — Crear el secreto de cliente</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-blue-800">
                <li>En la aplicación: <strong>Certificados y secretos → Secretos de cliente → Nuevo secreto de cliente</strong></li>
                <li>Anota el secreto <strong>inmediatamente</strong> — solo se muestra una vez</li>
                <li>Este valor es el <strong>Client Secret</strong> que ingresarás en el formulario</li>
              </ul>
            </li>

            <li>
              <p className="font-semibold">Paso 4 — Configurar aquí</p>
              <ul className="mt-1 ml-4 space-y-1 list-disc text-blue-800">
                <li>Ingresa el Tenant ID, Client ID y Client Secret obtenidos en los pasos anteriores</li>
                <li>El campo <strong>"Correo remitente"</strong> debe ser la cuenta exacta de Microsoft 365 desde la que se enviarán los correos</li>
              </ul>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

export function Parametrizaciones() {
  const navigate = useNavigate();
  const [parametrizacionId, setParametrizacionId] = useState<string | undefined>();
  const [form, setForm] = useState<ParametrizacionCorreoForm>(emptyForm);
  const [correoPrueba, setCorreoPrueba] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [ultimoErrorPrueba, setUltimoErrorPrueba] = useState('');

  useEffect(() => {
    const cargarParametrizacion = async () => {
      try {
        const data = await fetchParametrizacionCorreo();
        if (data) {
          setParametrizacionId(data.id);
          setForm({
            nombre_remitente: data.nombre_remitente,
            correo_remitente: data.correo_remitente,
            tipo_envio: data.tipo_envio ?? 'smtp',
            host_smtp: data.host_smtp ?? '',
            puerto_smtp: data.puerto_smtp,
            usuario_smtp: data.usuario_smtp ?? '',
            password_smtp: data.password_smtp ?? '',
            seguridad: data.seguridad,
            ms_tenant_id: data.ms_tenant_id ?? '',
            ms_client_id: data.ms_client_id ?? '',
            ms_client_secret: data.ms_client_secret ?? '',
            responder_a: data.responder_a ?? '',
            asunto_prueba: data.asunto_prueba ?? '',
            activo: data.activo,
          });
          setCorreoPrueba(data.responder_a ?? data.correo_remitente);
        }
      } catch {
        toast.error('Error al cargar la parametrización de correo');
      } finally {
        setCargando(false);
      }
    };

    cargarParametrizacion();
  }, []);

  const actualizarCampo = <K extends keyof ParametrizacionCorreoForm>(
    field: K,
    value: ParametrizacionCorreoForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validarFormulario = () => {
    if (!form.nombre_remitente.trim()) return 'Ingresa el nombre del remitente';
    if (!form.correo_remitente.trim()) return 'Ingresa el correo remitente';

    if (form.tipo_envio === 'smtp') {
      if (!form.host_smtp?.trim()) return 'Ingresa el servidor SMTP';
      if (!form.usuario_smtp?.trim()) return 'Ingresa el usuario SMTP';
      if (!form.password_smtp?.trim()) return 'Ingresa la contraseña SMTP';
      if (!form.puerto_smtp || form.puerto_smtp <= 0) return 'Ingresa un puerto SMTP válido';
    } else {
      if (!form.ms_tenant_id?.trim()) return 'Ingresa el Tenant ID de Microsoft 365';
      if (!form.ms_client_id?.trim()) return 'Ingresa el Client ID de Microsoft 365';
      if (!form.ms_client_secret?.trim()) return 'Ingresa el Client Secret de Microsoft 365';
    }

    return null;
  };

  const guardarParametrizacion = async () => {
    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      const saved = await saveParametrizacionCorreo(form, parametrizacionId);
      setParametrizacionId(saved.id);
      toast.success('Parametrización de correo guardada');
    } catch {
      toast.error('Error al guardar la parametrización de correo');
    } finally {
      setGuardando(false);
    }
  };

  const probarCorreo = async () => {
    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    if (!correoPrueba.trim()) {
      toast.error('Ingresa el correo destinatario de la prueba');
      return;
    }

    setProbando(true);
    setUltimoErrorPrueba('');
    try {
      const saved = await saveParametrizacionCorreo(form, parametrizacionId);
      setParametrizacionId(saved.id);
      const result = await probarParametrizacionCorreo(correoPrueba.trim());
      toast.success(result.message || 'Correo de prueba enviado correctamente');
    } catch (error) {
      if (error instanceof ProbarCorreoError && error.detail) {
        const partes = [
          error.detail.phase ? `Fase: ${error.detail.phase}` : null,
          error.detail.hint,
          error.detail.message ? `Detalle: ${error.detail.message}` : null,
          error.detail.code ? `Código: ${error.detail.code}` : null,
          error.detail.command ? `Comando: ${error.detail.command}` : null,
          error.detail.responseCode ? `SMTP: ${error.detail.responseCode}` : null,
          error.detail.smtpResponse ? `Respuesta: ${error.detail.smtpResponse}` : null,
          error.detail.status ? `HTTP: ${error.detail.status}` : null,
          error.detail.errno ? `Errno: ${error.detail.errno}` : null,
          error.detail.syscall ? `Syscall: ${error.detail.syscall}` : null,
          error.detail.address ? `Dirección: ${error.detail.address}` : null,
          error.detail.port ? `Puerto: ${error.detail.port}` : null,
          error.detail.raw && !error.detail.message ? `Respuesta cruda: ${error.detail.raw}` : null,
        ].filter(Boolean);
        const detalle = partes.join(' | ');

        toast.error(error.message, {
          description: detalle,
          duration: 10000,
        });
        setUltimoErrorPrueba(`${error.message}${detalle ? `: ${detalle}` : ''}`);
      } else {
        const mensaje = error instanceof Error ? error.message : 'No se pudo enviar el correo de prueba';
        toast.error(mensaje);
        setUltimoErrorPrueba(mensaje);
      }
    } finally {
      setProbando(false);
    }
  };

  const procesando = cargando || guardando || probando;

  return (
    <div className="p-8">
      {procesando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-slate-200">
            <div className="h-full w-1/3 animate-[pulse_1.1s_ease-in-out_infinite] bg-blue-600" />
          </div>
          <div className="flex min-w-64 items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-lg">
            <LoaderCircle className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-800">
              {probando
                ? 'Enviando correo de prueba...'
                : guardando
                  ? 'Guardando parametrización...'
                  : 'Cargando parametrización...'}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/configuracion')}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Configuración
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl text-gray-900">Parametrizaciones</h1>
          <p className="text-gray-600">Configura los datos que el sistema utilizará para enviar correos.</p>
        </div>
        <div className="hidden rounded-lg bg-blue-50 p-3 text-blue-600 md:block">
          <Mail className="h-6 w-6" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Envío de correo</CardTitle>
          <CardDescription>
            Método y datos del remitente predeterminado para los envíos del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Selector de método */}
          <div className="space-y-1.5">
            <Label htmlFor="tipoEnvio">Método de envío *</Label>
            <Select
              value={form.tipo_envio}
              onValueChange={(value) => actualizarCampo('tipo_envio', value as ParametrizacionCorreoForm['tipo_envio'])}
            >
              <SelectTrigger id="tipoEnvio">
                <SelectValue placeholder="Selecciona el método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smtp">SMTP (servidor de correo tradicional)</SelectItem>
                <SelectItem value="graph">Microsoft 365 (Graph API)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Manual colapsable solo en modo Graph */}
          {form.tipo_envio === 'graph' && <ManualGraph />}

          {/* Campos comunes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombreRemitente">Nombre remitente *</Label>
              <Input
                id="nombreRemitente"
                value={form.nombre_remitente}
                onChange={(e) => actualizarCampo('nombre_remitente', e.target.value)}
                placeholder="Paseo San Francisco"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="correoRemitente">Correo remitente *</Label>
              <Input
                id="correoRemitente"
                type="email"
                value={form.correo_remitente}
                onChange={(e) => actualizarCampo('correo_remitente', e.target.value)}
                placeholder="notificaciones@empresa.com"
              />
            </div>
          </div>

          {/* Campos SMTP */}
          {form.tipo_envio === 'smtp' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hostSmtp">Servidor SMTP *</Label>
                <Input
                  id="hostSmtp"
                  value={form.host_smtp ?? ''}
                  onChange={(e) => actualizarCampo('host_smtp', e.target.value)}
                  placeholder="smtp.empresa.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="puertoSmtp">Puerto SMTP *</Label>
                <Input
                  id="puertoSmtp"
                  type="number"
                  min="1"
                  value={form.puerto_smtp}
                  onChange={(e) => actualizarCampo('puerto_smtp', Number(e.target.value))}
                  placeholder="587"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usuarioSmtp">Usuario SMTP *</Label>
                <Input
                  id="usuarioSmtp"
                  value={form.usuario_smtp ?? ''}
                  onChange={(e) => actualizarCampo('usuario_smtp', e.target.value)}
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passwordSmtp">Contraseña SMTP *</Label>
                <Input
                  id="passwordSmtp"
                  type="password"
                  value={form.password_smtp ?? ''}
                  onChange={(e) => actualizarCampo('password_smtp', e.target.value)}
                  placeholder="Contraseña o app password"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="seguridadCorreo">Seguridad</Label>
                <Select
                  value={form.seguridad}
                  onValueChange={(value) => actualizarCampo('seguridad', value as ParametrizacionCorreoForm['seguridad'])}
                >
                  <SelectTrigger id="seguridadCorreo">
                    <SelectValue placeholder="Selecciona seguridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS / STARTTLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">Sin seguridad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Campos Microsoft Graph */}
          {form.tipo_envio === 'graph' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="msTenantId">Tenant ID *</Label>
                <Input
                  id="msTenantId"
                  value={form.ms_tenant_id ?? ''}
                  onChange={(e) => actualizarCampo('ms_tenant_id', e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="msClientId">Client ID *</Label>
                <Input
                  id="msClientId"
                  value={form.ms_client_id ?? ''}
                  onChange={(e) => actualizarCampo('ms_client_id', e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="msClientSecret">Client Secret *</Label>
                <Input
                  id="msClientSecret"
                  type="password"
                  value={form.ms_client_secret ?? ''}
                  onChange={(e) => actualizarCampo('ms_client_secret', e.target.value)}
                  placeholder="Secreto de cliente generado en Azure"
                />
              </div>
            </div>
          )}

          {/* Campos opcionales comunes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="responderA">Responder a</Label>
              <Input
                id="responderA"
                type="email"
                value={form.responder_a ?? ''}
                onChange={(e) => actualizarCampo('responder_a', e.target.value)}
                placeholder="soporte@empresa.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asuntoPrueba">Asunto de prueba</Label>
            <Textarea
              id="asuntoPrueba"
              value={form.asunto_prueba ?? ''}
              onChange={(e) => actualizarCampo('asunto_prueba', e.target.value)}
              placeholder="Correo de prueba del sistema de tickets"
              className="min-h-20"
            />
          </div>

          {/* Sección probar correo */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="correoPrueba">Correo para prueba</Label>
                <Input
                  id="correoPrueba"
                  type="email"
                  value={correoPrueba}
                  onChange={(e) => setCorreoPrueba(e.target.value)}
                  placeholder="destinatario@empresa.com"
                />
              </div>
              <Button type="button" variant="outline" onClick={probarCorreo} disabled={procesando}>
                {probando ? (
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-5 w-5" />
                )}
                {probando ? 'Probando...' : 'Probar correo'}
              </Button>
            </div>
            {ultimoErrorPrueba && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <p className="font-medium">Detalle del error de prueba</p>
                <p className="mt-1 break-words">{ultimoErrorPrueba}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <Switch
              id="activoCorreo"
              checked={form.activo}
              onCheckedChange={(checked) => actualizarCampo('activo', checked)}
            />
            <Label htmlFor="activoCorreo" className="cursor-pointer">
              Configuración activa
            </Label>
          </div>

          <div className="flex justify-end border-t border-gray-200 pt-4">
            <Button onClick={guardarParametrizacion} disabled={procesando}>
              {guardando ? (
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              {guardando ? 'Guardando...' : 'Guardar parametrización'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
