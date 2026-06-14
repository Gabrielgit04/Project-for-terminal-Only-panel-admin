import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
export const CreateListinServer = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id_movilizacion: number;
    asiento_numero: number;
    cedula: string;
    nombres: string;
    telefono?: string;
    destino?: string;
    monto: number;
    id_organizacion?: string;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const { data: existente } = await (supabase as any)
        .from('listines')
        .select("id")
        .eq("id_movilizacion", data.id_movilizacion)
        .eq("asiento_numero", data.asiento_numero)
        .maybeSingle();

      if (existente) {
        throw new Error("Ese asiento ya está ocupado en esta movilización");
      }

      const result = await (supabase as any)
        .from('listines')
        .insert({
          id_movilizacion: data.id_movilizacion,
          asiento_numero: data.asiento_numero,
          cedula: data.cedula,
          nombres: data.nombres,
          telefono: data.telefono ?? null,
          destino: data.destino ?? null,
          monto: data.monto,
          id_organizacion: data.id_organizacion ?? null,
          fecha: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (result.error) throw new Error(result.error.message);

      return { success: true, id: result.data?.id };
    } catch (err: any) {
      console.error("[DB error en CreateListinServer]", err.message);
      throw new Error("Error al registrar pasajero");
    }
  });
