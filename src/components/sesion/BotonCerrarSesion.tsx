import { cerrarSesion } from "@/lib/auth/acciones";

export default function BotonCerrarSesion() {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        className="min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
