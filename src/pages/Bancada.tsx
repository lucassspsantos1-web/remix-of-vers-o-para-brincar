import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueueDrivers, QueueDriver } from "@/hooks/useQueueDrivers";
import { useActiveBenches } from "@/hooks/useActiveBenches";
import { useRouteVolumosos } from "@/hooks/useVolumosos";
import { announceDriver } from "@/lib/speech";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Volume2, UserCheck, Clock, Users, LogOut, CheckCircle, Package, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NavBar from "@/components/NavBar";

const BENCHES = Array.from({ length: 24 }, (_, i) => i + 1);

interface ServingDriver {
  id: string;
  full_name: string;
  route_letter: string;
  route_number: number;
  checked_in_at: string;
  called_at: string;
}

export default function Bancada() {
  const [benchNumber, setBenchNumber] = useState<string>("");
  const { drivers, refetch: refetchQueue } = useQueueDrivers();
  const { activeBenches, myBench, claimBench, releaseBench } = useActiveBenches();
  const [calling, setCalling] = useState(false);

  // Auto-reconnect: if this session already owns a bench, restore it
  useEffect(() => {
    if (myBench !== null && !benchNumber) {
      setBenchNumber(String(myBench));
    }
  }, [myBench, benchNumber]);
  const [currentDriver, setCurrentDriver] = useState<ServingDriver | null>(null);

  // Volumosos for current driver's route
  const { volumosos: routeVolumosos } = useRouteVolumosos(
    currentDriver?.route_letter || "",
    currentDriver?.route_number || 0
  );

  // Fetch current serving driver for this bench from queue_drivers
  const fetchCurrentDriver = useCallback(async () => {
    if (!benchNumber) return;
    const { data } = await supabase
      .from("queue_drivers")
      .select("*")
      .eq("status", "em_atendimento")
      .eq("bench_number", parseInt(benchNumber))
      .maybeSingle();

    if (data) {
      setCurrentDriver({
        id: data.id,
        full_name: data.full_name,
        route_letter: data.route_letter,
        route_number: data.route_number,
        checked_in_at: data.checked_in_at,
        called_at: data.called_at || data.checked_in_at,
      });
    } else {
      setCurrentDriver(null);
    }
  }, [benchNumber]);

  // Poll for current driver state (recover from refresh, realtime backup)
  useEffect(() => {
    if (!benchNumber) return;
    fetchCurrentDriver();

    const channel = supabase
      .channel(`serving-bench-${benchNumber}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_drivers" },
        () => fetchCurrentDriver()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [benchNumber, fetchCurrentDriver]);

  const handleSelectBench = async (value: string) => {
    const success = await claimBench(parseInt(value));
    if (success) {
      setBenchNumber(value);
    } else {
      toast.error("Bancada já está em uso", {
        description: "Outro operador está utilizando esta bancada. Escolha uma bancada disponível.",
        duration: 6000,
      });
    }
  };

  const handleReleaseBench = async () => {
    if (benchNumber) {
      await releaseBench(parseInt(benchNumber));
      setBenchNumber("");
      setCurrentDriver(null);
      toast.success("Bancada liberada");
    }
  };

  // Atomic claim: uses DB function with FOR UPDATE SKIP LOCKED
  const claimDriver = async (driverId?: string) => {
    if (!benchNumber) {
      toast.error("Selecione o número da bancada primeiro");
      return;
    }

    setCalling(true);

    const params: { p_bench_number: number; p_driver_id?: string } = {
      p_bench_number: parseInt(benchNumber),
    };
    if (driverId) {
      params.p_driver_id = driverId;
    }

    const { data, error } = await supabase.rpc("claim_driver", params);

    setCalling(false);

    if (error) {
      console.error("claim_driver RPC error:", error);
    }

    const claimed = Array.isArray(data) ? data[0] : data;

    if (error || !claimed) {
      toast.error("Motorista já foi chamado por outra bancada ou fila vazia.");
      refetchQueue();
      return;
    }

    // service_history is now inserted atomically inside claim_driver DB function

    setCurrentDriver({
      id: claimed.id,
      full_name: claimed.full_name,
      route_letter: claimed.route_letter,
      route_number: claimed.route_number,
      checked_in_at: claimed.checked_in_at,
      called_at: claimed.called_at || new Date().toISOString(),
    });

    refetchQueue();
    toast.success(`${claimed.full_name} chamado para bancada ${benchNumber}`);
    announceDriver(claimed.full_name, parseInt(benchNumber));

    // Check volumosos for this route
    const { data: volData } = await supabase
      .from("volumosos")
      .select("*")
      .eq("route_letter", claimed.route_letter)
      .eq("route_number", claimed.route_number)
      .in("status", ["disponivel", "em_separacao"]);

    if (volData && volData.length > 0) {
      const totalQty = volData.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
      const volMsg = totalQty > 1
        ? `⚠️ Esta rota possui ${totalQty} volumosos no buffer!`
        : "⚠️ Esta rota possui volumoso no buffer!";
      toast.warning(volMsg, { duration: 8000 });
      // Update volumosos to em_separacao
      await supabase
        .from("volumosos")
        .update({ status: "em_separacao", bench_number: parseInt(benchNumber) } as any)
        .eq("route_letter", claimed.route_letter)
        .eq("route_number", claimed.route_number)
        .eq("status", "disponivel");
    }
  };

  const releaseDriver = async () => {
    if (!currentDriver) return;

    // Update queue_drivers to finalizado
    await supabase
      .from("queue_drivers")
      .update({ status: "finalizado", bench_number: null })
      .eq("id", currentDriver.id);

    // Mark service_history as released with timestamp
    await supabase
      .from("service_history")
      .update({ released: true, released_at: new Date().toISOString() } as any)
      .eq("bench_number", parseInt(benchNumber))
      .eq("driver_name", currentDriver.full_name)
      .eq("released", false);

    // Mark volumosos for this route as retirado
    const { error: volError, data: volData } = await supabase
      .from("volumosos")
      .update({ status: "retirado", retired_at: new Date().toISOString() } as any)
      .eq("route_letter", currentDriver.route_letter)
      .eq("route_number", currentDriver.route_number)
      .in("status", ["disponivel", "em_separacao"])
      .select();
    
    if (volError) {
      console.error("Erro ao atualizar volumosos:", volError);
      toast.error("Erro ao atualizar volumosos");
    } else {
      console.log("Volumosos atualizados:", volData);
    }

    setCurrentDriver(null);
    toast.success(`${currentDriver.full_name} liberado da bancada ${benchNumber}`);
  };

  if (!benchNumber) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="container mx-auto p-4 max-w-md flex flex-col items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center text-primary">Selecione sua Bancada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={handleSelectBench}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="Número da Bancada" />
                </SelectTrigger>
                <SelectContent>
                  {BENCHES.map((n) => {
                    const isOccupied = activeBenches.includes(n);
                    return (
                      <SelectItem key={n} value={String(n)} disabled={isOccupied}>
                        Bancada {n} {isOccupied ? "(Em uso)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Bancada <span className="text-primary">{benchNumber}</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              {drivers.length} motorista{drivers.length !== 1 ? "s" : ""} na fila
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleReleaseBench}
            className="h-14 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sair da Bancada
          </Button>
        </div>

        {/* Current driver being served */}
        {currentDriver ? (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Motorista em Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
                <div>
                  <p className="font-bold text-lg">{currentDriver.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Rota {currentDriver.route_letter}-{currentDriver.route_number}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chamado às {format(new Date(currentDriver.called_at), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={releaseDriver}
                  className="h-12 px-6 gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Liberar Motorista
                </Button>
              </div>
              {routeVolumosos.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center gap-3">
                  <Package className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-bold text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {(() => {
                        const total = routeVolumosos.reduce((s, v) => s + v.quantity, 0);
                        return total > 1
                          ? `Esta rota possui ${total} volumosos no buffer`
                          : "Esta rota possui volumoso no buffer";
                      })()}
                    </p>
                    {routeVolumosos.map((v) => (
                      <p key={v.id} className="text-sm text-muted-foreground">
                        {v.quantity}x {v.observation || "Sem observação"} — {v.status === "em_separacao" ? "Em separação" : "Disponível"}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="mb-6">
            <Button
              size="lg"
              onClick={() => claimDriver()}
              disabled={calling || drivers.length === 0}
              className="w-full h-14 text-lg gap-2"
            >
              <Volume2 className="h-5 w-5" />
              Chamar Próximo
            </Button>
          </div>
        )}

        {/* Queue - only show when no driver is being served */}
        {!currentDriver && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Fila de Motoristas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {drivers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum motorista na fila</p>
              ) : (
                <div className="space-y-2">
                  {drivers.map((d, i) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-bold text-lg w-8">{i + 1}º</span>
                        <div>
                          <p className="font-medium">{d.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Rota {d.route_letter}-{d.route_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(d.checked_in_at), "HH:mm", { locale: ptBR })}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => claimDriver(d.id)}
                          disabled={calling}
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          Chamar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
