import { z } from "zod";
import { REGEX_FECHA, esFechaValida, hoyLocal } from "./fechas";

z.config(z.locales.es());

const vacioANull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const texto = (campo: string, max = 120) =>
  z
    .string({ error: `${campo} es obligatorio` })
    .trim()
    .min(1, `${campo} es obligatorio`)
    .max(max, `${campo} admite como máximo ${max} caracteres`);

const textoOpcional = (campo: string, max = 500) =>
  z.preprocess(
    vacioANull,
    z
      .string({ error: `${campo} debe ser texto` })
      .trim()
      .max(max, `${campo} admite como máximo ${max} caracteres`)
      .nullable()
      .optional(),
  );

const alMenosUnCampo = (obj: Record<string, unknown>) =>
  Object.values(obj).some((v) => v !== undefined);

const idSchema = (campo: string) =>
  z.coerce
    .number({ error: `${campo} debe ser un número` })
    .int(`${campo} debe ser un entero`)
    .positive(`${campo} debe ser un entero positivo`);

const decimalSchema = (campo: string) =>
  z
    .union([z.number(), z.string().trim()], { error: `${campo} es obligatorio` })
    .transform((v) => String(v))
    .refine((v) => /^\d{1,10}(\.\d{1,2})?$/.test(v), {
      message: `${campo} debe ser un número positivo con hasta 2 decimales`,
    });

export const fechaSchema = z
  .string({ error: "La fecha es obligatoria" })
  .regex(REGEX_FECHA, "La fecha debe tener el formato AAAA-MM-DD")
  .refine(esFechaValida, "La fecha no existe en el calendario");

export const listadoQuery = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1, "page debe ser 1 o mayor").default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, "pageSize debe ser 1 o mayor")
    .max(100, "pageSize admite como máximo 100")
    .default(20),
});

const booleanoQuery = z
  .enum(["true", "false"], { error: "Debe ser true o false" })
  .transform((v) => v === "true")
  .optional();

/* ---------- Producto ---------- */

const productoCampos = {
  codigo: z
    .string({ error: "El código es obligatorio" })
    .trim()
    .toUpperCase()
    .min(1, "El código es obligatorio")
    .max(40, "El código admite como máximo 40 caracteres"),
  nombre: texto("El nombre", 160),
  marca: textoOpcional("La marca", 80),
  categoria: textoOpcional("La categoría", 80),
  precioVenta: decimalSchema("El precio de venta"),
  stockMinimo: z.coerce
    .number({ error: "stockMinimo debe ser un número" })
    .int()
    .min(0, "stockMinimo no puede ser negativo")
    .optional(),
  activo: z.boolean({ error: "activo debe ser true o false" }).optional(),
};

export const productoCrear = z.object({
  ...productoCampos,
  stock: z.coerce
    .number({ error: "stock debe ser un número" })
    .int()
    .min(0, "El stock inicial no puede ser negativo")
    .default(0),
  stockMinimo: productoCampos.stockMinimo.default(5),
  activo: z.boolean({ error: "activo debe ser true o false" }).default(true),
});

export const productoActualizar = z
  .object(productoCampos)
  .partial()
  .refine(alMenosUnCampo, "Envía al menos un campo para actualizar");

export const productosQuery = listadoQuery.extend({
  activo: booleanoQuery,
  categoria: z.string().trim().max(80).optional(),
});

/* ---------- Proveedor ---------- */

const proveedorCampos = {
  nombre: texto("El nombre", 160),
  nit: z.preprocess(
    vacioANull,
    z
      .string()
      .trim()
      .toUpperCase()
      .max(20, "El NIT admite como máximo 20 caracteres")
      .nullable()
      .optional(),
  ),
  telefono: z.preprocess(
    vacioANull,
    z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,20}$/, "El teléfono debe tener entre 6 y 20 dígitos")
      .nullable()
      .optional(),
  ),
  email: z.preprocess(
    vacioANull,
    z.email({ error: "El email no es válido" }).max(120).nullable().optional(),
  ),
  direccion: textoOpcional("La dirección", 200),
  activo: z.boolean({ error: "activo debe ser true o false" }).optional(),
};

export const proveedorCrear = z.object({
  ...proveedorCampos,
  activo: z.boolean({ error: "activo debe ser true o false" }).default(true),
});

export const proveedorActualizar = z
  .object(proveedorCampos)
  .partial()
  .refine(alMenosUnCampo, "Envía al menos un campo para actualizar");

export const proveedoresQuery = listadoQuery.extend({ activo: booleanoQuery });

/* ---------- Compra ---------- */

export const compraLineaSchema = z.object({
  productoId: idSchema("productoId"),
  cantidad: z.coerce
    .number({ error: "La cantidad es obligatoria" })
    .int()
    .min(1, "La cantidad debe ser al menos 1"),
  costoUnitario: decimalSchema("El costo unitario"),
});

export const compraCrear = z.object({
  proveedorId: idSchema("proveedorId"),
  fecha: fechaSchema
    .refine((f) => f <= hoyLocal(), "La fecha de compra no puede estar en el futuro")
    .optional(),
  numeroFactura: textoOpcional("El número de factura", 40),
  observaciones: textoOpcional("Las observaciones"),
  lineas: z.array(compraLineaSchema).min(1, "Registra al menos una línea de compra"),
});

export const compraActualizar = z
  .object({
    fecha: fechaSchema.refine((f) => f <= hoyLocal(), "La fecha de compra no puede estar en el futuro"),
    numeroFactura: textoOpcional("El número de factura", 40),
    observaciones: textoOpcional("Las observaciones"),
  })
  .partial()
  .refine(alMenosUnCampo, "Envía al menos un campo para actualizar");

export const comprasQuery = listadoQuery.extend({
  proveedorId: idSchema("proveedorId").optional(),
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
});

/* ---------- Venta ---------- */

export const ventaLineaSchema = z.object({
  productoId: idSchema("productoId"),
  cantidad: z.coerce
    .number({ error: "La cantidad es obligatoria" })
    .int()
    .min(1, "La cantidad debe ser al menos 1"),
  precioUnitario: decimalSchema("El precio unitario").optional(),
});

export const ventaCrear = z.object({
  fecha: z.string().datetime({ offset: true }).optional(),
  lineas: z.array(ventaLineaSchema).min(1, "Registra al menos una línea de venta"),
});

export const ventasQuery = listadoQuery.extend({
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
});
