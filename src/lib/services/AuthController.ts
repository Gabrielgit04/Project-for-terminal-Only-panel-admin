import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import type { AuthUser } from "@/lib/api";

// LOGUEAR USUARIO
export const loginServer = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      // 1. Transformamos el username en el email virtual que guardamos en Auth
      const virtualEmail = `${data.username.trim().toLowerCase()}@systemterminal.com`;

      // 2. Autenticamos directamente en el sistema de Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: data.password,
      });

      // Si las credenciales son incorrectas o no existe, manejamos el error
      if (authError || !authData.user) {
        throw new Error("Credenciales inválidas");
      }

      const user = authData.user;

      const userRole = user.user_metadata?.role || user.app_metadata?.role;

      // 3. Validación estricta de rol para el panel de administración
      if (userRole !== "admin" && userRole !== "gerente" && userRole !== "garita") {
        await supabase.auth.signOut();
        throw new Error("No tienes permisos para acceder al sistema");
      }

      // Buscamos el nombre del usuario en la tabla local 'usuario'
      const usernameLower = data.username.trim().toLowerCase();
      const { data: dbUser } = await supabase
        .from('usuario')
        .select('nombre')
        .ilike('usuario', usernameLower)
        .maybeSingle();

      // 4. Retornamos la sesión con el JWT seguro de Supabase y el ID tipo UUID
      return {
        token: authData.session?.access_token,
        user: {
          id: user.id,                               // Este es el nuevo UUID mapeado
          username: user.user_metadata?.username || data.username,
          name: dbUser?.nombre || user.user_metadata?.nombre || user.user_metadata?.name || data.username,
          role: userRole as any,
        } as AuthUser,
      };

    } catch (err: any) {
      console.error("[Auth error en login]", err.message);

      // Mantenemos tu filtro de errores limpios para el cliente
      if (
        err.message === "Credenciales inválidas" ||
        err.message === "No tienes permisos para acceder al sistema"
      ) {
        throw err;
      }

      throw new Error("Error en el proceso de autenticación");
    }
  });

export const getPerfilActualServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // 1. Obtener el usuario de la sesión actual en el servidor
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) return null;

      // 2. Extraer el username a partir del email
      const emailVirtual = authUser.email || "";
      const username = emailVirtual.split('@')[0] || authUser.user_metadata?.username;

      if (!username) return null;

      // 3. Buscar su nombre real en la tabla pública usando el username
      const { data: dbUser } = await supabase
        .from("usuario")
        .select("nombre, usuario, rol")
        .ilike("usuario", username.toLowerCase())
        .maybeSingle();

      if (!dbUser) return null;

      return {
        id: authUser.id,
        username: dbUser.usuario || username,
        name: dbUser.nombre,
        role: dbUser.rol as any,
      };
    } catch (err) {
      console.error("Error en getPerfilActualServer:", err);
      return null;
    }
  });