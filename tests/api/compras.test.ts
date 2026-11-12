import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import * as compra from "@/app/api/compras/[id]/route";
import * as compras from "@/app/api/compras/route";
import * as productoId from "@/app/api/productos/[id]/route";
import {
  crearCompra,
  crearProducto,
  crearProveedor,
  llamar,
  type Registro,
} from "../helpers";

async function stockDe(id: number) {
  const res = await productoId.GET(new NextRequest("http://localhost/api/productos/x"), {
    params: Promise.resolve({ id: String(id) }),
  });
  return (await res.json()).data.stock as number;
}

describe("API /api/compras (#8)", () => {
  it("crea una compra válida (201) e incrementa stock (#8)", async () => {
    const proveedor = await crearProveedor();
    const producto = await crearProducto({ stock: 5, codigo: "CMP-01" });

    const res = await llamar(compras.POST, "/api/compras", {
      metodo: "POST",
      body: {
        proveedorId: proveedor.id,
        numeroFactura: "F-100",
        lineas: [{ productoId: producto.id, cantidad: 10, costoUnitario: "8.00" }],
      },
    });
    expect(res.status).toBe(201);
    expect(Number(res.data.total)).toBe(80);
    expect(res.data.lineas).toHaveLength(1);
    expect(await stockDe(producto.id)).toBe(15);
  });

  it("rechaza compra inválida con 400 VALIDACION (#8)", async () => {
    const res = await llamar(compras.POST, "/api/compras", {
      metodo: "POST",
      body: { proveedorId: 0, lineas: [] },
    });
    expect(res.status).toBe(400);
    expect(res.error?.code).toBe("VALIDACION");
  });

  it("GET de una compra inexistente → 404 NO_ENCONTRADO (#8)", async () => {
    const res = await llamar(compra.GET, "/api/compras/999999", { id: 999999 });
    expect(res.status).toBe(404);
    expect(res.error?.code).toBe("NO_ENCONTRADO");
  });

  it("actualiza metadatos de una compra (200) (#8)", async () => {
    const proveedor = await crearProveedor();
    const producto = await crearProducto({ codigo: "CMP-UPD" });
    const creada = await crearCompra({
      proveedorId: proveedor.id,
      lineas: [{ productoId: producto.id, cantidad: 2, costoUnitario: "5.00" }],
    });

    const res = await llamar(compra.PATCH, "/api/compras/x", {
      metodo: "PATCH",
      id: creada.id,
      body: { numeroFactura: "F-UPDATED", observaciones: "Ajuste" },
    });
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      numeroFactura: "F-UPDATED",
      observaciones: "Ajuste",
    });
  });

  it("elimina una compra y revierte stock (200) (#8)", async () => {
    const proveedor = await crearProveedor();
    const producto = await crearProducto({ stock: 10, codigo: "CMP-DEL" });
    const creada = await crearCompra({
      proveedorId: proveedor.id,
      lineas: [{ productoId: producto.id, cantidad: 4, costoUnitario: "3.00" }],
    });

    const res = await llamar(compra.DELETE, "/api/compras/x", {
      metodo: "DELETE",
      id: creada.id,
    });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: creada.id });
    expect(await stockDe(producto.id)).toBe(10);
  });

  it("listado con ?q= filtra por factura o proveedor (#8)", async () => {
    const proveedor = await crearProveedor({ nombre: "Filtro Proveedor XYZ" });
    const producto = await crearProducto({ codigo: "CMP-Q" });
    await crearCompra({
      proveedorId: proveedor.id,
      numeroFactura: "FACT-ESPECIAL",
      lineas: [{ productoId: producto.id, cantidad: 1, costoUnitario: "1.00" }],
    });

    const porFactura = await llamar<Registro[]>(compras.GET, "/api/compras?q=FACT-ESPECIAL");
    expect(porFactura.status).toBe(200);
    expect(porFactura.data).toHaveLength(1);
    expect(porFactura.meta?.total).toBe(1);

    const porProveedor = await llamar<Registro[]>(compras.GET, "/api/compras?q=XYZ");
    expect(porProveedor.data).toHaveLength(1);
  });
});
