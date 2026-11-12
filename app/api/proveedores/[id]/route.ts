import { ApiError, leerId, leerJson, manejar, noEncontrado, ok, type ContextoId } from "@/lib/http";
import { prisma } from "@/lib/db";
import { proveedorActualizar } from "@/lib/validators";

async function buscarProveedor(id: number) {
  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: { _count: { select: { compras: true } } },
  });
  if (!proveedor) throw noEncontrado(`No existe el proveedor con id ${id}`);
  return proveedor;
}

export const GET = manejar(async (_req, ctx: ContextoId) => {
  return ok(await buscarProveedor(await leerId(ctx)));
});

export const PATCH = manejar(async (req, ctx: ContextoId) => {
  const id = await leerId(ctx);
  const datos = proveedorActualizar.parse(await leerJson(req));
  await buscarProveedor(id);

  if (datos.nit) {
    const otro = await prisma.proveedor.findUnique({ where: { nit: datos.nit } });
    if (otro && otro.id !== id) {
      throw new ApiError(
        409,
        "NIT_DUPLICADO",
        `Ya existe otro proveedor con NIT ${datos.nit} (${otro.nombre})`,
        { proveedorId: otro.id },
      );
    }
  }

  const proveedor = await prisma.proveedor.update({
    where: { id },
    data: {
      ...datos,
      nit: datos.nit !== undefined ? datos.nit : undefined,
      telefono: datos.telefono !== undefined ? datos.telefono : undefined,
      email: datos.email !== undefined ? datos.email : undefined,
      direccion: datos.direccion !== undefined ? datos.direccion : undefined,
    },
  });
  return ok(proveedor);
});

export const DELETE = manejar(async (_req, ctx: ContextoId) => {
  const id = await leerId(ctx);
  const proveedor = await buscarProveedor(id);
  if (proveedor._count.compras > 0) {
    throw new ApiError(
      409,
      "EN_USO",
      `No se puede eliminar el proveedor porque tiene ${proveedor._count.compras} compra(s) registrada(s)`,
    );
  }
  await prisma.proveedor.delete({ where: { id } });
  return ok({ id });
});
