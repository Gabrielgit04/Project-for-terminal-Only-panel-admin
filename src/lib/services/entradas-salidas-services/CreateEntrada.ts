import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
function nowVE(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}:${p("second")}-04:00`;
}

export const CreateEntradaServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: {
    id_tipologia: number;
    id_organizacion: string;
    id_ruta?: number | null;
    id_chofer: number;
    placa_vehiculo?: string | null;
    puestos_ocupados?: number | null;
    tipo_servicio?: string | null;
    serial_listin?: string | null;
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

      if (data.placa_vehiculo) {
        const { data: enEspera } = await (supabase as any)
          .from("entrada")
          .select("id")
          .eq("placa_vehiculo", data.placa_vehiculo)
          .eq("estado", "en_espera")
          .is("deleted_at", null)
          .maybeSingle();

        if (enEspera) {
          throw new Error("Este vehículo ya tiene una entrada activa en espera. Registre la salida primero.");
        }
      }

      const insertData: any = {
        hora,
        id_tipologia: data.id_tipologia,
        id_organizacion: data.id_organizacion,
        id_chofer: data.id_chofer,
        placa_vehiculo: data.placa_vehiculo ?? null,
        puestos_ocupados: puestos || null,
        estado: "en_espera",
      };
      if (data.id_ruta != null) insertData.id_ruta = data.id_ruta;
      if (data.tipo_servicio) insertData.tipo_servicio = data.tipo_servicio;
      if (data.serial_listin) insertData.serial_listin = data.serial_listin;

      const { data: newEntrada, error: insErr } = await (supabase as any)
        .from("entrada")
        .insert(insertData)
        .select("id")
        .single();

      if (insErr) throw insErr;

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en CreateEntradaServer]", err.message);
      throw new Error(err.message || "Error al registrar entrada");
    }
  });
