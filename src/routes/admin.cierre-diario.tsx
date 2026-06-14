import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { api, type CierreDiarioResponse } from "@/lib/api";
import { FlowBar } from "@/components/flow-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/admin/cierre-diario")({ component: CierreDiarioPage });

interface GrupoDestino {
  destino: string;
  filas: GrupoTipologia[];
  subtotal: { unidades: number; pasajeros: number; total_tasas: number };
}

interface GrupoTipologia {
  puestos: number;
  filas: GrupoOrg[];
  subtotal: { unidades: number; pasajeros: number; total_tasas: number };
}

interface GrupoOrg {
  organizacion: string;
  unidades: number;
  pasajeros: number;
  total_tasas: number;
}

function agrupar(filas: CierreDiarioResponse["filas"]): GrupoDestino[] {
  const map = new Map<string, Map<number, GrupoOrg[]>>();
  for (const f of filas) {
    if (!map.has(f.destino)) map.set(f.destino, new Map());
    const tipoMap = map.get(f.destino)!;
    if (!tipoMap.has(f.cantidad_puestos)) tipoMap.set(f.cantidad_puestos, []);
    tipoMap.get(f.cantidad_puestos)!.push({
      organizacion: f.organizacion, unidades: f.unidades, pasajeros: f.pasajeros, total_tasas: f.total_tasas,
    });
  }
  const result: GrupoDestino[] = [];
  for (const [destino, tipoMap] of map) {
    const tipologias: GrupoTipologia[] = [];
    for (const [puestos, orgs] of tipoMap) {
      const subtotal = orgs.reduce((a, o) => ({ unidades: a.unidades + o.unidades, pasajeros: a.pasajeros + o.pasajeros, total_tasas: a.total_tasas + o.total_tasas }), { unidades: 0, pasajeros: 0, total_tasas: 0 });
      tipologias.push({ puestos, filas: orgs, subtotal });
    }
    tipologias.sort((a, b) => a.puestos - b.puestos);
    const subtotal = tipologias.reduce((a, t) => ({ unidades: a.unidades + t.subtotal.unidades, pasajeros: a.pasajeros + t.subtotal.pasajeros, total_tasas: a.total_tasas + t.subtotal.total_tasas }), { unidades: 0, pasajeros: 0, total_tasas: 0 });
    result.push({ destino, filas: tipologias, subtotal });
  }
  result.sort((a, b) => a.destino.localeCompare(b.destino));
  return result;
}

function fmt(n: number): string {
  return n.toLocaleString("es-VE");
}

function CierreDiarioPage() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [data, setData] = useState<CierreDiarioResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(f: string) {
    setLoading(true);
    try {
      const res = await api.getCierreDiario(f);
      setData(res);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  useEffect(() => { load(fecha); }, [fecha]);

  const grupos = data ? agrupar(data.filas) : [];

  return (
    <div className="space-y-4">
      <FlowBar next={{ label: "Cierre Diario", to: "/admin/cierre-diario" }} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Cierre de Operaciones Diario</h1>
          <p className="text-sm text-muted-foreground">Resumen agrupado por destino, tipología y línea</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" className="w-44 h-9 text-sm" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Button variant="outline" size="sm" disabled={!data?.filas.length} onClick={() => {
            const doc = new jsPDF();
            const title = `Cierre de Operaciones - ${fecha}`;
            doc.setFontSize(14);
            doc.text(title, 14, 20);
            const body = (data?.filas ?? []).map((f) => [f.destino, String(f.cantidad_puestos), f.organizacion, String(f.unidades), String(f.pasajeros), fmt(f.total_tasas)]);
            body.push(["", "", "", "", "", ""]);
            body.push(["GRAN TOTAL", "", "", String(data?.granTotal.unidades ?? 0), String(data?.granTotal.pasajeros ?? 0), fmt(data?.granTotal.total_tasas ?? 0)]);
            autoTable(doc, {
              head: [["Destino", "Puestos", "Línea", "Unidades", "Pasajeros", "Tasas"]],
              body,
              startY: 28,
              styles: { fontSize: 8 },
              headStyles: { fillColor: [59, 130, 246] },
              footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
            });
            doc.save(`cierre-${fecha}.pdf`);
          }}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !data?.filas.length ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No hay operaciones registradas para esta fecha.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => (
            <Collapsible key={g.destino} defaultOpen>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform ui-open:rotate-180" />
                        {g.destino}
                      </CardTitle>
                      <div className="flex items-center gap-6 text-sm font-medium tabular-nums">
                        <span><span className="text-muted-foreground font-normal">Unid.</span> {fmt(g.subtotal.unidades)}</span>
                        <span><span className="text-muted-foreground font-normal">Pas.</span> {fmt(g.subtotal.pasajeros)}</span>
                        <span><span className="text-muted-foreground font-normal">Tasas.</span> {fmt(g.subtotal.total_tasas)}</span>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {g.filas.map((t) => (
                      <Collapsible key={t.puestos} defaultOpen={false}>
                        <div className="rounded-lg border bg-muted/30">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg text-sm">
                              <div className="flex items-center gap-2 font-medium">
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform ui-open:rotate-180" />
                                {t.puestos} Puestos
                              </div>
                              <div className="flex items-center gap-6 tabular-nums">
                                <span><span className="text-muted-foreground">Unid.</span> {fmt(t.subtotal.unidades)}</span>
                                <span><span className="text-muted-foreground">Pas.</span> {fmt(t.subtotal.pasajeros)}</span>
                                <span><span className="text-muted-foreground">Tasas. </span> {fmt(t.subtotal.total_tasas)}</span>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="divide-y border-t">
                              {t.filas.map((o) => (
                                <div key={o.organizacion} className="flex items-center justify-between px-6 py-2 text-sm">
                                  <span>{o.organizacion}</span>
                                  <div className="flex items-center gap-6 tabular-nums text-muted-foreground">
                                    <span>{fmt(o.unidades)}</span>
                                    <span>{fmt(o.pasajeros)}</span>
                                    <span>{fmt(o.total_tasas)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}

          {/* Gran total */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between py-4">
              <span className="font-display text-lg font-bold">Gran Total</span>
              <div className="flex items-center gap-8 text-base font-semibold tabular-nums">
                <span><span className="text-muted-foreground font-normal">Unidades:</span> {fmt(data?.granTotal.unidades ?? 0)}</span>
                <span><span className="text-muted-foreground font-normal">Pasajeros:</span> {fmt(data?.granTotal.pasajeros ?? 0)}</span>
                <span><span className="text-muted-foreground font-normal">Tasas:</span> {fmt(data?.granTotal.total_tasas ?? 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
