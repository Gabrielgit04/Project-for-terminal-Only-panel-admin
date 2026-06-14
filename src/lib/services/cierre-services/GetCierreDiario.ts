import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export interface CierreFila {
  destino: string;
  cantidad_puestos: number;
  organizacion_id: string;
  organizacion: string;
  unidades: number;
  pasajeros: number;
  total_tasas: number;
}

export interface CierreDiarioResponse {
  filas: CierreFila[];
  granTotal: { unidades: number; pasajeros: number; total_tasas: number };
}

export const getCierreDiarioServer = createServerFn({ method: "GET" })
  .inputValidator((data: { fecha: string }) => data)
  .handler(async ({ data }) => {
    try {
      const from = `${data.fecha} 00:00:00`;
      const to = `${data.fecha} 23:59:59`;
      const fromTS = `${from.replace(" ", "T")}-04:00`;
      const toTS = `${to.replace(" ", "T")}-04:00`;

      const { data: salidas, error } = await (supabase as any)
        .from("salida")
        .select("id, id_ruta, id_tipologia, id_organizacion, puestos_ocupados, total_tasas, entrada_id")
        .is("deleted_at", null)
        .gte("hora", fromTS)
        .lte("hora", toTS);

      if (error) throw error;
      if (!salidas?.length) return { filas: [], granTotal: { unidades: 0, pasajeros: 0, total_tasas: 0 } };

      const salidaIds = salidas.map((s: any) => s.id);
      const rutaIds = [...new Set(salidas.map((s: any) => s.id_ruta).filter(Boolean))];
      const tipoIds = [...new Set(salidas.map((s: any) => s.id_tipologia).filter(Boolean))];
      const orgIds = [...new Set(salidas.map((s: any) => s.id_organizacion).filter(Boolean))];

      const [rutasRes, tiposRes, orgsRes] = await Promise.all([
        (supabase as any).from("rutas").select("id, destino").in("id", rutaIds),
        (supabase as any).from("tipologia").select("id, cantidad_puestos").in("id", tipoIds),
        (supabase as any).from("organizaciones").select("id_rif, nombre").in("id_rif", orgIds),
      ]);

      const rutaMap = new Map<number, string>((rutasRes.data ?? []).map((r: any) => [r.id, r.destino ?? "S/D"]));
      const tipoMap = new Map<number, number>((tiposRes.data ?? []).map((t: any) => [t.id, t.cantidad_puestos ?? 0]));
      const orgMap = new Map<string, string>((orgsRes.data ?? []).map((o: any) => [o.id_rif, o.nombre ?? "S/D"]));

      const grupos = new Map<string, CierreFila>();

      for (const s of salidas) {
        const destino = rutaMap.get(s.id_ruta) ?? "S/D";
        const puestos = tipoMap.get(s.id_tipologia) ?? 0;
        const orgId = s.id_organizacion ?? "";
        const orgNombre = orgMap.get(orgId) ?? "S/D";
        const key = `${destino}|${puestos}|${orgId}`;

        if (!grupos.has(key)) {
          grupos.set(key, { destino, cantidad_puestos: puestos, organizacion_id: orgId, organizacion: orgNombre, unidades: 0, pasajeros: 0, total_tasas: 0 });
        }

        const g = grupos.get(key)!;
        g.unidades++;
        g.pasajeros += s.puestos_ocupados ?? 0;
        g.total_tasas += s.total_tasas ?? 0;
      }

      const filas = [...grupos.values()].sort((a, b) => a.destino.localeCompare(b.destino) || a.cantidad_puestos - b.cantidad_puestos || a.organizacion.localeCompare(b.organizacion));
      const granTotal = filas.reduce((acc, f) => ({ unidades: acc.unidades + f.unidades, pasajeros: acc.pasajeros + f.pasajeros, total_tasas: acc.total_tasas + f.total_tasas }), { unidades: 0, pasajeros: 0, total_tasas: 0 });

      return { filas, granTotal };
    } catch (err: any) {
      console.error("[DB error en getCierreDiario]", err.message);
      return { filas: [], granTotal: { unidades: 0, pasajeros: 0, total_tasas: 0 } };
    }
  });
