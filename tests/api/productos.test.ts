import { describe, expect, it } from "vitest";
import * as producto from "@/app/api/productos/[id]/route";
import * as productos from "@/app/api/productos/route";
import { crearProducto, llamar, type Registro } from "../helpers";

const valido = {
  codigo: "CER-PILS-355",
  nombre: "Cerveza Paceña 355ml",
  marca: "Paceña",
  categoria: "cerveza",
  precioVenta: "12.50",
  stock: 20,
  stockMinimo: 5,
};

describe("API /api/productos (#8)", () => {
  it("crea un producto válido (201) y normaliza el código a mayúsculas", async () => {
    const res = await llamar(productos.POST, "/api/productos", {
      metodo: "POST",
      body: { ...valido, codigo: "cer-pils-355" },
    });
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({
      codigo: "CER-PILS-355",
      nombre: "Cerveza Paceña 355ml",
      marca: "Paceña",
      stock: 20,
    });
    expect(typeof res.data.id).toBe("number");
  });

  it("rechaza datos inválidos con 400 VALIDACION (#8)", async () => {
    const res = await llamar(productos.POST, "/api/productos", {
      metodo: "POST",
      body: { codigo: "", nombre: "", precioVenta: "-1", stock: -3 },
    });
    expect(res.status).toBe(400);
    expect(res.error?.code).toBe("VALIDACION");
  });

  it("código duplicado al crear → 409 CODIGO_DUPLICADO (#8)", async () => {
    await llamar(productos.POST, "/api/productos", { metodo: "POST", body: valido });
    const res = await llamar(productos.POST, "/api/productos", {
      metodo: "POST",
      body: { ...valido, nombre: "Otro" },
    });
    expect(res.status).toBe(409);
    expect(res.error?.code).toBe("CODIGO_DUPLICADO");
  });

  it("GET de un producto inexistente → 404 NO_ENCONTRADO (#8)", async () => {
    const res = await llamar(producto.GET, "/api/productos/999999", { id: 999999 });
    expect(res.status).toBe(404);
    expect(res.error?.code).toBe("NO_ENCONTRADO");
  });

  it("actualiza un producto (200) (#8)", async () => {
    const p = await crearProducto({ codigo: "UPD-001", nombre: "Original" });
    const res = await llamar(producto.PATCH, "/api/productos/x", {
      metodo: "PATCH",
      id: p.id,
      body: { nombre: "Actualizado", precioVenta: "30.00" },
    });
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ nombre: "Actualizado" });
    expect(Number(res.data.precioVenta)).toBe(30);
  });

  it("elimina un producto sin movimientos (200) (#8)", async () => {
    const p = await crearProducto({ codigo: "DEL-001" });
    const res = await llamar(producto.DELETE, "/api/productos/x", {
      metodo: "DELETE",
      id: p.id,
    });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: p.id });
    expect((await llamar(producto.GET, "/api/productos/x", { id: p.id })).status).toBe(404);
  });

  it("listado con ?q= filtra por nombre o código (#8)", async () => {
    await crearProducto({ codigo: "Q-HUARI", nombre: "Huari Negra" });
    await crearProducto({ codigo: "Q-OTRO", nombre: "Singani Casa Real" });

    const porNombre = await llamar<Registro[]>(productos.GET, "/api/productos?q=huari");
    expect(porNombre.status).toBe(200);
    expect(porNombre.data.map((p) => p.codigo)).toEqual(["Q-HUARI"]);
    expect(porNombre.meta).toMatchObject({ page: 1, total: 1 });

    const porCodigo = await llamar<Registro[]>(productos.GET, "/api/productos?q=Q-OTRO");
    expect(porCodigo.data.map((p) => p.codigo)).toEqual(["Q-OTRO"]);
  });
});
