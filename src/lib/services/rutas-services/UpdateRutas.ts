import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const UpdateRutasServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: {
    id: number;
    origen?: string | null;
    destino?: string | null;
    distancia_km?: number | null;
    id_organizacion?: string;
  }) => data)
  .handler(async ({ data }) => {
    try {
      if (data.origen || data.destino) {
        const { data: rutaActual } = await (supabase as any)
          .from("rutas")
          .select("origen, destino")
          .eq("id", data.id)
          .maybeSingle();

        const nuevoOrigen = (data.origen ?? rutaActual?.origen ?? "").trim();
        const nuevoDestino = (data.destino ?? rutaActual?.destino ?? "").trim();

        if (nuevoOrigen && nuevoDestino) {
          const { data: existente } = await (supabase as any)
            .from("rutas")
            .select("id")
            .ilike("origen", nuevoOrigen)
            .ilike("destino", nuevoDestino)
            .neq("id", data.id)
            .is("deleted_at", null)
            .maybeSingle();

          if (existente) {
            throw new Error("Ya existe otra ruta con ese origen y destino");
          }
        }
      }

      const updates: Record<string, unknown> = {};
      if (data.origen !== undefined) updates.origen = data.origen;
      if (data.destino !== undefined) updates.destino = data.destino;
      if (data.distancia_km !== undefined) updates.distancia = data.distancia_km;
      if (data.id_organizacion !== undefined) updates.id_organizacion = data.id_organizacion;
      updates.updated_at = new Date().toISOString();

      const { error } = await (supabase as any)
        .from("rutas")
        .update(updates)
        .eq("id", data.id);

      if (error) throw new Error(error.message);

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en UpdateRutasServer]", err.message);
      throw new Error("Error al actualizar ruta");
    }
  });
