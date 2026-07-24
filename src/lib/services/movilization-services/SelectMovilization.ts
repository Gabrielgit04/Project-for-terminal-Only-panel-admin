import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export interface MovilizacionRow {
  id: number;
  dia: string;
  fecha: string;
  id_ruta: number;
  placa_vehiculo: string;
  unidades_despachadas: number | null;
  entrada_id: number | null;
  tipo_servicio: string | null;
  total_pasajeros: number | null;
  total_tasas: number | null;
  estado: string | null;
  puestos_ocupados: number | null;
  hora_entrada: string | null;
  tipo?: string;
  serial_listin?: string | null;
}

export interface SelectMovilizacionParams {
  month?: number;
  year?: number;
  filterDate?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

function toVE(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")} ${p("hour")}:${p("minute")}:${p("second")}`;
}

function dateParts(iso: string | undefined | null): { dia: string; fecha: string } {
  if (!iso) return { dia: "", fecha: "" };
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const diaMap: Record<string, string> = {
    domingo: "DOMINGO",
    lunes: "LUNES",
    martes: "MARTES",
    miércoles: "MIERCOLES",
    jueves: "JUEVES",
    viernes: "VIERNES",
    sábado: "SABADO",
  };
  const wd = p("weekday")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return {
    dia: diaMap[wd] ?? "DOMINGO",
    fecha: `${p("year")}-${p("month")}-${p("day")}`,
  };
}

export const selectMovilizationServer = createServerFn({ method: "GET" })
  .inputValidator((data: SelectMovilizacionParams) => data)
  .handler(async ({ data }) => {
    try {
      const now = new Date();
      const month = data.month ?? now.getMonth() + 1;
      const year = data.year ?? now.getFullYear();
      const page = data.page ?? 1;
      const pageSize = data.pageSize ?? 15;

      let fromStr: string, toStr: string;
      if (data.fromDate && data.toDate) {
        fromStr = `${data.fromDate} 00:00:00`;
        toStr = `${data.toDate} 23:59:59`;
      } else if (data.filterDate) {
        fromStr = `${data.filterDate} 00:00:00`;
        toStr = `${data.filterDate} 23:59:59`;
      } else {
        fromStr = `${year}-${String(month).padStart(2, "0")}-01 00:00:00`;
        const lastDay = new Date(year, month, 0).getDate();
        toStr = `${year}-${String(month).padStart(2, "0")}-${lastDay} 23:59:59`;
      }
      const fromTS = `${fromStr.replace(" ", "T")}-04:00`;
      const toTS = `${toStr.replace(" ", "T")}-04:00`;

      // Soft-cap para evitar descargar TODO el histórico si el período es enorme.
      // La paginación real en DB requeriría una SQL view (no disponible vía código).
      // Este cap limita el consumo de CPU/memoria del Worker bajo carga.
      const SOFT_CAP = Math.min(Math.max(pageSize * page * 10, 500), 10000);

      const [entradasRes, salidasSueltasRes] = await Promise.all([
        (supabase as any)
          .from("entrada")
          .select(
            "id, hora, id_tipologia, id_organizacion, id_ruta, placa_vehiculo, puestos_ocupados, id_chofer, estado, tipo_servicio, serial_listin",
          )
          .is("deleted_at", null)
          .gte("hora", fromTS)
          .lte("hora", toTS)
          .order("hora", { ascending: false })
          .limit(SOFT_CAP),
        (supabase as any)
          .from("salida")
          .select(
            "id, hora, id_tipologia, id_organizacion, id_ruta, placa_vehiculo, puestos_ocupados, total_tasas, tipo_servicio_salida, serial_listin",
          )
          .is("deleted_at", null)
          .is("entrada_id", null)
          .gte("hora", fromTS)
          .lte("hora", toTS)
          .order("hora", { ascending: false })
          .limit(SOFT_CAP),
      ]);

      if (entradasRes.error) throw entradasRes.error;
      if (salidasSueltasRes.error) throw salidasSueltasRes.error;

      const entradas = entradasRes.data ?? [];
      const salidasSueltas = salidasSueltasRes.data ?? [];

      const rutaIds = [
        ...new Set([...entradas, ...salidasSueltas].map((r: any) => r.id_ruta).filter(Boolean)),
      ];
      const { data: rutas } = await (supabase as any)
        .from("rutas")
        .select("id, origen, destino")
        .in("id", rutaIds);
      const rutaMap = new Map<number, { id: number; origen: string; destino: string }>(
        (rutas ?? []).map((rt: any) => [rt.id, rt]),
      );

      const entradaIds = entradas.map((r: any) => r.id).filter(Boolean);
      let salidaMap = new Map<number, { hora: string; total_tasas: number | null }>();
      if (entradaIds.length > 0) {
        const { data: salidas } = await (supabase as any)
          .from("salida")
          .select("entrada_id, hora, total_tasas, placa_vehiculo")
          .in("entrada_id", entradaIds)
          .is("deleted_at", null);
        for (const s of salidas ?? []) {
          if (s.entrada_id)
            salidaMap.set(s.entrada_id, { hora: s.hora, total_tasas: s.total_tasas });
        }
      }
      const sinSalida = entradas.filter((r: any) => !salidaMap.has(r.id) && r.placa_vehiculo);
      const placasFaltantes = [
        ...new Set(sinSalida.map((r: any) => r.placa_vehiculo).filter(Boolean)),
      ];
      if (placasFaltantes.length > 0) {
        const { data: salidas } = await (supabase as any)
          .from("salida")
          .select("entrada_id, hora, total_tasas, placa_vehiculo")
          .in("placa_vehiculo", placasFaltantes)
          .is("deleted_at", null)
          .is("entrada_id", null)
          .order("hora", { ascending: false });
        for (const s of salidas ?? []) {
          const entrada = sinSalida.find((r: any) => r.placa_vehiculo === s.placa_vehiculo);
          if (entrada && !salidaMap.has(entrada.id)) {
            salidaMap.set(entrada.id, { hora: s.hora, total_tasas: s.total_tasas });
          }
        }
      }

      const tipoIds = [
        ...new Set(
          [...entradas, ...salidasSueltas].map((r: any) => r.id_tipologia).filter(Boolean),
        ),
      ];
      let tipoMap = new Map<number, number>();
      if (tipoIds.length > 0) {
        const { data: tipos } = await (supabase as any)
          .from("tipologia")
          .select("id, cantidad_puestos")
          .in("id", tipoIds);
        tipoMap = new Map((tipos ?? []).map((t: any) => [t.id, t.cantidad_puestos ?? 0]));
      }

      function buildEntradaRow(r: any, rutaMap: any, salidaMap: any, tipoMap: any) {
        const dp = dateParts(r.hora);
        const salida = salidaMap.get(r.id);
        const ruta = rutaMap.get(r.id_ruta);
        let tipoServicio = r.tipo_servicio;
        if (!tipoServicio) {
          const destino = (ruta?.destino ?? "").toLowerCase();
          const suburbanoDestinos = [
            "judibana",
            "santa elena",
            "cardón",
            "cardon",
            "las piedras",
            "los taques",
            "amuay",
            "adícora",
            "adicora",
            "jadacaquiva",
            "moruy",
            "tacuato",
            "pueblo nuevo",
            "la vela",
          ];
          const interurbanoDestinos = [
            "inter",
            "ccs",
            "caracas",
            "maracay",
            "valencia",
            "amazonas",
            "anzoátegui",
            "anzeátegui",
            "apure",
            "aragua",
            "barinas",
            "bolívar",
            "bolivar",
            "carabobo",
            "cojedes",
            "delta amacuro",
            "falcon",
            "falcón",
            "guárico",
            "guarico",
            "lara",
            "mérida",
            "merida",
            "miranda",
            "monagas",
            "nueva esparta",
            "portuguesa",
            "sucre",
            "táchira",
            "tachira",
            "trujillo",
            "vargas",
            "la guaira",
            "yaracuy",
            "zulia",
            "barquisimeto",
            "ciudad guayana",
            "puerto ordaz",
            "barcelona",
            "puerto la cruz",
            "maturín",
            "maturin",
            "cumaná",
            "cumana",
            "san cristóbal",
            "coro",
            "los teques",
            "guanare",
            "san fernando",
            "calabozo",
            "el tigre",
            "ciudad bolívar",
            "tucupita",
            "porlamar",
            "punto fijo",
            "puerto cabello",
            "valera",
            "el vigía",
            "maracaibo",
            "cabimas",
            "ciudad ojeda",
            "carúpano",
            "carupano",
            "puerto ayacucho",
            "guasdualito",
          ];
          if (suburbanoDestinos.some((kw) => destino.includes(kw))) {
            tipoServicio = "suburbano";
          } else {
            tipoServicio = interurbanoDestinos.some((kw) => destino.includes(kw))
              ? "interurbano"
              : "suburbano";
          }
        }
        return {
          id: r.id,
          dia: dp.dia,
          fecha: dp.fecha,
          hora: toVE(salida?.hora ?? r.hora),
          id_ruta: r.id_ruta,
          placa_vehiculo: r.placa_vehiculo,
          unidades_despachadas: null,
          estado: r.estado ?? "en_espera",
          id_organizacion: r.id_organizacion,
          id_tipologia: r.id_tipologia,
          entrada_id: r.id,
          tipo_servicio: tipoServicio,
          total_pasajeros: null,
          total_tasas: salida?.total_tasas ?? null,
          puestos_ocupados: r.puestos_ocupados,
          hora_entrada: toVE(r.hora),
          hora_salida: toVE(salida?.hora ?? null),
          cantidad_puestos: tipoMap.get(r.id_tipologia) ?? 0,
          ruta_origen: rutaMap.get(r.id_ruta)?.origen ?? null,
          ruta_destino: rutaMap.get(r.id_ruta)?.destino ?? null,
          tipo: "entrada",
          serial_listin: r.serial_listin ?? null,
        };
      }

      function buildSalidaRow(r: any, rutaMap: any, tipoMap: any) {
        const dp = dateParts(r.hora);
        const ruta = rutaMap.get(r.id_ruta);
        return {
          id: r.id,
          dia: dp.dia,
          fecha: dp.fecha,
          hora: toVE(r.hora),
          id_ruta: r.id_ruta,
          placa_vehiculo: r.placa_vehiculo,
          unidades_despachadas: null,
          estado: "despachado",
          id_organizacion: r.id_organizacion,
          id_tipologia: r.id_tipologia,
          entrada_id: null,
          tipo_servicio: r.tipo_servicio_salida ?? null,
          total_pasajeros: null,
          total_tasas: r.total_tasas ?? null,
          puestos_ocupados: r.puestos_ocupados,
          hora_entrada: toVE(r.hora),
          hora_salida: toVE(r.hora),
          cantidad_puestos: tipoMap.get(r.id_tipologia) ?? 0,
          ruta_origen: rutaMap.get(r.id_ruta)?.origen ?? null,
          ruta_destino: rutaMap.get(r.id_ruta)?.destino ?? null,
          tipo: "salida",
          serial_listin: r.serial_listin ?? null,
        };
      }

      const allRows = [
        ...entradas.map((r: any) => buildEntradaRow(r, rutaMap, salidaMap, tipoMap)),
        ...salidasSueltas.map((r: any) => buildSalidaRow(r, rutaMap, tipoMap)),
      ];

      allRows.sort((a: any, b: any) => (b.hora ?? "").localeCompare(a.hora ?? ""));

      const totalCount = allRows.length;
      const paginated = allRows.slice((page - 1) * pageSize, page * pageSize);

      return { rows: paginated, count: totalCount };
    } catch (err: any) {
      console.error("[DB error en selectMovilizacion]", err.message);
      return { rows: [], count: 0 };
    }
  });
