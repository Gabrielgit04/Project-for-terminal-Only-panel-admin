import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export const SelectTipologiaServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("tipologia")
        .select("id, cantidad_puestos");
      if (error) throw error;
      return data ?? [];
    } catch (err: any) {
      console.error("[DB error en SelectTipologiaServer]", err.message);
      throw new Error("Error al consultar tipologías");
    }
  });
