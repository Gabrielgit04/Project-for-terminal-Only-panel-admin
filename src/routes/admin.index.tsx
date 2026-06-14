import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bus, Truck, UserCheck, MapPin } from "lucide-react";
import { api, type DashboardData, type UltimaMovilizacion } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Terminal Alí Primera" }] }),
  component: AdminDashboard,
});

const BAR_COLOR = "#1e3a5f";
const LINE_COLOR = "#3b6fa0";

function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.getDashboardData().then(setData).catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">
          Hola, {user?.name ?? user?.username}
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen operativo — {new Date().toLocaleDateString("es-VE", { dateStyle: "full" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bus} label="Movilizaciones" value={String(data?.movilizacionesActivas ?? "—")} />
        <StatCard icon={Truck} label="Vehículos Operativos" value={String(data?.vehiculosOperativos ?? "—")} />
        <StatCard icon={UserCheck} label="Choferes Disponibles" value={String(data?.choferesDisponibles ?? "—")} />
        <StatCard icon={MapPin} label="Rutas Cubiertas" value={String(data?.rutasCubiertas ?? "—")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rutas mas Demandadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {data && data.topRutas.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={data.topRutas} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="ruta" tick={{ fontSize: 12 }} width={150} />
                    <Tooltip />
                    <Bar dataKey="total" fill={BAR_COLOR} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sin datos hoy
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas Pico de Despacho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {data && data.horasPico.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={data.horasPico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke={LINE_COLOR} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sin datos hoy
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas Movilizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.ultimasMovilizaciones.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Hora Apertura</th>
                    <th className="pb-2 pr-4 font-medium">Ruta</th>
                    <th className="pb-2 pr-4 font-medium">Placa</th>
                    <th className="pb-2 font-medium">Chofer</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimasMovilizaciones.map((m: UltimaMovilizacion, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4">{m.horaApertura}</td>
                      <td className="py-2 pr-4">{m.ruta}</td>
                      <td className="py-2 pr-4 font-mono">{m.placa}</td>
                      <td className="py-2">{m.chofer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              Sin movilizaciones registradas hoy
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bus | typeof Truck | typeof UserCheck | typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
