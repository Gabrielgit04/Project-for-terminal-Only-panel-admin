import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const UpdateChoferServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: {
    id: number;
    nombres?: string;
    cedula?: number | null;
    placa_unidad?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      if (data.cedula) {
        const { data: existente } = await supabase.from("chofer")
          .select("id")
          .eq("cedula", data.cedula)
          .neq("id", data.id)
          .is("deleted_at", null)
          .maybeSingle();

        if (existente) {
          throw new Error("Ya existe otro conductor registrado con esa cédula");
        }
      }

      const { error } = await supabase.from("chofer")
        .update({
          ...(data.nombres !== undefined && { nombres_apellidos: data.nombres }),
          ...(data.cedula !== undefined && { cedula: data.cedula }),
          ...(data.placa_unidad !== undefined && { placa_unidad: data.placa_unidad }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (error) throw new Error(error.message);

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en UpdateChoferServer]", err.message);
      throw new Error("Error al actualizar conductor");
    }
  });
