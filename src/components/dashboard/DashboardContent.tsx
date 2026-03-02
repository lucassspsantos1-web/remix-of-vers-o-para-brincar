import { useState, useEffect } from "react";
import { useQueueDrivers } from "@/hooks/useQueueDrivers";
import { useServiceHistory, fetchAllForExport } from "@/hooks/useServiceHistory";
import { useActiveBenches } from "@/hooks/useActiveBenches";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Monitor, Clock, History, Timer, TrendingUp, LogOut, Package, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
// differenceInSeconds used for time metrics
import { ptBR } from "date-fns/locale";
import NavBar from "@/components/NavBar";
import { useVolumosos } from "@/hooks/useVolumosos";
import { toast } from "sonner";

interface ServingInfo {
  bench_number: number;
  full_name: string;
  called_at: string;
}


function formatMinSec(totalSeconds: number) {
  if (!totalSeconds || totalSeconds < 0) return "—";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

interface DashboardContentProps {
  signOut: () => Promise<void>;
}

export default function DashboardContent({ signOut }: DashboardContentProps) {
  const { drivers } = useQueueDrivers();
  const { volumosos } = useVolumosos();
  const volumososInBuffer = volumosos.filter((v) => v.status === "disponivel" || v.status === "em_separacao");
  const totalVolumososQty = volumososInBuffer.reduce((sum, v) => sum + (v.quantity || 1), 0);
  const { activeBenches, forceReleaseBench } = useActiveBenches();
  const today = format(new Date(), "yyyy-MM-dd");
  const [dateFilter, setDateFilter] = useState(today);
  const { records, total, page, totalPages, goToPage } = useServiceHistory(dateFilter);
  const [servingMap, setServingMap] = useState<Map<number, ServingInfo>>(new Map());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchServing = async () => {
      const { data } = await supabase
        .from("queue_drivers")
        .select("bench_number, full_name, called_at")
        .eq("status", "em_atendimento")
        .not("bench_number", "is", null);
      const map = new Map<number, ServingInfo>();
      (data || []).forEach((d) => {
        if (d.bench_number !== null) {
          map.set(d.bench_number, {
            bench_number: d.bench_number,
            full_name: d.full_name,
            called_at: d.called_at || new Date().toISOString(),
          });
        }
      });
      setServingMap(map);
    };
    fetchServing();

    const channel = supabase
      .channel("dashboard-serving")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_drivers" }, () => fetchServing())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);


  const lastCall = records.length > 0 ? records[0] : null;

  const waitTimes = records
    .filter((r) => r.called_at && r.checked_in_at)
    .map((r) => differenceInSeconds(new Date(r.called_at), new Date(r.checked_in_at)));
  const avgWait = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;

  const longestWait = drivers.length > 0
    ? Math.max(...drivers.map((d) => differenceInSeconds(new Date(), new Date(d.checked_in_at))))
    : 0;

  const serviceTimes = records
    .filter((r) => r.released && r.released_at && r.called_at)
    .map((r) => differenceInSeconds(new Date(r.released_at!), new Date(r.called_at)));
  const avgService = serviceTimes.length > 0 ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length : 0;

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const all = await fetchAllForExport(dateFilter);
      if (all.length === 0) {
        toast.warning("Nenhum atendimento finalizado para exportar nesta data.");
        return;
      }

      const header = ["Nome do Motorista", "Rota", "Bancada", "Horário de Início", "Horário de Término", "Tempo Total (min)"];
      const rows = all.map((r) => {
        const inicio = format(new Date(r.called_at), "HH:mm:ss", { locale: ptBR });
        const fim = r.released_at ? format(new Date(r.released_at), "HH:mm:ss", { locale: ptBR }) : "";
        const totalMin = r.released_at
          ? (differenceInSeconds(new Date(r.released_at), new Date(r.called_at)) / 60).toFixed(1)
          : "";
        return [
          r.driver_name,
          `${r.route_letter}-${r.route_number}`,
          r.bench_number,
          inicio,
          fim,
          totalMin,
        ];
      });

      const csvContent = [header, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
        .join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `atendimentos_${dateFilter}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${all.length} registros exportados com sucesso.`);
    } catch {
      toast.error("Erro ao exportar relatório.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar>
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </NavBar>
      <div className="container mx-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Na Fila</p>
                <p className="text-3xl font-bold text-primary">{drivers.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Monitor className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atendidos Hoje</p>
                <p className="text-3xl font-bold text-primary">{total}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/20">
                <Package className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volumosos no Buffer</p>
                <p className="text-3xl font-bold text-destructive">{totalVolumososQty}</p>
              </div>
            </CardContent>
          </Card>

          {lastCall && (
            <Card className="border-primary">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/20">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Chamada</p>
                  <p className="font-bold">{lastCall.driver_name}</p>
                  <p className="text-sm text-primary">Bancada {lastCall.bench_number}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/50">
                <Timer className="h-8 w-8 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio de Espera</p>
                <p className="text-2xl font-bold">{waitTimes.length > 0 ? formatMinSec(avgWait) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/20">
                <TrendingUp className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maior Tempo na Fila</p>
                <p className="text-2xl font-bold">{drivers.length > 0 ? formatMinSec(longestWait) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <Clock className="h-8 w-8 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio Atendimento</p>
                <p className="text-2xl font-bold">{serviceTimes.length > 0 ? formatMinSec(avgService) : "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bench Grid */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Bancadas (1-24)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => {
                const isOccupied = activeBenches.includes(n);
                const serving = servingMap.get(n);
                return (
                  <div
                    key={n}
                    className={`p-3 rounded-lg text-center border ${
                      isOccupied
                        ? "bg-red-500/20 border-red-500"
                        : "bg-green-500/20 border-green-500"
                    }`}
                  >
                    <p className="font-bold text-lg">{n}</p>
                    {isOccupied ? (
                      <>
                        <p className="text-xs text-destructive truncate font-semibold">
                          {serving?.full_name || "Ocupada"}
                        </p>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="mt-1 h-6 text-[10px] px-2"
                          onClick={() => forceReleaseBench(n)}
                        >
                          Liberar
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Livre</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico de Atendimentos
                {total > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({total} registros)
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportCSV}
                  disabled={exporting || total === 0}
                >
                  <Download className="h-4 w-4" />
                  {exporting ? "Exportando..." : "Baixar relatório"}
                </Button>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-44"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum atendimento encontrado</p>
            ) : (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {records.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                      <div>
                        <p className="font-medium">{r.driver_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Rota {r.route_letter}-{r.route_number} • Bancada {r.bench_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Início: {format(new Date(r.called_at), "HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-sm">
                          {r.released && r.released_at ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              Fim: {format(new Date(r.released_at), "HH:mm", { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">Em atendimento</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Página {page + 1} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(page + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
