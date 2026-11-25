// Verificación SQL en PGlite (Postgres en WebAssembly), sin Docker ni proyecto Supabase.
// Uso: npm run verificar:sql  (también corre en la CI; Informe U2 Tabla 91 y definición de terminado).
//
// 1. Simula lo mínimo de Supabase: esquemas auth y extensions, auth.users, auth.uid(), roles
//    anon / authenticated / service_role y los privilegios por defecto que Supabase da a esos roles
//    (así los revoke de las migraciones se prueban de verdad).
// 2. Aplica supabase/migrations/*.sql en orden, luego supabase/seed.sql.
// 3. Ejecuta supabase/verificacion/*.sql y revisa que todos los casos tengan ok = true
//    y que no queden filas residuales (cada script debe revertir lo que crea).
// Sale con código 1 si algo falla.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const MIGRACIONES = join(RAIZ, "migrations");
const VERIFICACION = join(RAIZ, "verificacion");
const SEED = join(RAIZ, "seed.sql");

const USUARIOS_DEMO = [
  "admin.demo@example.com",
  "conductor1.demo@example.com",
  "conductor2.demo@example.com",
  "conductor3.demo@example.com",
];

// Lo mínimo de Supabase que usan las migraciones, el seed y la verificación
const SIMULACION_SUPABASE = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema extensions;
  create schema auth;

  create table auth.users (
    id    uuid primary key default gen_random_uuid(),
    email text unique
  );

  -- Igual que en Supabase: lee el sub del JWT de la petición
  create function auth.uid() returns uuid
  language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;

  -- Supabase crea esta publicación vacía en cada proyecto; las migraciones le agregan tablas
  create publication supabase_realtime;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  -- Privilegios por defecto de Supabase sobre los objetos nuevos de public
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

async function archivosSql(directorio) {
  const nombres = (await readdir(directorio)).filter((n) => n.endsWith(".sql")).sort();
  return nombres.map((n) => join(directorio, n));
}

function relativo(ruta) {
  return ruta.slice(RAIZ.length).replaceAll("\\", "/");
}

async function ejecutarArchivo(db, ruta) {
  try {
    return await db.exec(await readFile(ruta, "utf8"));
  } catch (error) {
    throw new Error(`supabase/${relativo(ruta)}: ${error.message}${error.code ? ` (${error.code})` : ""}`);
  }
}

// Filas por tabla de public y auth.users, para detectar datos que la verificación no revirtió
async function contarFilas(db) {
  const { rows: tablas } = await db.query(`
    select table_schema as esquema, table_name as tabla
    from information_schema.tables
    where table_type = 'BASE TABLE'
      and (table_schema = 'public' or (table_schema = 'auth' and table_name = 'users'))
    order by 1, 2`);
  const conteo = new Map();
  for (const { esquema, tabla } of tablas) {
    const { rows } = await db.query(`select count(*)::int as n from "${esquema}"."${tabla}"`);
    conteo.set(`${esquema}.${tabla}`, rows[0].n);
  }
  return conteo;
}

async function main() {
  const db = new PGlite({ extensions: { btree_gist } });
  let fallas = 0;

  await db.exec(SIMULACION_SUPABASE);
  await db.query(
    "insert into auth.users (email) select unnest($1::text[])",
    [USUARIOS_DEMO]
  );

  const migraciones = await archivosSql(MIGRACIONES);
  for (const ruta of migraciones) {
    await ejecutarArchivo(db, ruta);
    console.log(`✓ migración ${relativo(ruta)}`);
  }
  await ejecutarArchivo(db, SEED);
  console.log("✓ seed.sql");

  const scripts = (await archivosSql(VERIFICACION));
  if (scripts.length === 0) throw new Error("No hay scripts en supabase/verificacion/");

  for (const ruta of scripts) {
    const antes = await contarFilas(db);
    const resultados = await ejecutarArchivo(db, ruta);
    const casos = resultados.at(-1)?.rows ?? [];

    console.log(`\n${relativo(ruta)}`);
    for (const { n, caso, esperado, obtenido, ok } of casos) {
      const detalle = ok ? "" : `  (esperado ${esperado}, obtenido ${obtenido ?? "null"})`;
      console.log(`  ${ok ? "✓" : "✗"} ${String(n).padStart(2)} ${caso}${detalle}`);
    }

    const correctos = casos.filter((c) => c.ok === true).length;
    const despues = await contarFilas(db);
    const residuales = [...despues].filter(([tabla, n]) => n !== antes.get(tabla));
    const totalResiduales = residuales.reduce((s, [tabla, n]) => s + Math.abs(n - (antes.get(tabla) ?? 0)), 0);

    console.log(`  casos: ${correctos}/${casos.length} ok`);
    console.log(`  filas residuales: ${totalResiduales}`);
    for (const [tabla, n] of residuales) console.log(`    ${tabla}: ${antes.get(tabla) ?? 0} → ${n}`);

    if (casos.length === 0 || correctos !== casos.length || totalResiduales !== 0) fallas++;
  }

  await db.close();
  if (fallas > 0) {
    console.error(`\nVerificación SQL fallida en ${fallas} script(s).`);
    process.exit(1);
  }
  console.log("\nVerificación SQL correcta.");
}

main().catch((error) => {
  console.error(`\nVerificación SQL interrumpida: ${error.message}`);
  process.exit(1);
});
