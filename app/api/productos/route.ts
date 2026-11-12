import type { Prisma } from "@prisma/client";
import { ApiError, creado, leerJson, manejar, metaPaginacion, ok, parametros } from "@/lib/http";
import { decimalDesdeEntrada } from "@/lib/decimales";
import { prisma } from "@/lib/db";
import { productoCrear, productosQuery } from "@/lib/validators";

function filtroBusquedaProducto(q?: string): Prisma.ProductoWhereInput {
  const palabras = (q ?? "").split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return {};
  return {
    AND: palabras.map((p) => ({
      OR: [
        { nombre: { contains: p, mode: "insensitive" } },
        { codigo: { contains: p, mode: "insensitive" } },
        { marca: { contains: p, mode: "insensitive" } },
        { categoria: { contains: p, mode: "insensitive" } },
      ],
    })),
  };
}

export const GET = manejar(async (req) => {
  const { q, page, pageSize, activo, categoria } = productosQuery.parse(parametros(req));
  const where: Prisma.ProductoWhereInput = {
    ...filtroBusquedaProducto(q),
    ...(activo !== undefined && { activo }),
    ...(categoria && { categoria: { equals: categoria, mode: "insensitive" } }),
  };
  const [total, productos] = await prisma.$transaction([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return ok(productos, { meta: metaPaginacion(page, pageSize, total) });
});

export const POST = manejar(async (req) => {
  const datos = productoCrear.parse(await leerJson(req));
  const existente = await prisma.producto.findUnique({ where: { codigo: datos.codigo } });
  if (existente) {
    throw new ApiError(
      409,
      "CODIGO_DUPLICADO",
      `Ya existe un producto con código ${datos.codigo} (${existente.nombre})`,
      { productoId: existente.id },
    );
  }
  const producto = await prisma.producto.create({
    data: {
      codigo: datos.codigo,
      nombre: datos.nombre,
      marca: datos.marca ?? null,
      categoria: datos.categoria ?? null,
      precioVenta: decimalDesdeEntrada(datos.precioVenta),
      stock: datos.stock,
      stockMinimo: datos.stockMinimo,
      activo: datos.activo,
    },
  });
  return creado(producto);
});
