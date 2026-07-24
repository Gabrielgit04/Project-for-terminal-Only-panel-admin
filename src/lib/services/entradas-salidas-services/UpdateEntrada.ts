import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const UpdateEntradaServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: {
    id: number;
    id_tipologia?: number | null;
    id_organizacion?: string | null;
    id_ruta?: number | null;
    id_chofer?: number | null;
    placa_vehiculo?: string | null;
    puestos_ocupados?: number | null;
    tipo_servicio?: string | null;
    serial_listin?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      if (data.puestos_ocupados != null) {
        const { data: entrada } = await (supabase as any)
          .from("entrada")
          .select("id_tipologia")
          .eq("id", data.id)
          .maybeSingle();
        if (entrada) {
          const { data: tipo } = await (supabase as any)
            .from("tipologia")
            .select("cantidad_puestos")
            .eq("id", entrada.id_tipologia)
            .maybeSingle();
          if (tipo && (data.puestos_ocupados < 0 || data.puestos_ocupados > (tipo.cantidad_puestos ?? 999999))) {
            throw new Error(`Los puestos no pueden exceder ${tipo.cantidad_puestos ?? 0}`);
          }
        }
      }

      const { id, ...fields } = data;
      const updateData: Record<string, any> = {};
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined && val !== null) updateData[key] = val;
      }

      const { error } = await (supabase as any)
        .from("entrada")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[DB error en UpdateEntradaServer]", err.message);
      throw new Error(err.message || "Error al actualizar entrada");
    }
  });
