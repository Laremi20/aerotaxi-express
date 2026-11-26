// Entrega el JWT de la sesión a Realtime ANTES de suscribirse (HU06; CP-13).
// RealtimeChannel.subscribe() arma el join con el token que el socket tenga en ese instante; supabase-js lo
// carga de forma asíncrona, y si el join sale antes, Realtime evalúa RLS como anónimo y no entrega ningún
// evento (los cambios solo se veían al recargar). Por eso se espera la sesión y se llama setAuth primero.

// Forma mínima del cliente de supabase-js que se usa (permite probarla sin el SDK)
export interface ClienteRealtime {
  auth: {
    getSession(): Promise<{ data: { session: { access_token: string } | null } }>;
  };
  realtime: {
    setAuth(token?: string | null): Promise<void>;
  };
}

// true si quedó autenticado con la sesión del usuario; false sin sesión o ante un error
export async function autenticarRealtime(cliente: ClienteRealtime): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await cliente.auth.getSession();
    if (!session?.access_token) return false;
    await cliente.realtime.setAuth(session.access_token);
    return true;
  } catch {
    return false;
  }
}

// Eventos de Supabase Auth que traen un token nuevo para Realtime
export function eventoConTokenNuevo(evento: string): boolean {
  return evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED";
}
