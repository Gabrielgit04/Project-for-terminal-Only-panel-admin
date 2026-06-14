import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
function nowVE(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}:${p("second")}-04:00`;
}

export const CreateSalidaServer = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id_tipologia: number;
    id_organizacion: string;
    id_ruta?: number | null;
    id_chofer: number;
    placa_vehiculo?: string | null;
    puestos_ocupados?: number | null;
    total_tasas: number;
    serial_listin?: string | null;
    tipo_servicio_salida?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const { data: tipo } = await (supabase as any)
        .from("tipologia")
        .select("cantidad_puestos")
        .eq("id", data.id_tipologia)
        .maybeSingle();

      if (!tipo) throw new Error("Tipología no encontrada");

      const puestos = data.puestos_ocupados ?? 0;
      if (puestos < 0 || puestos > (tipo.cantidad_puestos ?? 999999)) {
        throw new Error(`Los puestos no pueden exceder ${tipo.cantidad_puestos ?? 0}`);
      }

      const hora = nowVE();

      const insertData: any = {
        hora,
        id_tipologia: data.id_tipologia,
        id_organizacion: data.id_organizacion,
        id_chofer: data.id_chofer,
        placa_vehiculo: data.placa_vehiculo ?? null,
        total_tasas: Math.max(0, data.total_tasas),
        puestos_ocupados: puestos || null,
      };
      if (data.id_ruta != null) insertData.id_ruta = data.id_ruta;
      if (data.serial_listin) insertData.serial_listin = data.serial_listin;
      if (data.tipo_servicio_salida) insertData.tipo_servicio_salida = data.tipo_servicio_salida;

      const { data: newSalida, error: insErr } = await (supabase as any)
        .from("salida")
        .insert(insertData)
        .select("id")
        .single();

      if (insErr) throw insErr;

      const salidaId = (newSalida as any).id;
      let vinculada = false;

      if (data.placa_vehiculo) {
        const { data: entrada } = await (supabase as any)
          .from("entrada")
          .select("id")
          .eq("placa_vehiculo", data.placa_vehiculo)
          .is("deleted_at", null)
          .eq("estado", "en_espera")
          .order("hora", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (entrada) {
          await (supabase as any)
            .from("salida")
            .update({ entrada_id: entrada.id })
            .eq("id", salidaId);

          await (supabase as any)
            .from("entrada")
            .update({ estado: "despachado" })
            .eq("id", entrada.id);
          vinculada = true;
        }
      }

      return { success: true, standalone: !vinculada, salidaId };
    } catch (err: any) {
      console.error("[DB error en CreateSalidaServer]", err.message);
      throw new Error(err.message || "Error al registrar salida");
    }
  });
