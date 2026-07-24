import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
export const DeleteUserServer = createServerFn({ method: "POST" })
    .middleware([requireAuth])
    .inputValidator((data: { id: string }) => data)
    .handler(async ({ data }) => {
        try {
            const { error } = await supabase.from('usuario')
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", data.id);

            if (error) throw new Error(error.message);

            return { success: true };
        } catch (err: any) {
            console.error("[DB error en DeleteUserServer]", err.message);
            throw new Error("Error al eliminar usuario");
        }
    });
