import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fechaCalendario, hoyLocal } from "../lib/fechas";

const prisma = new PrismaClient();

const productos = [
  { codigo: "RON-750", nombre: "Ron Barceló Añejo 750 ml", marca: "Barceló", categoria: "Ron", precioVenta: "95.00", stock: 24, stockMinimo: 6 },
  { codigo: "VOD-750", nombre: "Vodka Absolut 750 ml", marca: "Absolut", categoria: "Vodka", precioVenta: "120.00", stock: 18, stockMinimo: 5 },
  { codigo: "GIN-750", nombre: "Gin Beefeater 750 ml", marca: "Beefeater", categoria: "Gin", precioVenta: "145.00", stock: 12, stockMinimo: 4 },
  { codigo: "CER-PAC", nombre: "Cerveza Paceña lata 355 ml (pack x6)", marca: "Paceña", categoria: "Cerveza", precioVenta: "48.00", stock: 40, stockMinimo: 12 },
  { codigo: "VIN-TINTO", nombre: "Vino tinto Cuesta Vieja 750 ml", marca: "Cuesta Vieja", categoria: "Vino", precioVenta: "55.00", stock: 8, stockMinimo: 6 },
  { codigo: "WHI-750", nombre: "Whisky Johnnie Walker Red 750 ml", marca: "Johnnie Walker", categoria: "Whisky", precioVenta: "210.00", stock: 3, stockMinimo: 4 },
];

const proveedores = [
  {
    nombre: "Distribuidora Andina S.R.L.",
    nit: "1020304050",
    telefono: "+591 33445566",
    email: "ventas@andina.example",
    direccion: "Av. Busch, Santa Cruz",
  },
  {
    nombre: "Importadora del Sur Ltda.",
    nit: "1098765432",
    telefono: "+591 77889900",
    email: "compras@delsur.example",
    direccion: "Zona Equipetrol, Santa Cruz",
  },
];

async function main() {
  const productosDb = [];
  for (const p of productos) {
    productosDb.push(
      await prisma.producto.upsert({
        where: { codigo: p.codigo },
        update: {},
        create: p,
      }),
    );
  }

  const proveedoresDb = [];
  for (const pr of proveedores) {
    proveedoresDb.push(
      await prisma.proveedor.upsert({
        where: { nit: pr.nit },
        update: {},
        create: pr,
      }),
    );
  }

  if ((await prisma.compra.count()) === 0) {
    const ron = productosDb.find((p) => p.codigo === "RON-750")!;
    const cerveza = productosDb.find((p) => p.codigo === "CER-PAC")!;
    await prisma.compra.create({
      data: {
        proveedorId: proveedoresDb[0].id,
        fecha: fechaCalendario(hoyLocal()),
        numeroFactura: "FAC-2026-001",
        observaciones: "Reposición de temporada",
        total: "738.00",
        lineas: {
          create: [
            {
              productoId: ron.id,
              cantidad: 12,
              costoUnitario: "62.50",
              subtotal: "750.00",
            },
            {
              productoId: cerveza.id,
              cantidad: 20,
              costoUnitario: "36.00",
              subtotal: "720.00",
            },
          ],
        },
      },
    });
  }

  if ((await prisma.venta.count()) === 0) {
    const vodka = productosDb.find((p) => p.codigo === "VOD-750")!;
    const gin = productosDb.find((p) => p.codigo === "GIN-750")!;
    await prisma.venta.create({
      data: {
        fecha: new Date(),
        total: "385.00",
        lineas: {
          create: [
            {
              productoId: vodka.id,
              cantidad: 2,
              precioUnitario: "120.00",
              subtotal: "240.00",
            },
            {
              productoId: gin.id,
              cantidad: 1,
              precioUnitario: "145.00",
              subtotal: "145.00",
            },
          ],
        },
      },
    });
  }

  console.log(
    `Seed listo: ${productosDb.length} productos, ${proveedoresDb.length} proveedores, ${await prisma.compra.count()} compras, ${await prisma.venta.count()} ventas.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
