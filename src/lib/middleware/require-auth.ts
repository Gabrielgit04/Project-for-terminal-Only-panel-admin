import { createMiddleware } from "@tanstack/react-start";
export const requireAuth = createMiddleware({ type: "function" }).server(
  async (ctx: any) => {
    const { getAuthUserFromRequest } = await import("@/server/supabase.service");
    const auth = await getAuthUserFromRequest(ctx.request);
    if (!auth) {
      throw new Error("No autorizado: token invalido o ausente");
    }
    return ctx.next({ context: { user: auth.user } });
  },
);