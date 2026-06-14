import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
export const UpdateMovilizationServer = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; estado?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const updateData: Record<string, any> = {};
      if (data.estado) updateData.estado = data.estado;

      const { error } = await (supabase as any)
        .from("entrada")
        .update(updateData)
        .eq("id", data.id);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[DB error en UpdateMovilizationServer]", err.message);
      throw new Error("Error al actualizar movilización");
    }
  });
