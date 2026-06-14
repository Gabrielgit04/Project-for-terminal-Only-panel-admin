import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export interface UltimaMovilizacion {
  horaApertura: string;
  ruta: string;
  placa: string;
  chofer: string;
}

export interface DashboardData {
  movilizacionesActivas: number;
  vehiculosOperativos: number;
  choferesDisponibles: number;
  rutasCubiertas: number;
  topRutas: { ruta: string; total: number }[];
  horasPico: { hora: string; total: number }[];
  ultimasMovilizaciones: UltimaMovilizacion[];
}

function todayVE(): { from: string; to: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const y = p("year"), m = p("month"), d = p("day");
  return {
    from: `${y}-${m}-${d} 00:00:00`,
    to: `${y}-${m}-${d} 23:59:59`,
  };
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

export const getDashboardDataServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { from, to } = todayVE();
      const fromTS = `${from.replace(" ", "T")}-04:00`;
      const toTS = `${to.replace(" ", "T")}-04:00`;

      const [entradasRes, salidasRes] = await Promise.all([
        (supabase as any)
          .from("entrada")
          .select("id, hora, id_ruta, placa_vehiculo, id_chofer")
          .is("deleted_at", null)
          .gte("hora", fromTS)
          .lte("hora", toTS),
        (supabase as any)
          .from("salida")
          .select("id, hora, id_ruta, placa_vehiculo, id_chofer")
          .is("deleted_at", null)
          .is("entrada_id", null)
          .gte("hora", fromTS)
          .lte("hora", toTS),
      ]);

      if (entradasRes.error) throw entradasRes.error;
      if (salidasRes.error) throw salidasRes.error;

      const movRows = [
        ...(entradasRes.data ?? []),
        ...(salidasRes.data ?? []),
      ];

      const rutaIds = [...new Set(movRows.map((r: any) => r.id_ruta))] as number[];

      const { count: vehiculosCount, error: vehErr } = await (supabase as any)
        .from("vehiculos")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      if (vehErr) throw vehErr;

      const { count: choferesCount, error: chofErr } = await (supabase as any)
        .from("chofer")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      if (chofErr) throw chofErr;

      let rutaMap = new Map<number, string>();
      if (rutaIds.length > 0) {
        const { data: rutas } = await (supabase as any)
          .from("rutas")
          .select("id, origen, destino")
          .in("id", rutaIds);
        rutaMap = new Map(
          (rutas ?? []).map((r: any) => [
            r.id,
            [r.origen, r.destino].filter(Boolean).join(" - ") || `Ruta #${r.id}`,
          ])
        );
      }

      const choferIds = [...new Set(movRows.map((r: any) => r.id_chofer).filter(Boolean))] as number[];
      let choferMap = new Map<number, string>();
      if (choferIds.length > 0) {
        const { data: choferes } = await (supabase as any)
          .from("chofer")
          .select("id, nombres_apellidos")
          .in("id", choferIds);
        choferMap = new Map(
          (choferes ?? []).map((c: any) => [c.id, c.nombres_apellidos])
        );
      }

      const rutaCounts: Record<number, number> = {};
      for (const r of movRows) {
        const rid = (r as any).id_ruta;
        rutaCounts[rid] = (rutaCounts[rid] || 0) + 1;
      }

      const topRutas = Object.entries(rutaCounts)
        .map(([id, total]) => ({
          ruta: rutaMap.get(Number(id)) || `Ruta #${id}`,
          total,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const horaCounts: Record<string, number> = {};
      for (const r of movRows) {
        const veHora = toVE((r as any).hora);
        const hora = veHora?.slice(11, 13) + ":00" || "—";
        horaCounts[hora] = (horaCounts[hora] || 0) + 1;
      }

      const horasPico = Object.entries(horaCounts)
        .map(([hora, total]) => ({ hora, total }))
        .sort((a, b) => a.hora.localeCompare(b.hora));

      const ultimasMovilizaciones = movRows
        .sort((a: any, b: any) => ((b as any).hora || "").localeCompare((a as any).hora || ""))
        .slice(0, 10)
        .map((r: any) => {
          const veHora = toVE(r.hora);
          const hora = veHora?.slice(11, 16) || "—";
          return {
            horaApertura: hora,
            ruta: rutaMap.get(r.id_ruta) || "—",
            placa: r.placa_vehiculo || "—",
            chofer: choferMap.get(r.id_chofer) || "—",
          };
        });

      return {
        movilizacionesActivas: movRows.length,
        vehiculosOperativos: vehiculosCount ?? 0,
        choferesDisponibles: choferesCount ?? 0,
        rutasCubiertas: rutaIds.length,
        topRutas,
        horasPico,
        ultimasMovilizaciones,
      };
    } catch (err: any) {
      console.error("[DB error en getDashboardData]", err.message);
      return {
        movilizacionesActivas: 0,
        vehiculosOperativos: 0,
        choferesDisponibles: 0,
        rutasCubiertas: 0,
        topRutas: [],
        horasPico: [],
        ultimasMovilizaciones: [],
      };
    }
  });
