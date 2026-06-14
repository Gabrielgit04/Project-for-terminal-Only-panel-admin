import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FlowBar } from "@/components/flow-nav";
import { SelectChoferServer } from "@/lib/services/chofer-services/SelectChofer";
import { SearchChoferServer } from "@/lib/services/chofer-services/SearchChofer";
import { CreateChoferServer } from "@/lib/services/chofer-services/CreateChofer";
import { UpdateChoferServer } from "@/lib/services/chofer-services/UpdateChofer";
import { DeleteChoferServer } from "@/lib/services/chofer-services/DeleteChofer";

interface Chofer {
    id: number;
    nombres_apellidos: string;
    cedula: number | null;
    placa_unidad: string | null;
}

export const Route = createFileRoute("/admin/chofer")({
    head: () => ({
        meta: [
            { title: "Gestión de Conductores — Terminal Alí Primera" },
        ],
    }),
    component: ChoferPage,
});

type FormState = {
    id?: number;
    nombres_apellidos: string;
    cedula: string;
    placa_unidad: string;
};

const emptyForm: FormState = {
    nombres_apellidos: "",
    cedula: "",
    placa_unidad: "",
};

function ChoferPage() {
    const [rows, setRows] = useState<Chofer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);

    async function load() {
        setLoading(true);
        try {
            const data = await SelectChoferServer();
            setRows(data ?? []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery.trim()) {
                setRows([]);
                load();
                return;
            }
            setSearching(true);
            try {
                const data = await SearchChoferServer({ data: { query: searchQuery.trim() } });
                setRows(data ?? []);
            } catch (err: any) {
                toast.error(err.message);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    function openNew() {
        setForm(emptyForm);
        setOpen(true);
    }

    function openEdit(c: Chofer) {
        setForm({
            id: c.id,
            nombres_apellidos: c.nombres_apellidos,
            cedula: c.cedula?.toString() ?? "",
            placa_unidad: c.placa_unidad ?? "",
        });
        setOpen(true);
    }

    async function save() {
        if (!form.nombres_apellidos) {
            toast.error("Completa todos los campos obligatorios");
            return;
        }
        setSaving(true);

        const payload = {
            nombres: form.nombres_apellidos.trim(),
            cedula: form.cedula ? Number(form.cedula) : null,
            placa_unidad: form.placa_unidad.trim() || null,
        };

        try {
            if (form.id) {
                await UpdateChoferServer({ data: { id: form.id, ...payload } });
                toast.success("Conductor actualizado");
            } else {
                await CreateChoferServer({ data: payload });
                toast.success("Conductor agregado");
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
        if (!confirm("¿Eliminar este conductor?")) return;
        try {
            await DeleteChoferServer({ data: { id } });
            toast.success("Conductor eliminado");
            load();
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold">Gestión de Conductores</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra los conductores registrados en el terminal.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Buscar por nombre, apellido o cédula..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                    />
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openNew}>
                                <Plus className="mr-2 h-4 w-4" /> Nuevo conductor
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{form.id ? "Editar conductor" : "Nuevo conductor"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Nombre completo">
                                    <Input
                                        value={form.nombres_apellidos}
                                        onChange={(e) => setForm({ ...form, nombres_apellidos: e.target.value })}
                                    />
                                </Field>
                                <Field label="Cédula">
                                    <Input
                                        type="number"
                                        value={form.cedula}
                                        onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                                    />
                                </Field>
                                <Field label="Placa Unidad">
                                <Input
                                    value={form.placa_unidad}
                                    onChange={(e) => setForm({ ...form, placa_unidad: e.target.value.toUpperCase() })}
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
                        <Loader2 className="h-4 w-4" /> Conductores registrados
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading || searching ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cédula</TableHead>
                                    <TableHead>Nombre completo</TableHead>
                                    <TableHead>Placa Unidad</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                            No se encontraron conductores.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.cedula ?? "—"}</TableCell>
                                            <TableCell>{c.nombres_apellidos}</TableCell>
                                            <TableCell>{c.placa_unidad ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        title="Editar un registro"
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-amber-400 text-amber-600 hover:bg-amber-50 hover:text-amber-400"
                                                        onClick={() => openEdit(c)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        title="Elimina un registro"
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-400"
                                                        onClick={() => remove(c.id)}
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
            <FlowBar next={{ label: "Rutas", to: "/admin/rutas" }} />
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
