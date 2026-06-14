import { useEffect, useState, type ReactNode } from "react";
import { api, auth, type AuthUser, getPerfilActualServer } from "@/lib/api";
import { AuthContext } from "@/lib/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function inicializarSesion() {
      try {
        const localUser = auth.getUser();

        if (localUser && localUser.id) {

          const dbUser = await getPerfilActualServer();

          if (dbUser) {
            const usuarioActualizado = {
              ...localUser,
              username: dbUser.username || localUser.username,
              name: dbUser.name || localUser.name,
              role: dbUser.role || localUser.role,
            };

            setUser(usuarioActualizado);
            auth.setSession(auth.getToken() || "", usuarioActualizado);
          } else {
            setUser(localUser);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error al inicializar sesión:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    inicializarSesion();
  }, []);
  async function login(username: string, password: string) {
    const { token, user: loggedUser } = await api.login(username, password);
    auth.setSession(token, loggedUser);
    setUser(loggedUser);
  }

  function logout() {
    auth.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}


