import paquete from "../../../package.json";

// Versión SemVer que informa GET /api/health (Tabla 19: APP_VERSION).
// Si la variable no está definida en el ambiente, se usa la versión de package.json.
export function resolverVersion(appVersion: string | undefined): string {
  const version = appVersion?.trim();
  return version ? version : paquete.version;
}
