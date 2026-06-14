import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export interface MovilizacionDetail {
  id: number;
  numero_listin: number | null;
  hora_salida: string | null;
}

function toVE(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")} ${p("hour")}:${p("minute")}:${p("second")}`;
}

export const getMovilizacionDetailServer = createServerFn({ method: "GET" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    try {
      let { data: salida } = await (supabase as any)
        .from("salida")
        .select("id, hora")
        .eq("entrada_id", data.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!salida) {
        const { data: salidaDirect } = await (supabase as any)
          .from("salida")
          .select("id, hora")
          .eq("id", data.id)
          .is("deleted_at", null)
          .maybeSingle();
        salida = salidaDirect;
      }

      return {
        id: data.id,
        numero_listin: (salida as any)?.id ?? null,
        hora_salida: toVE((salida as any)?.hora ?? null),
      } as MovilizacionDetail;
    } catch (err: any) {
      console.error("[DB error en getMovilizacionDetailServer]", err.message);
      throw new Error("Error al obtener detalle de movilización");
    }
  });
