import React, { useState } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/app/components/ui/select';

interface EventoCampana {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  categoriaIds: number[];
  categoriaNombre?: string;
  valorMinimo: number;
  valorMaximo: number;
  entregableId: number;
  entregableNombre?: string;
  cuponId: number;
  cuponNombre?: string;
}

// Datos de referencia - En un caso real, estos vendrían de un contexto o API
const categorias = [
  { id: 1, nombre: 'Accesorios', activo: true },
  { id: 2, nombre: 'Autos', activo: true },
  { id: 3, nombre: 'Bancos', activo: true },
  { id: 4, nombre: 'Entretenimiento', activo: true },
  { id: 5, nombre: 'Familiar', activo: true },
  { id: 6, nombre: 'Farmacias', activo: true },
  { id: 7, nombre: 'Ferreterías', activo: true },
  { id: 8, nombre: 'Retail', activo: true },
];

const entregables = [
  { id: 1, nombre: 'Camiseta Oficial', activo: true },
  { id: 2, nombre: 'Gorra', activo: true },
  { id: 3, nombre: 'Kit', activo: true },
  { id: 4, nombre: 'Ticket', activo: true },
];

const cupones = [
  { id: 1, nombre: 'Dinners triple cupon', activo: true },
  { id: 2, nombre: 'Cupon doble descuento', activo: true },
  { id: 3, nombre: 'Mega cupon premium', activo: true },
  { id: 4, nombre: 'Cupon simple', activo: true },
  { id: 5, nombre: 'Cupon familiar', activo: true },
  { id: 6, nombre: 'Cupon especial navidad', activo: false },
  { id: 7, nombre: 'Cupon fin de semana', activo: true },
  { id: 8, nombre: 'Cupon aniversario', activo: true },
];

export function EventosCampanas() {
  const [eventos, setEventos] = useState<EventoCampana[]>([
    {
      id: 1,
      nombre: 'Campaña Verano 2026',
      fechaInicio: '2026-03-01',
      fechaFin: '2026-03-31',
      categoriaIds: [4],
      categoriaNombre: 'Entretenimiento',
      valorMinimo: 50,
      valorMaximo: 500,
      entregableId: 3,
      entregableNombre: 'Kit',
      cuponId: 1,
      cuponNombre: 'Dinners triple cupon',
    },
    {
      id: 2,
      nombre: 'Promoción Navideña',
      fechaInicio: '2025-12-01',
      fechaFin: '2025-12-31',
      categoriaIds: [8],
      categoriaNombre: 'Retail',
      valorMinimo: 100,
      valorMaximo: 1000,
      entregableId: 1,
      entregableNombre: 'Camiseta Oficial',
      cuponId: 6,
      cuponNombre: 'Cupon especial navidad',
    },
    {
      id: 3,
      nombre: 'Evento Aniversario',
      fechaInicio: '2026-06-15',
      fechaFin: '2026-06-30',
      categoriaIds: [5],
      categoriaNombre: 'Familiar',
      valorMinimo: 75,
      valorMaximo: 750,
      entregableId: 4,
      entregableNombre: 'Ticket',
      cuponId: 8,
      cuponNombre: 'Cupon aniversario',
    },
  ]);

  const handleAdd = (evento: Omit<EventoCampana, 'id'>) => {
    const categoriaNombres = categorias
      .filter((c) => evento.categoriaIds.includes(c.id))
      .map((c) => c.nombre)
      .join(', ');
    const entregable = entregables.find((e) => e.id === evento.entregableId);
    const cupon = cupones.find((c) => c.id === evento.cuponId);

    const newEvento = {
      ...evento,
      id: Date.now(),
      categoriaNombre: categoriaNombres,
      entregableNombre: entregable?.nombre,
      cuponNombre: cupon?.nombre,
    };
    setEventos([...eventos, newEvento]);
  };

  const handleEdit = (id: string | number, evento: Partial<EventoCampana>) => {
    setEventos(
      eventos.map((e) => {
        if (e.id === Number(id)) {
          const updated = { ...e, ...evento };
          if (evento.categoriaIds) {
            const categoriaNombres = categorias
              .filter((c) => evento.categoriaIds?.includes(c.id))
              .map((c) => c.nombre)
              .join(', ');
            updated.categoriaNombre = categoriaNombres;
          }
          if (evento.entregableId) {
            const entregable = entregables.find((ent) => ent.id === evento.entregableId);
            updated.entregableNombre = entregable?.nombre;
          }
          if (evento.cuponId) {
            const cupon = cupones.find((c) => c.id === evento.cuponId);
            updated.cuponNombre = cupon?.nombre;
          }
          return updated;
        }
        return e;
      })
    );
  };

  const handleDelete = (id: string | number) => {
    setEventos(eventos.filter((e) => e.id !== Number(id)));
  };

  const renderForm = (
    item: Partial<EventoCampana> | null,
    onChange: (field: keyof EventoCampana, value: any) => void
  ) => {
    // Estado local para checkboxes, sincronizado con el CRUDTemplate
    const [localCategorias, setLocalCategorias] = useState<number[]>(item?.categoriaIds || []);
    // Sincroniza cambios hacia el CRUDTemplate
    React.useEffect(() => {
      setLocalCategorias(item?.categoriaIds || []);
    }, [item?.categoriaIds]);

    const handleCategoriaChange = (id: number, checked: boolean) => {
      let updated: number[];
      if (checked) {
        updated = [...localCategorias, id];
      } else {
        updated = localCategorias.filter((catId) => catId !== id);
      }
      setLocalCategorias(updated);
      onChange('categoriaIds', updated);
    };
    const handleSelectAll = () => {
      const allIds = categorias.filter((c) => c.activo).map((c) => c.id);
      setLocalCategorias(allIds);
      onChange('categoriaIds', allIds);
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
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-border transition-all">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold tracking-tight">Categorías participantes</Label>
              <Button type="button" variant="secondary" size="sm" onClick={handleSelectAll}>
                Seleccionar todas
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categorias.filter((c) => c.activo).map((categoria) => (
                <label
                  key={categoria.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-primary/40 hover:bg-accent/60 cursor-pointer transition-all group"
                >
                  <Checkbox
                    checked={localCategorias.includes(categoria.id)}
                    onCheckedChange={(checked) => handleCategoriaChange(categoria.id, !!checked)}
                    className="transition-all group-hover:scale-110"
                  />
                  <span className="text-sm font-medium select-none group-hover:text-primary transition-colors">
                    {categoria.nombre}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                defaultValue={item?.fechaInicio || ''}
                onChange={(e) => onChange('fechaInicio', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                defaultValue={item?.fechaFin || ''}
                onChange={(e) => onChange('fechaFin', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valorMinimo">Valor Mínimo de Participación</Label>
              <Input
                id="valorMinimo"
                type="number"
                step="0.01"
                defaultValue={item?.valorMinimo || ''}
                onChange={(e) => onChange('valorMinimo', parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valorMaximo">Valor Máximo por Factura</Label>
              <Input
                id="valorMaximo"
                type="number"
                step="0.01"
                defaultValue={item?.valorMaximo || ''}
                onChange={(e) => onChange('valorMaximo', parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="entregableId">Entregable</Label>
            <Select
              defaultValue={item?.entregableId?.toString()}
              onValueChange={(value) => onChange('entregableId', parseInt(value))}
            >
              <SelectTrigger id="entregableId">
                <SelectValue placeholder="Selecciona un entregable" />
              </SelectTrigger>
              <SelectContent>
                {entregables
                  .filter((e) => e.activo)
                  .map((entregable) => (
                    <SelectItem key={entregable.id} value={entregable.id.toString()}>
                      {entregable.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cuponId">Cupón</Label>
            <Select
              defaultValue={item?.cuponId?.toString()}
              onValueChange={(value) => onChange('cuponId', parseInt(value))}
            >
              <SelectTrigger id="cuponId">
                <SelectValue placeholder="Selecciona un cupón" />
              </SelectTrigger>
              <SelectContent>
                {cupones
                  .filter((c) => c.activo)
                  .map((cupon) => (
                    <SelectItem key={cupon.id} value={cupon.id.toString()}>
                      {cupon.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </form>
    );
  };

// ...existing code...

  return (
    <CRUDTemplate
      title="Eventos y Campañas"
      description="Gestiona todos los eventos y campañas del sistema"
      data={eventos}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'fechaInicio', label: 'Fecha Inicio' },
        { key: 'fechaFin', label: 'Fecha Fin' },
        { key: 'categoriaNombre', label: 'Categorías' },
        {
          key: 'valorMinimo',
          label: 'Valor Mínimo',
          render: (item) => `$${item.valorMinimo.toFixed(2)}`,
        },
        {
          key: 'valorMaximo',
          label: 'Valor Máximo',
          render: (item) => `$${item.valorMaximo.toFixed(2)}`,
        },
        { key: 'entregableNombre', label: 'Entregable' },
        { key: 'cuponNombre', label: 'Cupón' },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm}
      getItemId={(item) => item.id}
    />
  );
}