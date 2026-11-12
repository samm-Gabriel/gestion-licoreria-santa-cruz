import type {
  Compra,
  CompraActualizar,
  CompraCrear,
  ListParams,
  MetaPaginacion,
  Producto,
  ProductoActualizar,
  ProductoCrear,
  ProductoDetalle,
  Proveedor,
  ProveedorActualizar,
  ProveedorCrear,
  ProveedorDetalle,
  Venta,
  VentaCrear,
} from "./types";

export type ApiRecord = Record<string, unknown>;

interface ApiErrorBody {
  error?: { message?: string };
}

interface UiListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  activo?: boolean | "true" | "false" | string;
  categoria?: string;
  proveedorId?: number | string;
  desde?: string;
  hasta?: string;
}

function toListParams(params?: UiListParams): ListParams | undefined {
  if (!params) return undefined;
  const out: ListParams = {
    q: params.q,
    page: params.page,
    pageSize: params.pageSize ?? params.limit,
    categoria: params.categoria,
    desde: params.desde,
    hasta: params.hasta,
    proveedorId:
      params.proveedorId !== undefined && params.proveedorId !== "todos"
        ? Number(params.proveedorId)
        : undefined,
  };
  if (
    params.activo === true ||
    params.activo === "activo" ||
    params.activo === "true"
  )
    out.activo = "true";
  else if (
    params.activo === false ||
    params.activo === "inactivo" ||
    params.activo === "false"
  )
    out.activo = "false";
  return out;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!res.ok) {
    const message =
      (json as ApiErrorBody).error?.message ??
      `Error ${res.status} al llamar ${path}`;
    throw new Error(message);
  }
  return json;
}

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function listProductos(
  params?: UiListParams
): Promise<{ data: Producto[]; meta: MetaPaginacion }> {
  const normalized = toListParams(params);
  return request(
    `/productos${qs(normalized as Record<string, string | number | undefined>)}`
  );
}

export async function obtenerProducto(
  id: number | string
): Promise<{ data: ProductoDetalle }> {
  return request(`/productos/${Number(id)}`);
}

export async function crearProducto(
  body: ProductoCrear | ApiRecord
): Promise<{ data: Producto }> {
  return request("/productos", { method: "POST", body: JSON.stringify(body) });
}

export async function actualizarProducto(
  id: number | string,
  body: ProductoActualizar | ApiRecord
): Promise<{ data: Producto }> {
  return request(`/productos/${Number(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function eliminarProducto(
  id: number | string
): Promise<{ data: { id: number } }> {
  return request(`/productos/${Number(id)}`, { method: "DELETE" });
}

export async function listProveedores(
  params?: UiListParams
): Promise<{ data: Proveedor[]; meta: MetaPaginacion }> {
  const normalized = toListParams(params);
  return request(
    `/proveedores${qs(normalized as Record<string, string | number | undefined>)}`
  );
}

export async function obtenerProveedor(
  id: number | string
): Promise<{ data: ProveedorDetalle }> {
  return request(`/proveedores/${Number(id)}`);
}

export async function crearProveedor(
  body: ProveedorCrear | ApiRecord
): Promise<{ data: Proveedor }> {
  return request("/proveedores", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function actualizarProveedor(
  id: number | string,
  body: ProveedorActualizar | ApiRecord
): Promise<{ data: Proveedor }> {
  return request(`/proveedores/${Number(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function eliminarProveedor(
  id: number | string
): Promise<{ data: { id: number } }> {
  return request(`/proveedores/${Number(id)}`, { method: "DELETE" });
}

export async function listCompras(
  params?: UiListParams
): Promise<{ data: Compra[]; meta: MetaPaginacion }> {
  const normalized = toListParams(params);
  return request(
    `/compras${qs(normalized as Record<string, string | number | undefined>)}`
  );
}

export async function obtenerCompra(
  id: number | string
): Promise<{ data: Compra }> {
  return request(`/compras/${Number(id)}`);
}

export async function crearCompra(
  body: CompraCrear | ApiRecord
): Promise<{ data: Compra }> {
  const raw = body as ApiRecord;
  const payload: CompraCrear = {
    proveedorId: Number(raw.proveedorId),
    fecha: raw.fecha ? String(raw.fecha) : undefined,
    numeroFactura:
      raw.numeroFactura != null ? String(raw.numeroFactura) : null,
    observaciones:
      raw.observaciones != null ? String(raw.observaciones) : null,
    lineas: (Array.isArray(raw.lineas) ? raw.lineas : []).map((line) => {
      const l = line as ApiRecord;
      return {
        productoId: Number(l.productoId),
        cantidad: Number(l.cantidad),
        costoUnitario: l.costoUnitario as string | number,
      };
    }),
  };
  return request("/compras", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function actualizarCompra(
  id: number | string,
  body: CompraActualizar
): Promise<{ data: Compra }> {
  return request(`/compras/${Number(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function anularCompra(
  id: number | string
): Promise<{ data: { id: number } }> {
  return request(`/compras/${Number(id)}`, { method: "DELETE" });
}

export async function listVentas(
  params?: UiListParams
): Promise<{ data: Venta[]; meta: MetaPaginacion }> {
  const normalized = toListParams(params);
  return request(
    `/ventas${qs(normalized as Record<string, string | number | undefined>)}`
  );
}

export async function obtenerVenta(
  id: number | string
): Promise<{ data: Venta }> {
  return request(`/ventas/${Number(id)}`);
}

export async function crearVenta(
  body: VentaCrear | ApiRecord
): Promise<{ data: Venta }> {
  const raw = body as ApiRecord;
  const payload: VentaCrear = {
    fecha: raw.fecha ? String(raw.fecha) : undefined,
    lineas: (Array.isArray(raw.lineas) ? raw.lineas : []).map((line) => {
      const l = line as ApiRecord;
      return {
        productoId: Number(l.productoId),
        cantidad: Number(l.cantidad),
        ...(l.precioUnitario != null && l.precioUnitario !== ""
          ? { precioUnitario: l.precioUnitario as string | number }
          : {}),
      };
    }),
  };
  return request("/ventas", { method: "POST", body: JSON.stringify(payload) });
}

export async function anularVenta(
  id: number | string
): Promise<{ data: { id: number } }> {
  return request(`/ventas/${Number(id)}`, { method: "DELETE" });
}
