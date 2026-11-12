import { config } from "dotenv";
import path from "node:path";
import { afterAll, beforeEach, vi } from "vitest";
import { applyTestDatabaseEnv } from "./database-url";

config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const { schema } = applyTestDatabaseEnv();
if (!schema.endsWith("_test")) {
  throw new Error(`Las pruebas solo pueden correr sobre un schema *_test (recibido: ${schema})`);
}

// connection() exige el request scope de Next; al llamar handlers directo no existe.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

const { prisma } = await import("@/lib/db");

beforeEach(async () => {
  await prisma.ventaLinea.deleteMany();
  await prisma.compraLinea.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.compra.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.proveedor.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
