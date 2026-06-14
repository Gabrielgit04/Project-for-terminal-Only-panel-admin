import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export interface EntradaSalidaRow {
  id: string;
  hora: string;
  tipo: "entrada" | "salida";
  id_tipologia: number;
  id_organizacion: string;
  id_ruta: number;
  id_chofer: number;
  placa_vehiculo?: string | null;
  total_tasas?: number | null;
  puestos_ocupados?: number | null;
  ruta_nombre?: string | null;
  chofer_nombre?: string | null;
  tipologia_puestos?: number | null;
  organizacion_nombre?: string | null;
  movilizacion_id?: number | null;
  tipo_servicio?: string | null;
  ruta_origen?: string | null;
  ruta_destino?: string | null;
  serial_listin?: string | null;
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

export const SelectEntradasSalidasServer = createServerFn({ method: "GET" })
  .inputValidator((data: { from?: string; to?: string }) => data)
  .handler(async ({ data }) => {
    try {
      function ensureOffset(dateStr: string): string {
        const hasTime = dateStr.includes(" ") || dateStr.includes("T");
        const ts = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
        return hasTime ? `${ts}-04:00` : `${ts}T00:00:00-04:00`;
      }

      const fromTS = data.from ? ensureOffset(data.from) : null;
      const toTS = data.to ? ensureOffset(data.to) : null;

      const entradasQuery = (supabase as any)
        .from("entrada")
        .select(`id, hora, id_tipologia, id_organizacion, id_ruta, id_chofer, placa_vehiculo, puestos_ocupados, tipo_servicio, serial_listin`)
        .is("deleted_at", null);

      const salidasQuery = (supabase as any)
        .from("salida")
        .select(`id, hora, id_tipologia, id_organizacion, id_ruta, id_chofer, placa_vehiculo, puestos_ocupados, total_tasas, serial_listin, tipo_servicio_salida`)
        .is("deleted_at", null);

      if (fromTS) {
        entradasQuery.gte("hora", fromTS);
        salidasQuery.gte("hora", fromTS);
      }
      if (toTS) {
        entradasQuery.lte("hora", toTS);
        salidasQuery.lte("hora", toTS);
      }

      const [entradasRes, salidasRes] = await Promise.all([
        entradasQuery.order("hora", { ascending: false }),
        salidasQuery.order("hora", { ascending: false }),
      ]);

      if (entradasRes.error) throw entradasRes.error;
      if (salidasRes.error) throw salidasRes.error;

      const { data: choferRows } = await (supabase as any)
        .from("chofer")
        .select("id, nombres_apellidos")
        .is("deleted_at", null);
      const choferMap = new Map((choferRows ?? []).map((c: any) => [c.id, c.nombres_apellidos]));

      const allRaw: any[] = [
        ...((entradasRes.data ?? []).map((r: any) => ({ ...r, tipo: "entrada" as const }))),
        ...((salidasRes.data ?? []).map((r: any) => ({ ...r, tipo: "salida" as const }))),
      ];

      const rutaIds = [...new Set(allRaw.map((r: any) => r.id_ruta).filter(Boolean))];
      let rutaMap = new Map<number, { origen: string; destino: string }>();
      if (rutaIds.length > 0) {
        const { data: rutas } = await (supabase as any)
          .from("rutas")
          .select("id, origen, destino")
          .in("id", rutaIds);
        for (const rt of rutas ?? []) {
          rutaMap.set(rt.id, { origen: rt.origen ?? "", destino: rt.destino ?? "" });
        }
      }

      const rows: EntradaSalidaRow[] = allRaw.map((r: any) => {
        const rt = rutaMap.get(r.id_ruta);
        const normalized = { ...r };
        if (r.tipo === "salida" && r.tipo_servicio_salida != null) {
          normalized.tipo_servicio = r.tipo_servicio_salida;
        }
        delete normalized.tipo_servicio_salida;
        return {
          ...normalized,
          hora: toVE(r.hora) ?? r.hora,
          chofer_nombre: choferMap.get(r.id_chofer) ?? null,
          ruta_origen: rt?.origen ?? null,
          ruta_destino: rt?.destino ?? null,
        };
      });

      rows.sort((a, b) => (b.hora ?? "").localeCompare(a.hora ?? ""));

      return rows;
    } catch (err: any) {
      console.error("[DB error en SelectEntradasSalidasServer]", err.message);
      throw new Error("Error al consultar entradas/salidas");
    }
  });
