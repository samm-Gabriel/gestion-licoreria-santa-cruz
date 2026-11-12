import { ApiError, leerId, leerJson, manejar, noEncontrado, ok, type ContextoId } from "@/lib/http";
import { decimalDesdeEntrada } from "@/lib/decimales";
import { prisma } from "@/lib/db";
import { productoActualizar } from "@/lib/validators";

async function buscarProducto(id: number) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      _count: { select: { lineasCompra: true, lineasVenta: true } },
    },
  });
  if (!producto) throw noEncontrado(`No existe el producto con id ${id}`);
  return producto;
}

export const GET = manejar(async (_req, ctx: ContextoId) => {
  return ok(await buscarProducto(await leerId(ctx)));
});

export const PATCH = manejar(async (req, ctx: ContextoId) => {
  const id = await leerId(ctx);
  const datos = productoActualizar.parse(await leerJson(req));
  await buscarProducto(id);

  if (datos.codigo) {
    const otro = await prisma.producto.findUnique({ where: { codigo: datos.codigo } });
    if (otro && otro.id !== id) {
      throw new ApiError(
        409,
        "CODIGO_DUPLICADO",
        `Ya existe otro producto con código ${datos.codigo} (${otro.nombre})`,
        { productoId: otro.id },
      );
    }
  }

  const producto = await prisma.producto.update({
    where: { id },
    data: {
      ...datos,
      marca: datos.marca !== undefined ? datos.marca : undefined,
      categoria: datos.categoria !== undefined ? datos.categoria : undefined,
      precioVenta:
        datos.precioVenta !== undefined ? decimalDesdeEntrada(datos.precioVenta) : undefined,
    },
  });
  return ok(producto);
});

export const DELETE = manejar(async (_req, ctx: ContextoId) => {
  const id = await leerId(ctx);
  const producto = await buscarProducto(id);
  const movimientos = producto._count.lineasCompra + producto._count.lineasVenta;
  if (movimientos > 0) {
    throw new ApiError(
      409,
      "EN_USO",
      `No se puede eliminar el producto porque tiene ${movimientos} movimiento(s) en compras o ventas`,
    );
  }
  await prisma.producto.delete({ where: { id } });
  return ok({ id });
});
