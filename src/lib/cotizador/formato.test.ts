import { describe, expect, it } from "vitest";
import { formatearKm, formatearPesos } from "./formato";

describe("formato es-CL", () => {
  it("formatea pesos con punto de miles", () => {
    expect(formatearPesos(500)).toBe("$500");
    expect(formatearPesos(24300)).toBe("$24.300");
  });

  it("formatea km con un decimal y coma", () => {
    expect(formatearKm(25.37)).toBe("25,4 km");
    expect(formatearKm(8)).toBe("8,0 km");
  });
});
