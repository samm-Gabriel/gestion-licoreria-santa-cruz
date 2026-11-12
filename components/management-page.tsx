'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Package,
  Truck,
  ShoppingCart,
  ReceiptText,
  LoaderCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  listCompras,
  listProductos,
  listProveedores,
  listVentas,
  eliminarProducto,
  eliminarProveedor,
} from '@/lib/api'
import type { MetaPaginacion } from '@/lib/types'

type Resource = 'productos' | 'proveedores' | 'compras' | 'ventas'

const PAGE_SIZE = 10

const config = {
  productos: {
    title: 'Productos',
    description: 'Administra el catálogo y los niveles de inventario.',
    icon: Package,
    add: '/productos/nuevo',
    addText: 'Nuevo producto',
    columns: [
      'Código',
      'Nombre',
      'Marca',
      'Categoría',
      'Precio venta',
      'Stock',
      'Stock mínimo',
      'Estado',
    ],
  },
  proveedores: {
    title: 'Proveedores',
    description: 'Mantén al día los datos de tus proveedores.',
    icon: Truck,
    add: '/proveedores/nuevo',
    addText: 'Nuevo proveedor',
    columns: ['Nombre', 'NIT', 'Teléfono', 'Email', 'Estado'],
  },
  compras: {
    title: 'Compras',
    description: 'Historial de abastecimiento y facturas.',
    icon: ShoppingCart,
    add: '/compras/nueva',
    addText: 'Nueva compra',
    columns: ['Fecha', 'Proveedor', 'N.º factura', 'Total'],
  },
  ventas: {
    title: 'Ventas',
    description: 'Consulta las ventas registradas.',
    icon: ReceiptText,
    add: '/ventas/nueva',
    addText: 'Nueva venta',
    columns: ['Fecha', 'Total'],
  },
}

const dateText = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString('es-BO') : '—'
const money = (value: unknown) => (value == null ? '—' : `Bs. ${String(value)}`)

function nombreProveedor(value: unknown): string {
  if (value && typeof value === 'object') {
    const nombre = (value as { nombre?: unknown }).nombre
    return nombre != null && nombre !== '' ? String(nombre) : '—'
  }
  if (value == null || value === '') return '—'
  return String(value)
}

export function ManagementPage({ resource }: { resource: Resource }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState('todos')
  const [category, setCategory] = useState('todas')
  const [supplierId, setSupplierId] = useState('todos')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const api = {
    productos: listProductos,
    proveedores: listProveedores,
    compras: listCompras,
    ventas: listVentas,
  }[resource]

  const params =
    resource === 'productos' || resource === 'proveedores'
      ? {
          q,
          activo: active === 'todos' ? undefined : active === 'activo',
          categoria:
            resource === 'productos' && category !== 'todas' ? category : undefined,
          page,
          pageSize: PAGE_SIZE,
        }
      : {
          proveedorId:
            resource === 'compras' && supplierId !== 'todos' ? supplierId : undefined,
          desde: from || undefined,
          hasta: to || undefined,
          page,
          pageSize: PAGE_SIZE,
        }

  const { data: supplierData } = useSWR(
    resource === 'compras' ? 'proveedores-filtro-compras' : null,
    () => listProveedores({ activo: true, pageSize: 100 }).then((r) => r.data)
  )
  const suppliers = Array.isArray(supplierData) ? supplierData : []

  type ListResult = { data: unknown[]; meta: MetaPaginacion }
  const { data, error, isLoading, mutate } = useSWR<ListResult>(
    [resource, params],
    () => api(params) as Promise<ListResult>
  )

  useEffect(() => {
    if (error) toast.error(error.message || 'No se pudo cargar la información.')
  }, [error])

  const rows = useMemo(
    () =>
      (Array.isArray(data?.data) ? data.data : []) as unknown as Record<
        string,
        unknown
      >[],
    [data]
  )
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1
  const title = config[resource]

  const remove = async (id: unknown) => {
    if (!window.confirm('¿Confirmas que deseas eliminar este registro?')) return
    try {
      await (resource === 'productos'
        ? eliminarProducto(String(id))
        : eliminarProveedor(String(id)))
      toast.success('Registro eliminado.')
      await mutate()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo eliminar el registro.'
      )
    }
  }

  const fields: Record<Resource, string[]> = {
    productos: [
      'codigo',
      'nombre',
      'marca',
      'categoria',
      'precioVenta',
      'stock',
      'stockMinimo',
      'activo',
    ],
    proveedores: ['nombre', 'nit', 'telefono', 'email', 'activo'],
    compras: ['fecha', 'proveedor', 'numeroFactura', 'total'],
    ventas: ['fecha', 'total'],
  }

  const valueOf = (row: Record<string, unknown>, key: string) => {
    if (key === 'activo') {
      return (
        <Badge variant={row[key] ? 'default' : 'secondary'}>
          {row[key] ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    }
    if (key === 'precioVenta' || key === 'total') return money(row[key])
    if (key === 'fecha') return dateText(row[key])
    if (key === 'proveedor') return nombreProveedor(row.proveedor)
    if (key === 'stock' && Number(row.stock) <= Number(row.stockMinimo)) {
      return <Badge variant="destructive">{String(row[key] ?? '—')}</Badge>
    }
    return String(row[key] ?? '—')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">GESTIÓN</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title.title}</h1>
          <p className="mt-2 text-muted-foreground">{title.description}</p>
        </div>
        <Button render={<Link href={title.add} />}>
          <Plus data-icon="inline-start" />
          {title.addText}
        </Button>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {(resource === 'productos' || resource === 'proveedores') && (
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Buscar"
                  placeholder="Buscar…"
                  className="pl-9"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            )}
            {resource === 'productos' && (
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v ?? 'todas')
                  setPage(1)
                }}
              >
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    {['Vino', 'Cerveza', 'Whisky', 'Vodka', 'Ron', 'Otros'].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            {(resource === 'productos' || resource === 'proveedores') && (
              <Select
                value={active}
                onValueChange={(v) => {
                  setActive(v ?? 'todos')
                  setPage(1)
                }}
              >
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activo">Activos</SelectItem>
                    <SelectItem value="inactivo">Inactivos</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            {resource === 'compras' && (
              <Select
                value={supplierId}
                onValueChange={(v) => {
                  setSupplierId(v ?? 'todos')
                  setPage(1)
                }}
              >
                <SelectTrigger className="md:w-56">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="todos">Todos los proveedores</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={String(supplier.id)} value={String(supplier.id)}>
                        {String(supplier.nombre)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            {(resource === 'compras' || resource === 'ventas') && (
              <>
                <Input
                  aria-label="Desde"
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    setPage(1)
                  }}
                />
                <Input
                  aria-label="Hasta"
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value)
                    setPage(1)
                  }}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {title.columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                  <TableHead className="w-14">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={title.columns.length + 1}
                      className="h-36 text-center"
                    >
                      <LoaderCircle className="mx-auto animate-spin text-primary" />
                      <span className="sr-only">Cargando datos</span>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={title.columns.length + 1}
                      className="h-36 text-center text-destructive"
                    >
                      {error.message || 'Error al cargar los datos.'}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={title.columns.length + 1}
                      className="h-36 text-center text-muted-foreground"
                    >
                      No hay registros para mostrar.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, i) => (
                    <TableRow key={String(row.id ?? i)}>
                      {fields[resource].map((key) => (
                        <TableCell key={key}>{valueOf(row, key)}</TableCell>
                      ))}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Abrir acciones"
                              >
                                <MoreHorizontal />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            {resource === 'compras' || resource === 'ventas' ? (
                              <DropdownMenuItem
                                render={<Link href={`/${resource}/${row.id}`} />}
                              >
                                <Eye data-icon="inline-start" />
                                Ver detalle
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                render={
                                  <Link href={`/${resource}/${row.id}/editar`} />
                                }
                              >
                                <Pencil data-icon="inline-start" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {(resource === 'productos' ||
                              resource === 'proveedores') && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => remove(row.id)}
                              >
                                <Trash2 data-icon="inline-start" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Página {meta?.page ?? page} de {totalPages}
              {meta?.total != null ? ` · ${meta.total} registro(s)` : ''}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
