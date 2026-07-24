import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const MigrateRutasOrgServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async () => {
    const { data: orgs } = await supabase
      .from("organizaciones")
      .select("id_rif");
    const validRifs = new Set((orgs ?? []).map((o: any) => o.id_rif));

    const { data: dt9 } = await supabase
      .from("DT9")
      .select("id_ruta, id_organizacion")
      .not("id_ruta", "is", null);

    if (!dt9 || dt9.length === 0) return { updated: 0, skipped: 0 };

    let updated = 0;
    let skipped = 0;
    for (const d of dt9 as any[]) {
      const orgId = d.id_organizacion;
      if (!orgId || !validRifs.has(orgId)) {
        skipped++;
        continue;
      }
      const { error } = await supabase
        .from("rutas")
        .update({ id_organizacion: orgId })
        .eq("id", d.id_ruta)
        .is("id_organizacion", null);

      if (!error) updated++;
    }

    return { updated, skipped };
  });
