import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { createUserSchema, formatZodErrorsFlat } from "@/lib/schemas";
export const CreateUserServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const result = createUserSchema.safeParse(data);
    if (!result.success) {
      throw new Error(formatZodErrorsFlat(result.error));
    }
    return result.data;
  })
  .handler(async ({ data }) => {
    try {
      const virtualEmail = `${data.usuario.trim().toLowerCase()}@systemterminal.com`;

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: virtualEmail,
        password: data.contrasena,
        email_confirm: true,

        user_metadata: {
          username: data.usuario.trim(),
          name: data.nombre,
          role: data.rol,
        }
      });

      if (authError || !authUser.user) {
        throw new Error(authError?.message || "No se pudo crear el usuario en Auth");
      }

      const { error: dbError } = await supabase.from('usuario').insert({
        id: authUser.user.id,
        nombre: data.nombre,
        usuario: data.usuario.trim(),
        rol: data.rol,
      });

      if (dbError) {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Error en Base de Datos: ${dbError.message}`);
      }

      return { success: true, userId: authUser.user.id };

    } catch (err: any) {
      console.error("[Auth error en CreateUserServer]", err.message);
      if (err.message.includes("already exists")) {
        throw new Error("El nombre de usuario ya está registrado");
      }

      throw new Error(err.message || "Error al crear el usuario en el sistema");
    }
  });