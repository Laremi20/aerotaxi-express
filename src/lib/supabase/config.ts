import type { CookieOptions } from "@supabase/ssr";

// Valores públicos: la protección real de los datos está en las políticas RLS (HU08)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Se mantienen los valores por defecto de @supabase/ssr (SameSite=Lax, sin HttpOnly para que el
// cliente de navegador lea la sesión); en producción la cookie solo viaja por HTTPS (CU11).
export const OPCIONES_COOKIE: CookieOptions = {
  secure: process.env.NODE_ENV === "production",
};
