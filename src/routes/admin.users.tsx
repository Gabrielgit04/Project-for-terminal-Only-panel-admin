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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/use-auth";
import { withAuth } from "@/lib/api";
import { SelectUserServer } from "@/lib/services/users-services/SelectUser";
import { CreateUserServer } from "@/lib/services/users-services/CreateUser";
import { UpdateUserServer } from "@/lib/services/users-services/UpdateUser";
import { DeleteUserServer } from "@/lib/services/users-services/DeleteUser";

interface Users {
    id: string | null;
    nombre: string;
    usuario: string;
    rol: string;
}

export const Route = createFileRoute("/admin/users")({
    head: () => ({
        meta: [
            { title: "Gestión de Usuarios — Terminal Alí Primera" },
        ],
    }),
    component: UsuariosPage,
});

type FormState = {
    id?: string;
    nombre: string;
    usuario: string;
    contrasena: string;
    rol: string;
};

const emptyForm: FormState = {
    nombre: "",
    usuario: "",
    contrasena: "",
    rol: "",
};

function UsuariosPage() {
    const { user: currentUser } = useAuth();
    const [rows, setRows] = useState<Users[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);

    async function load() {
        setLoading(true);
        try {
            const data = await SelectUserServer();
            setRows(data);
        } catch (err: any) {
            toast.error(err.message);
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    function openNew() {
        setForm(emptyForm);
        setOpen(true);
    }

    function openEdit(u: Users) {
        setForm({
            id: u.id ?? undefined,
            nombre: u.nombre,
            usuario: u.usuario,
            contrasena: "",
            rol: u.rol,
        });
        setOpen(true);
    }

    async function save() {
        if (!form.nombre || !form.usuario || !form.rol) {
            toast.error("Completa todos los campos");
            return;
        }
        if (!form.id && !form.contrasena) {
            toast.error("La contraseña es obligatoria para nuevos usuarios");
            return;
        }
        setSaving(true);

        try {
            if (form.id) {
                await UpdateUserServer(withAuth({
                    data: {
                        userId: form.id,
                        nombre: form.nombre.trim(),
                        usuario: form.usuario.trim(),
                        contrasena: form.contrasena,
                        rol: form.rol.trim(),
                    },
                }));
                toast.success("Usuario actualizado");
            } else {
                await CreateUserServer(withAuth({
                    data: {
                        nombre: form.nombre.trim(),
                        usuario: form.usuario.trim(),
                        contrasena: form.contrasena,
                        rol: form.rol.trim(),
                    },
                }));
                toast.success("Usuario agregado");
            }
        } catch (err: any) {
            toast.error(err.message);
            setSaving(false);
            return;
        }

        setSaving(false);
        setOpen(false);
        load();
    }

    async function remove(id: string) {
        if (!confirm("¿Desea eliminar este usuario?")) return;
        try {
            await DeleteUserServer(withAuth({ data: { id } }));
            toast.success("Usuario eliminado");
            load();
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold">Gestión de Usuarios</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra los usuarios del sistema.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo usuario
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{form.id ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Nombre">
                                <Input
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) })}
                                />
                            </Field>
                            <Field label="Usuario">
                                <Input
                                    value={form.usuario}
                                    onChange={(e) => setForm({ ...form, usuario: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1).toLowerCase() })}
                                />
                            </Field>
                            <Field label="Contraseña">
                                <Input
                                    type="password"
                                    value={form.contrasena}
                                    onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                                    placeholder={form.id ? "Dejar vacío para mantener" : ""}
                                />
                            </Field>
                            <Field label="Rol">
                                <Select
                                    value={form.rol}
                                    onValueChange={(v) => setForm({ ...form, rol: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="presidente">Presidente</SelectItem>
                                        <SelectItem value="coordinador">Coordinador</SelectItem>
                                        <SelectItem value="gerente">Gerente de Operaciones</SelectItem>
                                        <SelectItem value="asistente">Asistente de Operaciones</SelectItem>
                                        <SelectItem value="garita">Garita</SelectItem>
                                    </SelectContent>
                                </Select>
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
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Loader2 className="h-4 w-4" /> Usuarios registrados
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
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                            Aún no hay usuarios. Agrega el primero.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.nombre}</TableCell>
                                            <TableCell>{u.usuario}</TableCell>
                                            <TableCell>
                                                <Badge className={`${u.rol === "presidente" || u.rol === "coordinador" || u.rol === "gerente" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"} capitalize`}>
                                                    {u.rol === "presidente" ? "Presidente" : u.rol === "coordinador" ? "Coordinador" : u.rol === "gerente" ? "Gerente de Op." : u.rol === "asistente" ? "Asistente de Op." : u.rol}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {!(u.rol === "presidente" && (currentUser?.role === "coordinador" || currentUser?.role === "gerente")) && (
                                                        <Button
                                                            title="Editar"
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-amber-400 text-amber-600 hover:bg-amber-50 hover:text-amber-400"
                                                            onClick={() => openEdit(u)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {!(u.rol === "presidente" && (currentUser?.role === "coordinador" || currentUser?.role === "gerente")) && (
                                                        <Button
                                                            title="Eliminar"
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-400"
                                                            onClick={() => remove(u.id || "")}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
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
