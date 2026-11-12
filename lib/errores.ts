export type CodigoError =
  | "VALIDACION"
  | "JSON_INVALIDO"
  | "NO_ENCONTRADO"
  | "CONFLICTO"
  | "CODIGO_DUPLICADO"
  | "NIT_DUPLICADO"
  | "EN_USO"
  | "SIN_STOCK"
  | "INACTIVO"
  | "ERROR_INTERNO";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: CodigoError,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const noEncontrado = (message: string) => new ApiError(404, "NO_ENCONTRADO", message);
