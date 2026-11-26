import type { Metadata } from "next";
import GestorConductores from "@/components/conductores/GestorConductores";
import type { ConductorGestor } from "@/components/conductores/tipos";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = {
  title: "Conductores · AeroTaxi Express",
};

// Gestor de Conductores (HU04; CU06). Se lee con el JWT del administrador: RLS (admin_lee_conductores)
// solo deja ver los conductores de su flota (HU08). Incluye a los dados de baja (baja lógica).
export default async function PaginaConductores() {
  const supabase = await crearClienteServidor();
  const [flota, conductores] = await Promise.all([
    supabase.from("flota").select("flota_id").maybeSingle(),
    supabase
      .from("conductor")
      .select("driver_id, nombre, patente, contacto, email, estado_disponibilidad, is_active")
      .order("is_active", { ascending: false })
      .order("nombre"),
  ]);

  const error = flota.error ?? conductores.error;
  if (error) console.error("[conductores] lectura", error.code);

  return (
    <main className="mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Conductores</h1>
        <p className="text-sm text-slate-600">
          Alta, edición y baja de los conductores de tu flota. Un conductor dado de baja no recibe viajes ni puede
          ingresar, pero conserva su historial.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          No es posible cargar los conductores; inténtalo de nuevo en unos minutos.
        </p>
      ) : !flota.data ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          No tienes una flota a cargo.
        </p>
      ) : (
        <GestorConductores conductores={(conductores.data ?? []) as ConductorGestor[]} />
      )}
    </main>
  );
}
