import type { Metadata } from "next";
import Cotizador from "@/components/cotizador/Cotizador";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { MontosRecargo } from "@/lib/tarifa/monto";

export const metadata: Metadata = {
  title: "Cotizar viaje · AeroTaxi Express",
};

// Pantalla Cotizar (HU01, HU02, HU03; CU01, CU02, CU05). Los montos de los recargos (RN-15) se leen
// de la tarifa activa con el JWT del administrador: RLS solo deja ver las tarifas de su flota.
export default async function PaginaCotizar() {
  const supabase = await crearClienteServidor();
  const { data: tarifa, error } = await supabase
    .from("tarifa")
    .select("recargo_equipaje, recargo_mascota, recargo_nocturno")
    .eq("is_active", true)
    .maybeSingle();
  if (error) console.error("[cotizar] tarifa activa", error.code, error.message);

  const montosRecargo: MontosRecargo | null = tarifa
    ? {
        EQUIPAJE: Number(tarifa.recargo_equipaje),
        MASCOTA: Number(tarifa.recargo_mascota),
        NOCTURNO: Number(tarifa.recargo_nocturno),
      }
    : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cotizar viaje</h1>
        <p className="text-sm text-slate-600">Origen fijo: Aeropuerto SCL.</p>
      </div>

      {montosRecargo ? (
        <Cotizador montosRecargo={montosRecargo} />
      ) : (
        <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          {error
            ? "No es posible cotizar; usa la planilla de contingencia."
            : "No hay una tarifa activa para tu flota. Configúrala antes de cotizar."}
        </p>
      )}
    </main>
  );
}
