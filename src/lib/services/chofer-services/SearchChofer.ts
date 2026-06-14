import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export const SearchChoferServer = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data: { query } }) => {
    try {
      const term = query.trim().toLowerCase();

      const { data: all } = await (supabase as any)
        .from("chofer")
        .select("*")
        .is("deleted_at", null);

      return (all ?? []).filter((r: any) => {
        const nameMatch = (r.nombres_apellidos ?? "").toLowerCase().includes(term);
        const cedMatch = r.cedula != null && String(r.cedula).includes(term);
        return nameMatch || cedMatch;
      }).sort((a: any, b: any) => (a.cedula ?? 0) - (b.cedula ?? 0));
    } catch (err: any) {
      console.error("[DB error en SearchChoferServer]", err.message);
      throw new Error(err.message);
    }
  });
