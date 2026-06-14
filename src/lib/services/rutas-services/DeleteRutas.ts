import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
export const DeleteRutasServer = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    try {
      const { error } = await supabase.from('rutas')
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", data.id);

      if (error) throw new Error(error.message);

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en DeleteRutasServer]", err.message);
      throw new Error("Error al eliminar ruta");
    }
  });
