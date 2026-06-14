import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FlowBar } from "@/components/flow-nav";
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
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface Ruta {
    id: number;
    origen: string | null;
    destino: string | null;
    id_organizacion: string;
    organizacion_nombre?: string | null;
    created_at?: string;
}

export const Route = createFileRoute("/admin/rutas")({
    head: () => ({
        meta: [
            { title: "Gestión de Rutas — Terminal Alí Primera" },
        ],
    }),
    component: RutasPage,
});

type FormState = {
    id?: number;
    origen: string;
    destino: string;
    id_organizacion: string;
    organizacion_nombre: string;
};

const emptyForm: FormState = {
    origen: "",
    destino: "",
    id_organizacion: "",
    organizacion_nombre: "",
};

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function RutasPage() {
    const [rows, setRows] = useState<Ruta[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [filterOrg, setFilterOrg] = useState("all");
    const [organizaciones, setOrganizaciones] = useState<{ id_rif: string; nombre: string }[]>([]);
    const [rifOpen, setRifOpen] = useState(false);
    const [rifSearch, setRifSearch] = useState("");

    const filteredRows = rows.filter((r) => filterOrg === "all" || r.id_organizacion === filterOrg);

    const destCounts = filteredRows.reduce((acc, r) => {
        const raw = r.destino || "Desconocido";
        const key = raw.toLowerCase();
        if (!acc[key]) acc[key] = { destino: capitalize(raw), cantidad: 0 };
        acc[key].cantidad++;
        return acc;
    }, {} as Record<string, { destino: string; cantidad: number }>);

    const destTable = Object.values(destCounts)
        .sort((a, b) => b.cantidad - a.cantidad);

    async function load() {
        setLoading(true);
        try {
            const [data, orgs] = await Promise.all([
                api.selectRutas(),
                api.selectOrganizaciones(),
            ]);
            setRows(data ?? []);
            setOrganizaciones(orgs ?? []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    function openNew() {
        setForm(emptyForm);
        setOpen(true);
    }

    function onRifChange(rif: string) {
        const org = organizaciones.find((o) => o.id_rif === rif);
        setForm({
            ...form,
            id_organizacion: rif,
            organizacion_nombre: org ? org.nombre : "",
        });
    }

    function openEdit(r: Ruta) {
        setForm({
            id: r.id,
            origen: r.origen ?? "",
            destino: r.destino ?? "",
            id_organizacion: r.id_organizacion ?? "",
            organizacion_nombre: r.organizacion_nombre ?? "",
        });
        setOpen(true);
    }

    async function save() {
        setSaving(true);

        try {
            const origen = capitalize(form.origen.trim());
            const destino = capitalize(form.destino.trim());

            if (!origen || !destino) {
                toast.error("El origen y destino son obligatorios");
                setSaving(false);
                return;
            }

            if (!form.id && rows.some((r) => r.destino && capitalize(r.destino) === destino)) {
                toast.error(`El destino "${destino}" ya está registrado.`);
                setSaving(false);
                return;
            }

            const payload = {
                origen: origen || null,
                destino: destino || null,
                id_organizacion: form.id_organizacion.trim() || undefined,
            };

            if (form.id) {
                await api.updateRutas({ id: form.id, ...payload });
                toast.success("Ruta actualizada");
            } else {
                await api.createRutas(payload);
                toast.success("Ruta agregada");
            }

            setOpen(false);
            load();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function remove(id: number) {
        if (!confirm("¿Eliminar esta ruta?")) return;
        try {
            await api.deleteRutas(id);
            toast.success("Ruta eliminada");
            load();
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold">Gestión de Rutas</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra las rutas del terminal.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select value={filterOrg} onValueChange={setFilterOrg}>
                            <SelectTrigger className="w-56 h-8 text-xs">
                                <SelectValue placeholder="Todas las organizaciones" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las organizaciones</SelectItem>
                                {organizaciones.map((o) => (
                                    <SelectItem key={o.id_rif} value={o.id_rif}>
                                        {o.nombre} ({o.id_rif})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openNew}>
                                <Plus className="mr-2 h-4 w-4" /> Nueva ruta
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{form.id ? "Editar ruta" : "Nueva ruta"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="RIF de la Organización">
                                    <Popover open={rifOpen} onOpenChange={setRifOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" aria-expanded={rifOpen}
                                                className="w-full justify-between font-normal overflow-hidden truncate">
                                                {form.id_organizacion
                                                    ? (() => { const o = organizaciones.find((x) => x.id_rif === form.id_organizacion); return o ? `${o.id_rif} — ${o.nombre}` : form.id_organizacion; })()
                                                    : "Buscar RIF..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar por RIF o nombre..." className="overflow-hidden"
                                                    value={rifSearch} onValueChange={setRifSearch} />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        <div className="p-2 text-sm text-muted-foreground">Sin resultados</div>
                                                    </CommandEmpty>
                                                    <CommandGroup heading="Organizaciones">
                                                        {organizaciones
                                                            .filter((o) =>
                                                                !rifSearch ||
                                                                o.id_rif.toLowerCase().includes(rifSearch.toLowerCase()) ||
                                                                o.nombre.toLowerCase().includes(rifSearch.toLowerCase())
                                                            )
                                                            .map((o) => (
                                                                <CommandItem key={o.id_rif} value={o.id_rif}
                                                                    onSelect={(val) => {
                                                                        onRifChange(val);
                                                                        setRifOpen(false);
                                                                        setRifSearch("");
                                                                    }}>
                                                                    <Check className={cn("mr-2 h-4 w-4",
                                                                        form.id_organizacion === o.id_rif ? "opacity-100" : "opacity-0")} />
                                                                    <span className="font-medium">{o.id_rif}</span>
                                                                    <span className="ml-2 text-xs text-muted-foreground">— {o.nombre}</span>
                                                                </CommandItem>
                                                            ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </Field>
                                <Field label="Nombre de la Organización">
                                    <Input
                                        value={form.organizacion_nombre}
                                        readOnly
                                        placeholder="Se autocompleta al seleccionar el RIF"
                                    />
                                </Field>
                                <Field label="Origen">
                                    <Input
                                        value={form.origen}
                                        onChange={(e) => setForm({ ...form, origen: e.target.value })}
                                    />
                                </Field>
                                <Field label="Destino">
                                    <Input
                                        value={form.destino}
                                        onChange={(e) => setForm({ ...form, destino: e.target.value })}
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
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Loader2 className="h-4 w-4" /> Rutas registradas
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
                                    <TableHead>RIF</TableHead>
                                    <TableHead>Organización</TableHead>
                                    <TableHead>Origen</TableHead>
                                    <TableHead>Destino</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                            No hay rutas para este filtro.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRows.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">{r.id_organizacion}</TableCell>
                                            <TableCell>{r.organizacion_nombre ?? "—"}</TableCell>
                                            <TableCell>{r.origen ?? "—"}</TableCell>
                                            <TableCell>{r.destino ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        title="Editar un registro"
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-amber-400 text-amber-600 hover:bg-amber-50 hover:text-amber-400"
                                                        onClick={() => openEdit(r)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        title="Elimina un registro"
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-400"
                                                        onClick={() => remove(r.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {destTable.length > 0 && (
                <Card className="max-w-[400px]">
                    <CardHeader>
                        <CardTitle className="text-base">Rutas por destino</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 py-3">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Destino</TableHead>
                                    <TableHead className="text-right">Cantidad de viajes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {destTable.map(({ destino, cantidad }) => (
                                    <TableRow key={destino.toUpperCase()}>
                                        <TableCell className="font-medium">{destino}</TableCell>
                                        <TableCell className="text-right">{cantidad}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
            <FlowBar next={{ label: "Garita", to: "/admin/entradas-salidas" }} />
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
