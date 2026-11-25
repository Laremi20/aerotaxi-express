"use client";

// Búsqueda predictiva de destino con Places API (New) (HU01, CU01; CP-01, CP-02; KPI-05).
// Desde 3 caracteres, con pausa de tecleo, un token de sesión por búsqueda y sesgo de ≈ 100 km
// alrededor de SCL. Combobox accesible (patrón ARIA 1.2). Debe ir dentro de <APIProvider>.
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useId, useRef, useState } from "react";
import type { ResultadoBusqueda } from "@/lib/cotizador/destino";
import {
  construirSolicitudSugerencias,
  crearControladorSugerencias,
  interpretarLugar,
  interpretarSugerencias,
  LARGO_MINIMO_BUSQUEDA,
  moverActiva,
  type EstadoSugerencias,
  type Sugerencia,
} from "@/lib/cotizador/sugerencias";

interface Props {
  deshabilitado: boolean;
  onInteraccion: () => void;
  onElegir: (resultado: ResultadoBusqueda) => void;
}

type Controlador = ReturnType<typeof crearControladorSugerencias<google.maps.places.AutocompleteSessionToken>>;

const MENSAJE_ERROR = "No fue posible buscar la dirección. Inténtalo de nuevo o marca el destino en el mapa.";
const MENSAJE_SIN_UBICACION = "No fue posible ubicar ese lugar. Elige otra sugerencia o marca el destino en el mapa.";

export default function BuscadorDestino({ deshabilitado, onInteraccion, onElegir }: Props) {
  const idCampo = useId();
  const idAyuda = useId();
  const idLista = useId();
  const places = useMapsLibrary("places");
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<EstadoSugerencias>({ tipo: "inactivo" });
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);
  const [ubicando, setUbicando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const controlador = useRef<Controlador | null>(null);
  // Predicciones de la sesión actual: toPlace() conserva el token, así Place Details cierra la sesión
  const predicciones = useRef(new Map<string, google.maps.places.PlacePrediction>());

  useEffect(() => {
    if (!places) return;
    const mapaPredicciones = predicciones.current;
    const nuevo = crearControladorSugerencias<google.maps.places.AutocompleteSessionToken>({
      crearToken: () => new places.AutocompleteSessionToken(),
      buscar: async (consulta, token) => {
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          construirSolicitudSugerencias(consulta, token)
        );
        for (const { placePrediction } of suggestions) {
          if (placePrediction) mapaPredicciones.set(placePrediction.placeId, placePrediction);
        }
        return interpretarSugerencias(suggestions);
      },
      alCambiar: (estado) => {
        setSugerencias(estado);
        setActiva(-1);
        setAbierta(estado.tipo === "lista" && estado.sugerencias.length > 0);
        if (estado.tipo === "error") setAviso(MENSAJE_ERROR);
        else if (estado.tipo === "lista" && estado.sugerencias.length === 0) {
          // CU01 3a: sin sugerencias útiles se ajusta con el Pin
          setAviso(`Sin sugerencias para «${estado.consulta}». Marca el destino en el mapa.`);
        } else setAviso(null);
      },
    });
    controlador.current = nuevo;
    return () => {
      nuevo.cerrarSesion();
      mapaPredicciones.clear();
      controlador.current = null;
    };
  }, [places]);

  const lista = sugerencias.tipo === "lista" ? sugerencias.sugerencias : [];
  const listaVisible = abierta && lista.length > 0;

  const elegir = async (sugerencia: Sugerencia) => {
    const prediccion = predicciones.current.get(sugerencia.placeId);
    setAbierta(false);
    setActiva(-1);
    if (!prediccion) return;
    setUbicando(true);
    setAviso(null);
    try {
      const lugar = prediccion.toPlace();
      await lugar.fetchFields({ fields: ["id", "location", "formattedAddress"] });
      const resultado = interpretarLugar(lugar, sugerencia);
      if (!resultado) {
        setAviso(MENSAJE_SIN_UBICACION);
        return;
      }
      setTexto(resultado.texto);
      setSugerencias({ tipo: "inactivo" });
      onElegir(resultado);
    } catch (error) {
      console.warn("[cotizar] detalle del lugar", error);
      setAviso(MENSAJE_SIN_UBICACION);
    } finally {
      // Place Details cierra la sesión: la próxima búsqueda usa un token nuevo
      controlador.current?.cerrarSesion();
      predicciones.current.clear();
      setUbicando(false);
    }
  };

  const alTeclear = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = evento;
    if (key === "ArrowDown" || key === "ArrowUp" || ((key === "Home" || key === "End") && listaVisible)) {
      if (lista.length === 0) return;
      evento.preventDefault();
      setAbierta(true);
      setActiva((indice) => moverActiva(listaVisible ? indice : -1, lista.length, key));
    } else if (key === "Enter") {
      if (listaVisible && activa >= 0) {
        evento.preventDefault();
        void elegir(lista[activa]);
      }
    } else if (key === "Escape") {
      if (listaVisible) {
        evento.preventDefault();
        setAbierta(false);
        setActiva(-1);
      }
    }
  };

  const cargando = !places;

  return (
    <div className="flex flex-col gap-2">
      <div role="search" className="flex flex-col gap-1">
        <label htmlFor={idCampo} className="text-sm font-semibold text-slate-700">
          Destino del pasajero
        </label>
        <div className="relative">
          <input
            id={idCampo}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listaVisible}
            aria-controls={idLista}
            aria-activedescendant={listaVisible && activa >= 0 ? `${idLista}-${activa}` : undefined}
            aria-describedby={idAyuda}
            aria-busy={ubicando}
            value={texto}
            onChange={(evento) => {
              onInteraccion();
              setTexto(evento.target.value);
              controlador.current?.escribir(evento.target.value);
            }}
            onKeyDown={alTeclear}
            onFocus={() => lista.length > 0 && setAbierta(true)}
            onBlur={() => setAbierta(false)}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            disabled={deshabilitado || cargando || ubicando}
            placeholder={cargando ? "Cargando búsqueda…" : "Ej.: Costanera Center, Providencia"}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 disabled:bg-slate-100"
          />

          {listaVisible && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <ul id={idLista} role="listbox" aria-label="Sugerencias de destino">
                {lista.map((sugerencia, indice) => (
                  <li
                    key={sugerencia.placeId}
                    id={`${idLista}-${indice}`}
                    role="option"
                    aria-selected={indice === activa}
                    // Evita que el campo pierda el foco antes del clic
                    onMouseDown={(evento) => evento.preventDefault()}
                    onClick={() => void elegir(sugerencia)}
                    onMouseEnter={() => setActiva(indice)}
                    className={`flex min-h-11 cursor-pointer flex-col justify-center px-3 py-2 text-sm ${
                      indice === activa ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    <span className="font-semibold text-slate-900">{sugerencia.principal}</span>
                    {sugerencia.secundario && <span className="text-slate-600">{sugerencia.secundario}</span>}
                  </li>
                ))}
              </ul>
              {/* Atribución de los datos de Places mostrados fuera del mapa */}
              <p className="border-t border-slate-100 px-3 py-1 text-right text-xs text-slate-500">
                Sugerencias de Google Maps
              </p>
            </div>
          )}
        </div>
        <p id={idAyuda} className="text-xs text-slate-600">
          Escribe al menos {LARGO_MINIMO_BUSQUEDA} caracteres para ver sugerencias, o toca el mapa para marcar el
          destino.
        </p>
      </div>

      <p role="status" className="text-sm text-slate-700 empty:hidden">
        {ubicando ? "Ubicando el lugar…" : aviso}
      </p>
    </div>
  );
}
