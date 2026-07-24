import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock del modulo supabase.service para controlar el resultado de
// getAuthUserFromRequest sin tocar la red real.
vi.mock("@/server/supabase.service", () => ({
  getAuthUserFromRequest: vi.fn(),
}));

import { requireAuth } from "@/lib/middleware/require-auth";
import { getAuthUserFromRequest } from "@/server/supabase.service";

const mockGetAuth = getAuthUserFromRequest as unknown as ReturnType<
  typeof vi.fn
>;

// `requireAuth` es el objeto retornado por createMiddleware(...).server(fn).
// El handler real vive en `.options.server`.
const middlewareHandler = (requireAuth as any).options.server as (
  ctx: any,
) => Promise<any>;

describe("requireAuth middleware", () => {
  beforeEach(() => {
    mockGetAuth.mockReset();
  });

  it("lanza 'No autorizado' y NO llama next() cuando no hay token valido", async () => {
    mockGetAuth.mockResolvedValue(null);

    const next = vi.fn().mockResolvedValue({ context: {} });
    const ctx = { request: new Request("https://example.com"), next };

    await expect(middlewareHandler(ctx)).rejects.toThrow(/No autorizado/i);
    expect(next).not.toHaveBeenCalled();
  });

  it("inyecta context.user y llama next() cuando el token es valido", async () => {
    const user = { id: "u-123", username: "admin", role: "presidente" };
    mockGetAuth.mockResolvedValue({ user });

    const next = vi.fn().mockResolvedValue({ context: { user } });
    const ctx = { request: new Request("https://example.com"), next };

    await middlewareHandler(ctx);

    expect(mockGetAuth).toHaveBeenCalledTimes(1);
    expect(mockGetAuth).toHaveBeenCalledWith(ctx.request);
    expect(next).toHaveBeenCalledTimes(1);
    const nextArg = next.mock.calls[0][0];
    expect(nextArg.context).toEqual({ user });
  });

  it("propaga el Request recibido tal cual a getAuthUserFromRequest", async () => {
    mockGetAuth.mockResolvedValue(null);
    const request = new Request("https://api.test/fn", {
      headers: { authorization: "Bearer xyz" },
    });
    const ctx = { request, next: vi.fn() };

    await expect(middlewareHandler(ctx)).rejects.toThrow();
    expect(mockGetAuth).toHaveBeenCalledWith(request);
  });
});