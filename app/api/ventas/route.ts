import type { Prisma } from "@prisma/client";
import { ApiError, creado, leerJson, manejar, metaPaginacion, noEncontrado, ok, parametros } from "@/lib/http";
import { decimalDesdeEntrada, multiplicarDecimal, sumarDecimales } from "@/lib/decimales";
import { fechaCalendario } from "@/lib/fechas";
import { prisma } from "@/lib/db";
import { ventaCrear, ventasQuery } from "@/lib/validators";

const includeVenta = {
  lineas: {
    include: { producto: { select: { id: true, codigo: true, nombre: true } } },
    orderBy: { id: "asc" as const },
  },
};

export const GET = manejar(async (req) => {
  const { q, page, pageSize, desde, hasta } = ventasQuery.parse(parametros(req));
  const where: Prisma.VentaWhereInput = {
    ...(desde || hasta
      ? {
          fecha: {
            ...(desde && { gte: fechaCalendario(desde) }),
            ...(hasta && {
              lt: new Date(fechaCalendario(hasta).getTime() + 24 * 60 * 60 * 1000),
            }),
          },
        }
      : {}),
    ...(q && {
      lineas: {
        some: {
          producto: {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { codigo: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    }),
  };
  const [total, ventas] = await prisma.$transaction([
    prisma.venta.count({ where }),
    prisma.venta.findMany({
      where,
      include: includeVenta,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return ok(ventas, { meta: metaPaginacion(page, pageSize, total) });
});

export const POST = manejar(async (req) => {
  const datos = ventaCrear.parse(await leerJson(req));

  const ids = [...new Set(datos.lineas.map((l) => l.productoId))];
  const productos = await prisma.producto.findMany({ where: { id: { in: ids } } });
  const mapa = new Map(productos.map((p) => [p.id, p]));

  const faltantes: { productoId: number; nombre: string; stock: number; solicitado: number }[] = [];
  for (const linea of datos.lineas) {
    const producto = mapa.get(linea.productoId);
    if (!producto) throw noEncontrado(`No existe el producto con id ${linea.productoId}`);
    if (!producto.activo) {
      throw new ApiError(422, "INACTIVO", `El producto ${producto.nombre} está inactivo`);
    }
    if (producto.stock < linea.cantidad) {
      faltantes.push({
        productoId: producto.id,
        nombre: producto.nombre,
        stock: producto.stock,
        solicitado: linea.cantidad,
      });
    }
  }
  if (faltantes.length > 0) {
    throw new ApiError(409, "SIN_STOCK", "No hay stock suficiente para completar la venta", {
      productos: faltantes,
    });
  }

  const lineasData = datos.lineas.map((l) => {
    const producto = mapa.get(l.productoId)!;
    const unitario = l.precioUnitario ?? producto.precioVenta.toString();
    const subtotal = multiplicarDecimal(l.cantidad, unitario);
    return {
      productoId: l.productoId,
      cantidad: l.cantidad,
      precioUnitario: decimalDesdeEntrada(unitario),
      subtotal,
    };
  });
  const total = sumarDecimales(...lineasData.map((l) => l.subtotal));
  const fecha = datos.fecha ? new Date(datos.fecha) : new Date();

  const venta = await prisma.$transaction(async (tx) => {
    const creada = await tx.venta.create({
      data: {
        fecha,
        total,
        lineas: { create: lineasData },
      },
      include: includeVenta,
    });
    for (const linea of datos.lineas) {
      const actualizado = await tx.producto.update({
        where: { id: linea.productoId },
        data: { stock: { decrement: linea.cantidad } },
      });
      if (actualizado.stock < 0) {
        throw new ApiError(409, "SIN_STOCK", "No hay stock suficiente para completar la venta");
      }
    }
    return creada;
  });

  return creado(venta);
});
