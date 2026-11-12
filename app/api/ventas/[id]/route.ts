import { ApiError, leerId, manejar, noEncontrado, ok, type ContextoId } from "@/lib/http";
import { prisma } from "@/lib/db";

const includeVenta = {
  lineas: {
    include: { producto: { select: { id: true, codigo: true, nombre: true } } },
    orderBy: { id: "asc" as const },
  },
};

async function buscarVenta(id: number) {
  const venta = await prisma.venta.findUnique({ where: { id }, include: includeVenta });
  if (!venta) throw noEncontrado(`No existe la venta con id ${id}`);
  return venta;
}

export const GET = manejar(async (_req, ctx: ContextoId) => {
  return ok(await buscarVenta(await leerId(ctx)));
});

export const PATCH = manejar(async () => {
  throw new ApiError(400, "VALIDACION", "Las ventas no admiten actualización; anula con DELETE si corresponde");
});

export const DELETE = manejar(async (_req, ctx: ContextoId) => {
  const id = await leerId(ctx);
  const venta = await buscarVenta(id);

  await prisma.$transaction(async (tx) => {
    for (const linea of venta.lineas) {
      await tx.producto.update({
        where: { id: linea.productoId },
        data: { stock: { increment: linea.cantidad } },
      });
    }
    await tx.venta.delete({ where: { id } });
  });

  return ok({ id });
});
