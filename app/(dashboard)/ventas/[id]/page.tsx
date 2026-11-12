import { Suspense } from 'react'
import { TransactionDetail } from '@/components/transaction-detail'

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Cargando…</div>}>
      <TransactionDetail kind="venta" />
    </Suspense>
  )
}
