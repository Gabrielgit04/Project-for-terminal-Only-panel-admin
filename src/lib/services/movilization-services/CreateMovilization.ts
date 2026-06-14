import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
function nowVE(): { fecha: string; dia: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "long",
  }).formatToParts(now);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const diaMap: Record<string, string> = {
    domingo: "DOMINGO", lunes: "LUNES", martes: "MARTES", miércoles: "MIERCOLES",
    jueves: "JUEVES", viernes: "VIERNES", sábado: "SABADO",
  };
  const wd = p("weekday").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return {
    fecha: `${p("year")}-${p("month")}-${p("day")}`,
    dia: diaMap[wd] ?? "DOMINGO",
  };
}

export const CreateMovilizationServer = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id_ruta: number;
    placa_vehiculo: string;
    id_organizacion?: string | null;
    id_chofer_cedula?: number | null;
    anden?: string | null;
    entrada_id?: number | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const { fecha, dia } = nowVE();

      const { data: existente } = await (supabase as any)
        .from("movilizaciones")
        .select("id")
        .eq("fecha", fecha)
        .eq("id_ruta", data.id_ruta)
        .eq("placa_vehiculo", data.placa_vehiculo)
        .is("deleted_at", null)
        .maybeSingle();

      if (existente) {
        throw new Error("Ya existe una movilización con esa ruta y placa en la fecha de hoy");
      }

      const { data: mov } = await (supabase as any)
        .from("movilizaciones")
        .insert({
          id_ruta: data.id_ruta,
          placa_vehiculo: data.placa_vehiculo,
          id_organizacion: data.id_organizacion,
          id_chofer_cedula: data.id_chofer_cedula,
          anden: data.anden,
          fecha,
          dia,
        })
        .select("id")
        .single();

      const movId = (mov as any)?.id;
      if (movId && data.entrada_id) {
        await (supabase as any)
          .from("entrada")
          .update({ movilizacion_id: movId })
          .eq("id", data.entrada_id);
      }

      return mov;
    } catch (err: any) {
      console.error("[DB error en CreateMovilizationServer]", err.message);
      throw new Error("Error al crear movilización");
    }
  });
