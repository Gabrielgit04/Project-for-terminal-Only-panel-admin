import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export interface ControlSemanalData {
  kpis: {
    totalUnidades: number;
    totalUsuarios: number;
    totalDesembarques: number;
    totalTasas: number;
  };
  barras: { tipologia: number; puestos: number; unidades: number; usuarios: number }[];
  tendencia: { dia: string; unidades: number; usuarios: number }[];
  tabla: {
    fecha: string;
    dia: string;
    unidades: number;
    usuarios: number;
    desembarques: number;
    tasas: number;
    detalle: { id: number; placa: string; ruta: string; linea: string; puestos: number }[];
  }[];
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

function diaSemana(hora: string): string {
  try {
    const d = new Date(hora);
    const weekdayParts = new Intl.DateTimeFormat("es-VE", {
      timeZone: "America/Caracas", weekday: "long",
    }).formatToParts(d);
    const wd = weekdayParts.find((x) => x.type === "weekday")?.value ?? "";
    const diaMap: Record<string, string> = {
      domingo: "DOMINGO", lunes: "LUNES", martes: "MARTES", miercoles: "MIERCOLES",
      jueves: "JUEVES", viernes: "VIERNES", sabado: "SABADO",
    };
    const normalized = wd.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return diaMap[normalized] ?? "SIN DIA";
  } catch { return "SIN DIA"; }
}

function extraerFecha(hora: string): string {
  return toVE(hora)?.slice(0, 10) ?? "—";
}

export const getControlSemanalServer = createServerFn({ method: "GET" })
  .inputValidator((data: { from: string; to: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { from, to } = data;
      const fromTS = `${from.replace(" ", "T")}-04:00`;
      const toTS = `${to.replace(" ", "T")}-04:00`;

      const { data: salidas } = await (supabase as any)
        .from("salida")
        .select("id, hora, placa_vehiculo, id_tipologia, id_organizacion, id_ruta, puestos_ocupados, total_tasas")
        .is("deleted_at", null)
        .gte("hora", fromTS)
        .lte("hora", toTS);

      const { data: entradas } = await (supabase as any)
        .from("entrada")
        .select("hora, puestos_ocupados")
        .is("deleted_at", null)
        .gte("hora", fromTS)
        .lte("hora", toTS);

      if (!salidas?.length && !entradas?.length) return { kpis: { totalUnidades: 0, totalUsuarios: 0, totalDesembarques: 0, totalTasas: 0 }, barras: [], tendencia: [], tabla: [] };

      const tipoIds = [...new Set(salidas.map((r: any) => r.id_tipologia).filter(Boolean))];
      const rutaIds = [...new Set(salidas.map((r: any) => r.id_ruta).filter(Boolean))];

      const [tipos, rutas] = await Promise.all([
        tipoIds.length > 0 ? (supabase as any).from("tipologia").select("id, cantidad_puestos").in("id", tipoIds) : { data: [] },
        rutaIds.length > 0 ? (supabase as any).from("rutas").select("id, origen, destino").in("id", rutaIds) : { data: [] },
      ]);

      const puestosMap = new Map<number, number>((tipos.data ?? []).map((t: any) => [t.id, t.cantidad_puestos ?? 0]));
      const rutaMap = new Map<number, string>((rutas.data ?? []).map((r: any) => [r.id, `${r.origen ?? ""} → ${r.destino ?? ""}`]));

      const rows = salidas.map((r: any) => ({
        id: r.id,
        fecha: extraerFecha(r.hora),
        dia: diaSemana(r.hora),
        placa_vehiculo: r.placa_vehiculo ?? "—",
        id_tipologia: r.id_tipologia,
        id_organizacion: r.id_organizacion,
        id_ruta: r.id_ruta,
        puestos: r.puestos_ocupados ?? puestosMap.get(r.id_tipologia) ?? 0,
        rutaStr: rutaMap.get(r.id_ruta) ?? "?",
        total_tasas: r.total_tasas ?? 0,
      }));

      // KPIs
      const kpis = {
        totalUnidades: rows.length,
        totalUsuarios: rows.reduce((s: number, r: any) => s + r.puestos, 0),
        totalDesembarques: (entradas ?? []).reduce((s: number, r: any) => s + (r.puestos_ocupados ?? 0), 0),
        totalTasas: rows.reduce((s: number, r: any) => s + Number(r.total_tasas ?? 0), 0),
      };

      // Barras (por tipologia)
      const tipoGroup = new Map<number, { puestos: number; unidades: number; usuarios: number }>();
      for (const r of rows) {
        const t = r.id_tipologia ?? 0;
        const g = tipoGroup.get(t) ?? { puestos: r.puestos, unidades: 0, usuarios: 0 };
        g.unidades += 1;
        g.usuarios += r.puestos;
        tipoGroup.set(t, g);
      }
      const barras = [...tipoGroup.entries()]
        .map(([tipologia, v]) => ({ tipologia, puestos: v.puestos, unidades: v.unidades, usuarios: v.usuarios }))
        .sort((a, b) => b.usuarios - a.usuarios);

      // Tendencia (por dia)
      const ordenDias: Record<string, number> = { LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 7 };
      const diaGroup = new Map<string, { unidades: number; usuarios: number }>();
      for (const r of rows) {
        const d = r.dia ?? "SIN DIA";
        const g = diaGroup.get(d) ?? { unidades: 0, usuarios: 0 };
        g.unidades += 1;
        g.usuarios += r.puestos;
        diaGroup.set(d, g);
      }
      const tendencia = [...diaGroup.entries()]
        .map(([dia, v]) => ({ dia, unidades: v.unidades, usuarios: v.usuarios }))
        .sort((a, b) => (ordenDias[a.dia] ?? 99) - (ordenDias[b.dia] ?? 99));

      // Tabla (agrupada por fecha)
      const fechaGroup = new Map<string, { dia: string; unidades: number; usuarios: number; tasas: number; ids: { id: number; placa: string; ruta: string; linea: string; puestos: number }[] }>();
      for (const r of rows) {
        const f = r.fecha;
        if (!f) continue;
        const g = fechaGroup.get(f) ?? { dia: r.dia ?? "", unidades: 0, usuarios: 0, tasas: 0, ids: [] as { id: number; placa: string; ruta: string; linea: string; puestos: number }[] };
        g.unidades += 1;
        g.usuarios += r.puestos;
        g.tasas += Number(r.total_tasas ?? 0);
        g.ids.push({ id: r.id, placa: r.placa_vehiculo, ruta: r.rutaStr, linea: r.id_organizacion ?? "—", puestos: r.puestos });
        fechaGroup.set(f, g);
      }

      const desembarquePorFecha: Record<string, number> = {};
      for (const r of entradas ?? []) {
        const f = extraerFecha(r.hora);
        if (!f) continue;
        desembarquePorFecha[f] = (desembarquePorFecha[f] ?? 0) + (r.puestos_ocupados ?? 0);
        if (!fechaGroup.has(f)) {
          fechaGroup.set(f, { dia: diaSemana(r.hora), unidades: 0, usuarios: 0, tasas: 0, ids: [] });
        }
      }

      const tabla = [...fechaGroup.entries()]
        .map(([fecha, v]) => ({
          fecha,
          dia: v.dia,
          unidades: v.unidades,
          usuarios: v.usuarios,
          desembarques: desembarquePorFecha[fecha] ?? 0,
          tasas: v.tasas,
          detalle: v.ids.sort((a, b) => a.puestos - b.puestos),
        }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha));

      return { kpis, barras, tendencia, tabla };
    } catch (err: any) {
      console.error("[DB error en getControlSemanal]", err.message);
      return { kpis: { totalUnidades: 0, totalUsuarios: 0, totalDesembarques: 0, totalTasas: 0 }, barras: [], tendencia: [], tabla: [] };
    }
  });
