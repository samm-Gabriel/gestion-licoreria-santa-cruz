import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "../..");

const RUTAS_CLAVE = ["/", "/productos", "/ventas/nueva"];

const PAGINAS_CLAVE = [
  "app/(dashboard)/page.tsx",
  "app/(dashboard)/productos/page.tsx",
  "app/(dashboard)/ventas/nueva/page.tsx",
];

function buscarPaginas(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "api" ? [] : buscarPaginas(ruta);
    return e.name === "page.tsx" ? [ruta] : [];
  });
}

describe("smoke: cada page.tsx exporta un componente (#8)", () => {
  const paginas = buscarPaginas(path.join(RAIZ, "app"));

  it("encuentra las páginas del app router incluyendo / , /productos y /ventas/nueva", () => {
    expect(paginas.length).toBeGreaterThanOrEqual(RUTAS_CLAVE.length);
    for (const relativa of PAGINAS_CLAVE) {
      expect(paginas.map((p) => path.relative(RAIZ, p))).toContain(relativa);
    }
  });

  it.each(paginas.map((p) => path.relative(RAIZ, p)))("%s exporta default function", async (relativa) => {
    const modulo = await import(path.join(RAIZ, relativa));
    expect(typeof modulo.default).toBe("function");
  });

  it.each(PAGINAS_CLAVE)("página clave %s es un componente", async (relativa) => {
    const modulo = await import(path.join(RAIZ, relativa));
    expect(typeof modulo.default).toBe("function");
  });
});
