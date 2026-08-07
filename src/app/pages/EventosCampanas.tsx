import React, { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import type { EventoCampana, EventoCuponConfiguracion, EventoReglaCalculo, Categoria, Cupon, Entregable, Local, MetodoPago } from '@/lib/types';
import {
  fetchEventos,
  createEvento,
  updateEvento,
  deleteEvento,
} from '@/lib/api/eventos-campanas';
import { fetchCategorias } from '@/lib/api/categorias';
import { fetchCupones } from '@/lib/api/cupones';
import { fetchEntregables } from '@/lib/api/entregables';
import { fetchLocales } from '@/lib/api/locales';
import { fetchMetodosPago } from '@/lib/api/metodos-pago';

const toDateTimeInputValue = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const toTimestampValue = (value?: string) => {
  if (!value) return '';
  return new Date(value).toISOString();
};

const toNumberInputValue = (value?: number) => {
  return Number.isFinite(value) ? String(value) : '';
};

const toNumberValue = (value: string) => {
  if (value.trim() === '') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatFechaHora = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  }).format(date);
};

const validarEvento = (form: Partial<EventoCampana>) => {
  if (!form.nombre?.trim()) return 'Ingresa el nombre del evento o campaña';
  if (!form.fecha_inicio) return 'Ingresa la fecha y hora de inicio';
  if (!form.fecha_fin) return 'Ingresa la fecha y hora de fin';
  const inicio = new Date(form.fecha_inicio).getTime();
  const fin = new Date(form.fecha_fin).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fin)) return 'Ingresa fechas y horas válidas';
  if (inicio >= fin) {
    return 'La fecha y hora de inicio debe ser menor a la fecha y hora de fin';
  }
  if (!Number.isFinite(form.valor_minimo)) return 'Ingresa un valor mínimo válido';
  if (!Number.isFinite(form.valor_maximo)) return 'Ingresa un valor máximo válido';
  if ((form.valor_minimo ?? 0) <= 0) return 'El valor mínimo debe ser mayor a 0';
  if ((form.valor_maximo ?? 0) < 0) return 'El valor máximo no puede ser negativo';
  if ((form.valor_maximo ?? 0) > 0 && (form.valor_minimo ?? 0) > (form.valor_maximo ?? 0)) {
    return 'El valor mínimo no puede ser mayor que el valor máximo';
  }
  const cuponConfiguraciones = form.cupon_configuraciones ?? [];
  if ((form.cupon_ids ?? []).some((cuponId) => !cuponConfiguraciones.some((config) => config.cupon_id === cuponId && config.metodo_pago_id))) {
    return 'Asigna un método de pago a cada cupón seleccionado';
  }
  const metodosConfigurados = cuponConfiguraciones.map((config) => config.metodo_pago_id).filter(Boolean);
  if (new Set(metodosConfigurados).size !== metodosConfigurados.length) {
    return 'Un método de pago no puede estar asignado a más de un cupón del evento';
  }
  const reglas = form.reglas_calculo ?? [];
  for (const regla of reglas) {
    if (!regla.categoria_id) return 'Selecciona una categoría en cada excepción';
    if (!(form.categoria_ids ?? []).includes(regla.categoria_id)) {
      return 'Las categorías excluidas no pueden tener excepciones de cálculo';
    }
    if (regla.valor_minimo <= 0) return 'El valor mínimo de cada excepción debe ser mayor a 0';
    if (regla.valor_maximo < 0 || (regla.valor_maximo > 0 && regla.valor_minimo > regla.valor_maximo)) {
      return 'Revisa los valores mínimo y máximo de las excepciones';
    }
    if (!regla.aplica_todos && regla.local_ids.length === 0) return 'Selecciona al menos un local en cada excepción de locales específicos';
  }
  const categoriasTodos = reglas.filter((regla) => regla.aplica_todos).map((regla) => regla.categoria_id);
  if (new Set(categoriasTodos).size !== categoriasTodos.length) return 'No puede haber dos excepciones para toda la misma categoría';
  const localesReglas = reglas.flatMap((regla) => regla.local_ids);
  if (new Set(localesReglas).size !== localesReglas.length) return 'Un local no puede pertenecer a más de una excepción de la campaña';
  return null;
};

function ReglasCalculoEditor({
  value,
  categorias,
  categoriaIdsParticipantes,
  locales,
  onChange,
}: {
  value: EventoReglaCalculo[];
  categorias: Categoria[];
  categoriaIdsParticipantes: string[];
  locales: Local[];
  onChange: (reglas: EventoReglaCalculo[]) => void;
}) {
  const addRegla = () => onChange([...value, {
    categoria_id: '',
    aplica_todos: true,
    local_ids: [],
    acumula_saldo: false,
    valor_minimo: 0,
    valor_maximo: 0,
    activo: true,
  }]);
  const updateRegla = (index: number, patch: Partial<EventoReglaCalculo>) =>
    onChange(value.map((regla, i) => (i === index ? { ...regla, ...patch } : regla)));

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-base font-semibold text-slate-900">Excepciones de cálculo</Label>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
            Solo puedes crear excepciones para categorías participantes. Las categorías excluidas no aparecerán en el selector. Una regla de local tiene prioridad sobre la regla de categoría.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addRegla}>
          <Plus className="mr-1 h-4 w-4" /> Agregar
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {value.length === 0 && <p className="rounded-md border border-dashed border-amber-300 bg-white/70 p-4 text-center text-sm text-slate-500">La campaña utilizará únicamente sus parámetros generales.</p>}
        {value.map((regla, index) => {
          const localesCategoria = locales.filter((local) => local.activo && local.categoria_id === regla.categoria_id);
          return (
            <div key={regla.id ?? index} className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Excepción {index + 1}</span>
                <Button type="button" size="icon" variant="ghost" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Eliminar excepción ${index + 1}`}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Categoría</Label>
                  <Select value={regla.categoria_id} onValueChange={(categoria_id) => updateRegla(index, { categoria_id, local_ids: [] })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
                    <SelectContent>
                      {categorias
                        .filter((c) => c.activo && categoriaIdsParticipantes.includes(c.id))
                        .map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Aplicar a</Label>
                  <Select value={regla.aplica_todos ? 'todos' : 'especificos'} disabled={!regla.categoria_id} onValueChange={(value) => updateRegla(index, { aplica_todos: value === 'todos', local_ids: [] })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona alcance" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los locales de la categoría</SelectItem>
                      <SelectItem value="especificos">Locales específicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!regla.aplica_todos && regla.categoria_id && (
                  <div className="sm:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                      <Label>Locales</Label>
                      <span className="text-xs text-slate-500">{regla.local_ids.length} seleccionado{regla.local_ids.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border border-slate-200 p-2 sm:grid-cols-2">
                      {localesCategoria.map((local) => (
                        <label key={local.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50">
                          <Checkbox
                            checked={regla.local_ids.includes(local.id)}
                            onCheckedChange={(checked) => updateRegla(index, {
                              local_ids: checked
                                ? [...regla.local_ids, local.id]
                                : regla.local_ids.filter((id) => id !== local.id),
                            })}
                          />
                          <span>{local.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label>Valor mínimo especial</Label>
                  <Input type="number" min="0.01" step="0.01" value={regla.valor_minimo || ''} onChange={(e) => updateRegla(index, { valor_minimo: toNumberValue(e.target.value) })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Valor máximo especial</Label>
                  <Input type="number" min="0" step="0.01" value={regla.valor_maximo || ''} onChange={(e) => updateRegla(index, { valor_maximo: toNumberValue(e.target.value) })} placeholder="0.00" />
                </div>
                <label className="flex items-center gap-2 text-sm"><Switch checked={regla.activo} onCheckedChange={(activo) => updateRegla(index, { activo })} /> Regla activa</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={regla.acumula_saldo} onCheckedChange={(acumula_saldo) => updateRegla(index, { acumula_saldo })} /> Acumula saldo</label>
                {!regla.acumula_saldo && <p className="sm:col-span-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">La factura no consumirá saldo anterior ni generará un nuevo saldo. Cualquier saldo existente del cliente se conservará intacto.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const maybeError = error as { message?: string; details?: string; hint?: string; code?: string };
    return [maybeError.message, maybeError.details, maybeError.hint, maybeError.code && `Código: ${maybeError.code}`]
      .filter(Boolean)
      .join(' | ');
  }

  return '';
};

export function EventosCampanas() {
  const [eventos, setEventos] = useState<EventoCampana[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  useEffect(() => {
    fetchEventos().then(setEventos).catch(() => toast.error('Error al cargar eventos'));
    fetchCategorias().then(setCategorias).catch(() => {});
    fetchCupones().then(setCupones).catch(() => {});
    fetchEntregables().then(setEntregables).catch(() => {});
    fetchLocales().then(setLocales).catch(() => {});
    fetchMetodosPago().then(setMetodosPago).catch(() => {});
  }, []);

  const handleAdd = async (form: Omit<EventoCampana, 'id' | 'created_at'>) => {
    const activeCategoriaIds = categorias.filter((c) => c.activo).map((c) => c.id);
    const normalizedForm = {
      ...form,
      valor_minimo: Number.isFinite(form.valor_minimo) ? form.valor_minimo : 0,
      valor_maximo: Number.isFinite(form.valor_maximo) ? form.valor_maximo : 0,
      activo: form.activo ?? true,
      categoria_ids: form.categoria_ids ?? activeCategoriaIds,
      cupon_ids: form.cupon_ids ?? [],
      cupon_configuraciones: form.cupon_configuraciones ?? [],
      entregable_ids: form.entregable_ids ?? [],
      reglas_calculo: form.reglas_calculo ?? [],
    };
    const errorValidacion = validarEvento(normalizedForm);
    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    try {
      const created = await createEvento({
        nombre: normalizedForm.nombre,
        fecha_inicio: normalizedForm.fecha_inicio,
        fecha_fin: normalizedForm.fecha_fin,
        valor_minimo: normalizedForm.valor_minimo,
        valor_maximo: normalizedForm.valor_maximo,
        activo: normalizedForm.activo,
        categoria_ids: normalizedForm.categoria_ids,
        cupon_ids: normalizedForm.cupon_ids,
        cupon_configuraciones: normalizedForm.cupon_configuraciones,
        entregable_ids: normalizedForm.entregable_ids,
        reglas_calculo: normalizedForm.reglas_calculo,
      });
      setEventos((prev) => [created, ...prev]);
    } catch (error) {
      toast.error('Error al crear el evento', {
        description: getErrorMessage(error),
        duration: 10000,
      });
    }
  };

  const handleEdit = async (id: string | number, form: Partial<EventoCampana>) => {
    const errorValidacion = validarEvento(form);
    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    try {
      const updated = await updateEvento(String(id), form);
      setEventos((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (error) {
      toast.error('Error al actualizar el evento', {
        description: getErrorMessage(error),
        duration: 10000,
      });
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteEvento(String(id));
      setEventos((prev) => prev.filter((e) => e.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el evento');
    }
  };

  const renderForm = (
    item: Partial<EventoCampana> | null,
    onChange: (field: keyof EventoCampana, value: any) => void
  ) => {
    const [localCategorias, setLocalCategorias] = React.useState<string[]>(item?.categoria_ids ?? []);
    const [localCupones, setLocalCupones] = React.useState<string[]>(item?.cupon_ids ?? []);
    const [localCuponConfiguraciones, setLocalCuponConfiguraciones] = React.useState<EventoCuponConfiguracion[]>(item?.cupon_configuraciones ?? []);
    const [localEntregables, setLocalEntregables] = React.useState<string[]>(item?.entregable_ids ?? []);
    const [localReglas, setLocalReglas] = React.useState<EventoReglaCalculo[]>(item?.reglas_calculo ?? []);
    const categoriasActivas = categorias.filter((c) => c.activo);
    const categoriaIdsActivas = categoriasActivas.map((c) => c.id);
    const categoriasExcluidas = categoriaIdsActivas.filter((id) => !localCategorias.includes(id));

    React.useEffect(() => {
      const categoriasParticipantes = item?.id
        ? item?.categoria_ids ?? []
        : categorias.filter((c) => c.activo).map((c) => c.id);
      setLocalCategorias(categoriasParticipantes);
      onChange('categoria_ids', categoriasParticipantes);
      setLocalCupones(item?.cupon_ids ?? []);
      setLocalCuponConfiguraciones(item?.cupon_configuraciones ?? []);
      onChange('cupon_configuraciones', item?.cupon_configuraciones ?? []);
      setLocalEntregables(item?.entregable_ids ?? []);
      setLocalReglas(item?.reglas_calculo ?? []);
      onChange('reglas_calculo', item?.reglas_calculo ?? []);
    }, [item?.id, categorias.length]);

    React.useEffect(() => {
      onChange('valor_minimo', item?.valor_minimo ?? 0);
      onChange('valor_maximo', item?.valor_maximo ?? 0);
      onChange('activo', item?.activo ?? true);
    }, [item?.id]);

    const toggleCategoriaExcluida = (id: string, checked: boolean) => {
      const updated = checked
        ? localCategorias.filter((x) => x !== id)
        : Array.from(new Set([...localCategorias, id]));
      setLocalCategorias(updated);
      onChange('categoria_ids', updated);
      if (checked) {
        const reglasCompatibles = localReglas.filter((regla) => regla.categoria_id !== id);
        if (reglasCompatibles.length !== localReglas.length) {
          setLocalReglas(reglasCompatibles);
          onChange('reglas_calculo', reglasCompatibles);
          const categoria = categorias.find((item) => item.id === id);
          toast.info(`Se eliminaron las excepciones de ${categoria?.nombre ?? 'la categoría'} porque quedó excluida`);
        }
      }
    };
    const toggleCupon = (id: string, checked: boolean) => {
      const updated = checked ? [...localCupones, id] : localCupones.filter((x) => x !== id);
      const configuracionesActualizadas = checked
        ? [...localCuponConfiguraciones, { cupon_id: id, metodo_pago_id: '' }]
        : localCuponConfiguraciones.filter((config) => config.cupon_id !== id);
      setLocalCupones(updated);
      setLocalCuponConfiguraciones(configuracionesActualizadas);
      onChange('cupon_ids', updated);
      onChange('cupon_configuraciones', configuracionesActualizadas);
    };
    const asignarMetodoCupon = (cuponId: string, metodoPagoId: string) => {
      const configuracionesActualizadas = localCuponConfiguraciones.map((config) =>
        config.cupon_id === cuponId ? { ...config, metodo_pago_id: metodoPagoId } : config,
      );
      setLocalCuponConfiguraciones(configuracionesActualizadas);
      onChange('cupon_configuraciones', configuracionesActualizadas);
    };
    const toggleEntregable = (id: string, checked: boolean) => {
      const updated = checked ? [...localEntregables, id] : localEntregables.filter((x) => x !== id);
      setLocalEntregables(updated);
      onChange('entregable_ids', updated);
    };

    return (
      <form className="p-2 md:p-4">
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              defaultValue={item?.nombre || ''}
              onChange={(e) => onChange('nombre', e.target.value)}
              placeholder="Nombre del evento o campaña"
            />
          </div>

          {/* Categorías */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-base font-semibold">Categorías excluidas</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Todas participan por defecto. Una categoría excluida no podrá tener excepciones de cálculo. Si ya tiene una excepción, se eliminará al excluirla.
                </p>
              </div>
              {categoriasExcluidas.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setLocalCategorias(categoriaIdsActivas);
                    onChange('categoria_ids', categoriaIdsActivas);
                  }}
                >
                  Incluir todas
                </Button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoriasActivas.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-primary/40 hover:bg-accent/60 cursor-pointer">
                  <Checkbox
                    checked={categoriasExcluidas.includes(c.id)}
                    onCheckedChange={(checked) => toggleCategoriaExcluida(c.id, !!checked)}
                  />
                  <span className="text-sm font-medium">{c.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="fecha_inicio">Fecha y Hora Inicio</Label>
              <Input
                id="fecha_inicio"
                type="datetime-local"
                defaultValue={toDateTimeInputValue(item?.fecha_inicio)}
                onChange={(e) => onChange('fecha_inicio', toTimestampValue(e.target.value))}
                className="h-11 min-w-0 pr-4 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="fecha_fin">Fecha y Hora Fin</Label>
              <Input
                id="fecha_fin"
                type="datetime-local"
                defaultValue={toDateTimeInputValue(item?.fecha_fin)}
                onChange={(e) => onChange('fecha_fin', toTimestampValue(e.target.value))}
                className="h-11 min-w-0 pr-4 text-sm"
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor_minimo">Valor Mínimo de Participación</Label>
              <Input
                id="valor_minimo"
                type="number"
                step="0.01"
                defaultValue={toNumberInputValue(item?.valor_minimo)}
                onChange={(e) => onChange('valor_minimo', toNumberValue(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_maximo">Valor Máximo por Factura</Label>
              <Input
                id="valor_maximo"
                type="number"
                step="0.01"
                defaultValue={toNumberInputValue(item?.valor_maximo)}
                onChange={(e) => onChange('valor_maximo', toNumberValue(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Activo */}
          <div className="flex items-center gap-2">
            <Switch
              id="activo"
              defaultChecked={item?.activo ?? true}
              onCheckedChange={(checked) => onChange('activo', checked)}
            />
            <Label htmlFor="activo">Activo</Label>
          </div>

          {/* Cupones */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-border">
            <Label className="text-base font-semibold block">Cupones y métodos de pago</Label>
            <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">
              Selecciona los cupones del evento y asigna un método diferente a cada uno. En Registro, el cupón se aplicará automáticamente al elegir el método de pago.
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {cupones.filter((c) => c.activo).map((c) => (
                <div key={c.id} className="grid gap-3 rounded-lg border border-border/70 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)] sm:items-center">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={localCupones.includes(c.id)}
                      onCheckedChange={(checked) => toggleCupon(c.id, !!checked)}
                    />
                    <span className="text-sm font-medium">{c.nombre} (x{c.numero})</span>
                  </label>
                  {localCupones.includes(c.id) && (
                    <Select
                      value={localCuponConfiguraciones.find((config) => config.cupon_id === c.id)?.metodo_pago_id ?? ''}
                      onValueChange={(metodoPagoId) => asignarMetodoCupon(c.id, metodoPagoId)}
                    >
                      <SelectTrigger aria-label={`Método de pago para ${c.nombre}`}>
                        <SelectValue placeholder="Asigna método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodosPago.filter((metodo) => metodo.activo).map((metodo) => {
                          const usadoPorOtroCupon = localCuponConfiguraciones.some((config) =>
                            config.cupon_id !== c.id && config.metodo_pago_id === metodo.id,
                          );
                          return <SelectItem key={metodo.id} value={metodo.id} disabled={usadoPorOtroCupon}>{metodo.nombre}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Entregables */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-border">
            <Label className="text-base font-semibold mb-4 block">Entregables del evento</Label>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {entregables.filter((e) => e.activo).map((e) => (
                <label key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-primary/40 hover:bg-accent/60 cursor-pointer">
                  <Checkbox
                    checked={localEntregables.includes(e.id)}
                    onCheckedChange={(checked) => toggleEntregable(e.id, !!checked)}
                  />
                  <span className="text-sm font-medium">{e.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          <ReglasCalculoEditor
            value={localReglas}
            categorias={categorias}
            categoriaIdsParticipantes={localCategorias}
            locales={locales}
            onChange={(reglas) => {
              setLocalReglas(reglas);
              onChange('reglas_calculo', reglas);
            }}
          />
        </div>
      </form>
    );
  };

  const getCategoriaNames = (evento: EventoCampana) =>
    evento.categoria_ids
      .map((id) => categorias.find((c) => c.id === id)?.nombre)
      .filter(Boolean)
      .join(', ') || '—';

  return (
    <CRUDTemplate
      title="Eventos y Campañas"
      description="Gestiona todos los eventos y campañas del sistema"
      data={eventos}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        {
          key: 'fecha_inicio',
          label: 'Inicio',
          render: (item) => formatFechaHora(item.fecha_inicio),
        },
        {
          key: 'fecha_fin',
          label: 'Fin',
          render: (item) => formatFechaHora(item.fecha_fin),
        },
        {
          key: 'categoria_ids',
          label: 'Categorías',
          render: (item) => getCategoriaNames(item),
        },
        {
          key: 'valor_minimo',
          label: 'Valor Mínimo',
          render: (item) => `$${item.valor_minimo.toFixed(2)}`,
        },
        {
          key: 'valor_maximo',
          label: 'Valor Máximo',
          render: (item) => `$${item.valor_maximo.toFixed(2)}`,
        },
        {
          key: 'reglas_calculo',
          label: 'Excepciones',
          render: (item) => String(item.reglas_calculo.length),
        },
      ]}
      onAdd={handleAdd as any}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm as any}
      getItemId={(item) => item.id}
    />
  );
}
