import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

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

export const getMovilizationMonthlyServer = createServerFn({ method: "GET" })
  .inputValidator((data: { year?: number }) => data)
  .handler(async ({ data }) => {
    try {
      const year = data.year ?? new Date().getFullYear();
      const fromTS = `${year}-01-01T00:00:00-04:00`;
      const toTS = `${year}-12-31T23:59:59-04:00`;

      const [entradasRes, salidasRes] = await Promise.all([
        (supabase as any)
          .from('entrada')
          .select("hora")
          .is("deleted_at", null)
          .gte("hora", fromTS)
          .lte("hora", toTS),
        (supabase as any)
          .from('salida')
          .select("hora, entrada_id")
          .is("deleted_at", null)
          .is("entrada_id", null)
          .gte("hora", fromTS)
          .lte("hora", toTS),
      ]);

      if (entradasRes.error) throw entradasRes.error;
      if (salidasRes.error) throw salidasRes.error;

      const entradas = entradasRes.data ?? [];
      const salidasStandalone = salidasRes.data ?? [];

      const monthly: Record<string, number> = {};
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, "0")}`;
        monthly[key] = 0;
      }

      for (const r of [...entradas, ...salidasStandalone]) {
        const veHora = toVE((r as any).hora);
        const key = veHora?.slice(0, 7);
        if (key && monthly[key] !== undefined) monthly[key]++;
      }

      const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
      ];

      return Object.entries(monthly).map(([key, val], i) => ({
        mes: months[i],
        total: val,
      }));
    } catch (err: any) {
      console.error("[DB error en getMovilizacionMonthly]", err.message);
      return [];
    }
  });
