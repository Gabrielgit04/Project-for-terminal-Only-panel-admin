import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
export const CreateVehicleServer = createServerFn({ method: "POST" })
  .inputValidator((data: {
    placa: string;
    marca: string;
    modelo: string;
    cedula_propietario: string;
    propietario: string;
    tipo: string;
    cantidad_puestos?: number;
    organizacion_nombre?: string;
    organizacion_rif?: string;
    id_organizacion?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      let idOrganizacion = data.id_organizacion ?? null;

      if (data.organizacion_nombre && !idOrganizacion) {
        const nombre = data.organizacion_nombre.trim();
        const rifIngresado = (data.organizacion_rif ?? "").trim();

        const { data: orgExistente } = await (supabase.from('organizaciones') as any)
          .select("id_rif, nombre")
          .ilike("nombre", nombre)
          .maybeSingle();

        if (orgExistente) {
          if (rifIngresado && rifIngresado !== orgExistente.id_rif) {
            throw new Error(
              `Ya existe una organización con el nombre "${nombre}" (RIF: ${orgExistente.id_rif}). ` +
              `El RIF ingresado (${rifIngresado}) no coincide.`
            );
          }
          idOrganizacion = orgExistente.id_rif;
        } else {
          const rif = rifIngresado || nombre.toUpperCase().replace(/\s+/g, "_");
          const { error: orgErr } = await (supabase.from('organizaciones') as any)
            .upsert({ id_rif: rif, nombre: nombre });
          if (orgErr) throw new Error("Error al guardar organización: " + orgErr.message);
          idOrganizacion = rif;
        }
      }

      const placa = data.placa.toUpperCase();

      const { data: existente } = await (supabase.from('vehiculos') as any)
        .select("placa")
        .eq("placa", placa)
        .is("deleted_at", null)
        .maybeSingle();

      if (existente) {
        throw new Error("Ya existe un vehículo registrado con esa placa");
      }

      const { error: vehErr } = await (supabase.from('vehiculos') as any).insert({
        placa,
        marca: data.marca,
        modelo: data.modelo,
        cedula_propietario: data.cedula_propietario,
        propietario: data.propietario,
        tipo: data.tipo,
        id_organizacion: idOrganizacion,
      });

      if (vehErr) throw new Error(vehErr.message);

      const { data: tipoData, error: tipoErr } = await (supabase.from('tipologia') as any).insert({
        cantidad_puestos: data.cantidad_puestos ?? 0,
      }).select("id").single();

      if (tipoErr) throw new Error(tipoErr.message);

      if (tipoData?.id || idOrganizacion) {
        const vehUpdate: Record<string, any> = {};
        if (tipoData?.id) vehUpdate.id_tipologia = tipoData.id;
        if (idOrganizacion) vehUpdate.id_organizacion = idOrganizacion;
        const { error: updErr } = await (supabase.from('vehiculos') as any)
          .update(vehUpdate)
          .eq("placa", placa);
        if (updErr) throw new Error(updErr.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en CreateVehicleServer]", err.message);
      throw new Error("Error al crear vehículo");
    }
  });
