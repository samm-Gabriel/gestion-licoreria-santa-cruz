import { Suspense } from 'react'
import { EntityForm } from '@/components/entity-form'

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Cargando…</div>}>
      <EntityForm entity="proveedor" />
    </Suspense>
  )
}
