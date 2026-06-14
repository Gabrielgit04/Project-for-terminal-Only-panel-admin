import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export interface Organizacion {
  id_rif: string;
  nombre: string;
}

export const SelectOrganizacionServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("organizaciones")
        .select("id_rif, nombre")
        .order("nombre", { ascending: true });

      if (error) throw new Error("Error al obtener organizaciones");

      return (data ?? []) as Organizacion[];
    } catch (err: any) {
      console.error("[DB error en SelectOrganizacionServer]", err.message);
      throw new Error("Error de conexión con la base de datos");
    }
  });
