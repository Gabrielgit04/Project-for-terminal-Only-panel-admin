import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
export interface ListinPasajero {
  id: number;
  id_movilizacion: number;
  asiento_numero: number;
  cedula: string;
  nombres: string;
  telefono: string | null;
  destino: string | null;
  monto: number;
}

export const selectListinesByMovilizacionServer = createServerFn({ method: "GET" })
  .inputValidator((data: { id_movilizacion: number }) => data)
  .handler(async ({ data }) => {
    try {
      const { data: rows, error } = await ((supabase as any).from('listines') as any)
        .select("*")
        .eq("id_movilizacion", data.id_movilizacion)
        .order("asiento_numero", { ascending: true });

      if (error) throw new Error(error.message);

      return (rows ?? []) as ListinPasajero[];
    } catch (err: any) {
      console.error("[DB error en selectListinesByMovilizacionServer]", err.message);
      throw new Error("Error al obtener pasajeros");
    }
  });
