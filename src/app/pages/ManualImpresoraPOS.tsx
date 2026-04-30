import { ArrowLeft, CheckCircle2, Download, Monitor, Printer, RefreshCcw, Settings, ShieldCheck, Terminal, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

const pasosMac = [
  'Conecta la Epson TM-T20 por USB y enciéndela.',
  'Instala la impresora en macOS desde Ajustes del Sistema > Impresoras y escáneres.',
  'Confirma que el nombre de la impresora sea EPSON_TM_T20III.',
  'Desde Configuración > Impresora POS descarga el instalador para macOS.',
  'Abre el archivo .dmg y ejecuta Instalar.command.',
  'Regresa a Configuración > Impresora POS y presiona Actualizar.',
  'Presiona Ticket de prueba y confirma que la impresora corte el papel.',
];

const pasosWindows = [
  'Conecta la impresora POS por USB y enciéndela.',
  'Instala el driver de la Epson desde Windows.',
  'Verifica en Impresoras y escáneres que la impresora aparezca instalada.',
  'Descarga el instalador para Windows desde Configuración > Impresora POS.',
  'Ejecuta el archivo .exe y acepta la instalación.',
  'Regresa al sistema y presiona Actualizar en Impresora POS.',
  'Presiona Ticket de prueba y valida la impresión.',
];

const problemas = [
  {
    titulo: 'La consola aparece como No detectada',
    detalle: 'El conector local no está instalado o no está corriendo. Reinicia la computadora y vuelve a entrar a Impresora POS.',
  },
  {
    titulo: 'Token inválido o ausente',
    detalle: 'El instalador y el sistema no tienen el mismo token. Reinstala el conector usando el instalador vigente publicado en el sistema.',
  },
  {
    titulo: 'La cola recibe tickets pero no imprime',
    detalle: 'Revisa que la Epson esté encendida, con papel, sin error físico y configurada con el nombre correcto.',
  },
  {
    titulo: 'El ticket sale con símbolos extraños',
    detalle: 'La impresora no está recibiendo el trabajo como RAW/ESC-POS. Revisa el driver o reinstala la impresora.',
  },
];

function Paso({ index, text }: { index: number; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
        {index}
      </span>
      <span className="pt-1 text-sm leading-6 text-slate-700">{text}</span>
    </li>
  );
}

export function ManualImpresoraPOS() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/configuracion/impresora-pos')}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Impresora POS
      </button>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
              Manual operativo
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              Epson POS
            </Badge>
          </div>
          <h1 className="mb-2 text-3xl text-gray-900">Instalación y configuración de impresoras</h1>
          <p className="max-w-3xl text-gray-600">
            Guía para preparar cada computadora que emitirá tickets desde el sistema.
          </p>
        </div>
        <div className="hidden rounded-lg bg-slate-950 p-4 text-white lg:block">
          <Printer className="h-7 w-7" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              macOS
            </CardTitle>
            <CardDescription>Instalación recomendada para cajas Mac.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {pasosMac.map((paso, index) => (
                <Paso key={paso} index={index + 1} text={paso} />
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Windows
            </CardTitle>
            <CardDescription>Instalación recomendada para cajas Windows.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {pasosWindows.map((paso, index) => (
                <Paso key={paso} index={index + 1} text={paso} />
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Validación final
            </CardTitle>
            <CardDescription>Antes de entregar la caja al usuario, confirma estos puntos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Conector activo', 'La pantalla Impresora POS debe mostrar estado Conectada.'],
              ['Seguridad activa', 'Debe indicar Token local activo.'],
              ['Cola sin errores', 'Pendientes, Imprimiendo y Errores deben estar en cero antes de iniciar operación.'],
              ['Ticket de prueba', 'Debe imprimir y cortar un ticket desde el botón Ticket de prueba.'],
            ].map(([titulo, detalle]) => (
              <div key={titulo} className="flex gap-3 rounded-lg border bg-white p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-medium text-slate-900">{titulo}</p>
                  <p className="text-sm text-slate-600">{detalle}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5" />
              Errores frecuentes
            </CardTitle>
            <CardDescription>Qué revisar cuando una caja no imprime.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {problemas.map((problema) => (
              <div key={problema.titulo} className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                <p className="font-medium text-amber-950">{problema.titulo}</p>
                <p className="mt-1 text-sm leading-6 text-amber-800">{problema.detalle}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Referencia técnica
          </CardTitle>
          <CardDescription>Comandos útiles para soporte interno.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg bg-slate-950 p-4 text-sm text-white">
            <p className="mb-2 flex items-center gap-2 font-medium">
              <RefreshCcw className="h-4 w-4" />
              Probar conector
            </p>
            <code className="text-slate-200">curl http://127.0.0.1:3010/health</code>
          </div>
          <div className="rounded-lg bg-slate-950 p-4 text-sm text-white">
            <p className="mb-2 flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" />
              Servicio macOS
            </p>
            <code className="text-slate-200">npm run printer:install:mac</code>
          </div>
          <div className="rounded-lg bg-slate-950 p-4 text-sm text-white">
            <p className="mb-2 flex items-center gap-2 font-medium">
              <Download className="h-4 w-4" />
              Instaladores
            </p>
            <code className="text-slate-200">public/installers</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
