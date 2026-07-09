import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, LogIn, LogOut, Bus, ArrowRightLeft, BarChart3, ChevronsUpDown, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api, type Vehicle } from "@/lib/api";
import { FlowBar } from "@/components/flow-nav";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, formatHora } from "@/lib/utils";

function fechaVE(): { year: number; month: number; day: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return { year: Number(p("year")), month: Number(p("month")), day: Number(p("day")) };
}

export const Route = createFileRoute("/admin/entradas-salidas")({
  head: () => ({
    meta: [
      { title: "Entradas / Salidas — Terminal Alí Primera" },
    ],
  }),
  component: EntradasSalidasPage,
});

function EntradasSalidasPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"entrada" | "salida">("salida");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipoRegistro, setTipoRegistro] = useState<"entrada" | "salida">("entrada");
  const [puestosInput, setPuestosInput] = useState("");
  const [form, setForm] = useState({
    id_tipologia: "",
    id_organizacion: "",
    id_ruta: "",
    id_chofer: "",
    placa_vehiculo: "",
    puestos_ocupados: "",
    total_tasas: "",
    tipo_servicio: "",
    serial_listin: "",
  });
  const [tipologias, setTipologias] = useState<any[]>([]);
  const [organizaciones, setOrganizaciones] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [standaloneSalidaId, setStandaloneSalidaId] = useState<number | null>(null);
  const [entradaHora, setEntradaHora] = useState("");
  const [choferes, setChoferes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [placaOpen, setPlacaOpen] = useState(false);
  const [placaSearch, setPlacaSearch] = useState("");
  const [rutaOpen, setRutaOpen] = useState(false);
  const [rutaSearch, setRutaSearch] = useState("");
  const [editRow, setEditRow] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const ve = fechaVE();
    return `${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const ve = fechaVE();
    return `${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`;
  });

  async function load() {
    setLoading(true);
    try {
      const data = await api.selectEntradasSalidas({ from: dateFrom, to: dateTo + " 23:59:59" });
      setRows(data ?? []);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  async function loadSelects() {
    try {
      const [tipoRes, orgRes, rutasRes, chofRes, vehRes] = await Promise.all([
        api.selectTipologias(),
        api.selectOrganizaciones(),
        api.selectRutas(),
        api.selectChofer(),
        api.selectVehicle(),
      ]);
      if (tipoRes) setTipologias(tipoRes);
      setOrganizaciones(orgRes ?? []);
      setRutas(rutasRes ?? []);
      setChoferes(chofRes ?? []);
      setVehicles(vehRes ?? []);
    } catch { }
  }

  useEffect(() => { load(); loadSelects(); }, []);
  useEffect(() => { load(); }, [dateFrom, dateTo]);

  function resetForm() {
    setPuestosInput("");
    setForm({
      id_tipologia: "",
      id_organizacion: "",
      id_ruta: "",
      id_chofer: "",
      placa_vehiculo: "",
      puestos_ocupados: "",
      total_tasas: "",
      tipo_servicio: "",
      serial_listin: "",
    });
  }

  function openNew(tipo: "entrada" | "salida") {
    setTipoRegistro(tipo);
    resetForm();
    setOpen(true);
  }

  function openEdit(row: any) {
    setEditRow(row);
    const tipo = tipologias.find((t: any) => t.id === row.id_tipologia);
    setPuestosInput(tipo ? String(tipo.cantidad_puestos) : String(row.id_tipologia ?? ""));
    setForm({
      id_tipologia: String(row.id_tipologia ?? ""),
      id_organizacion: row.id_organizacion ?? "",
      id_ruta: String(row.id_ruta ?? ""),
      id_chofer: String(row.id_chofer ?? ""),
      placa_vehiculo: row.placa_vehiculo ?? "",
      puestos_ocupados: String(row.puestos_ocupados ?? ""),
      total_tasas: String(row.total_tasas ?? ""),
      tipo_servicio: row.tipo_servicio ?? "",
      serial_listin: row.serial_listin ?? "",
    });
    setEditOpen(true);
  }

  async function save() {
    if (!form.id_tipologia || !form.id_organizacion || !form.id_chofer) {
      toast.error("Tipología, Organización y Chofer son obligatorios");
      return;
    }
    const capacidad = tipologias.find((t: any) => String(t.id) === form.id_tipologia)?.cantidad_puestos;
    const puestos = Number(form.puestos_ocupados);
    if (capacidad && puestos > capacidad) {
      toast.error(`Los puestos no pueden exceder la capacidad de ${capacidad}`);
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        id_tipologia: Number(form.id_tipologia),
        id_organizacion: form.id_organizacion,
        id_ruta: form.id_ruta ? Number(form.id_ruta) : null,
        id_chofer: Number(form.id_chofer),
        placa_vehiculo: form.placa_vehiculo || null,
        puestos_ocupados: form.puestos_ocupados ? Number(form.puestos_ocupados) : null,
        tipo_servicio: form.tipo_servicio || null,
        serial_listin: form.serial_listin || null,
      };
      if (tipoRegistro === "salida") {
        payload.total_tasas = Number(form.total_tasas) || 0;
        payload.tipo_servicio_salida = form.tipo_servicio || null;
        const res: any = await api.createSalida(payload);
        setSaving(false);
        setOpen(false);
        if (res?.standalone && res?.salidaId) {
          setStandaloneSalidaId(res.salidaId);
          setEntradaHora("");
        } else {
          toast.success("Salida registrada");
          load();
        }
      } else {
        await api.createEntrada(payload);
        setSaving(false);
        setOpen(false);
        toast.success("Entrada registrada");
        load();
      }
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message);
    }
  }

  async function saveEdit() {
    if (!editRow) return;
    const capacidad = tipologias.find((t: any) => String(t.id) === form.id_tipologia)?.cantidad_puestos;
    const puestos = Number(form.puestos_ocupados);
    if (capacidad && puestos > capacidad) {
      toast.error(`Los puestos no pueden exceder la capacidad de ${capacidad}`);
      return;
    }
    setSaving(true);
    try {
      const tipo = editRow.tipo;
      const payload: any = {
        id: editRow.id,
        id_tipologia: form.id_tipologia ? Number(form.id_tipologia) : null,
        id_organizacion: form.id_organizacion || null,
        id_ruta: form.id_ruta ? Number(form.id_ruta) : null,
        id_chofer: form.id_chofer ? Number(form.id_chofer) : null,
        placa_vehiculo: form.placa_vehiculo || null,
        puestos_ocupados: form.puestos_ocupados ? Number(form.puestos_ocupados) : null,
        serial_listin: form.serial_listin || null,
      };
      if (tipo === "entrada") {
        (payload as any).tipo_servicio = form.tipo_servicio || null;
        await api.updateEntrada(payload);
      } else {
        (payload as any).total_tasas = form.total_tasas ? Number(form.total_tasas) : null;
        (payload as any).tipo_servicio_salida = form.tipo_servicio || null;
        await api.updateSalida(payload);
      }
      setSaving(false);
      setEditOpen(false);
      setEditRow(null);
      toast.success("Registro actualizado");
      load();
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message);
    }
  }

  async function vincularSalida() {
    if (!standaloneSalidaId || !entradaHora) {
      toast.error("Selecciona una hora de entrada");
      return;
    }
    setSaving(true);
    try {
      await api.vincularSalidaSuelta({ salidaId: standaloneSalidaId, horaEntrada: entradaHora });
      setSaving(false);
      setStandaloneSalidaId(null);
      toast.success("Salida vinculada con hora de entrada");
      load();
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message);
    }
  }

  const rutaMap = useMemo(() => new Map(rutas.map((r: any) => [r.id, r])), [rutas]);
  const orgMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of organizaciones) m.set(o.id_rif ?? o.id, o.nombre ?? "");
    return m;
  }, [organizaciones]);
  const tipoMap = useMemo(() => new Map(tipologias.map((t: any) => [t.id, t.cantidad_puestos ?? t.id])), [tipologias]);

  const rutasFiltradas = useMemo(() =>
    form.id_organizacion
      ? rutas.filter((r: any) => r.id_organizacion === form.id_organizacion)
      : rutas,
    [rutas, form.id_organizacion]
  );

  const filteredRows = useMemo(() =>
    rows.filter((r) => (tab === "entrada" ? r.tipo === "entrada" : r.tipo === "salida")),
    [rows, tab]
  );

  const entradasRows = useMemo(() => rows.filter((r) => r.tipo === "entrada"), [rows]);
  const salidasRows = useMemo(() => rows.filter((r) => r.tipo === "salida"), [rows]);

  const suburbanoKeywords = [
    "judibana", "santa elena", "cardón", "cardon", "las piedras",
    "los taques", "amuay", "adícora", "adicora", "jadacaquiva",
    "moruy", "tacuato", "pueblo nuevo", "la vela",
  ];

  const interurbanoKeywords = [
    "inter", "ccs", "caracas", "maracay", "valencia",
    "amazonas", "anzoátegui", "anzeátegui", "apure", "aragua",
    "barinas", "bolívar", "bolivar", "carabobo", "cojedes",
    "delta amacuro", "falcon", "falcón", "guárico", "guarico",
    "lara", "mérida", "merida", "miranda", "monagas",
    "nueva esparta", "portuguesa", "sucre", "táchira", "tachira",
    "trujillo", "vargas", "la guaira", "yaracuy", "zulia",
    "barquisimeto", "ciudad guayana", "puerto ordaz", "barcelona",
    "puerto la cruz", "maturín", "maturin", "cumaná", "cumana",
    "san cristóbal", "coro", "los teques", "guanare",
    "san fernando", "calabozo", "el tigre", "ciudad bolívar",
    "tucupita", "porlamar", "punto fijo", "puerto cabello",
    "valera", "el vigía", "maracaibo", "cabimas", "ciudad ojeda",
    "carúpano", "carupano", "puerto ayacucho", "guasdualito",
  ];

  function esInterurbano(r: any): boolean {
    if (r.tipo_servicio) return r.tipo_servicio === "interurbano";
    const destino = (r.ruta_destino ?? "").toLowerCase();
    if (suburbanoKeywords.some((kw) => destino.includes(kw))) return false;
    return interurbanoKeywords.some((kw) => destino.includes(kw));
  }

  const resumen = useMemo(() => {
    let subUnidades = 0, subPasajeros = 0, subTasas = 0;
    let interUnidades = 0, interPasajeros = 0, interTasas = 0;
    let totalTasas = 0, totalListines = 0, totalPasajeros = 0;

    for (const r of salidasRows) {
      totalListines++;
      totalPasajeros += r.puestos_ocupados ?? 0;
      totalTasas += r.total_tasas ?? 0;

      if (esInterurbano(r)) {
        interUnidades++;
        interPasajeros += r.puestos_ocupados ?? 0;
        interTasas += r.total_tasas ?? 0;
      } else {
        subUnidades++;
        subPasajeros += r.puestos_ocupados ?? 0;
        subTasas += r.total_tasas ?? 0;
      }
    }
    return { subUnidades, subPasajeros, subTasas, interUnidades, interPasajeros, interTasas, totalTasas, totalListines, totalPasajeros };
  }, [salidasRows, rutaMap]);

  const cierre = useMemo(() => {
    const entUnidades = entradasRows.length;
    const entPasajeros = entradasRows.reduce((s, r) => s + (r.puestos_ocupados ?? 0), 0);
    const salUnidades = salidasRows.length;
    const salPasajeros = salidasRows.reduce((s, r) => s + (r.puestos_ocupados ?? 0), 0);
    const salTasas = salidasRows.reduce((s, r) => s + (r.total_tasas ?? 0), 0);
    return { entUnidades, entPasajeros, salUnidades, salPasajeros, salTasas };
  }, [entradasRows, salidasRows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Garita</h1>
          <p className="text-sm text-muted-foreground">Registro de entrada y salida de unidades</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Label className="text-xs">Desde</Label>
            <Input type="date" className="w-36 h-8 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Label className="text-xs">Hasta</Label>
            <Input type="date" className="w-36 h-8 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button onClick={() => { const ve = fechaVE(); setDateFrom(`${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`); setDateTo(`${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`); }} variant="outline" size="sm">Hoy</Button>
          <Button onClick={() => { const ve = fechaVE(); setDateFrom(`${ve.year}-${String(ve.month).padStart(2, "0")}-01`); setDateTo(`${ve.year}-${String(ve.month).padStart(2, "0")}-${String(ve.day).padStart(2, "0")}`); }} variant="outline" size="sm">Mes actual</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => openNew("entrada")}>
                <LogIn className="mr-2 h-4 w-4" /> Agregar entrada
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button onClick={() => openNew("salida")}>
                <LogOut className="mr-2 h-4 w-4" /> Agregar salida
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {tipoRegistro === "entrada" ? "Registrar Entrada" : "Registrar Salida"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Organización">
                  <Select value={form.id_organizacion} onValueChange={(v) => setForm({ ...form, id_organizacion: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {organizaciones.map((o: any) => (
                        <SelectItem key={o.id_rif ?? o.id} value={o.id_rif ?? o.id}>
                          {o.nombre ?? o.id_rif ?? o.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Vehículo">
                  <Popover open={placaOpen} onOpenChange={setPlacaOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={placaOpen}
                        className="w-full justify-between font-normal overflow-hidden"
                      >
                        {form.placa_vehiculo
                          ? (() => { const v = vehicles.find((x) => x.placa === form.placa_vehiculo); return v ? `${v.placa} — ${v.marca} ${v.modelo}` : form.placa_vehiculo; })()
                          : "Buscar vehículo..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Buscar por placa, marca o modelo..."
                          value={placaSearch}
                          onValueChange={setPlacaSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground">Sin resultados</div>
                          </CommandEmpty>
                          <CommandGroup heading="Vehículos disponibles">
                            {vehicles
                              .filter((v) =>
                                !placaSearch ||
                                v.placa.toLowerCase().includes(placaSearch.toLowerCase()) ||
                                v.marca?.toLowerCase().includes(placaSearch.toLowerCase()) ||
                                v.modelo?.toLowerCase().includes(placaSearch.toLowerCase())
                              )
                              .slice(0, 10)
                              .map((v) => (
                                <CommandItem
                                  key={v.placa}
                                  value={v.placa}
                                  onSelect={(val) => {
                                    const veh = vehicles.find((x) => x.placa === val);
                                    const chof = choferes.find((c: any) => c.placa_unidad === val);
                                    const tipo = tipologias.find((t: any) => t.cantidad_puestos === veh?.cantidad_puestos);
                                    setPuestosInput(String(veh?.cantidad_puestos ?? ""));
                                    const updates: any = {
                                      placa_vehiculo: val,
                                      id_organizacion: veh?.id_organizacion ?? form.id_organizacion,
                                      id_tipologia: String(tipo?.id ?? form.id_tipologia),
                                      id_chofer: chof ? String(chof.id) : form.id_chofer,
                                    };
                                    setForm({ ...form, ...updates });
                                    setPlacaOpen(false);
                                    setPlacaSearch("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.placa_vehiculo === v.placa ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="font-medium">{v.placa}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {v.marca} {v.modelo} ({v.tipo})
                                  </span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </Field>
                <Field label="Tipología (Puestos)">
                  <Input type="number" min={1} value={puestosInput} placeholder="Ej: 23"
                    onChange={(e) => {
                      const val = e.target.value;
                      setPuestosInput(val);
                      const tipo = tipologias.find((t: any) => t.cantidad_puestos === Number(val));
                      setForm({ ...form, id_tipologia: tipo ? String(tipo.id) : "" });
                    }}
                  />
                </Field>
                <Field label="Ruta">
                  <Popover open={rutaOpen} onOpenChange={setRutaOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={rutaOpen}
                        className="w-full justify-between font-normal"
                      >
                        {form.id_ruta
                          ? (() => { const r = rutasFiltradas.find((x: any) => String(x.id) === form.id_ruta); return r ? `${r.origen} → ${r.destino}` : form.id_ruta; })()
                          : "Buscar ruta..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar ruta..."
                          value={rutaSearch}
                          onValueChange={setRutaSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground">Sin resultados</div>
                          </CommandEmpty>
                          <CommandGroup heading="Rutas disponibles">
                            {rutasFiltradas
                              .filter((r: any) =>
                                !rutaSearch ||
                                r.origen?.toLowerCase().includes(rutaSearch.toLowerCase()) ||
                                r.destino?.toLowerCase().includes(rutaSearch.toLowerCase())
                              )
                              .map((r: any) => (
                                <CommandItem
                                  key={r.id}
                                  value={String(r.id)}
                                  onSelect={(val) => {
                                    setForm({ ...form, id_ruta: val });
                                    setRutaOpen(false);
                                    setRutaSearch("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.id_ruta === String(r.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span>{r.origen} → {r.destino}</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </Field>
                <Field label="Chofer">
                  <Select value={form.id_chofer} onValueChange={(v) => setForm({ ...form, id_chofer: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {choferes.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombres_apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={tipoRegistro === "entrada" ? "Desembarque" : "Puestos ocupados"}>
                  <Input type="number" min={0} value={form.puestos_ocupados}
                    onChange={(e) => setForm({ ...form, puestos_ocupados: e.target.value })} placeholder="0" />
                </Field>
                {tipoRegistro === "salida" && (
                  <Field label="Serial Listín">
                    <Input value={form.serial_listin} onChange={(e) => setForm({ ...form, serial_listin: e.target.value })} placeholder="Nro. de listín" />
                  </Field>
                )}
                <Field label="Tipo de Servicio">
                  <Select value={form.tipo_servicio} onValueChange={(v) => setForm({ ...form, tipo_servicio: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suburbano">Suburbano</SelectItem>
                      <SelectItem value="interurbano">Interurbano</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {tipoRegistro === "salida" && (
                  <Field label="Total Tasas">
                    <Input type="number" step="0.01" min={0} value={form.total_tasas}
                      onChange={(e) => setForm({ ...form, total_tasas: e.target.value })} />
                  </Field>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Editar {editRow?.tipo === "entrada" ? "Entrada" : "Salida"} #{editRow?.id}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Organización">
                  <Select value={form.id_organizacion} onValueChange={(v) => setForm({ ...form, id_organizacion: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {organizaciones.map((o: any) => (
                        <SelectItem key={o.id_rif ?? o.id} value={o.id_rif ?? o.id}>
                          {o.nombre ?? o.id_rif ?? o.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Vehículo">
                  <Input value={form.placa_vehiculo} onChange={(e) => setForm({ ...form, placa_vehiculo: e.target.value.toUpperCase() })} placeholder="Placa" />
                </Field>
                <Field label="Tipología (Puestos)">
                  <Input type="number" min={1} value={puestosInput} placeholder="Ej: 23"
                    onChange={(e) => {
                      const val = e.target.value;
                      setPuestosInput(val);
                      const tipo = tipologias.find((t: any) => t.cantidad_puestos === Number(val));
                      setForm({ ...form, id_tipologia: tipo ? String(tipo.id) : "" });
                    }}
                  />
                </Field>
                <Field label="Chofer">
                  <Select value={form.id_chofer} onValueChange={(v) => setForm({ ...form, id_chofer: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {choferes.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nombres_apellidos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={editRow?.tipo === "entrada" ? "Desembarque" : "Puestos ocupados"}>
                  <Input type="number" min={0} value={form.puestos_ocupados}
                    onChange={(e) => setForm({ ...form, puestos_ocupados: e.target.value })} />
                </Field>
                {editRow?.tipo === "salida" && (
                  <Field label="Serial Listín">
                    <Input value={form.serial_listin} onChange={(e) => setForm({ ...form, serial_listin: e.target.value })} placeholder="Nro. de listín" required />
                  </Field>
                )}
                <Field label="Tipo de Servicio">
                  <Select value={form.tipo_servicio} onValueChange={(v) => setForm({ ...form, tipo_servicio: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suburbano">Suburbano</SelectItem>
                      <SelectItem value="interurbano">Interurbano</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {editRow?.tipo === "salida" && (
                  <Field label="Total Tasas">
                    <Input type="number" step="0.01" min={0} value={form.total_tasas}
                      onChange={(e) => setForm({ ...form, total_tasas: e.target.value })} />
                  </Field>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setEditOpen(false); setEditRow(null); }}>Cancelar</Button>
                <Button onClick={saveEdit} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Vincular Salida Suelta */}
          <Dialog open={standaloneSalidaId !== null} onOpenChange={(open) => { if (!open) setStandaloneSalidaId(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salida sin entrada vinculada</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Esta salida no se vinculó a ninguna entrada. ¿Desea registrar la hora en que entró la unidad?
              </p>
              <Field label="Hora de Entrada">
                <Input type="datetime-local" value={entradaHora} onChange={(e) => setEntradaHora(e.target.value)} />
              </Field>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStandaloneSalidaId(null)}>No, omitir</Button>
                <Button onClick={vincularSalida} disabled={saving || !entradaHora}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sí, vincular
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-md p-1 w-fit">
        <Button variant={tab === "salida" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("salida")}>
          <LogOut className="mr-1 h-4 w-4" /> Garita Salida
        </Button>
        <Button variant={tab === "entrada" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("entrada")}>
          <LogIn className="mr-1 h-4 w-4" /> Garita Entrada
        </Button>
      </div>

      {/* Main content: 2 columns */}
      <div className="grid gap-4 lg:grid-cols-[7fr_3fr]">
        {/* Left: Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {tab === "entrada" ? "Registros de Entrada" : "Registros de Salida"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Ptos</TableHead>
                    <TableHead>Organizacion</TableHead>
                    <TableHead>Placa / Chofer</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">{tab === "entrada" ? "Desemb." : "Pasaj."}</TableHead>
                    {tab === "salida" && <TableHead className="text-right">Tasas</TableHead>}
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={tab === "salida" ? 9 : 8} className="py-10 text-center text-sm text-muted-foreground">
                        No hay registros en este período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r, i) => {
                      return (
                        <TableRow key={`${r.tipo}-${r.id}-${i}`}>
                          <TableCell className="text-xs text-muted-foreground">{filteredRows.length - i}</TableCell>
                          <TableCell className="text-xs font-medium">{formatHora(r.hora)}</TableCell>
                          <TableCell className="text-xs">
                            <div>{tipoMap.get(r.id_tipologia) ?? r.id_tipologia}</div>
                            <div className="text-[10px] text-muted-foreground">{r.serial_listin ?? "Asignándose"}</div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{orgMap.get(r.id_organizacion) ?? r.id_organizacion}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.placa_vehiculo + " - " + r.chofer_nombre}</TableCell>
                          <TableCell className="text-xs">{r.ruta_origen && r.ruta_destino ? `${r.ruta_origen}→${r.ruta_destino}` : r.id_ruta}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{r.puestos_ocupados}</TableCell>
                          {tab === "salida" && (
                            <TableCell className="text-right text-xs">{r.total_tasas != null ? `${Number(r.total_tasas).toLocaleString("es-VE")}` : "—"}</TableCell>
                          )}
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right: Summary Panel */}
        <div className="space-y-4">
          {tab === "salida" && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bus className="h-4 w-4" /> Resumen de Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Suburbanos</p>
                    <div className="flex justify-between text-sm">
                      <span>Unidades (L):</span>
                      <span className="font-bold">{resumen.subUnidades}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pasajeros (P):</span>
                      <span className="font-bold">{resumen.subPasajeros}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tasas:</span>
                      <span className="font-bold">{resumen.subTasas.toLocaleString("es-VE")}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Interurbanos</p>
                    <div className="flex justify-between text-sm">
                      <span>Unidades (L):</span>
                      <span className="font-bold">{resumen.interUnidades}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pasajeros (P):</span>
                      <span className="font-bold">{resumen.interPasajeros}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tasas:</span>
                      <span className="font-bold">{resumen.interTasas.toLocaleString("es-VE")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Listines</p>
                      <p className="font-display text-xl font-bold">{resumen.totalListines}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Pasajeros</p>
                      <p className="font-display text-xl font-bold">{resumen.totalPasajeros}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-center">
                    <p className="text-xs text-muted-foreground uppercase">Total en Tasas</p>
                    <p className="font-display text-xl font-bold text-primary">{resumen.totalTasas.toLocaleString("es-VE")}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === "entrada" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Resumen de Entradas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total Unidades:</span>
                  <span className="font-bold">{entradasRows.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Desembarque:</span>
                  <span className="font-bold">{entradasRows.reduce((s, r) => s + (r.puestos_ocupados ?? 0), 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tipologías usadas:</span>
                  <span className="font-bold">{new Set(entradasRows.map((r) => r.id_tipologia)).size}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom: Cierre de Turno */}
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Cierre de Turno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Entradas</p>
              <p className="font-display text-2xl font-bold text-green-700 dark:text-green-400">{cierre.entUnidades} Unidades</p>
              <p className="text-sm text-muted-foreground">{cierre.entPasajeros} Desembarque</p>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Salidas</p>
              <p className="font-display text-2xl font-bold text-blue-700 dark:text-blue-400">{cierre.salUnidades} Listines</p>
              <p className="text-sm text-muted-foreground">{cierre.salPasajeros} Pasajeros</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Tasas Recaudadas</p>
              <p className="font-display text-2xl font-bold text-amber-700 dark:text-amber-400">{cierre.salTasas.toLocaleString("es-VE")} Tasas</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {user?.role !== "garita" && <FlowBar next={{ label: "Movilizaciones", to: "/admin/movilizacion" }} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
