"use client";

// Alta (CU06 pasos 2–4) o edición (CU06 6a) de un conductor. La validación final es del servidor y de la
// base (CHECK, UNIQUE, RLS); los errores llegan por campo (CU06 4a: se marca el campo en conflicto).
import { useState, useTransition } from "react";
import { claseBoton } from "@/components/calendario/tipos";
import { IconoAlerta, IconoCheck } from "@/components/iconos";
import { crearConductor, editarConductor } from "@/lib/conductores/acciones";
import type { CampoConductor, ErroresConductor } from "@/lib/conductores/validacion";
import { claseCampo, type ConductorGestor } from "./tipos";

const MENSAJE_SIN_CONEXION = "No fue posible guardar el conductor; revisa tu conexión.";

interface Props {
  // Sin conductor: alta; con conductor: edición
  conductor?: ConductorGestor;
  onListo: (mensaje: string) => void;
  onCancelar: () => void;
}

interface Campo {
  nombre: CampoConductor;
  etiqueta: string;
  tipo: string;
  autoComplete: string;
  ayuda?: string;
  inputMode?: "tel" | "email" | "text";
}

const CAMPOS_COMUNES: Campo[] = [
  { nombre: "nombre", etiqueta: "Nombre completo", tipo: "text", autoComplete: "off" },
  { nombre: "patente", etiqueta: "Patente", tipo: "text", autoComplete: "off", ayuda: "Por ejemplo BCDF12 o AB1234." },
  { nombre: "contacto", etiqueta: "Teléfono", tipo: "tel", autoComplete: "off", inputMode: "tel" },
];

const CAMPOS_ALTA: Campo[] = [
  { nombre: "email", etiqueta: "Correo", tipo: "email", autoComplete: "off", inputMode: "email" },
  {
    nombre: "contrasena",
    etiqueta: "Contraseña temporal",
    tipo: "text",
    autoComplete: "off",
    ayuda: "Mínimo 8 caracteres. Entrégasela al conductor en persona junto con su correo.",
  },
];

export default function FormularioConductor({ conductor, onListo, onCancelar }: Props) {
  const esAlta = !conductor;
  const [error, setError] = useState<string | null>(null);
  const [campos, setCampos] = useState<ErroresConductor>({});
  const [enviando, iniciarEnvio] = useTransition();
  const prefijo = esAlta ? "alta" : `edicion-${conductor.driver_id}`;
  const lista = esAlta ? [...CAMPOS_COMUNES, ...CAMPOS_ALTA] : CAMPOS_COMUNES;

  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setError(null);
    setCampos({});
    iniciarEnvio(async () => {
      const accion = esAlta ? crearConductor : editarConductor;
      const resultado = await accion(datos).catch(() => ({ ok: false as const, error: MENSAJE_SIN_CONEXION }));
      if (resultado.ok) {
        onListo(resultado.mensaje);
      } else {
        setError(resultado.error);
        setCampos(("campos" in resultado && resultado.campos) || {});
      }
    });
  };

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3" aria-label={esAlta ? "Nuevo conductor" : `Editar a ${conductor.nombre}`}>
      {!esAlta && <input type="hidden" name="driver_id" value={conductor.driver_id} />}

      {lista.map((campo) => {
        const id = `${prefijo}-${campo.nombre}`;
        const errorCampo = campos[campo.nombre];
        const describe = [campo.ayuda && `${id}-ayuda`, errorCampo && `${id}-error`].filter(Boolean).join(" ");
        return (
          <div key={campo.nombre} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-semibold text-slate-800">
              {campo.etiqueta}
            </label>
            <input
              id={id}
              name={campo.nombre}
              type={campo.tipo}
              inputMode={campo.inputMode}
              autoComplete={campo.autoComplete}
              spellCheck={false}
              required
              defaultValue={conductor ? conductor[campo.nombre as keyof ConductorGestor]?.toString() : undefined}
              aria-invalid={errorCampo ? true : undefined}
              aria-describedby={describe || undefined}
              className={`${claseCampo} ${campo.nombre === "patente" ? "uppercase" : ""}`}
            />
            {campo.ayuda && (
              <p id={`${id}-ayuda`} className="text-sm text-slate-600">
                {campo.ayuda}
              </p>
            )}
            {errorCampo && (
              <p id={`${id}-error`} className="text-sm font-semibold text-red-800">
                {errorCampo}
              </p>
            )}
          </div>
        );
      })}

      {!esAlta && (
        <p className="text-sm text-slate-600">
          Correo: <span className="font-semibold text-slate-800">{conductor.email}</span> (no se puede cambiar).
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          <IconoAlerta className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={enviando} className={`${claseBoton} bg-green-700 text-white hover:bg-green-600`}>
          <IconoCheck />
          {enviando ? "Guardando…" : esAlta ? "Registrar conductor" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          className={`${claseBoton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
