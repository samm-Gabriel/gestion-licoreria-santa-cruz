'use client'

import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  listProductos,
  listProveedores,
  obtenerProducto,
  obtenerProveedor,
  crearProducto,
  crearProveedor,
  actualizarProducto,
  actualizarProveedor,
  crearCompra,
  crearVenta,
  type ApiRecord,
} from '@/lib/api'

type Entity = 'producto' | 'proveedor'

const productFields = [
  ['codigo', 'Código', 'text', true],
  ['nombre', 'Nombre', 'text', true],
  ['marca', 'Marca', 'text', false],
  ['categoria', 'Categoría', 'text', false],
  ['precioVenta', 'Precio de venta (Bs.)', 'number', true],
  ['stockMinimo', 'Stock mínimo', 'number', false],
] as const

const supplierFields = [
  ['nombre', 'Nombre', 'text', true],
  ['nit', 'NIT', 'text', false],
  ['telefono', 'Teléfono', 'tel', false],
  ['email', 'Email', 'email', false],
  ['direccion', 'Dirección', 'text', false],
] as const

function emptyToNull(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

function buildEntityBody(
  form: FormData,
  opts: { product: boolean; editing: boolean; active: boolean }
): ApiRecord {
  const body: ApiRecord = {}
  for (const [key, value] of form.entries()) {
    body[key] = typeof value === 'string' ? value.trim() : value
  }
  body.activo = opts.active

  for (const key of ['marca', 'categoria', 'nit', 'telefono', 'email', 'direccion'] as const) {
    if (key in body) body[key] = emptyToNull(body[key])
  }

  if (opts.product) {
    body.precioVenta = String(body.precioVenta ?? '')
    if (!opts.editing) {
      body.stock = Number(form.get('stock') || 0)
    } else {
      delete body.stock
    }
    const stockMinimoRaw = String(form.get('stockMinimo') ?? '').trim()
    if (stockMinimoRaw === '') delete body.stockMinimo
    else body.stockMinimo = Number(stockMinimoRaw)
  }

  return body
}

export function EntityForm({ entity }: { entity: Entity }) {
  const router = useRouter()
  const params = useParams<{ id?: string }>()
  const id = params.id
  const editing = Boolean(id)
  const product = entity === 'producto'
  const title = product ? 'Producto' : 'Proveedor'
  const root = product ? '/productos' : '/proveedores'
  const getData = product ? obtenerProducto : obtenerProveedor
  const { data, isLoading, error } = useSWR(editing ? [entity, id] : null, () =>
    getData(id!).then((r) => r.data)
  )
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(true)
  const record = data as unknown as ApiRecord | undefined

  useEffect(() => {
    if (data) setActive(Boolean(record?.activo ?? true))
  }, [data, record?.activo])

  useEffect(() => {
    if (error) toast.error(error.message || `No se pudo cargar el ${title.toLowerCase()}.`)
  }, [error, title])

  const fields = product ? productFields : supplierFields

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const body = buildEntityBody(form, { product, editing, active })
    try {
      if (product) {
        if (editing) await actualizarProducto(id!, body)
        else await crearProducto(body)
      } else {
        if (editing) await actualizarProveedor(id!, body)
        else await crearProveedor(body)
      }
      toast.success(`${title} ${editing ? 'actualizado' : 'creado'} correctamente.`)
      router.push(root)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-64 place-items-center">
        <LoaderCircle className="animate-spin text-primary" />
      </div>
    )
  }

  if (editing && error) {
    return (
      <div className="grid min-h-64 place-items-center text-sm text-destructive">
        {error.message || `No se pudo cargar el ${title.toLowerCase()}.`}
      </div>
    )
  }

  const categoriaDefault = record?.categoria ? String(record.categoria) : undefined

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Button variant="ghost" render={<Link href={root} />} className="w-fit">
        <ArrowLeft data-icon="inline-start" />
        Volver a {product ? 'productos' : 'proveedores'}
      </Button>
      <div>
        <p className="text-sm font-medium text-primary">
          {editing ? 'ACTUALIZAR' : 'NUEVO REGISTRO'}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {editing ? 'Editar' : 'Nuevo'} {title.toLowerCase()}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Información del {title.toLowerCase()}</CardTitle>
          <CardDescription>Completa los datos requeridos para guardar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map(([key, label, type, required]) => (
                <div key={key} className="flex flex-col gap-2">
                  <Label htmlFor={key}>
                    {label}
                    {required ? ' *' : ''}
                  </Label>
                  {key === 'categoria' ? (
                    <Select name={key} defaultValue={categoriaDefault}>
                      <SelectTrigger id={key}>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {['Vino', 'Cerveza', 'Whisky', 'Vodka', 'Ron', 'Otros'].map(
                            (item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            )
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={key}
                      name={key}
                      type={type}
                      required={required}
                      min={type === 'number' ? '0' : undefined}
                      step={key === 'precioVenta' ? '0.01' : undefined}
                      defaultValue={String(record?.[key] ?? '')}
                    />
                  )}
                </div>
              ))}
              {product && !editing && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="stock">Stock inicial</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue="0"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="activo">{title} activo</Label>
                <p className="text-sm text-muted-foreground">
                  Disponible para operaciones del negocio.
                </p>
              </div>
              <Switch id="activo" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" render={<Link href={root} />}>
                Cancelar
              </Button>
              <Button disabled={busy} type="submit">
                {busy && (
                  <LoaderCircle data-icon="inline-start" className="animate-spin" />
                )}
                {editing ? 'Guardar cambios' : `Crear ${title.toLowerCase()}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

type Line = {
  productoId: string
  cantidad: string
  costoUnitario: string
  precioUnitario: string
}

export function TransactionForm({ kind }: { kind: 'compra' | 'venta' }) {
  const router = useRouter()
  const purchase = kind === 'compra'
  const root = purchase ? '/compras' : '/ventas'
  const {
    data: products,
    error: productsError,
    isLoading: productsLoading,
  } = useSWR('productos-transaction', () =>
    listProductos({ activo: true, pageSize: 100 }).then((r) => r.data)
  )
  const {
    data: suppliers,
    error: suppliersError,
    isLoading: suppliersLoading,
  } = useSWR(purchase ? 'proveedores-transaction' : null, () =>
    listProveedores({ activo: true, pageSize: 100 }).then((r) => r.data)
  )
  const productRows = Array.isArray(products) ? products : []
  const supplierRows = Array.isArray(suppliers) ? suppliers : []
  const [lines, setLines] = useState<Line[]>([
    { productoId: '', cantidad: '1', costoUnitario: '', precioUnitario: '' },
  ])
  const [busy, setBusy] = useState(false)
  const [proveedorId, setProveedorId] = useState('')

  useEffect(() => {
    if (productsError) toast.error(productsError.message || 'No se pudieron cargar productos.')
  }, [productsError])
  useEffect(() => {
    if (suppliersError)
      toast.error(suppliersError.message || 'No se pudieron cargar proveedores.')
  }, [suppliersError])

  const update = (index: number, key: keyof Line, value: string) =>
    setLines((items) => items.map((line, i) => (i === index ? { ...line, [key]: value } : line)))

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (purchase && !proveedorId) {
      toast.error('Selecciona un proveedor.')
      return
    }
    if (lines.some((line) => !line.productoId)) {
      toast.error('Cada línea debe tener un producto.')
      return
    }
    setBusy(true)
    const form = new FormData(e.currentTarget)
    const lineItems = lines.map((line) => ({
      productoId: Number(line.productoId),
      cantidad: Number(line.cantidad),
      ...(purchase
        ? { costoUnitario: String(line.costoUnitario) }
        : line.precioUnitario
          ? { precioUnitario: String(line.precioUnitario) }
          : {}),
    }))
    const payload: ApiRecord = purchase
      ? {
          proveedorId: Number(proveedorId),
          fecha: String(form.get('fecha') || ''),
          numeroFactura: emptyToNull(form.get('numeroFactura')),
          observaciones: emptyToNull(form.get('observaciones')),
          lineas: lineItems,
        }
      : { lineas: lineItems }
    try {
      if (purchase) await crearCompra(payload)
      else await crearVenta(payload)
      toast.success(`${purchase ? 'Compra' : 'Venta'} registrada.`)
      router.push(root)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar.')
    } finally {
      setBusy(false)
    }
  }

  const loadingCatalog = productsLoading || (purchase && suppliersLoading)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Button variant="ghost" render={<Link href={root} />} className="w-fit">
        <ArrowLeft data-icon="inline-start" />
        Volver
      </Button>
      <div>
        <p className="text-sm font-medium text-primary">NUEVA OPERACIÓN</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Nueva {purchase ? 'compra' : 'venta'}
        </h1>
      </div>
      {loadingCatalog ? (
        <div className="grid min-h-40 place-items-center">
          <LoaderCircle className="animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          {purchase && (
            <Card>
              <CardHeader>
                <CardTitle>Datos de la compra</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Proveedor *</Label>
                  <Select
                    name="proveedorId"
                    required
                    value={proveedorId || undefined}
                    onValueChange={(v) => setProveedorId(v ?? '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {supplierRows.map((row) => (
                          <SelectItem key={String(row.id)} value={String(row.id)}>
                            {String(row.nombre)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    id="fecha"
                    name="fecha"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="numeroFactura">Número de factura</Label>
                  <Input id="numeroFactura" name="numeroFactura" />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea id="observaciones" name="observaciones" />
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detalle de productos</CardTitle>
                  <CardDescription>Agrega una o más líneas a la operación.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setLines((items) => [
                      ...items,
                      {
                        productoId: '',
                        cantidad: '1',
                        costoUnitario: '',
                        precioUnitario: '',
                      },
                    ])
                  }
                >
                  <Plus data-icon="inline-start" />
                  Agregar línea
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(160px,1fr)_100px_150px_40px] sm:items-end"
                >
                  <div className="flex flex-col gap-2">
                    <Label>Producto *</Label>
                    <Select
                      value={line.productoId || undefined}
                      onValueChange={(v) => update(index, 'productoId', v ?? '')}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona producto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {productRows.map((row) => (
                            <SelectItem key={String(row.id)} value={String(row.id)}>
                              {String(row.nombre)}
                              {row.codigo ? ` · ${row.codigo}` : ''}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`qty-${index}`}>Cantidad *</Label>
                    <Input
                      id={`qty-${index}`}
                      type="number"
                      min="1"
                      step="1"
                      value={line.cantidad}
                      onChange={(e) => update(index, 'cantidad', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`price-${index}`}>
                      {purchase ? 'Costo unitario *' : 'Precio unitario (Bs.)'}
                    </Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchase ? line.costoUnitario : line.precioUnitario}
                      onChange={(e) =>
                        update(
                          index,
                          purchase ? 'costoUnitario' : 'precioUnitario',
                          e.target.value
                        )
                      }
                      required={purchase}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar línea"
                    disabled={lines.length === 1}
                    onClick={() => setLines((items) => items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" render={<Link href={root} />}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
              Registrar {purchase ? 'compra' : 'venta'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
