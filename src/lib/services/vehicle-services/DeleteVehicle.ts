import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
export const DeleteVehicleServer = createServerFn({ method: "POST" })
  .inputValidator((data: { placa: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { data: veh } = await (supabase as any)
        .from('vehiculos')
        .select("placa")
        .eq("placa", data.placa)
        .maybeSingle();

      if (veh) {
        await (supabase as any).from("DT9").delete().eq("id_vehiculo", veh.placa);
      }

      const { error } = await (supabase as any)
        .from('vehiculos')
        .update({ deleted_at: new Date().toISOString() })
        .eq("placa", data.placa);

      if (error) throw new Error(error.message);

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en DeleteVehicleServer]", err.message);
      throw new Error("Error al eliminar vehículo");
    }
  });
