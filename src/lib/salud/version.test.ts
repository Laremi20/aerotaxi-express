import { describe, expect, it } from "vitest";
import paquete from "../../../package.json";
import { resolverVersion } from "./version";

describe("resolverVersion (HU09; CP-19)", () => {
  it("usa APP_VERSION cuando está definida", () => {
    expect(resolverVersion("1.2.3")).toBe("1.2.3");
  });

  it("recorta espacios de APP_VERSION", () => {
    expect(resolverVersion("  1.2.3\n")).toBe("1.2.3");
  });

  it("usa la versión de package.json si falta APP_VERSION", () => {
    expect(resolverVersion(undefined)).toBe(paquete.version);
  });

  it("usa la versión de package.json si APP_VERSION está vacía", () => {
    expect(resolverVersion("   ")).toBe(paquete.version);
  });
});
