import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export const SelectRutasServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      let rows: any[] = [];

      const { data: r1, error: e1 } = await (supabase as any)
        .from("rutas")
        .select("*")
        .is("deleted_at", null)
        .order("id", { ascending: false });

      if (!e1) {
        rows = r1 ?? [];
      } else {
        const { data: r2, error: e2 } = await (supabase as any)
          .from("rutas")
          .select("*")
          .order("id", { ascending: false });
        if (e2) throw e2;
        rows = r2 ?? [];
      }

      const { data: orgs } = await (supabase as any)
        .from("organizaciones")
        .select("id_rif, nombre");
      const orgMap = new Map((orgs ?? []).map((o: any) => [o.id_rif, o.nombre]));

      return (rows ?? []).map((row: any) => ({
        id: row.id,
        origen: row.origen,
        destino: row.destino,
        id_organizacion: row.id_organizacion ?? null,
        organizacion_nombre: row.id_organizacion ? (orgMap.get(row.id_organizacion) ?? null) : null,
      }));
    } catch (err: any) {
      console.error("[DB error en SelectRutasServer]", err.message);
      throw new Error("Error de conexión con la base de datos");
    }
  });
