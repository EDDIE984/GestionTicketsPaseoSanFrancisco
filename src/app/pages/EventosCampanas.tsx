import React, { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { EventoCampana, Categoria, Cupon, Entregable } from '@/lib/types';
import {
  fetchEventos,
  createEvento,
  updateEvento,
  deleteEvento,
} from '@/lib/api/eventos-campanas';
import { fetchCategorias } from '@/lib/api/categorias';
import { fetchCupones } from '@/lib/api/cupones';
import { fetchEntregables } from '@/lib/api/entregables';

export function EventosCampanas() {
  const [eventos, setEventos] = useState<EventoCampana[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);

  useEffect(() => {
    fetchEventos().then(setEventos).catch(() => toast.error('Error al cargar eventos'));
    fetchCategorias().then(setCategorias).catch(() => {});
    fetchCupones().then(setCupones).catch(() => {});
    fetchEntregables().then(setEntregables).catch(() => {});
  }, []);

  const handleAdd = async (form: Omit<EventoCampana, 'id' | 'created_at'>) => {
    try {
      const created = await createEvento({
        nombre: form.nombre,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        valor_minimo: form.valor_minimo,
        valor_maximo: form.valor_maximo,
        activo: form.activo ?? true,
        categoria_ids: form.categoria_ids ?? [],
        cupon_ids: form.cupon_ids ?? [],
        entregable_ids: form.entregable_ids ?? [],
      });
      setEventos((prev) => [created, ...prev]);
    } catch {
      toast.error('Error al crear el evento');
    }
  };

  const handleEdit = async (id: string | number, form: Partial<EventoCampana>) => {
    try {
      const updated = await updateEvento(String(id), form);
      setEventos((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch {
      toast.error('Error al actualizar el evento');
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
    const [localEntregables, setLocalEntregables] = React.useState<string[]>(item?.entregable_ids ?? []);

    React.useEffect(() => {
      setLocalCategorias(item?.categoria_ids ?? []);
      setLocalCupones(item?.cupon_ids ?? []);
      setLocalEntregables(item?.entregable_ids ?? []);
    }, [item?.id]);

    const toggleCategoria = (id: string, checked: boolean) => {
      const updated = checked ? [...localCategorias, id] : localCategorias.filter((x) => x !== id);
      setLocalCategorias(updated);
      onChange('categoria_ids', updated);
    };
    const toggleCupon = (id: string, checked: boolean) => {
      const updated = checked ? [...localCupones, id] : localCupones.filter((x) => x !== id);
      setLocalCupones(updated);
      onChange('cupon_ids', updated);
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
              <Label className="text-base font-semibold">Categorías participantes</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const all = categorias.filter((c) => c.activo).map((c) => c.id);
                  setLocalCategorias(all);
                  onChange('categoria_ids', all);
                }}
              >
                Seleccionar todas
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categorias.filter((c) => c.activo).map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-primary/40 hover:bg-accent/60 cursor-pointer">
                  <Checkbox
                    checked={localCategorias.includes(c.id)}
                    onCheckedChange={(checked) => toggleCategoria(c.id, !!checked)}
                  />
                  <span className="text-sm font-medium">{c.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
              <Input
                id="fecha_inicio"
                type="date"
                defaultValue={item?.fecha_inicio || ''}
                onChange={(e) => onChange('fecha_inicio', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha_fin">Fecha Fin</Label>
              <Input
                id="fecha_fin"
                type="date"
                defaultValue={item?.fecha_fin || ''}
                onChange={(e) => onChange('fecha_fin', e.target.value)}
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
                defaultValue={item?.valor_minimo ?? ''}
                onChange={(e) => onChange('valor_minimo', parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_maximo">Valor Máximo por Factura</Label>
              <Input
                id="valor_maximo"
                type="number"
                step="0.01"
                defaultValue={item?.valor_maximo ?? ''}
                onChange={(e) => onChange('valor_maximo', parseFloat(e.target.value))}
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
            <Label className="text-base font-semibold mb-4 block">Cupones del evento</Label>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cupones.filter((c) => c.activo).map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-primary/40 hover:bg-accent/60 cursor-pointer">
                  <Checkbox
                    checked={localCupones.includes(c.id)}
                    onCheckedChange={(checked) => toggleCupon(c.id, !!checked)}
                  />
                  <span className="text-sm font-medium">{c.nombre} (x{c.numero})</span>
                </label>
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
        { key: 'fecha_inicio', label: 'Fecha Inicio' },
        { key: 'fecha_fin', label: 'Fecha Fin' },
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
      ]}
      onAdd={handleAdd as any}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm as any}
      getItemId={(item) => item.id}
    />
  );
}
