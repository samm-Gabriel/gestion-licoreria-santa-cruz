'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { listProductos, listVentas } from '@/lib/api'
import { ArrowUpRight, Package, TriangleAlert, Banknote, Truck, ShoppingCart, ReceiptText, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const shortcuts = [
  { title: 'Registrar producto', description: 'Agrega artículos al inventario.', href: '/productos/nuevo', icon: Package },
  { title: 'Nueva compra', description: 'Registra una reposición de stock.', href: '/compras/nueva', icon: ShoppingCart },
  { title: 'Nueva venta', description: 'Registra una venta de mostrador.', href: '/ventas/nueva', icon: ReceiptText },
  { title: 'Proveedores', description: 'Consulta y administra contactos.', href: '/proveedores', icon: Truck },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function money(value: number) {
  return `Bs. ${value.toFixed(2)}`
}

export default function DashboardPage() {
  const hoy = todayISO()
  const { data: productosData } = useSWR('dashboard-productos', () =>
    listProductos({ pageSize: 100, activo: true }).then((r) => r.data)
  )
  const { data: ventasData } = useSWR(['dashboard-ventas', hoy], () =>
    listVentas({ desde: hoy, hasta: hoy, pageSize: 100 }).then((r) => r.data)
  )

  const products = Array.isArray(productosData) ? productosData : []
  const ventas = Array.isArray(ventasData) ? ventasData : []
  const lowStock = products.filter(
    (p) => Number(p.stock ?? 0) <= Number(p.stockMinimo ?? 0)
  )
  const cajaDelDia = ventas.reduce((acc, v) => acc + Number(v.total ?? 0), 0)

  const stats = [
    {
      title: 'Productos activos',
      value: productosData ? String(products.length) : '—',
      note: 'Catálogo disponible para venta',
      icon: Package,
      href: '/productos',
    },
    {
      title: 'Alertas de stock mínimo',
      value: productosData ? String(lowStock.length) : '—',
      note: 'Productos por reponer',
      icon: TriangleAlert,
      href: '/productos',
    },
    {
      title: 'Caja del día',
      value: ventasData ? money(cajaDelDia) : '—',
      note: `${ventas.length} venta${ventas.length === 1 ? '' : 's'} hoy`,
      icon: Banknote,
      href: '/ventas',
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">LICORERÍA SANTA CRUZ</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            Tablero de gestión
          </h1>
          <p className="mt-2 text-muted-foreground">
            Alertas de stock y caja del día en un vistazo.
          </p>
        </div>
        <Button render={<Link href="/ventas/nueva" />}>
          <Plus data-icon="inline-start" />
          Registrar venta
        </Button>
      </header>

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ title, value, note, icon: Icon, href }) => (
          <Link href={href} key={title} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{title}</CardDescription>
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">{value}</div>
                <p className="mt-1 text-sm text-muted-foreground">{note}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section aria-label="Alertas de stock">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Alertas de stock mínimo</h2>
            <p className="text-sm text-muted-foreground">
              Productos con stock igual o por debajo del mínimo.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/productos" />}>
            Ver inventario
          </Button>
        </div>
        {productosData == null ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Cargando alertas…</CardContent>
          </Card>
        ) : lowStock.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No hay productos bajo el stock mínimo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {lowStock.slice(0, 8).map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.codigo}
                      {p.marca ? ` · ${p.marca}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="destructive">
                      Stock {p.stock} / mín. {p.stockMinimo}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/productos/${p.id}/editar`} />}
                    >
                      Revisar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Accesos rápidos</h2>
          <p className="text-sm text-muted-foreground">Continúa con las tareas más frecuentes.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {shortcuts.map(({ title, description, href, icon: Icon }) => (
            <Link href={href} key={title}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
