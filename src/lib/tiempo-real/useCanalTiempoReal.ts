"use client";

// Suscripción a postgres_changes de Supabase Realtime (HU06; CU07, CU12; CP-13).
// - Usa el cliente de navegador (sesión en cookies). Antes de subscribe() espera la sesión y llama
//   realtime.setAuth(access_token): así el join lleva el JWT del usuario y Realtime solo envía las filas
//   que puede leer por RLS. Sin esto, el join podía salir con la anon key y no llegaba ningún evento.
// - Un canal con nombre único por montaje: channel() reutiliza un canal con el mismo nombre, y el
//   doble montaje del modo estricto de React podría recibir uno que se está cerrando.
// - CU07 2a: ante un error o un corte de red, informa «sin conexión», rehace la suscripción con
//   espera creciente y, al volver, avisa con onReconectar para recargar el estado perdido.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { autenticarRealtime, eventoConTokenNuevo } from "./autenticar";
import { esperaReintento, estadoConexion, type Conexion } from "./estado";

export interface SuscripcionTabla {
  tabla: "conductor" | "viaje";
  evento: "INSERT" | "UPDATE" | "*";
  // Filtro de postgres_changes, p. ej. "flota_id=eq.<uuid>" (RLS sigue aplicando)
  filtro: string;
}

interface Opciones {
  prefijo: string;
  suscripciones: readonly SuscripcionTabla[];
  onCambio: (tabla: SuscripcionTabla["tabla"], payload: unknown) => void;
  onReconectar: () => void;
}

const idUnico = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useCanalTiempoReal({ prefijo, suscripciones, onCambio, onReconectar }: Opciones): Conexion {
  const [conexion, setConexion] = useState<Conexion>("conectando");
  // Cada valor de intento crea un canal nuevo
  const [intento, setIntento] = useState(0);
  const fallidos = useRef(0);
  const huboCaida = useRef(false);
  // Siempre la última versión de los callbacks, sin volver a suscribirse
  const callbacks = useRef({ onCambio, onReconectar });
  useEffect(() => {
    callbacks.current = { onCambio, onReconectar };
  });

  const clave = JSON.stringify(suscripciones);

  useEffect(() => {
    const lista: SuscripcionTabla[] = JSON.parse(clave);
    const supabase = crearClienteNavegador();
    let canal: RealtimeChannel | null = null;
    let reintento: ReturnType<typeof setTimeout> | undefined;
    // Desmontado: no se suscribe tarde, y el CLOSED de removeChannel no programa otro intento
    let cerrado = false;

    const caida = () => {
      huboCaida.current = true;
      setConexion("sin_conexion");
      clearTimeout(reintento);
      reintento = setTimeout(() => setIntento((n) => n + 1), esperaReintento(fallidos.current++));
    };

    const suscribir = async () => {
      // Primero el JWT de la sesión: si el join sale sin él, Realtime filtra todo por RLS como anónimo
      const autenticado = await autenticarRealtime(supabase);
      if (cerrado) return;
      if (!autenticado) {
        caida();
        return;
      }

      canal = supabase.channel(`${prefijo}:${idUnico()}`);
      for (const s of lista) {
        canal.on(
          "postgres_changes",
          { event: s.evento, schema: "public", table: s.tabla, filter: s.filtro },
          (payload) => callbacks.current.onCambio(s.tabla, payload)
        );
      }

      canal.subscribe((status) => {
        if (cerrado) return;
        const nuevo = estadoConexion(status);
        if (nuevo === "conectado") {
          fallidos.current = 0;
          setConexion("conectado");
          if (huboCaida.current) {
            huboCaida.current = false;
            callbacks.current.onReconectar();
          }
        } else if (nuevo === "sin_conexion") {
          caida();
        }
      });
    };
    void suscribir();

    return () => {
      cerrado = true;
      clearTimeout(reintento);
      if (canal) void supabase.removeChannel(canal);
    };
  }, [prefijo, clave, intento]);

  // Token renovado o nuevo inicio de sesión: se entrega a Realtime y a los canales ya unidos.
  // supabase-js también lo hace por su cuenta; aquí queda explícito y no depende de su versión.
  useEffect(() => {
    const supabase = crearClienteNavegador();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, sesion) => {
      // Sin await: no se deben encadenar llamadas a Supabase dentro de este callback
      if (eventoConTokenNuevo(evento) && sesion) void supabase.realtime.setAuth(sesion.access_token);
    });
    return () => subscription.unsubscribe();
  }, []);

  // El navegador avisa antes que el socket cuando se corta la red
  useEffect(() => {
    const alDesconectar = () => {
      huboCaida.current = true;
      setConexion("sin_conexion");
    };
    const alConectar = () => setIntento((n) => n + 1);
    window.addEventListener("offline", alDesconectar);
    window.addEventListener("online", alConectar);
    return () => {
      window.removeEventListener("offline", alDesconectar);
      window.removeEventListener("online", alConectar);
    };
  }, []);

  return conexion;
}

// Agrupa varias señales en una sola recarga del Server Component (router.refresh)
export function useRecargaDiferida(recargar: () => void, esperaMs = 300): () => void {
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ultima = useRef(recargar);
  useEffect(() => {
    ultima.current = recargar;
  });
  useEffect(() => () => clearTimeout(temporizador.current), []);
  return useCallback(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => ultima.current(), esperaMs);
  }, [esperaMs]);
}
