import { ApiError, leerId, leerJson, manejar, noEncontrado, ok, type ContextoId } from "@/lib/http";
import { fechaCalendario } from "@/lib/fechas";
import { prisma } from "@/lib/db";
import { compraActualizar } from "@/lib/validators";

const includeCompra = {
  proveedor: true,
  lineas: {
    include: { producto: { select: { id: true, codigo: true, nombre: true } } },
    orderBy: { id: "asc" as const },
  },
};

async function buscarCompra(id: number) {
  const compra = await prisma.compra.findUnique({ where: { id }, include: includeCompra });
  if (!compra) throw noEncontrado(`No existe la compra con id ${id}`);
  return compra;
}

export const GET = manejar(async (_req, ctx: ContextoId) => {
  return ok(await buscarCompra(await leerId(ctx)));
});

export const PATCH = manejar(async (req, ctx: ContextoId) => {
  const id = await leerId(ctx);
  const datos = compraActualizar.parse(await leerJson(req));
  await buscarCompra(id);
  const compra = await prisma.compra.update({
    where: { id },
    data: {
      ...(datos.fecha !== undefined && { fecha: fechaCalendario(datos.fecha) }),
      ...(datos.numeroFactura !== undefined && { numeroFactura: datos.numeroFactura }),
      ...(datos.observaciones !== undefined && { observaciones: datos.observaciones }),
    },
    include: includeCompra,
  });
  return ok(compra);
});

export const DELETE = manejar(async (_req, ctx: ContextoId) => {
  const id = await leerId(ctx);
  const compra = await buscarCompra(id);

  await prisma.$transaction(async (tx) => {
    for (const linea of compra.lineas) {
      const producto = await tx.producto.findUnique({ where: { id: linea.productoId } });
      if (!producto) continue;
      if (producto.stock < linea.cantidad) {
        throw new ApiError(
          409,
          "CONFLICTO",
          `No se puede anular la compra: el producto ${producto.nombre} no tiene stock suficiente para revertir`,
          { productoId: producto.id, stock: producto.stock, cantidad: linea.cantidad },
        );
      }
      await tx.producto.update({
        where: { id: linea.productoId },
        data: { stock: { decrement: linea.cantidad } },
      });
    }
    await tx.compra.delete({ where: { id } });
  });

  return ok({ id });
});
