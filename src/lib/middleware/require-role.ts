import { createMiddleware } from "@tanstack/react-start";

export function requireRole(...allowedRoles: string[]) {
  return createMiddleware({ type: "function" }).server(async (ctx: any) => {
    const { getAuthUserFromRequest } = await import("@/server/supabase.service");
    const auth = await getAuthUserFromRequest(ctx.request);
    if (!auth) {
      throw new Error("No autorizado: token invalido o ausente");
    }
    if (!allowedRoles.includes(auth.user.role)) {
      throw new Error("No tienes permisos para realizar esta accion");
    }
    return ctx.next({ context: { user: auth.user } });
  });
}
