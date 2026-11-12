import type { Prisma } from "@prisma/client";
import { ApiError, creado, leerJson, manejar, metaPaginacion, ok, parametros } from "@/lib/http";
import { prisma } from "@/lib/db";
import { proveedorCrear, proveedoresQuery } from "@/lib/validators";

function filtroBusquedaProveedor(q?: string): Prisma.ProveedorWhereInput {
  const palabras = (q ?? "").split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return {};
  return {
    AND: palabras.map((p) => ({
      OR: [
        { nombre: { contains: p, mode: "insensitive" } },
        { nit: { contains: p, mode: "insensitive" } },
      ],
    })),
  };
}

export const GET = manejar(async (req) => {
  const { q, page, pageSize, activo } = proveedoresQuery.parse(parametros(req));
  const where: Prisma.ProveedorWhereInput = {
    ...filtroBusquedaProveedor(q),
    ...(activo !== undefined && { activo }),
  };
  const [total, proveedores] = await prisma.$transaction([
    prisma.proveedor.count({ where }),
    prisma.proveedor.findMany({
      where,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return ok(proveedores, { meta: metaPaginacion(page, pageSize, total) });
});

export const POST = manejar(async (req) => {
  const datos = proveedorCrear.parse(await leerJson(req));
  if (datos.nit) {
    const existente = await prisma.proveedor.findUnique({ where: { nit: datos.nit } });
    if (existente) {
      throw new ApiError(
        409,
        "NIT_DUPLICADO",
        `Ya existe un proveedor con NIT ${datos.nit} (${existente.nombre})`,
        { proveedorId: existente.id },
      );
    }
  }
  const proveedor = await prisma.proveedor.create({
    data: {
      nombre: datos.nombre,
      nit: datos.nit ?? null,
      telefono: datos.telefono ?? null,
      email: datos.email ?? null,
      direccion: datos.direccion ?? null,
      activo: datos.activo,
    },
  });
  return creado(proveedor);
});
