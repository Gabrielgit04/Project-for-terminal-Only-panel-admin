import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export interface ControlOperativoData {
  kpis: {
    unidadesSalientes: number;
    usuariosMovilizados: number;
    desembarques: number;
    tasas: number;
  };
  tipologiaChart: { tipologia: string; usuarios: number; unidades: number }[];
  weeklyTrend: { dia: string; usuarios: number; unidades: number }[];
  dailyTable: {
    fecha: string;
    diaSemana: string;
    unidades: number;
    desembarques: number;
    tasas: number;
    detalle: { tipologia: string; unidades: number; pasajeros: number }[];
  }[];
}

export const getControlOperativoServer = createServerFn({ method: "GET" })
  .inputValidator((data: { from: string; to: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { from, to } = data;

      // 1. movilizaciones activas en el rango
      const { data: movRows, error: movErr } = await (supabase as any)
        .from('movilizaciones')
        .select("id, fecha, dia, id_tipologia, unidades_despachadas")
        .is("deleted_at", null)
        .gte("fecha", from)
        .lte("fecha", to);

      if (movErr) throw movErr;

      const movIds: number[] = (movRows ?? []).map((r: any) => r.id);

      // 2. conteo de listines en esas movilizaciones
      let pasajerosPorMov: Record<number, number> = {};
      let totalPasajeros = 0;
      if (movIds.length > 0) {
        const { data: listRows } = await (supabase as any)
          .from('listines')
          .select('id_movilizacion')
          .in('id_movilizacion', movIds);
        for (const l of listRows ?? []) {
          const mid = l.id_movilizacion;
          pasajerosPorMov[mid] = (pasajerosPorMov[mid] ?? 0) + 1;
          totalPasajeros++;
        }
      }

      // 3. nombres de tipología
      const tipoIds = [...new Set((movRows ?? []).map((r: any) => r.id_tipologia).filter(Boolean))];
      let tipoMap = new Map<number, { id: number; cantidad_puestos: number }>();
      if (tipoIds.length > 0) {
        const { data: tipos } = await (supabase as any)
          .from('tipologia')
          .select("id, cantidad_puestos")
          .in("id", tipoIds);
        tipoMap = new Map((tipos ?? []).map((t: any) => [t.id, t]));
      }

      // 4. KPI
      const unidadesSalientes = movRows?.length ?? 0;
      const usuariosMovilizados = totalPasajeros;
      const desembarques = 0;
      const tasas = 0;

      // 5. tipología chart
      const tipoAgg = new Map<number, { usuarios: number; unidades: number }>();
      for (const r of movRows ?? []) {
        const tid = r.id_tipologia;
        if (!tid) continue;
        if (!tipoAgg.has(tid)) tipoAgg.set(tid, { usuarios: 0, unidades: 0 });
        const entry = tipoAgg.get(tid)!;
        entry.unidades++;
        entry.usuarios += pasajerosPorMov[r.id] ?? 0;
      }
      const tipologiaChart = [...tipoAgg.entries()]
        .map(([tid, agg]) => ({
          tipologia: `${tid} puestos`,
          usuarios: agg.usuarios,
          unidades: agg.unidades,
        }))
        .sort((a, b) => b.usuarios - a.usuarios);

      // 6. weekly trend — group by dia
      const diaMap: Record<string, { unidades: number; usuarios: number }> = {
        LUNES: { unidades: 0, usuarios: 0 },
        MARTES: { unidades: 0, usuarios: 0 },
        MIERCOLES: { unidades: 0, usuarios: 0 },
        JUEVES: { unidades: 0, usuarios: 0 },
        VIERNES: { unidades: 0, usuarios: 0 },
        SABADO: { unidades: 0, usuarios: 0 },
        DOMINGO: { unidades: 0, usuarios: 0 },
      };
      for (const r of movRows ?? []) {
        const d = (r.dia ?? "DOMINGO").toUpperCase();
        if (diaMap[d]) {
          diaMap[d].unidades++;
          diaMap[d].usuarios += pasajerosPorMov[r.id] ?? 0;
        }
      }
      const diasOrden = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
      const weeklyTrend = diasOrden.map((d) => ({
        dia: d.charAt(0) + d.slice(1).toLowerCase(),
        usuarios: diaMap[d].usuarios,
        unidades: diaMap[d].unidades,
      }));

      // 7. dailyTable — group by fecha
      const fechaMap = new Map<string, {
        unidades: number; pasajeros: number; desembarques: number; tasas: number;
        detalle: Map<number, { unidades: number; pasajeros: number }>;
      }>();
      for (const r of movRows ?? []) {
        const f = (r.fecha ?? "").slice(0, 10);
        if (!f) continue;
        if (!fechaMap.has(f)) {
          fechaMap.set(f, { unidades: 0, pasajeros: 0, desembarques: 0, tasas: 0, detalle: new Map() });
        }
        const day = fechaMap.get(f)!;
        day.unidades++;
        const pax = pasajerosPorMov[r.id] ?? 0;
        day.pasajeros += pax;
        const tid = r.id_tipologia;
        if (tid) {
          if (!day.detalle.has(tid)) day.detalle.set(tid, { unidades: 0, pasajeros: 0 });
          const det = day.detalle.get(tid)!;
          det.unidades++;
          det.pasajeros += pax;
        }
      }

      const diasSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
      const dailyTable = [...fechaMap.entries()]
        .map(([fechaStr, day]) => {
          const dt = new Date(fechaStr + "T12:00:00");
          const diaSemana = diasSemana[dt.getDay()] ?? "";
          return {
            fecha: fechaStr,
            diaSemana,
            unidades: day.unidades,
            pasajeros: day.pasajeros,
            desembarques: day.desembarques,
            tasas: day.tasas,
            detalle: [...day.detalle.entries()].map(([tid, d]) => ({
              tipologia: `${tid} puestos`,
              unidades: d.unidades,
              pasajeros: d.pasajeros,
            })),
          };
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha));

      return {
        kpis: { unidadesSalientes, usuariosMovilizados, desembarques, tasas },
        tipologiaChart,
        weeklyTrend,
        dailyTable,
      };
    } catch (err: any) {
      console.error("[DB error en getControlOperativoServer]", err.message);
      return {
        kpis: { unidadesSalientes: 0, usuariosMovilizados: 0, desembarques: 0, tasas: 0 },
        tipologiaChart: [],
        weeklyTrend: [],
        dailyTable: [],
      };
    }
  });
