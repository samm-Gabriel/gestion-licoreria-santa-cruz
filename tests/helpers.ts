import { NextRequest } from "next/server";
import * as productos from "@/app/api/productos/route";
import * as proveedores from "@/app/api/proveedores/route";
import * as compras from "@/app/api/compras/route";
import * as ventas from "@/app/api/ventas/route";
import type { ContextoId } from "@/lib/http";

type Metodo = "GET" | "POST" | "PATCH" | "DELETE";
type Handler = (req: NextRequest, ctx: ContextoId) => Promise<Response>;

export type Registro = { id: number; [campo: string]: unknown };
export type ErrorApi = { code: string; message: string; details?: unknown };
export type Respuesta<T> = {
  status: number;
  data: T;
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
  error?: ErrorApi;
};

/** Llama un route handler como lo haría Next: con NextRequest y params asíncronos. */
export async function llamar<
  T = Registro,
>(
  handler: Handler,
  ruta: string,
  opciones: { metodo?: Metodo; body?: unknown; id?: number | string } = {},
): Promise<Respuesta<T>> {
  const { metodo = "GET", body, id } = opciones;
  const req = new NextRequest(new URL(ruta, "http://localhost"), {
    method: metodo,
    ...(body !== undefined && {
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  });
  const res = await handler(req, { params: Promise.resolve({ id: String(id ?? "") }) });
  return { status: res.status, ...(await res.json()) };
}

let secuencia = 0;
const siguiente = () => `${Date.now() % 100_000}${++secuencia}`;

export async function crearProducto(datos: Record<string, unknown> = {}) {
  const res = await llamar(productos.POST, "/api/productos", {
    metodo: "POST",
    body: {
      codigo: `T-${siguiente()}`,
      nombre: `Producto prueba ${siguiente()}`,
      marca: "Santa Cruz",
      categoria: "cerveza",
      precioVenta: "25.50",
      stock: 10,
      stockMinimo: 3,
      ...datos,
    },
  });
  if (res.status !== 201) {
    throw new Error(`crearProducto: ${res.status} ${JSON.stringify(res.error)}`);
  }
  return res.data;
}

export async function crearProveedor(datos: Record<string, unknown> = {}) {
  const res = await llamar(proveedores.POST, "/api/proveedores", {
    metodo: "POST",
    body: {
      nombre: `Proveedor ${siguiente()}`,
      nit: `NIT${siguiente()}`.slice(0, 20),
      telefono: "70000000",
      ...datos,
    },
  });
  if (res.status !== 201) {
    throw new Error(`crearProveedor: ${res.status} ${JSON.stringify(res.error)}`);
  }
  return res.data;
}

export async function crearCompra(body: Record<string, unknown>) {
  const res = await llamar(compras.POST, "/api/compras", { metodo: "POST", body });
  if (res.status !== 201) {
    throw new Error(`crearCompra: ${res.status} ${JSON.stringify(res.error)}`);
  }
  return res.data;
}

export async function crearVenta(body: Record<string, unknown>) {
  return llamar(ventas.POST, "/api/ventas", { metodo: "POST", body });
}
