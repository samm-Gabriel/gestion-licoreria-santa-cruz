export type Decimal = string;

export interface MetaPaginacion {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductoResumen {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  marca: string | null;
  categoria: string | null;
  precioVenta: Decimal;
  stock: number;
  stockMinimo: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductoDetalle extends Producto {
  _count?: { lineasCompra: number; lineasVenta: number };
}

export interface ProductoCrear {
  codigo: string;
  nombre: string;
  marca?: string | null;
  categoria?: string | null;
  precioVenta: string | number;
  stock?: number;
  stockMinimo?: number;
  activo?: boolean;
}

export interface ProductoActualizar {
  codigo?: string;
  nombre?: string;
  marca?: string | null;
  categoria?: string | null;
  precioVenta?: string | number;
  stockMinimo?: number;
  activo?: boolean;
}

export interface Proveedor {
  id: number;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProveedorDetalle extends Proveedor {
  _count?: { compras: number };
}

export interface ProveedorCrear {
  nombre: string;
  nit?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo?: boolean;
}

export interface ProveedorActualizar {
  nombre?: string;
  nit?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo?: boolean;
}

export interface CompraLinea {
  id?: number;
  compraId?: number;
  productoId: number;
  cantidad: number;
  costoUnitario: Decimal;
  subtotal: Decimal;
  producto?: ProductoResumen;
  createdAt?: string;
  updatedAt?: string;
}

export interface Compra {
  id: number;
  proveedorId: number;
  proveedor?: Proveedor;
  fecha: string;
  numeroFactura: string | null;
  observaciones: string | null;
  total: Decimal;
  lineas?: CompraLinea[];
  createdAt: string;
  updatedAt: string;
}

export interface CompraLineaCrear {
  productoId: number;
  cantidad: number;
  costoUnitario: string | number;
}

export interface CompraCrear {
  proveedorId: number;
  fecha?: string;
  numeroFactura?: string | null;
  observaciones?: string | null;
  lineas: CompraLineaCrear[];
}

export interface CompraActualizar {
  fecha?: string;
  numeroFactura?: string | null;
  observaciones?: string | null;
}

export interface VentaLinea {
  id?: number;
  ventaId?: number;
  productoId: number;
  cantidad: number;
  precioUnitario: Decimal;
  subtotal: Decimal;
  producto?: ProductoResumen;
  createdAt?: string;
  updatedAt?: string;
}

export interface Venta {
  id: number;
  fecha: string;
  total: Decimal;
  lineas?: VentaLinea[];
  createdAt: string;
  updatedAt: string;
}

export interface VentaLineaCrear {
  productoId: number;
  cantidad: number;
  precioUnitario?: string | number;
}

export interface VentaCrear {
  fecha?: string;
  lineas: VentaLineaCrear[];
}

export interface ListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  activo?: "true" | "false";
  categoria?: string;
  proveedorId?: number;
  desde?: string;
  hasta?: string;
}
