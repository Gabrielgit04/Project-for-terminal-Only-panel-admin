import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, Fragment } from "react";
import { Loader2, Car, Bus, User, Clock, CheckCircle, XCircle, MoreVertical, ArrowDown, DollarSign, FileText, Tag, Hash } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, type Vehicle, type MovilizacionKPI, type MovilizacionMonthly, type ControlSemanalData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FlowBar } from "@/components/flow-nav";
import { formatHora } from "@/lib/utils";

const VE_TZ = "America/Caracas";

function fechaVE(): { year: number; month: number; day: number; dia: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: VE_TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "long",
  }).formatToParts(now);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const diaMap: Record<string, string> = {
    domingo: "DOMINGO", lunes: "LUNES", martes: "MARTES", miércoles: "MIERCOLES",
    jueves: "JUEVES", viernes: "VIERNES", sábado: "SABADO",
  };
  const wd = p("weekday").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return { year: Number(p("year")), month: Number(p("month")), day: Number(p("day")), dia: diaMap[wd] ?? "DOMINGO" };
}

function formatHoraVE(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  const m = isoStr.match(/(\d{2}):(\d{2}):/);
  if (m) return `${m[1]}:${m[2]}`;
  try {
    return new Date(isoStr).toLocaleTimeString("es-VE", { timeZone: VE_TZ, hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

type MovilizacionRow = {
  id: number;
  dia: string;
  fecha: string;
  hora: string;
  estado: string;
  id_ruta: number;
  placa_vehiculo: string;
  unidades_despachadas: number | null;
  cantidad_puestos: number;
  id_organizacion: string | null;
  entrada_id: number | null;
  tipo_servicio: string | null;
  total_pasajeros: number | null;
  total_tasas: number | null;
  puestos_ocupados: number | null;
  hora_entrada: string | null;
  hora_salida: string | null;
  anden?: string | null;
  ruta_nombre?: string | null;
  ruta_origen?: string | null;
  ruta_destino?: string | null;
  tipo?: string;
  serial_listin?: string | null;
};

type TabType = "control" | "semanal";

type EstadoViaje = "en_espera" | "en_anden" | "despachado" | "cancelado";

function getEstado(estado: string | null): EstadoViaje {
  if (estado === "en_espera") return "en_espera";
  if (estado === "en_anden") return "en_anden";
  if (estado === "despachado") return "despachado";
  return "cancelado";
}

const badges: Record<EstadoViaje, { label: string; class: string }> = {
  en_espera: { label: "En espera", class: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  en_anden: { label: "En andén", class: "bg-blue-100 text-blue-700 border-blue-300" },
  despachado: { label: "Despachado", class: "bg-green-100 text-green-700 border-green-300" },
  cancelado: { label: "Cancelado", class: "bg-red-100 text-red-700 border-red-300" },
};

export const Route = createFileRoute("/admin/movilizacion")({
  head: () => ({ meta: [{ title: "Movilizaciones — Terminal Alí Primera" }] }),
  component: MovilizacionPage,
});

function MovilizacionPage() {
  const [tab, setTab] = useState<TabType>("control");

  const [rows, setRows] = useState<MovilizacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState(fechaVE().month);
  const [filtroAno, setFiltroAno] = useState(fechaVE().year);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showToday, setShowToday] = useState(true);
  const [showRange, setShowRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const pageSize = 20;

  const [kpi, setKpi] = useState<MovilizacionKPI | null>(null);
  const [chartData, setChartData] = useState<MovilizacionMonthly[]>([]);
  const [chartYear, setChartYear] = useState(fechaVE().year);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [organizaciones, setOrganizaciones] = useState<{ id_rif: string; nombre: string }[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [choferes, setChoferes] = useState<any[]>([]);

  // Control Semanal state
  const [csRange, setCsRange] = useState(() => {
    const ve = fechaVE();
    const y = ve.year, m = String(ve.month).padStart(2, "0"), d = String(ve.day).padStart(2, "0");
    return { from: `${y}-${m}-${d} 00:00:00`, to: `${y}-${m}-${d} 23:59:59` };
  });
  const [csData, setCsData] = useState<ControlSemanalData | null>(null);
  const [csLoading, setCsLoading] = useState(false);
  const [desgloseFecha, setDesgloseFecha] = useState<string | null>(null);

  const [detailMov, setDetailMov] = useState<MovilizacionRow | null>(null);
  const [detailData, setDetailData] = useState<{ id: number; numero_listin: number | null; hora_salida: string | null } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  async function loadMov() {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (showRange && fromDate && toDate) {
        params.fromDate = fromDate;
        params.toDate = toDate;
      } else if (showToday) {
        const ve = fechaVE();
        const d = `${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`;
        params.filterDate = d;
      } else {
        params.month = filtroMes;
        params.year = filtroAno;
      }
      const data = await api.selectMovilizacion(params);
      setRows(data.rows as MovilizacionRow[]);
      setTotalCount(data.count);
    } catch { toast.error("Error al cargar movilizaciones"); }
    setLoading(false);
  }

  async function loadRefs() {
    try {
      const [v, o, r, c] = await Promise.all([
        api.selectVehicle(),
        api.selectOrganizaciones(),
        api.selectRutas(),
        api.selectChofer(),
      ]);
      setVehicles(v);
      setOrganizaciones(o ?? []);
      setRutas(r ?? []);
      setChoferes(c ?? []);
    } catch { toast.error("Error al cargar datos de referencia"); }
  }

  async function loadKPIs() {
    try {
      const k = await api.getMovilizacionKPIs();
      setKpi(k);
    } catch { /* ignore */ }
  }

  async function loadCharts() {
    try {
      const c = await api.getMovilizacionMonthly({ year: chartYear });
      setChartData(c);
    } catch { /* ignore */ }
  }

  async function loadCS() {
    setCsLoading(true);
    try {
      const d = await api.getControlSemanal({ from: csRange.from, to: csRange.to });
      setCsData(d);
    } catch { toast.error("Error al cargar control semanal"); }
    setCsLoading(false);
  }

  function setRange(date: Date) {
    const ve = fechaVE();
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
    const today = `${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`;
    setCsRange({ from: `${y}-${m}-${d} 00:00:00`, to: `${today} 23:59:59` });
  }

  function setRangeWeek() {
    const ve = fechaVE();
    const dayOfWeek = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
      .indexOf(ve.dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mon = new Date(ve.year, ve.month - 1, ve.day - diff);
    const y = mon.getFullYear(), m = String(mon.getMonth() + 1).padStart(2, "0"), d = String(mon.getDate()).padStart(2, "0");
    const today = `${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`;
    setCsRange({ from: `${y}-${m}-${d} 00:00:00`, to: `${today} 23:59:59` });
  }

  function setRangeMonth() {
    const ve = fechaVE();
    const y = ve.year, m = String(ve.month).padStart(2, "0");
    const today = `${y}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`;
    setCsRange({ from: `${y}-${m}-01 00:00:00`, to: `${today} 23:59:59` });
  }

  useEffect(() => { loadMov(); }, [filtroMes, filtroAno, page, showToday, showRange, fromDate, toDate]);
  useEffect(() => { loadRefs(); loadKPIs(); loadCharts(); }, []);
  useEffect(() => { loadCS(); }, [csRange]);

  function getVehiculo(placa: string) {
    return vehicles.find((v) => v.placa === placa);
  }

  function getOrgNombre(id_rif: string | null | undefined) {
    if (!id_rif) return "Sin organización";
    return organizaciones.find((o) => o.id_rif === id_rif)?.nombre ?? id_rif;
  }

  async function handleCambiarEstado(id: number, estado: string) {
    try {
      await api.updateMovilizacion({ id, estado });
      toast.success(`Estado cambiado a "${badges[getEstado(estado)].label}"`);
      loadMov();
      loadKPIs();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleEliminar(id: number, tipo?: string) {
    if (!confirm("¿Eliminar este viaje?")) return;
    try {
      await api.deleteMovilizacion({ id, tipo });
      toast.success("Viaje eliminado");
      loadMov();
      loadKPIs();
      loadCharts();
    } catch (err: any) { toast.error(err.message); }
  }

  async function openDetail(r: MovilizacionRow) {
    setDetailMov(r);
    setDetailOpen(true);
    try {
      const d = await api.getMovilizacionDetail({ id: r.id });
      setDetailData(d);
    } catch { setDetailData(null); }
  }

  const viajesPorOrganizacion = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const org = getOrgNombre(r.id_organizacion);
      map.set(org, (map.get(org) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [rows, organizaciones]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Movilizaciones</h1>
          <p className="text-sm text-muted-foreground">Control operativo y semanal del terminal</p>
        </div>
        <div className="flex bg-muted rounded-md p-1">
          <Button variant={tab === "control" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("control")}>
            <Bus className="mr-1 h-4 w-4" /> Control Operativo
          </Button>
          <Button variant={tab === "semanal" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("semanal")}>
            <Clock className="mr-1 h-4 w-4" /> Control Semanal
          </Button>
        </div>
      </div>

      {/* KPIs — siempre del día de hoy */}
      <div className="grid gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bus className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total hoy</p>
                <p className="font-display text-xl font-bold">{kpi?.totalMovilizado ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-950/30">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Despachados</p>
                <p className="font-display text-xl font-bold">{kpi?.totalDespachados ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/30">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Suspendidos</p>
                <p className="font-display text-xl font-bold">{kpi?.totalSuspendidos ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/30">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Usuarios</p>
                <p className="font-display text-xl font-bold">{(kpi?.totalPuestosEntrada ?? 0) + (kpi?.totalPuestosSalida ?? 0)}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{kpi?.totalPuestosEntrada ?? 0} entrada</span>
                  <span>|</span>
                  <span>{kpi?.totalPuestosSalida ?? 0} salida</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/30">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Vehículo + usado</p>
                <p className="font-display text-xl font-bold">{kpi?.vehiculoMasUsado ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {tab === "control" && (
        <>
          {/* Filters + New */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex bg-muted rounded-md p-1">
              <Button variant={showToday && !showRange ? "secondary" : "ghost"} size="sm" onClick={() => { setShowToday(true); setShowRange(false); setPage(1); }}>
                <Clock className="mr-1 h-4 w-4" /> Ver Hoy
              </Button>
              <Button variant={showRange ? "secondary" : "ghost"} size="sm" onClick={() => { setShowToday(false); setShowRange(true); if (!fromDate && !toDate) { const ve = fechaVE(); setFromDate(`${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`); setToDate(`${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`); } setPage(1); }}>
                <FileText className="mr-1 h-4 w-4" /> Rango
              </Button>
              <Button variant={!showToday && !showRange ? "secondary" : "ghost"} size="sm" onClick={() => { setShowToday(false); setShowRange(false); setPage(1); }}>
                Historial
              </Button>
            </div>
            {showRange && (
              <>
                <div className="space-y-1">
                  <Label>Desde</Label>
                  <Input type="date" className="w-36 h-8 text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
                </div>
                <div className="space-y-1">
                  <Label>Hasta</Label>
                  <Input type="date" className="w-36 h-8 text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
                </div>
              </>
            )}
            {!showToday && !showRange && (
              <>
                <div className="space-y-1">
                  <Label>Mes</Label>
                  <Select value={String(filtroMes)} onValueChange={(v) => { setFiltroMes(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][i]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Año</Label>
                  <Input type="number" className="w-20 h-9" value={filtroAno}
                    onChange={(e) => { setFiltroAno(Number(e.target.value) || new Date().getFullYear()); setPage(1); }} min={2020} max={2030} />
                </div>
              </>
            )}
          </div>

          {/* Table */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-3">{showRange ? `Viajes del ${fromDate} al ${toDate}` : showToday ? "Viajes de Hoy" : `Viajes de ${["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][filtroMes - 1]} ${filtroAno}`}
              <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                <span className="inline-flex items-center justify-center rounded-full w-4 h-4 text-[9px] font-bold bg-blue-100 text-blue-700">E</span>
                <span>Entrada</span>
                <span className="inline-flex items-center justify-center rounded-full w-4 h-4 text-[9px] font-bold bg-orange-100 text-orange-700">S</span>
                <span>Salida</span>
              </span>
            </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-6" />
                      <TableHead>Unidad / Organización</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pasajeros</TableHead>
                      <TableHead>Tasas</TableHead>
                      <TableHead>Hora Entrada</TableHead>
                      <TableHead>Hora Salida</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">No hay viajes en este período.</TableCell></TableRow>
                    ) : (
                      rows.map((r) => {
                        const estado = getEstado(r.estado);
                        const veh = getVehiculo(r.placa_vehiculo);
                        const badge = badges[estado];
                        const horaEntrada = formatHora(r.hora_entrada);
                        const horaSalida = formatHora(r.hora_salida);
                        return (
                          <TableRow key={`${r.tipo}-${r.id}`} className="cursor-pointer" onClick={() => openDetail(r)}>
                            <TableCell className="w-6 pr-1">
                              <span className={`inline-flex items-center justify-center rounded-full w-5 h-5 text-[10px] font-bold ${r.tipo === "salida" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                                {r.tipo === "salida" ? "S" : "E"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{r.placa_vehiculo}</div>
                              <div className="text-xs text-muted-foreground">{veh ? getOrgNombre(veh.id_organizacion) : "—"}</div>
                            </TableCell>
                            <TableCell className="text-xs">{r.ruta_destino ?? r.ruta_origen ?? "—"}</TableCell>
                            <TableCell><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${r.tipo_servicio === "interurbano" ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-teal-100 text-teal-700 border-teal-300"}`}>{r.tipo_servicio === "interurbano" ? "Inter" : "Sub"}</span></TableCell>
                            <TableCell className="text-xs text-center">{r.puestos_ocupados ?? "—"}</TableCell>
                            <TableCell className="text-xs text-right">{r.total_tasas != null ? `${Number(r.total_tasas).toLocaleString("es-VE")}` : "—"}</TableCell>
                            <TableCell className="text-xs">{horaEntrada}</TableCell>
                            <TableCell className="text-xs">{horaSalida}</TableCell>
                            <TableCell><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.class}`}>{badge.label}</span></TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {estado !== "en_espera" && (
                                      <DropdownMenuItem onClick={() => handleCambiarEstado(r.id, "en_espera")}>
                                        <Clock className="mr-2 h-4 w-4" /> En espera
                                      </DropdownMenuItem>
                                    )}
                                    {estado !== "en_anden" && (
                                      <DropdownMenuItem onClick={() => handleCambiarEstado(r.id, "en_anden")}>
                                        <Bus className="mr-2 h-4 w-4" /> En andén
                                      </DropdownMenuItem>
                                    )}
                                    {estado !== "cancelado" && (
                                      <DropdownMenuItem onClick={() => handleCambiarEstado(r.id, "cancelado")}>
                                        <XCircle className="mr-2 h-4 w-4 text-red-500" /> Cancelar
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleEliminar(r.id, r.tipo)}>
                                      <XCircle className="mr-2 h-4 w-4 text-red-500" /> Eliminar viaje
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
              {totalCount > pageSize && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">Página {page} de {Math.ceil(totalCount / pageSize)} ({totalCount} registros)</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                    <Button size="sm" variant="outline" disabled={page >= Math.ceil(totalCount / pageSize)} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detail Dialog */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detalle de Movilización #{detailMov?.id}</DialogTitle>
              </DialogHeader>
              {detailMov && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">ID de la Movilización</p>
                      <p className="font-display text-lg font-bold">#{detailMov.id}</p>
                      <p className="text-xs text-muted-foreground">Para soporte técnico o auditoría</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Número de Listín</p>
                      <p className="font-display text-lg font-bold">{detailMov.serial_listin ?? "Asignándose"}</p>
                      <p className="text-xs text-muted-foreground">{detailMov.serial_listin ? "Serial registrado" : "Pendiente de asignación"}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Hora de Salida</p>
                    <p className="font-display text-lg font-bold">{formatHora(detailData?.hora_salida)}</p>
                    <p className="text-xs text-muted-foreground">Hora exacta en que abandonó el terminal</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                    <span>Placa: <strong>{detailMov.placa_vehiculo}</strong></span>
                    <span>·</span>
                    <span>Destino: <strong>{detailMov.ruta_destino ?? "—"}</strong></span>
                    <span>·</span>
                    <span>Estado: <strong>{badges[getEstado(detailMov.estado)].label}</strong></span>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Flujo mensual de movilizaciones</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#1e3a5f" radius={[6, 6, 0, 0]} name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin datos para este año</div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Label className="text-sm">Año:</Label>
                <Input type="number" className="w-20 h-8" value={chartYear}
                  onChange={(e) => setChartYear(Number(e.target.value) || new Date().getFullYear())} min={2020} max={2030} />
              </div>
            </CardContent>
          </Card>

          {/* Viajes por organización */}
          <Card>
            <CardHeader><CardTitle className="text-base">Viajes por organización</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organización</TableHead>
                    <TableHead className="text-right">Cantidad de Viajes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viajesPorOrganizacion.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">No hay datos.</TableCell></TableRow>
                  ) : (
                    viajesPorOrganizacion.map((o) => (
                      <TableRow key={o.nombre}>
                        <TableCell className="font-medium">{o.nombre}</TableCell>
                        <TableCell className="text-right">{o.cantidad}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>

      )}

      {tab === "semanal" && (
        <div className="space-y-6">
          {/* Filtro Maestro */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Desde</Label>
                  <Input type="date" value={csRange.from.slice(0, 10)}
                    onChange={(e) => setCsRange((prev) => ({ from: `${e.target.value} 00:00:00`, to: prev.to }))} />
                </div>
                <div className="space-y-1">
                  <Label>Hasta</Label>
                  <Input type="date" value={csRange.to.slice(0, 10)}
                    onChange={(e) => setCsRange((prev) => ({ from: prev.from, to: `${e.target.value} 23:59:59` }))} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setRange(new Date())}>Hoy</Button>
                <Button variant="outline" size="sm" onClick={setRangeWeek}>Esta Semana</Button>
                <Button variant="outline" size="sm" onClick={setRangeMonth}>Mes Actual</Button>
                <Button variant="outline" size="sm" disabled={!csData?.tabla.length} onClick={() => {
                  const doc = new jsPDF();
                  const fromStr = csRange.from.slice(0, 10);
                  const toStr = csRange.to.slice(0, 10);
                  doc.setFontSize(14);
                  doc.text(`Control Semanal — ${fromStr} al ${toStr}`, 14, 20);
                  const tbody = (csData?.tabla ?? []).map((f) => [f.fecha, f.dia, String(f.unidades), String(f.usuarios), String(f.desembarques), `${f.tasas.toLocaleString("es-VE")}`]);
                  tbody.push(["", "", "", "", "", ""]);
                  tbody.push(["GRAN TOTAL", "", String(csData?.kpis.totalUnidades ?? 0), String(csData?.kpis.totalUsuarios ?? 0), String(csData?.kpis.totalDesembarques ?? 0), `${(csData?.kpis.totalTasas ?? 0).toLocaleString("es-VE")}`]);
                  autoTable(doc, {
                    head: [["Fecha", "Día", "Unidades", "Usuarios", "Desembarques", "Tasas"]],
                    body: tbody,
                    startY: 28,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [59, 130, 246] },
                  });
                  doc.save(`control-semanal-${fromStr}.pdf`);
                }}>
                  <FileText className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* KPIs Consolidados */}
          <div className="grid gap-3 md:grid-cols-4">
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bus className="h-4 w-4" /></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Total Unidades Salientes</p><p className="font-display text-xl font-bold">{csData?.kpis.totalUnidades ?? 0}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600"><User className="h-4 w-4" /></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Total Usuarios Movilizados</p><p className="font-display text-xl font-bold">{(csData?.kpis.totalUsuarios ?? 0).toLocaleString("es-VE")}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><ArrowDown className="h-4 w-4" /></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Total Desembarques</p><p className="font-display text-xl font-bold">{csData?.kpis.totalDesembarques ?? 0}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><Hash className="h-4 w-4" /></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Recaudación Tasas</p><p className="font-display text-xl font-bold">{(csData?.kpis.totalTasas ?? 0).toLocaleString("es-VE")}</p></div>
              </div>
            </CardContent></Card>
          </div>

          {/* Tabla Detallada */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Detalle por Fecha</CardTitle></CardHeader>
            <CardContent>
              {csLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Día</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Usuarios</TableHead>
                      <TableHead className="text-right">Desembarques</TableHead>
                      <TableHead className="text-right">Tasas</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!csData || csData.tabla.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Sin datos en el rango seleccionado.</TableCell></TableRow>
                    ) : (
                      csData.tabla.map((fila) => {
                        const abierto = desgloseFecha === fila.fecha;
                        return (
                          <Fragment key={fila.fecha}>
                            <TableRow>
                              <TableCell className="font-medium">{fila.fecha}</TableCell>
                              <TableCell className="text-xs uppercase">{fila.dia}</TableCell>
                              <TableCell className="text-right">{fila.unidades}</TableCell>
                              <TableCell className="text-right">{fila.usuarios.toLocaleString("es-VE")}</TableCell>
                              <TableCell className="text-right">{fila.desembarques}</TableCell>
                              <TableCell className="text-right">{fila.tasas.toLocaleString("es-VE")}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => setDesgloseFecha(abierto ? null : fila.fecha)}>
                                  {abierto ? "Ocultar" : "Ver Desglose"}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {abierto && fila.detalle.map((d) => (
                              <TableRow key={d.id} className="bg-muted/30">
                                <TableCell colSpan={2} className="text-xs pl-8">{d.placa} — {d.ruta}</TableCell>
                                <TableCell className="text-right text-xs">{d.linea}</TableCell>
                                <TableCell className="text-right text-xs">{d.puestos} ptos</TableCell>
                                <TableCell colSpan={3} />
                              </TableRow>
                            ))}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-sm">Movilización por Tipo (Usuarios)</CardTitle></CardHeader>
              <CardContent>
                {csData && csData.barras.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={csData.barras.map((b) => ({ name: `${b.puestos} Ptos`, usuarios: b.usuarios }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="usuarios" fill="#1e3a5f" radius={[6, 6, 0, 0]} name="Usuarios" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-sm">Tendencia Semanal</CardTitle></CardHeader>
              <CardContent>
                {csData && csData.tendencia.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={csData.tendencia.map((t) => ({ dia: t.dia.slice(0, 3), unidades: t.unidades, usuarios: t.usuarios }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="unidades" fill="#2563eb" radius={[4, 4, 0, 0]} name="Unidades" />
                      <Bar dataKey="usuarios" fill="#1e3a5f" radius={[4, 4, 0, 0]} name="Usuarios" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground py-8 text-center">Sin datos</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      <FlowBar />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
