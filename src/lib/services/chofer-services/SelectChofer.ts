import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export const SelectChoferServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      let data: any[] = [];

      const { data: r1, error: e1 } = await (supabase as any)
        .from("chofer")
        .select("*")
        .is("deleted_at", null)
        .order("nombres_apellidos", { ascending: true });

      if (!e1) {
        data = r1 ?? [];
      } else {
        const { data: r2, error: e2 } = await (supabase as any)
          .from("chofer")
          .select("*")
          .order("nombres_apellidos", { ascending: true });
        if (e2) throw e2;
        data = r2 ?? [];
      }

      return data;
    } catch (err: any) {
      console.error("[DB error en SelectChoferServer]", err.message);
      throw new Error("Error de conexión con la base de datos");
    }
  });
