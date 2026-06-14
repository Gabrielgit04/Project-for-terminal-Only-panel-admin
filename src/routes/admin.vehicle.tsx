import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { FlowBar } from "@/components/flow-nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";


type TipologyValue = 32 | 5 | 60 | 20;

const PUESTOS_POR_TIPO: Record<"encava" | "por puesto" | "colectivo", TipologyValue> = {
    encava: 32,
    "por puesto": 5,
    colectivo: 60,
};

interface Vehiculo {
    placa: string;
    marca: string;
    modelo: string;
    cedula_propietario: string;
    propietario: string;
    tipo: "encava" | "por puesto" | "colectivo";
    cantidad_puestos: TipologyValue | null;
    id_organizacion: string | null;
    organizacion_nombre: string | null;
}

export const Route = createFileRoute("/admin/vehicle")({
    head: () => ({
        meta: [
            { title: "Gestión de Vehículos — Terminal Alí Primera" },
        ],
    }),
    component: VehiculosPage,
});

type FormState = {
    placa: string;
    marca: string;
    modelo: string;
    cedula_propietario: string;
    propietario: string;
    tipo: "encava" | "por puesto" | "colectivo";
    cantidad_puestos: TipologyValue;
    id_organizacion?: string | null;
    organizacion_nombre: string;
    organizacion_rif: string;
};

const emptyForm = {
    placa: "",
    marca: "",
    modelo: "",
    cedula_propietario: "",
    propietario: "",
    tipo: "encava" as const,
    cantidad_puestos: 32 as TipologyValue,
    id_organizacion: null as string | null,
    organizacion_nombre: "",
    organizacion_rif: "",
};

function VehiculosPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [editingPlaca, setEditingPlaca] = useState("");
    const [page, setPage] = useState(1);
    const [orgCount, setOrgCount] = useState<{ nombre: string; cantidad: number }[]>([]);
    const [allVehicles, setAllVehicles] = useState<Vehiculo[]>([]);
    const [organizaciones, setOrganizaciones] = useState<{ id_rif: string; nombre: string }[]>([]);
    const [orgOpen, setOrgOpen] = useState(false);
    const [orgSearch, setOrgSearch] = useState("");
    const [search, setSearch] = useState("");
    const pageSize = 15;

    async function load() {
        setLoading(true);
        try {
            const [data, orgs] = await Promise.all([
                api.selectVehicle(),
                api.selectOrganizaciones(),
            ]);
            setAllVehicles(data as Vehiculo[]);
            setOrganizaciones(orgs ?? []);

            const map = new Map<string, number>();
            for (const v of data) {
                const key = (v as any).organizacion_nombre || (v as any).id_organizacion || "Sin organización";
                map.set(key, (map.get(key) ?? 0) + 1);
            }
            const sorted = [...map.entries()]
                .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                .sort((a, b) => b.cantidad - a.cantidad);
            setOrgCount(sorted);
        } catch (err: any) {
            toast.error(err.message);
        }
        setLoading(false);
    }

    const filteredVehicles = useMemo(() => {
        if (!search) return allVehicles;
        const q = search.toLowerCase();
        return allVehicles.filter((v) =>
            v.placa.toLowerCase().includes(q) ||
            v.cedula_propietario.toLowerCase().includes(q)
        );
    }, [allVehicles, search]);

    const totalPages = Math.ceil(filteredVehicles.length / pageSize);
    const currentPage = filteredVehicles.length > 0 ? Math.min(page, Math.max(1, totalPages)) : 1;
    const pagedVehicles = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setPage(totalPages);
    }, [filteredVehicles.length]);

    function openNew() {
        setForm(emptyForm);
        setEditingPlaca("");
        setOrgSearch("");
        setOpen(true);
    }

    function openEdit(v: Vehiculo) {
        setForm({
            placa: v.placa,
            marca: v.marca,
            modelo: v.modelo,
            cedula_propietario: v.cedula_propietario,
            propietario: v.propietario,
            tipo: v.tipo,
            cantidad_puestos: v.cantidad_puestos ?? PUESTOS_POR_TIPO[v.tipo],
            id_organizacion: v.id_organizacion,
            organizacion_nombre: v.organizacion_nombre ?? "",
            organizacion_rif: "",
        });
        setEditingPlaca(v.placa);
        setOpen(true);
    }

    async function save() {
        if (!form.placa) {
            toast.error("La placa es obligatoria");
            return;
        }
        setSaving(true);
        try {
            if (editingPlaca) {
                await api.updateVehicle({
                    placa: form.placa,
                    marca: form.marca.trim(),
                    modelo: form.modelo.trim(),
                    cedula_propietario: form.cedula_propietario.trim(),
                    propietario: form.propietario.trim(),
                    tipo: form.tipo,
                    cantidad_puestos: form.cantidad_puestos,
                    id_organizacion: form.id_organizacion,
                    organizacion_nombre: form.organizacion_nombre.trim() || null,
                    organizacion_rif: form.organizacion_rif.trim() || null,
                });
            } else {
                await api.createVehicle({
                    placa: form.placa,
                    marca: form.marca.trim(),
                    modelo: form.modelo.trim(),
                    cedula_propietario: form.cedula_propietario.trim(),
                    propietario: form.propietario.trim(),
                    tipo: form.tipo,
                    cantidad_puestos: form.cantidad_puestos,
                    organizacion_nombre: form.organizacion_nombre.trim() || undefined,
                    organizacion_rif: form.organizacion_rif.trim() || undefined,
                    id_organizacion: form.id_organizacion,
                });
            }
            setSaving(false);
            setOpen(false);
            toast.success(editingPlaca ? "Vehículo actualizado" : "Vehículo creado");
            load();
        } catch (err: any) {
            setSaving(false);
            toast.error(err.message);
        }
    }

    async function remove(placa: string) {
        if (!confirm("¿Deshabilitar este vehículo?")) return;
        try {
            await api.deleteVehicle(placa);
            toast.success("Vehículo deshabilitado");
            load();
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold">Gestión de Vehículos</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra los vehiculos que prestan servicio en el terminal.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setOrgSearch(""); }}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo vehículo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{form.placa ? "Editar vehículo" : "Nuevo vehículo"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Placa">
                                <Input
                                    value={form.placa}
                                    onChange={(e) => setForm({ ...form, placa: e.target.value })}
                                    placeholder="Ej: ABC-123"
                                />
                            </Field>
                            <Field label="Marca">
                                <Input
                                    value={form.marca}
                                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                                />
                            </Field>
                            <Field label="Modelo">
                                <Input
                                    value={form.modelo}
                                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                                />
                            </Field>
                            <Field label="Cédula del Propietario">
                                <Input
                                    value={form.cedula_propietario}
                                    onChange={(e) => setForm({ ...form, cedula_propietario: e.target.value })}
                                    placeholder="V-12345678"
                                />
                            </Field>
                            <Field label="Propietario">
                                <Input
                                    value={form.propietario}
                                    onChange={(e) => setForm({ ...form, propietario: e.target.value })}
                                />
                            </Field>
                            <Field label="Tipo">
                                <Select
                                    value={form.tipo}
                                    onValueChange={(v) => setForm({ ...form, tipo: v as "encava" | "por puesto" | "colectivo", cantidad_puestos: PUESTOS_POR_TIPO[v as "encava" | "por puesto" | "colectivo"] })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="encava">Encava</SelectItem>
                                        <SelectItem value="por puesto">Por Puesto</SelectItem>
                                        <SelectItem value="colectivo">Colectivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Cant. Puestos">
                                <Input value={String(form.cantidad_puestos)} disabled />
                            </Field>
                            <Field label="Organización">
                                <Popover open={orgOpen} onOpenChange={(v) => {
                                    if (v && form.organizacion_nombre) {
                                        setOrgSearch(form.organizacion_nombre);
                                    }
                                    if (!v && orgSearch && !organizaciones.some((o) => o.nombre === orgSearch)) {
                                        setForm({ ...form, organizacion_nombre: orgSearch });
                                    }
                                    setOrgOpen(v);
                                }}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={orgOpen}
                                            className="w-full justify-between font-normal"
                                        >
                                            {form.organizacion_nombre || "Buscar o escribir nombre..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder="Buscar por nombre..."
                                                value={orgSearch}
                                                onValueChange={setOrgSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty>
                                                    <div className="p-2 text-sm text-muted-foreground">
                                                        {orgSearch ? `Crear "${orgSearch}"` : "Escribe para crear una nueva"}
                                                    </div>
                                                </CommandEmpty>
                                                <CommandGroup heading="Organizaciones existentes">
                                                    {organizaciones
                                                        .filter((o) => {
                                                            const q = orgSearch.toLowerCase();
                                                            return !q || o.nombre.toLowerCase().includes(q);
                                                        })
                                                        .slice(0, 10)
                                                        .map((o) => (
                                                            <CommandItem
                                                                key={o.id_rif}
                                                                value={o.nombre}
                                                                onSelect={() => {
                                                                    setForm({ ...form, organizacion_nombre: o.nombre, organizacion_rif: o.id_rif, id_organizacion: o.id_rif });
                                                                    setOrgSearch("");
                                                                    setOrgOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        form.organizacion_nombre === o.nombre ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <span className="font-medium">{o.nombre}</span>
                                                                <span className="ml-2 text-xs text-muted-foreground">{o.id_rif}</span>
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </Field>
                            <Field label="RIF">
                                <Input
                                    value={form.organizacion_rif}
                                    onChange={(e) => setForm({ ...form, organizacion_rif: e.target.value })}
                                    placeholder="RIF de la organización"
                                />
                            </Field>
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
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Vehículos registrados</CardTitle>
                    <Input
                        placeholder="Filtrar por placa o cédula..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-64 h-8 text-sm"
                    />
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
                                    <TableHead>Placa</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Modelo</TableHead>
                                    <TableHead>Cédula del propietario</TableHead>
                                    <TableHead>Propietario</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Cant. Puestos</TableHead>
                                    <TableHead>Organización</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pagedVehicles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                                            {search ? "Sin resultados para este filtro" : "Aún no hay vehículos. Agrega el primero."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pagedVehicles.map((v) => (
                                        <TableRow key={v.placa}>
                                            <TableCell className="font-medium">{v.placa}</TableCell>
                                            <TableCell>{v.marca}</TableCell>
                                            <TableCell>{v.modelo}</TableCell>
                                            <TableCell>{v.cedula_propietario}</TableCell>
                                            <TableCell>{v.propietario}</TableCell>
                                            <TableCell className="capitalize">{v.tipo}</TableCell>
                                            <TableCell>{v.cantidad_puestos ?? "—"}</TableCell>
                                            <TableCell>{v.organizacion_nombre ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {user?.role === "admin" && (
                                                        <>
                                                            <Button
                                                                title="Editar un registro"
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-amber-400 text-amber-600 hover:bg-amber-50 hover:text-amber-400"
                                                                onClick={() => openEdit(v)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                title="Elimina un registro"
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-400"
                                                                onClick={() => remove(v.placa)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                    {!loading && filteredVehicles.length > pageSize && (
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-xs text-muted-foreground">
                                Página {currentPage} de {totalPages} ({filteredVehicles.length} registros)
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Vehículos por organización</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organización</TableHead>
                                <TableHead className="text-right">Cantidad de Vehículos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orgCount.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
                                        No hay datos.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orgCount.map((o) => (
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
            <FlowBar next={{ label: "Choferes", to: "/admin/chofer" }} />
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}
