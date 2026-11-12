import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import * as venta from "@/app/api/ventas/[id]/route";
import * as ventas from "@/app/api/ventas/route";
import * as productoId from "@/app/api/productos/[id]/route";
import { crearProducto, crearVenta, llamar, type Registro } from "../helpers";

async function stockDe(id: number) {
  const res = await productoId.GET(new NextRequest("http://localhost/api/productos/x"), {
    params: Promise.resolve({ id: String(id) }),
  });
  return (await res.json()).data.stock as number;
}

describe("API /api/ventas (#8)", () => {
  it("crea una venta válida (201) y decrementa stock (#8)", async () => {
    const producto = await crearProducto({ stock: 10, precioVenta: "15.00", codigo: "VTA-OK" });
    const res = await crearVenta({
      lineas: [{ productoId: producto.id, cantidad: 3 }],
    });
    expect(res.status).toBe(201);
    expect(Number(res.data.total)).toBe(45);
    expect(res.data.lineas).toHaveLength(1);
    expect(await stockDe(producto.id)).toBe(7);
  });

  it("venta con stock insuficiente → 409 SIN_STOCK (#8)", async () => {
    const producto = await crearProducto({ stock: 2, codigo: "VTA-SIN" });
    const res = await crearVenta({
      lineas: [{ productoId: producto.id, cantidad: 5 }],
    });
    expect(res.status).toBe(409);
    expect(res.error?.code).toBe("SIN_STOCK");
    expect(res.error?.details).toMatchObject({
      productos: [
        expect.objectContaining({
          productoId: producto.id,
          stock: 2,
          solicitado: 5,
        }),
      ],
    });
    expect(await stockDe(producto.id)).toBe(2);
  });

  it("rechaza venta inválida con 400 VALIDACION (#8)", async () => {
    const res = await crearVenta({ lineas: [] });
    expect(res.status).toBe(400);
    expect(res.error?.code).toBe("VALIDACION");
  });

  it("GET de una venta inexistente → 404 NO_ENCONTRADO (#8)", async () => {
    const res = await llamar(venta.GET, "/api/ventas/999999", { id: 999999 });
    expect(res.status).toBe(404);
    expect(res.error?.code).toBe("NO_ENCONTRADO");
  });

  it("PATCH de venta → 400 VALIDACION (#8)", async () => {
    const producto = await crearProducto({ stock: 5, codigo: "VTA-PATCH" });
    const creada = await crearVenta({ lineas: [{ productoId: producto.id, cantidad: 1 }] });
    const res = await llamar(venta.PATCH, "/api/ventas/x", {
      metodo: "PATCH",
      id: creada.data.id,
      body: { total: "1.00" },
    });
    expect(res.status).toBe(400);
    expect(res.error?.code).toBe("VALIDACION");
  });

  it("elimina una venta y devuelve stock (200) (#8)", async () => {
    const producto = await crearProducto({ stock: 8, codigo: "VTA-DEL" });
    const creada = await crearVenta({ lineas: [{ productoId: producto.id, cantidad: 3 }] });
    expect(await stockDe(producto.id)).toBe(5);

    const res = await llamar(venta.DELETE, "/api/ventas/x", {
      metodo: "DELETE",
      id: creada.data.id,
    });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: creada.data.id });
    expect(await stockDe(producto.id)).toBe(8);
  });

  it("listado con ?q= filtra por producto en líneas (#8)", async () => {
    const a = await crearProducto({ stock: 5, codigo: "VTA-Q1", nombre: "Singani Especial" });
    const b = await crearProducto({ stock: 5, codigo: "VTA-Q2", nombre: "Ron Cartavio" });
    await crearVenta({ lineas: [{ productoId: a.id, cantidad: 1 }] });
    await crearVenta({ lineas: [{ productoId: b.id, cantidad: 1 }] });

    const porNombre = await llamar<Registro[]>(ventas.GET, "/api/ventas?q=singani");
    expect(porNombre.status).toBe(200);
    expect(porNombre.data).toHaveLength(1);
    expect(porNombre.meta?.total).toBe(1);
  });
});
