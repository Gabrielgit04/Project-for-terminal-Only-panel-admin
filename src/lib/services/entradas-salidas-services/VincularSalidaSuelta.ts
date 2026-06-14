import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export const VincularSalidaSueltaServer = createServerFn({ method: "POST" })
  .inputValidator((data: { salidaId: number; horaEntrada: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { data: salida } = await (supabase as any)
        .from("salida")
        .select("id_tipologia, id_organizacion, id_ruta, id_chofer, placa_vehiculo, puestos_ocupados, tipo_servicio_salida, serial_listin")
        .eq("id", data.salidaId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!salida) throw new Error("Salida no encontrada");

      const horaEntrada = `${data.horaEntrada}:00-04:00`;

      const insertData: any = {
        hora: horaEntrada,
        id_tipologia: salida.id_tipologia,
        id_organizacion: salida.id_organizacion,
        id_chofer: salida.id_chofer,
        placa_vehiculo: salida.placa_vehiculo,
        puestos_ocupados: salida.puestos_ocupados,
        estado: "despachado",
      };
      if (salida.id_ruta != null) insertData.id_ruta = salida.id_ruta;
      if (salida.tipo_servicio_salida) insertData.tipo_servicio = salida.tipo_servicio_salida;
      if (salida.serial_listin) insertData.serial_listin = salida.serial_listin;

      const { data: newEntrada, error: insErr } = await (supabase as any)
        .from("entrada")
        .insert(insertData)
        .select("id")
        .single();

      if (insErr) throw insErr;

      await (supabase as any)
        .from("salida")
        .update({ entrada_id: newEntrada.id })
        .eq("id", data.salidaId);

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en VincularSalidaSueltaServer]", err.message);
      throw new Error(err.message || "Error al vincular salida");
    }
  });
