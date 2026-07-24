import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const DeleteListinServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    try {
      const { error } = await (supabase as any)
        .from('listines')
        .delete()
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      console.error("[DB error en DeleteListinServer]", err.message);
      throw new Error("Error al eliminar pasajero");
    }
  });
