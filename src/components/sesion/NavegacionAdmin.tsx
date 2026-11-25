"use client";

// Navegación del Taxista Administrador: Cotizar, Calendario Maestro e Historial (HU05, HU07; CU05 → CU08, CU10)
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { href: "/cotizar", texto: "Cotizar" },
  { href: "/calendario", texto: "Calendario" },
  { href: "/historial", texto: "Historial" },
];

export default function NavegacionAdmin() {
  const ruta = usePathname();

  return (
    <nav aria-label="Secciones del administrador" className="w-full border-b border-slate-200 bg-white px-4">
      <ul className="mx-auto flex max-w-7xl gap-1">
        {SECCIONES.map(({ href, texto }) => {
          const actual = ruta === href || ruta.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actual ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-2 px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  actual ? "border-blue-700 text-blue-800" : "border-transparent text-slate-700 hover:text-slate-900"
                }`}
              >
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
