import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Bus, Users, Car, Route, DoorOpen, FileSpreadsheet, HelpCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/use-auth";
import { ROLE_LABELS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTour } from "@/lib/tour";
import logoSrc from "@/public/assets/Imagen1.png";
const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, roles: ["admin", "gerente"], tour: undefined },
  { title: "Registro de Vehículos", url: "/admin/vehicle", icon: Bus, roles: ["admin", "gerente"], tour: "vehicle" },
  { title: "Choferes", url: "/admin/chofer", icon: Users, roles: ["admin", "gerente"], tour: "chofer" },
  { title: "Rutas", url: "/admin/rutas", icon: Route, roles: ["admin", "gerente"], tour: "rutas" },
  { title: "Entradas / Salidas", url: "/admin/entradas-salidas", icon: DoorOpen, roles: ["admin", "gerente", "garita"], tour: "entradas-salidas" },
  { title: "Movilizacion", url: "/admin/movilizacion", icon: Car, roles: ["admin", "gerente"], tour: "movilizacion" },
  { title: "Cierre Diario", url: "/admin/cierre-diario", icon: FileSpreadsheet, roles: ["admin", "gerente"], tour: undefined },
  { title: "Usuarios", url: "/admin/users", icon: Users, roles: ["admin"], tour: undefined },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, logout } = useAuth();

  const items = navItems.filter((i) => !i.roles || i.roles.includes(user?.role ?? ""));
  const { restart } = useTour();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gradient-primary)] p-1 shadow-[var(--shadow-soft)]">
            <img src={logoSrc} alt="Logo" className="h-full w-full rounded-md object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-bold">Terminal</span>
              <span className="text-xs text-muted-foreground">Alí Primera</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || (item.url !== "/admin" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-3" data-tour={item.tour}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        {!collapsed && user && (
          <div className="mb-2 rounded-md bg-muted/50 p-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
        )}
        {!collapsed && user && user.role !== "garita" && (
          <Button
            variant="default"
            size="sm"
            onClick={restart}
            className="w-full justify-start gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm mb-1"
          >
            <HelpCircle className="h-4 w-4" />
            {!collapsed && <span>Guía rápida</span>}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
