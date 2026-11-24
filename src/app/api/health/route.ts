// GET /api/health: chequeo de salud para UptimeRobot (HU09; CP-19; Informe U2 §6.3 «Monitoreo y medición»).
// Hace una consulta liviana a la base (fn_salud = select 1) con un tiempo máximo de 3 s.
// No consulta a Google ni requiere sesión (src/proxy.ts deja pasar /api/*), y no devuelve datos sensibles.
import { resolverVersion } from "@/lib/salud/version";
import { crearClienteAnonimo } from "@/lib/supabase/anonimo";

// Siempre se ejecuta: el resultado no puede quedar en caché
export const dynamic = "force-dynamic";

const TIEMPO_MAXIMO_BD_MS = 3000;
const SIN_CACHE = { "Cache-Control": "no-store, max-age=0" };

function degradado() {
  return Response.json({ estado: "degradado" }, { status: 503, headers: SIN_CACHE });
}

export async function GET() {
  const controlador = new AbortController();
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const inicio = performance.now();

  try {
    const supabase = crearClienteAnonimo();
    const limite = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(() => {
        controlador.abort();
        rechazar(new Error(`La base no respondió en ${TIEMPO_MAXIMO_BD_MS} ms`));
      }, TIEMPO_MAXIMO_BD_MS);
    });

    const { data, error } = await Promise.race([
      supabase.rpc("fn_salud").abortSignal(controlador.signal),
      limite,
    ]);
    const dbMs = Math.round(performance.now() - inicio);

    // Los detalles quedan en los logs del servidor; la respuesta nunca los expone
    if (error) {
      console.error("[api/health] fn_salud", error.code, error.message);
      return degradado();
    }
    if (data !== 1) {
      console.error("[api/health] fn_salud devolvió un valor inesperado");
      return degradado();
    }

    return Response.json(
      { estado: "ok", version: resolverVersion(process.env.APP_VERSION), db_ms: dbMs },
      { headers: SIN_CACHE }
    );
  } catch (motivo) {
    console.error("[api/health] base de datos no disponible:", motivo instanceof Error ? motivo.message : motivo);
    return degradado();
  } finally {
    clearTimeout(temporizador);
  }
}
