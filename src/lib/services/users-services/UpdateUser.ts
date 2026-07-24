import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import { requireAuth } from "@/lib/middleware/require-auth";
// ACTUALIZAR USUARIO (Perfil, Email Virtual y Contraseña Opcional)
export const UpdateUserServer = createServerFn({ method: "POST" })
    .middleware([requireAuth])
    .inputValidator((data: {
        userId: string;
        usuario: string;
        nombre: string;
        rol: string;
        contrasena?: string;
    }) => data)
    .handler(async ({ data }) => {
        try {
            const usuario = data.usuario.trim();
            const nombre = data.nombre.trim();

            // Validar formato del usuario
            if (!usuario) throw new Error("El nombre de usuario no puede estar vacío");
            if (!/^[a-zA-Z0-9_]+$/.test(usuario)) {
                throw new Error("El usuario solo puede contener letras, números y guiones bajos");
            }

            // Validar que coordinador/gerente no cambien contraseña del presidente
            if (data.contrasena && data.contrasena.trim() !== "") {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                const currentRole = currentUser?.user_metadata?.role || "";

                if (currentRole === "coordinador" || currentRole === "gerente") {
                    const { data: targetUser } = await supabase
                        .from("usuario")
                        .select("rol")
                        .eq("id", data.userId)
                        .maybeSingle();

                    if (targetUser?.rol === "presidente") {
                        throw new Error("No tienes permisos para cambiar la contraseña del presidente");
                    }
                }
            }

            // 1. Generamos el nuevo email virtual basado en el username modificado
            const nuevoVirtualEmail = `${usuario.toLowerCase()}@systemterminal.com`;

            // 2. Actualizamos la tabla pública local usando el ID tipo UUID
            const { error: dbError } = await supabase
                .from('usuario')
                .update({
                    usuario,
                    nombre,
                    rol: data.rol,
                })
                .eq('id', data.userId);

            if (dbError) {
                throw new Error(`Error en Base de Datos: ${dbError.message}`);
            }

            // 3. Preparamos los datos base para actualizar en auth.users
            const datosActualizacionAuth: any = {
                email: nuevoVirtualEmail,
                email_confirm: true,
                user_metadata: {
                    username: usuario,
                    name: nombre,
                    role: data.rol,
                }
            };

            // 4. Si se envió una nueva contraseña, la inyectamos en los datos de actualización
            if (data.contrasena && data.contrasena.trim() !== "") {
                if (data.contrasena.length < 6) {
                    throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
                }
                datosActualizacionAuth.password = data.contrasena;
            }

            // 5. Sincronizamos auth.users usando la API de administración
            // NOTA: Recuerda que 'supabase' debe estar inicializado con la SERVICE_ROLE_KEY en el servidor
            const { error: authError } = await supabase.auth.admin.updateUserById(
                data.userId,
                datosActualizacionAuth
            );

            if (authError) {
                throw new Error(`Error en Supabase Auth: ${authError.message}`);
            }

            return {
                success: true,
                message: data.contrasena
                    ? "Usuario y contraseña actualizados con éxito"
                    : "Datos de usuario actualizados con éxito"
            };

        } catch (err: any) {
            console.error("[DB/Auth error en UpdateUserServer]", err.message);

            // Manejo de errores por si el nuevo nombre de usuario ya está tomado por otro correo virtual
            if (err.message.includes("already exists")) {
                throw new Error("El nombre de usuario ya está siendo utilizado por otro usuario");
            }

            throw new Error(err.message || "Error al actualizar el usuario");
        }
    });