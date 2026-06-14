import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
export const DeleteChoferServer = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    try {
      const { error } = await supabase.from("chofer")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", data.id);

      if (error) throw new Error(error.message);

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en DeleteChoferServer]", err.message);
      throw new Error("Error al eliminar conductor");
    }
  });
