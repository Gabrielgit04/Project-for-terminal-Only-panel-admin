import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
function nowVE(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}:${p("second")}-04:00`;
}

export const DeleteMovilizationServer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: number; tipo?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const deletedAt = nowVE();

      if (data.tipo === "salida") {
        const { error } = await (supabase as any)
          .from("salida")
          .update({ deleted_at: deletedAt })
          .eq("id", data.id);
        if (error) throw error;
        return { success: true };
      }

      const { error: errEnt } = await (supabase as any)
        .from("entrada")
        .update({ deleted_at: deletedAt })
        .eq("id", data.id);

      if (errEnt) throw errEnt;

      await (supabase as any)
        .from("salida")
        .update({ deleted_at: deletedAt })
        .eq("entrada_id", data.id);

      return { success: true };
    } catch (err: any) {
      console.error("[DB error en DeleteMovilizationServer]", err.message);
      throw new Error("Error al eliminar movilización");
    }
  });
