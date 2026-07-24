import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const UpdateVehicleServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: {
    placa: string;
    marca: string;
    modelo: string;
    cedula_propietario: string;
    propietario: string;
    tipo: "encava" | "por puesto" | "colectivo";
    cantidad_puestos: 32 | 5 | 60 | 20 | 23 | 24 | 15 | 4 | 28;
    id_organizacion?: string | null;
    organizacion_nombre?: string | null;
    organizacion_rif?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      let idOrganizacion: string | null = data.id_organizacion ?? null;
      const orgNombre = (data.organizacion_nombre ?? "").trim();
      const orgRif = (data.organizacion_rif ?? "").trim();

      if (orgNombre) {
        const { data: orgExistente } = await (supabase as any)
          .from('organizaciones')
          .select("id_rif, nombre")
          .ilike("nombre", orgNombre)
          .maybeSingle();

        if (orgExistente) {
          if (orgRif && orgRif !== orgExistente.id_rif) {
            throw new Error(
              `Ya existe una organización con el nombre "${orgNombre}" (RIF: ${orgExistente.id_rif}). ` +
              `El RIF ingresado (${orgRif}) no coincide.`
            );
          }
          idOrganizacion = orgExistente.id_rif;
        } else {
          const rif = orgRif || orgNombre.toUpperCase().replace(/\s+/g, "_");
          const { error: orgErr } = await (supabase as any)
            .from('organizaciones')
            .upsert({ id_rif: rif, nombre: orgNombre });
          if (orgErr) throw new Error("Error al guardar organización: " + orgErr.message);
          idOrganizacion = rif;
        }
      }

      const placa = data.placa.toUpperCase();

      const { error } = await (supabase as any)
        .from('vehiculos')
        .update({
          placa,
          marca: data.marca,
          modelo: data.modelo,
          cedula_propietario: data.cedula_propietario,
          propietario: data.propietario,
          tipo: data.tipo,
          id_organizacion: idOrganizacion,
          updated_at: new Date().toISOString(),
        })
        .eq("placa", placa);

      if (error) throw new Error(error.message);

      const { data: currentVeh } = await (supabase as any)
        .from('vehiculos')
        .select("id_tipologia")
        .eq("placa", placa)
        .maybeSingle();

      let tipoId: number | undefined;
      if (currentVeh?.id_tipologia) {
        const { error: upErr } = await (supabase as any)
          .from('tipologia')
          .update({ cantidad_puestos: data.cantidad_puestos })
          .eq("id", currentVeh.id_tipologia);
        if (upErr) throw new Error(upErr.message);
        tipoId = currentVeh.id_tipologia;
      } else {
        const { data: newTipo, error: insErr } = await (supabase as any)
          .from('tipologia')
          .insert({ cantidad_puestos: data.cantidad_puestos })
          .select("id")
          .single();
        if (insErr) throw new Error(insErr.message);
        tipoId = newTipo.id;
      }

      if (tipoId) {
        await (supabase as any)
          .from('vehiculos')
          .update({ id_tipologia: tipoId })
          .eq("placa", placa);
      }

      const { data: existingDt9 } = await (supabase as any)
        .from("DT9")
        .select("id")
        .eq("id_vehiculo", placa)
        .maybeSingle();

      let dt9Id: number | undefined;
      if (existingDt9) {
        const dt9Upd: any = {};
        if (idOrganizacion) dt9Upd.id_organizacion = idOrganizacion;
        await (supabase as any).from("DT9").update(dt9Upd).eq("id", existingDt9.id);
        dt9Id = existingDt9.id;
      } else {
        const { data: maxRow } = await (supabase as any)
          .from('DT9')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);
        const nextId = ((maxRow as any)?.[0]?.id ?? 0) + 1;
        const dt9Ins: any = { id: nextId, id_vehiculo: placa };
        if (idOrganizacion) dt9Ins.id_organizacion = idOrganizacion;
        const { data: newDt9, error: dt9InsErr } = await (supabase as any)
          .from("DT9")
          .insert(dt9Ins)
          .select("id")
          .single();
        if (dt9InsErr) throw new Error(dt9InsErr.message);
        if (newDt9) dt9Id = newDt9.id;
      }

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en UpdateVehicleServer]", err.message);
      throw new Error("Error al actualizar vehículo");
    }
  });
