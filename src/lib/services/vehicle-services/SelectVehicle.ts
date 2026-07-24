import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export const SelectVehicleServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { data: rows, error } = await (supabase as any)
        .from('vehiculos')
        .select("placa, marca, modelo, cedula_propietario, propietario, tipo, created_at, updated_at, deleted_at, id_organizacion, id_tipologia")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error("Error al obtener vehículos");
      }

      const [{ data: orgs }, { data: tipologias }] = await Promise.all([
        supabase.from("organizaciones").select("id_rif, nombre") as any,
        (supabase as any).from("tipologia").select("id,cantidad_puestos"),
      ]);

      const orgMap = new Map<string, string>();
      if (orgs) {
        for (const o of orgs) {
          orgMap.set((o as any).id_rif, (o as any).nombre ?? "");
        }
      }
      type TipologyValue = 32 | 5 | 60 | 20 | 23 | 24 | 15 | 4 | 28;
      const PUESTOS_POR_TIPO: Record<string, TipologyValue> = {
        encava: 32,
        "por puesto": 5,
        colectivo: 60,
      };
      const tipoPorId = new Map<string, TipologyValue>((tipologias ?? []).map((t: any) => [
        t.id,
        t.cantidad_puestos,
      ]));

      return (rows ?? []).map((v: any) => {
        const cantidadPuestos: TipologyValue | null = v.id_tipologia
          ? (tipoPorId.get(v.id_tipologia) ?? PUESTOS_POR_TIPO[v.tipo] ?? null)
          : (PUESTOS_POR_TIPO[v.tipo] ?? null);
        return {
          placa: v.placa,
          marca: v.marca ?? "",
          modelo: v.modelo ?? "",
          cedula_propietario: v.cedula_propietario ?? "",
          propietario: v.propietario ?? "",
          tipo: (v.tipo ?? "encava") as "encava" | "por puesto" | "colectivo",
          cantidad_puestos: cantidadPuestos,
          id_organizacion: v.id_organizacion ?? null,
          organizacion_nombre: v.id_organizacion ? (orgMap.get(v.id_organizacion) ?? null) : null,
        };
      });
    } catch (err: any) {
      console.error("[DB error en SelectVehicleServer]", err.message);
      throw new Error("Error de conexión con la base de datos");
    }
  });
