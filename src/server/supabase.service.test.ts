import { describe, it, expect, vi, afterEach } from "vitest";
import { getAuthUserFromRequest } from "./supabase.service";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("getAuthUserFromRequest — caminos de salida temprana", () => {
  // Estos casos NO tocan el singleton Supabase (getSupabase nunca se invoca),
  // por lo que no hacen falta credenciales ni mocks de red.

  it("devuelve null cuando no hay Request", async () => {
    expect(await getAuthUserFromRequest(undefined)).toBeNull();
  });

  it("devuelve null cuando el Request no trae Authorization", async () => {
    const req = new Request("https://example.com");
    expect(await getAuthUserFromRequest(req)).toBeNull();
  });

  it("devuelve null cuando Authorization viene vacio", async () => {
    const req = new Request("https://example.com", {
      headers: { authorization: "" },
    });
    expect(await getAuthUserFromRequest(req)).toBeNull();
  });

  it("devuelve null cuando el header es 'Bearer ' (token vacio tras strip)", async () => {
    const req = new Request("https://example.com", {
      headers: { authorization: "Bearer " },
    });
    expect(await getAuthUserFromRequest(req)).toBeNull();
  });
});

describe("getAuthUserFromRequest — token invalido (con mock de fetch)", () => {
  // Para estos caminos SI se invoca getSupabase().auth.getUser(token).
  // Stub global de fetch para no tocar la red real.

  it("acepta minusculas en el prefijo 'bearer' y devuelve null si Supabase rechaza", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    ) as any;

    const req = new Request("https://example.com", {
      headers: { authorization: "bearer xyz" },
    });

    expect(await getAuthUserFromRequest(req)).toBeNull();
  });
});