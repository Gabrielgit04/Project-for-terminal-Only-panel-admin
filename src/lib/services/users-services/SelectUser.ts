import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export const SelectUserServer = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            const { data: rows, error } = await supabase
                .from('usuario')
                .select("id, nombre, usuario, rol, deleted_at")
                .is("deleted_at", null)
                .order("id", { ascending: false });

            if (error) {
                console.error("[Supabase Error]", error.message);
                throw new Error("Error al obtener usuarios");
            }

            return (rows ?? []).map((u) => ({
                id: u.id,
                nombre: u.nombre ?? "",
                usuario: u.usuario ?? "",
                rol: u.rol ?? "",
            }));

        } catch (err: any) {
            console.error("[DB error en SelectUserServer]", err.message);

            if (err.message === "Error al obtener usuarios") {
                throw err;
            }

            throw new Error("Error de conexión con la base de datos");
        }
    });