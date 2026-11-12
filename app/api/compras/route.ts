import type { Prisma } from "@prisma/client";
import { ApiError, creado, leerJson, manejar, metaPaginacion, noEncontrado, ok, parametros } from "@/lib/http";
import { decimalDesdeEntrada, multiplicarDecimal, sumarDecimales } from "@/lib/decimales";
import { fechaCalendario, hoyLocal } from "@/lib/fechas";
import { prisma } from "@/lib/db";
import { compraCrear, comprasQuery } from "@/lib/validators";

const includeCompra = {
  proveedor: true,
  lineas: {
    include: { producto: { select: { id: true, codigo: true, nombre: true } } },
    orderBy: { id: "asc" as const },
  },
};

export const GET = manejar(async (req) => {
  const { q, page, pageSize, proveedorId, desde, hasta } = comprasQuery.parse(parametros(req));
  const where: Prisma.CompraWhereInput = {
    ...(proveedorId && { proveedorId }),
    ...(desde || hasta
      ? {
          fecha: {
            ...(desde && { gte: fechaCalendario(desde) }),
            ...(hasta && { lte: fechaCalendario(hasta) }),
          },
        }
      : {}),
    ...(q && {
      OR: [
        { numeroFactura: { contains: q, mode: "insensitive" } },
        { observaciones: { contains: q, mode: "insensitive" } },
        { proveedor: { nombre: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };
  const [total, compras] = await prisma.$transaction([
    prisma.compra.count({ where }),
    prisma.compra.findMany({
      where,
      include: includeCompra,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return ok(compras, { meta: metaPaginacion(page, pageSize, total) });
});

export const POST = manejar(async (req) => {
  const datos = compraCrear.parse(await leerJson(req));
  const proveedor = await prisma.proveedor.findUnique({ where: { id: datos.proveedorId } });
  if (!proveedor) throw noEncontrado(`No existe el proveedor con id ${datos.proveedorId}`);
  if (!proveedor.activo) {
    throw new ApiError(422, "INACTIVO", "El proveedor está inactivo y no se pueden registrar compras");
  }

  const ids = [...new Set(datos.lineas.map((l) => l.productoId))];
  const productos = await prisma.producto.findMany({ where: { id: { in: ids } } });
  const mapa = new Map(productos.map((p) => [p.id, p]));
  for (const linea of datos.lineas) {
    const producto = mapa.get(linea.productoId);
    if (!producto) throw noEncontrado(`No existe el producto con id ${linea.productoId}`);
  }

  const lineasData = datos.lineas.map((l) => {
    const subtotal = multiplicarDecimal(l.cantidad, l.costoUnitario);
    return {
      productoId: l.productoId,
      cantidad: l.cantidad,
      costoUnitario: decimalDesdeEntrada(l.costoUnitario),
      subtotal,
    };
  });
  const total = sumarDecimales(...lineasData.map((l) => l.subtotal));
  const fecha = datos.fecha ? fechaCalendario(datos.fecha) : fechaCalendario(hoyLocal());

  const compra = await prisma.$transaction(async (tx) => {
    const creada = await tx.compra.create({
      data: {
        proveedorId: datos.proveedorId,
        fecha,
        numeroFactura: datos.numeroFactura ?? null,
        observaciones: datos.observaciones ?? null,
        total,
        lineas: { create: lineasData },
      },
      include: includeCompra,
    });
    for (const linea of datos.lineas) {
      await tx.producto.update({
        where: { id: linea.productoId },
        data: { stock: { increment: linea.cantidad } },
      });
    }
    return creada;
  });

  return creado(compra);
});
