import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const CreateChoferServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: {
    nombres: string;
    cedula?: number | null;
    placa_unidad?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      if (data.cedula) {
        const { data: existente } = await supabase.from("chofer")
          .select("id")
          .eq("cedula", data.cedula)
          .is("deleted_at", null)
          .maybeSingle();

        if (existente) {
          throw new Error("Ya existe un conductor registrado con esa cédula");
        }
      }

      const { error } = await supabase.from("chofer")
        .insert({
          nombres_apellidos: data.nombres,
          cedula: data.cedula ?? null,
          placa_unidad: data.placa_unidad ?? null,
        });

      if (error) throw new Error(error.message);

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en CreateChoferServer]", err.message);
      throw new Error("Error al crear conductor");
    }
  });
