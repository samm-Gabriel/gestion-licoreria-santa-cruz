import { Prisma } from "@prisma/client";
import { unstable_rethrow } from "next/navigation";
import { connection, type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, type CodigoError } from "./errores";

export { ApiError, noEncontrado, type CodigoError } from "./errores";

export type DetalleError = { campo: string; mensaje: string };

export function ok<T>(data: T, init?: { status?: number; meta?: unknown }) {
  const body = init?.meta === undefined ? { data } : { data, meta: init.meta };
  return Response.json(body, { status: init?.status ?? 200 });
}

export function creado<T>(data: T) {
  return ok(data, { status: 201 });
}

export function errorJson(status: number, code: CodigoError, message: string, details?: unknown) {
  const error = details === undefined ? { code, message } : { code, message, details };
  return Response.json({ error }, { status });
}

function detallesZod(error: z.ZodError): DetalleError[] {
  return error.issues.map((issue) => ({
    campo: issue.path.join(".") || "(cuerpo)",
    mensaje: issue.message,
  }));
}

function respuestaPrisma(error: Prisma.PrismaClientKnownRequestError): Response | null {
  switch (error.code) {
    case "P2002": {
      const target = String((error.meta?.target as string[] | string | undefined) ?? "");
      if (target.includes("codigo")) {
        return errorJson(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código");
      }
      if (target.includes("nit")) {
        return errorJson(409, "NIT_DUPLICADO", "Ya existe un proveedor con ese NIT");
      }
      return errorJson(409, "CONFLICTO", "El registro entra en conflicto con otro existente");
    }
    case "P2003":
      return errorJson(409, "EN_USO", "No se puede eliminar porque tiene registros asociados");
    case "P2025":
      return errorJson(404, "NO_ENCONTRADO", "El registro solicitado no existe");
    default:
      return null;
  }
}

export function respuestaDeError(error: unknown): Response {
  if (error instanceof ApiError) {
    return errorJson(error.status, error.code, error.message, error.details);
  }
  if (error instanceof z.ZodError) {
    return errorJson(400, "VALIDACION", "Los datos enviados no son válidos", detallesZod(error));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const respuesta = respuestaPrisma(error);
    if (respuesta) return respuesta;
  }
  console.error(error);
  return errorJson(500, "ERROR_INTERNO", "Ocurrió un error interno en el servidor");
}

export type ContextoId = { params: Promise<{ id: string }> };

export function manejar<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    await connection();
    try {
      return await fn(req, ctx);
    } catch (error) {
      unstable_rethrow(error);
      return respuestaDeError(error);
    }
  };
}

export async function leerJson(req: Request, opcional = false): Promise<unknown> {
  const texto = await req.text();
  if (!texto.trim()) {
    if (opcional) return {};
    throw new ApiError(400, "JSON_INVALIDO", "El cuerpo de la petición está vacío");
  }
  try {
    return JSON.parse(texto);
  } catch {
    throw new ApiError(400, "JSON_INVALIDO", "El cuerpo de la petición no es un JSON válido");
  }
}

export async function leerId(ctx: ContextoId): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(n) || n <= 0) {
    throw new ApiError(400, "VALIDACION", "El id debe ser un número entero positivo", [
      { campo: "id", mensaje: "Debe ser un entero positivo" },
    ]);
  }
  return n;
}

export function parametros(req: NextRequest): Record<string, string> {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

export function metaPaginacion(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
