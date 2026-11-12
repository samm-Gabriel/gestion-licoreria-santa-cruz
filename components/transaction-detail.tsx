'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ArrowLeft, Ban, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { obtenerCompra, obtenerVenta, anularCompra, anularVenta } from '@/lib/api'
import type { ApiRecord } from '@/lib/api'

export function TransactionDetail({ kind }: { kind: 'compra' | 'venta' }) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const purchase = kind === 'compra'
  const root = purchase ? '/compras' : '/ventas'
  const get = purchase ? obtenerCompra : obtenerVenta
  const { data, error, isLoading } = useSWR([kind, id], () => get(id).then((r) => r.data))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (error) toast.error(error.message || 'No se pudo cargar el detalle.')
  }, [error])

  if (isLoading) {
    return (
      <div className="grid min-h-64 place-items-center">
        <LoaderCircle className="animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" render={<Link href={root} />} className="w-fit">
          <ArrowLeft data-icon="inline-start" />
          Volver
        </Button>
        <p className="text-sm text-destructive">
          {error?.message || 'No se encontró el registro.'}
        </p>
      </div>
    )
  }

  const record = data as unknown as ApiRecord
  const lines = (record.lineas ?? []) as ApiRecord[]

  const cancel = async () => {
    if (!window.confirm(`¿Confirmas que deseas anular esta ${kind}?`)) return
    setBusy(true)
    try {
      await (purchase ? anularCompra(id) : anularVenta(id))
      toast.success(`${purchase ? 'Compra' : 'Venta'} anulada.`)
      router.push(root)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo anular.')
    } finally {
      setBusy(false)
    }
  }

  const proveedorNombre =
    typeof record.proveedor === 'object' && record.proveedor
      ? String((record.proveedor as ApiRecord).nombre ?? '—')
      : String(record.proveedor ?? '—')

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" render={<Link href={root} />} className="w-fit">
        <ArrowLeft data-icon="inline-start" />
        Volver a {purchase ? 'compras' : 'ventas'}
      </Button>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">
            DETALLE DE {purchase ? 'COMPRA' : 'VENTA'}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {purchase ? 'Compra' : 'Venta'} #{String(record.id ?? id)}
          </h1>
        </div>
        <Button variant="destructive" onClick={cancel} disabled={busy}>
          {busy ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Ban data-icon="inline-start" />
          )}
          Anular {kind}
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Fecha</p>
            <p className="mt-1 font-medium">
              {record.fecha
                ? new Date(String(record.fecha)).toLocaleDateString('es-BO')
                : '—'}
            </p>
          </div>
          {purchase && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="mt-1 font-medium">{proveedorNombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Número de factura</p>
                <p className="mt-1 font-medium">{String(record.numeroFactura ?? '—')}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            <Badge className="mt-1" variant="secondary">
              Registrada
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-1 text-xl font-semibold">Bs. {String(record.total ?? '0.00')}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>{purchase ? 'Costo unitario' : 'Precio unitario'}</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Sin líneas
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={String(line.id ?? index)}>
                      <TableCell>
                        {typeof line.producto === 'object' && line.producto
                          ? String((line.producto as ApiRecord).nombre ?? '—')
                          : String(line.producto ?? line.productoId ?? '—')}
                      </TableCell>
                      <TableCell>{String(line.cantidad ?? '—')}</TableCell>
                      <TableCell>
                        Bs.{' '}
                        {String(
                          purchase
                            ? (line.costoUnitario ?? '—')
                            : (line.precioUnitario ?? '—')
                        )}
                      </TableCell>
                      <TableCell>Bs. {String(line.subtotal ?? '—')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
