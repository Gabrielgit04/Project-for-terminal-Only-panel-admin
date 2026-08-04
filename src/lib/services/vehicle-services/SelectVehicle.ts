import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { withSpan } from "@/server/trace";

type TipologyValue = 32 | 5 | 60 | 20 | 23 | 24 | 15 | 4 | 28;
const PUESTOS_POR_TIPO: Record<string, TipologyValue> = {
  encava: 32,
  "por puesto": 5,
  colectivo: 60,
};

export const SelectVehicleServer = createServerFn({ method: "GET" }).handler(
  async () => {
    return withSpan("SelectVehicleServer", async () => {
      try {
        const { data: rows, error } = await (supabase as any)
          .from("vehiculos")
          .select(
            "placa, marca, modelo, cedula_propietario, propietario, tipo, created_at, id_organizacion, id_tipologia, organizaciones(id_rif, nombre), tipologia(cantidad_puestos)",
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error("Error al obtener vehículos");
        }

        return (rows ?? []).map((v: any) => {
          const cantidadPuestos: TipologyValue | null =
            v.tipologia?.[0]?.cantidad_puestos ?? PUESTOS_POR_TIPO[v.tipo] ?? null;
          return {
            placa: v.placa,
            marca: v.marca ?? "",
            modelo: v.modelo ?? "",
            cedula_propietario: v.cedula_propietario ?? "",
            propietario: v.propietario ?? "",
            tipo: (v.tipo ?? "encava") as "encava" | "por puesto" | "colectivo",
            cantidad_puestos: cantidadPuestos,
            id_organizacion: v.id_organizacion ?? null,
            organizacion_nombre: v.organizaciones?.[0]?.nombre ?? null,
          };
        });
      } catch (err: any) {
        console.error("[DB error en SelectVehicleServer]", err.message);
        throw new Error("Error de conexión con la base de datos");
      }
    });
  },
);
