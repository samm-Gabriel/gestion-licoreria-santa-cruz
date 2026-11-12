import { describe, expect, it } from "vitest";
import * as proveedor from "@/app/api/proveedores/[id]/route";
import * as proveedores from "@/app/api/proveedores/route";
import { crearProveedor, llamar, type Registro } from "../helpers";

const valido = {
  nombre: "Distribuidora Norte",
  nit: "1234567012",
  telefono: "77001122",
  email: "norte@example.com",
};

describe("API /api/proveedores (#8)", () => {
  it("crea un proveedor válido (201) (#8)", async () => {
    const res = await llamar(proveedores.POST, "/api/proveedores", {
      metodo: "POST",
      body: valido,
    });
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({
      nombre: "Distribuidora Norte",
      nit: "1234567012",
      telefono: "77001122",
    });
    expect(typeof res.data.id).toBe("number");
  });

  it("rechaza datos inválidos con 400 VALIDACION (#8)", async () => {
    const res = await llamar(proveedores.POST, "/api/proveedores", {
      metodo: "POST",
      body: { nombre: "", email: "no-es-email", telefono: "12" },
    });
    expect(res.status).toBe(400);
    expect(res.error?.code).toBe("VALIDACION");
  });

  it("NIT duplicado al crear → 409 NIT_DUPLICADO (#8)", async () => {
    await llamar(proveedores.POST, "/api/proveedores", { metodo: "POST", body: valido });
    const res = await llamar(proveedores.POST, "/api/proveedores", {
      metodo: "POST",
      body: { ...valido, nombre: "Otro" },
    });
    expect(res.status).toBe(409);
    expect(res.error?.code).toBe("NIT_DUPLICADO");
  });

  it("GET de un proveedor inexistente → 404 NO_ENCONTRADO (#8)", async () => {
    const res = await llamar(proveedor.GET, "/api/proveedores/999999", { id: 999999 });
    expect(res.status).toBe(404);
    expect(res.error?.code).toBe("NO_ENCONTRADO");
  });

  it("actualiza un proveedor (200) (#8)", async () => {
    const p = await crearProveedor({ nombre: "Original" });
    const res = await llamar(proveedor.PATCH, "/api/proveedores/x", {
      metodo: "PATCH",
      id: p.id,
      body: { telefono: "76543210", direccion: "Av. Cristo Redentor" },
    });
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      telefono: "76543210",
      direccion: "Av. Cristo Redentor",
    });
  });

  it("elimina un proveedor sin compras (200) (#8)", async () => {
    const p = await crearProveedor();
    const res = await llamar(proveedor.DELETE, "/api/proveedores/x", {
      metodo: "DELETE",
      id: p.id,
    });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: p.id });
    expect((await llamar(proveedor.GET, "/api/proveedores/x", { id: p.id })).status).toBe(404);
  });

  it("listado con ?q= filtra por nombre o NIT (#8)", async () => {
    await crearProveedor({ nombre: "Cervecería Boliviana", nit: "99887766" });
    await crearProveedor({ nombre: "Vinos del Sur", nit: "11223344" });

    const porNombre = await llamar<Registro[]>(proveedores.GET, "/api/proveedores?q=cervecer");
    expect(porNombre.status).toBe(200);
    expect(porNombre.data.map((p) => p.nombre)).toEqual(["Cervecería Boliviana"]);
    expect(porNombre.meta).toMatchObject({ page: 1, total: 1 });

    const porNit = await llamar<Registro[]>(proveedores.GET, "/api/proveedores?q=1122");
    expect(porNit.data.map((p) => p.nit)).toEqual(["11223344"]);
  });
});
