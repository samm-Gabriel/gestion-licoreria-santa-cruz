'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useState } from 'react'
import { LayoutDashboard, Package, Truck, ShoppingCart, ReceiptText, Wine, Moon, Sun, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Tablero', icon: LayoutDashboard },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/ventas', label: 'Ventas', icon: ReceiptText },
]

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return <nav aria-label="Navegación principal" className="flex flex-col gap-1">{links.map(({ href, label, icon: Icon }) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
    return <Link key={href} href={href} onClick={onNavigate} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}><Icon data-icon="inline-start" />{label}</Link>
  })}</nav>
}

export function Sidebar() {
  const [dark, setDark] = useState(false)
  const toggleTheme = () => { document.documentElement.classList.toggle('dark', !dark); setDark(!dark) }
  const brand = <div className="flex items-center gap-3 px-2 py-1"><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Wine /></div><div><p className="font-semibold leading-tight">Santa Cruz</p><p className="text-xs text-muted-foreground">Gestión Licorería</p></div></div>
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card px-4 py-6 md:flex">{brand}<Separator className="my-7"/><Suspense fallback={null}><Navigation/></Suspense><div className="mt-auto"><Separator className="mb-4"/><Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={toggleTheme}>{dark ? <Sun data-icon="inline-start"/> : <Moon data-icon="inline-start"/>}{dark ? 'Modo claro' : 'Modo oscuro'}</Button></div></aside>
    <div className="fixed left-4 top-4 z-30 md:hidden"><Sheet><SheetTrigger render={<Button variant="outline" size="icon" aria-label="Abrir menú"><Menu /></Button>} /><SheetContent side="left" className="flex flex-col gap-6"><SheetTitle>{brand}</SheetTitle><Suspense fallback={null}><Navigation/></Suspense><Button variant="ghost" className="mt-auto justify-start" onClick={toggleTheme}>{dark ? <Sun data-icon="inline-start"/> : <Moon data-icon="inline-start"/>}{dark ? 'Modo claro' : 'Modo oscuro'}</Button></SheetContent></Sheet></div>
  </>
}
