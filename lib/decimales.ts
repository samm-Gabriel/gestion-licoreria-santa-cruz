import { Prisma } from "@prisma/client";

export function decimalDesdeEntrada(valor: string): Prisma.Decimal {
  return new Prisma.Decimal(valor);
}

export function multiplicarDecimal(cantidad: number, unitario: string): Prisma.Decimal {
  return new Prisma.Decimal(unitario).mul(cantidad);
}

export function sumarDecimales(...valores: Prisma.Decimal[]): Prisma.Decimal {
  return valores.reduce((acc, v) => acc.add(v), new Prisma.Decimal(0));
}
