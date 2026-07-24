import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const CreateRutasServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: {
    origen?: string | null;
    destino?: string | null;
    id_organizacion?: string;
  }) => data)
  .handler(async ({ data }) => {
    try {
      if (data.origen && data.destino) {
        const { data: existente } = await supabase.from("rutas")
          .select("id")
          .ilike("origen", data.origen.trim())
          .ilike("destino", data.destino.trim())
          .is("deleted_at", null)
          .maybeSingle();

        if (existente) {
          throw new Error("Ya existe una ruta con ese origen y destino");
        }
      }

      const { data: newRuta, error } = await supabase.from("rutas").insert({
        origen: data.origen ?? null,
        destino: data.destino ?? null,
        id_organizacion: data.id_organizacion ?? null,
        created_at: new Date().toISOString(),
      }).select("id").maybeSingle();

      if (error) throw new Error(error.message);
      if (!newRuta) throw new Error("No se pudo crear la ruta");

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en CreateRutasServer]", err.message);
      throw new Error("Error al crear ruta");
    }
  });
