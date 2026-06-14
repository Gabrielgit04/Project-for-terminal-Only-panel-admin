import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
export const UpdateSalidaServer = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: number;
    id_tipologia?: number | null;
    id_organizacion?: string | null;
    id_ruta?: number | null;
    id_chofer?: number | null;
    placa_vehiculo?: string | null;
    puestos_ocupados?: number | null;
    total_tasas?: number | null;
    serial_listin?: string | null;
    tipo_servicio_salida?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      if (data.puestos_ocupados != null) {
        const { data: salida } = await (supabase as any)
          .from("salida")
          .select("id_tipologia")
          .eq("id", data.id)
          .maybeSingle();
        if (salida) {
          const { data: tipo } = await (supabase as any)
            .from("tipologia")
            .select("cantidad_puestos")
            .eq("id", salida.id_tipologia)
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
        .from("salida")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[DB error en UpdateSalidaServer]", err.message);
      throw new Error(err.message || "Error al actualizar salida");
    }
  });
