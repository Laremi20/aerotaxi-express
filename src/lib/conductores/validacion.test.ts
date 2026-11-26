import { describe, expect, it } from "vitest";
import {
  esUuid,
  MENSAJES_CONDUCTOR,
  normalizarPatente,
  validarAltaConductor,
  validarEdicionConductor,
} from "./validacion";

const EDICION = { nombre: "Juan Pérez", patente: "BCDF12", contacto: "+56 9 1234 5678" };
const ALTA = { ...EDICION, email: "juan.perez@example.com", contrasena: "Temporal2026" };

describe("normalizarPatente", () => {
  it.each([
    ["bcdf12", "BCDF12"],
    ["BC-DF-12", "BCDF12"],
    [" bc df 12 ", "BCDF12"],
    ["AB·12·34", "AB1234"],
    ["ab.1234", "AB1234"],
    [undefined, ""],
  ])("%j → %j", (entrada, esperado) => {
    expect(normalizarPatente(entrada)).toBe(esperado);
  });
});

describe("validarEdicionConductor", () => {
  it("acepta y normaliza los datos (CU06 6a)", () => {
    expect(
      validarEdicionConductor({ nombre: "  Juan   Pérez ", patente: "bc-df-12", contacto: " +56 9  1234 5678 " })
    ).toEqual({ ok: true, datos: EDICION });
  });

  it("acepta el formato antiguo de patente", () => {
    expect(validarEdicionConductor({ ...EDICION, patente: "AB1234" })).toMatchObject({ ok: true });
  });

  it.each(["", "BCD123", "ABC1234", "AB12", "12ABCD", "BCDF1Ñ", 123])("rechaza la patente %j", (patente) => {
    expect(validarEdicionConductor({ ...EDICION, patente })).toEqual({
      ok: false,
      errores: { patente: MENSAJES_CONDUCTOR.patente },
    });
  });

  it.each(["", " ", "J", "x".repeat(81), null])("rechaza el nombre %j", (nombre) => {
    expect(validarEdicionConductor({ ...EDICION, nombre })).toEqual({
      ok: false,
      errores: { nombre: MENSAJES_CONDUCTOR.nombre },
    });
  });

  it.each(["", "1234567", "fono 912345678", "+56 9 1234 5678 99999", "+56-9-1234-567890123", "9123456a"])(
    "rechaza el contacto %j",
    (contacto) => {
      expect(validarEdicionConductor({ ...EDICION, contacto })).toEqual({
        ok: false,
        errores: { contacto: MENSAJES_CONDUCTOR.contacto },
      });
    }
  );

  it.each(["912345678", "+56912345678", "(2) 2345 6789"])("acepta el contacto %j", (contacto) => {
    expect(validarEdicionConductor({ ...EDICION, contacto })).toMatchObject({ ok: true });
  });

  it("informa todos los campos con error a la vez", () => {
    expect(validarEdicionConductor({ nombre: "", patente: "", contacto: "" })).toEqual({
      ok: false,
      errores: {
        nombre: MENSAJES_CONDUCTOR.nombre,
        patente: MENSAJES_CONDUCTOR.patente,
        contacto: MENSAJES_CONDUCTOR.contacto,
      },
    });
  });
});

describe("validarAltaConductor", () => {
  it("acepta el alta y normaliza el correo (CU06 pasos 3–4)", () => {
    expect(validarAltaConductor({ ...ALTA, email: "  Juan.Perez@Example.COM " })).toEqual({ ok: true, datos: ALTA });
  });

  it("no recorta la contraseña temporal", () => {
    expect(validarAltaConductor({ ...ALTA, contrasena: " Temporal 2026 " })).toMatchObject({
      ok: true,
      datos: { contrasena: " Temporal 2026 " },
    });
  });

  it.each(["", "juan", "juan@", "juan@example", "juan perez@example.com", `${"a".repeat(110)}@example.com`])(
    "rechaza el correo %j",
    (email) => {
      expect(validarAltaConductor({ ...ALTA, email })).toEqual({
        ok: false,
        errores: { email: MENSAJES_CONDUCTOR.email },
      });
    }
  );

  it("rechaza una contraseña temporal corta, larga o solo de espacios", () => {
    for (const contrasena of ["corta", "x".repeat(73), "         ", undefined]) {
      const resultado = validarAltaConductor({ ...ALTA, contrasena });
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(Object.keys(resultado.errores)).toEqual(["contrasena"]);
    }
  });

  it("aplica también las reglas de la edición", () => {
    const resultado = validarAltaConductor({ ...ALTA, patente: "XX" });
    expect(resultado).toEqual({ ok: false, errores: { patente: MENSAJES_CONDUCTOR.patente } });
  });
});

describe("esUuid", () => {
  it("acepta un UUID y rechaza lo demás", () => {
    expect(esUuid("0b5c7c8e-1f2a-4d3b-9c4d-5e6f7a8b9c0d")).toBe(true);
    expect(esUuid("conductor-1")).toBe(false);
    expect(esUuid(7)).toBe(false);
  });
});
