import { describe, expect, it } from "vitest";
import { etiquetaUsuario, mapearEventos, USUARIO_NO_IDENTIFICADO, type Usuarios } from "./bitacora";

const USUARIOS: Usuarios = {
  adminId: "admin-1",
  conductores: new Map([["c1", "Conductor Demo Uno"]]),
};

describe("etiquetaUsuario", () => {
  it("identifica al administrador, a un conductor y a un usuario desconocido", () => {
    expect(etiquetaUsuario("admin-1", USUARIOS)).toBe("Administrador");
    expect(etiquetaUsuario("c1", USUARIOS)).toBe("Conductor Demo Uno (conductor)");
    expect(etiquetaUsuario("otro", USUARIOS)).toBe(USUARIO_NO_IDENTIFICADO);
    expect(etiquetaUsuario(null, USUARIOS)).toBe(USUARIO_NO_IDENTIFICADO);
  });
});

describe("mapearEventos (CP-15)", () => {
  it("ordena por fecha y extrae los km del detalle", () => {
    const eventos = mapearEventos(
      [
        {
          evento_id: 3,
          estado_anterior: "ACTIVO",
          estado_nuevo: "COMPLETADO",
          usuario_id: "c1",
          detalle: { km_reales: 25.4 },
          created_at: "2026-11-25T15:00:00+00:00",
        },
        {
          evento_id: 1,
          estado_anterior: null,
          estado_nuevo: "ASIGNADO",
          usuario_id: "admin-1",
          detalle: { km_reales: null },
          created_at: "2026-11-25T12:00:00+00:00",
        },
        {
          evento_id: 2,
          estado_anterior: "ASIGNADO",
          estado_nuevo: "ACTIVO",
          usuario_id: "c1",
          detalle: null,
          created_at: "2026-11-25T13:00:00+00:00",
        },
      ],
      USUARIOS
    );
    expect(eventos).toEqual([
      {
        evento_id: 1,
        estado_anterior: null,
        estado_nuevo: "ASIGNADO",
        usuario: "Administrador",
        fecha: "2026-11-25T12:00:00+00:00",
        km_reales: null,
      },
      {
        evento_id: 2,
        estado_anterior: "ASIGNADO",
        estado_nuevo: "ACTIVO",
        usuario: "Conductor Demo Uno (conductor)",
        fecha: "2026-11-25T13:00:00+00:00",
        km_reales: null,
      },
      {
        evento_id: 3,
        estado_anterior: "ACTIVO",
        estado_nuevo: "COMPLETADO",
        usuario: "Conductor Demo Uno (conductor)",
        fecha: "2026-11-25T15:00:00+00:00",
        km_reales: 25.4,
      },
    ]);
  });

  it("descarta filas mal formadas", () => {
    expect(
      mapearEventos(
        [null, { evento_id: 9, estado_anterior: "X", estado_nuevo: "ACTIVO", created_at: "2026-11-25T12:00:00Z" }],
        USUARIOS
      )
    ).toEqual([]);
  });
});
