import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

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

export const getMovilizationKPIsServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { from, to } = todayVE();
      const fromTS = `${from.replace(" ", "T")}-04:00`;
      const toTS = `${to.replace(" ", "T")}-04:00`;

      const { data: rowsEntrada, error: errEnt } = await (supabase as any)
        .from('entrada')
        .select("placa_vehiculo, puestos_ocupados, estado")
        .is("deleted_at", null)
        .gte("hora", fromTS)
        .lte("hora", toTS);

      if (errEnt) throw errEnt;

      const { data: rowsSalida, error: errSal } = await (supabase as any)
        .from('salida')
        .select("puestos_ocupados, entrada_id, placa_vehiculo")
        .is("deleted_at", null)
        .gte("hora", fromTS)
        .lte("hora", toTS);

      if (errSal) throw errSal;

      const entradas = rowsEntrada ?? [];
      const salidas = rowsSalida ?? [];

      const standaloneSalidas = salidas.filter((r: any) => !r.entrada_id);
      const totalMovilizado = entradas.length + standaloneSalidas.length;
      const totalDespachados = entradas.filter((r: any) => r.estado === "despachado").length + standaloneSalidas.length;

      const { data: listines } = await (supabase as any)
        .from('listines')
        .select('id', { count: 'exact', head: true })
        .gte('fecha', from)
        .lte('fecha', to);
      const totalPasajesHoy = (listines as any)?.length ?? 0;

      let totalPuestosEntrada = 0;
      for (const r of entradas) {
        totalPuestosEntrada += (r as any).puestos_ocupados ?? 0;
      }

      let totalPuestosSalida = 0;
      for (const r of salidas) {
        totalPuestosSalida += (r as any).puestos_ocupados ?? 0;
      }

      const placaCount: Record<string, number> = {};
      for (const r of entradas) {
        const placa = (r as any).placa_vehiculo;
        if (placa) placaCount[placa] = (placaCount[placa] ?? 0) + 1;
      }
      for (const r of standaloneSalidas) {
        const placa = (r as any).placa_vehiculo;
        if (placa) placaCount[placa] = (placaCount[placa] ?? 0) + 1;
      }
      let vehiculoMasUsado = "—";
      let maxCount = 0;
      for (const [placa, cnt] of Object.entries(placaCount)) {
        if (cnt > maxCount) {
          maxCount = cnt;
          vehiculoMasUsado = placa;
        }
      }

      return {
        totalMovilizado,
        totalDespachados,
        totalSuspendidos: 0,
        totalPuestos: totalPuestosEntrada,
        totalPuestosEntrada,
        totalPuestosSalida,
        totalPasajesHoy,
        vehiculoMasUsado,
      };
    } catch (err: any) {
      console.error("[DB error en getMovilizacionKPIs]", err.message);
      return {
        totalMovilizado: 0,
        totalDespachados: 0,
        totalSuspendidos: 0,
        totalPuestos: 0,
        totalPuestosEntrada: 0,
        totalPuestosSalida: 0,
        totalPasajesHoy: 0,
        vehiculoMasUsado: "—",
      };
    }
  });
