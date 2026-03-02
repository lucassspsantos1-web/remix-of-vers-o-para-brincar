import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueueDrivers } from "@/hooks/useQueueDrivers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, QrCode, Clock, AlertTriangle, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NavBar from "@/components/NavBar";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function CheckIn() {
  const [fullName, setFullName] = useState("");
  const [routeLetter, setRouteLetter] = useState("");
  const [routeNumber, setRouteNumber] = useState("");
  const [scannerInput, setScannerInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [driverNotFound, setDriverNotFound] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { drivers, removeDriverLocally, refetch } = useQueueDrivers();

  const autoSave = async (name: string, letter: string, number: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || !letter || !number) return;
    if (trimmedName.length > 200 || !/^[A-Z]+$/.test(letter)) return;
    const routeNum = parseInt(number);
    if (isNaN(routeNum) || routeNum < 1 || routeNum > 24) return;

    setSaving(true);
    const { error } = await supabase.from("queue_drivers").insert({
      full_name: trimmedName,
      route_letter: letter,
      route_number: routeNum,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar motorista");
    } else {
      refetch();
      toast.success(`${trimmedName} adicionado à fila`);
      setFullName("");
      setRouteLetter("");
      setRouteNumber("");
      setScannerInput("");
      setDriverNotFound(false);
      const scannerEl = document.querySelector<HTMLInputElement>('[data-scanner-input]');
      scannerEl?.focus();
    }
  };

  const processScanner = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setDriverNotFound(false);

    // QR format "NOME;LETRA;NÚMERO"
    const parts = trimmed.split(";");
    if (parts.length >= 3) {
      const name = parts[0].trim();
      const letter = parts[1].trim().toUpperCase();
      const number = parts[2].trim();
      setFullName(name);
      setRouteLetter(letter);
      setRouteNumber(number);
      await autoSave(name, letter, number);
      return;
    }

    // id_motorista lookup
    const { data } = await supabase
      .from("motoristas_base_dia")
      .select("nome, rota")
      .eq("id_motorista", trimmed)
      .limit(1)
      .maybeSingle();

    if (data) {
      const rotaMatch = data.rota.match(/([A-Za-z]+)\s*[-\s]?\s*(\d+)/);
      const letter = rotaMatch ? rotaMatch[1].toUpperCase() : "";
      const number = rotaMatch ? rotaMatch[2] : "";
      setFullName(data.nome);
      setRouteLetter(letter);
      setRouteNumber(number);
      setDriverNotFound(false);
      await autoSave(data.nome, letter, number);
    } else {
      setDriverNotFound(true);
      setFullName("");
      setRouteLetter("");
      setRouteNumber("");
    }
  };

  const handleScannerInput = (value: string) => {
    setScannerInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      processScanner(value);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleRemove = async (driverId: string, driverName: string) => {
    if (removingId) return;
    setRemovingId(driverId);

    const { error } = await supabase
      .from("queue_drivers")
      .delete()
      .eq("id", driverId);

    if (error) {
      toast.error("Erro ao remover motorista da fila");
    } else {
      removeDriverLocally(driverId);
      toast.success(`${driverName} removido da fila`);
    }
    setRemovingId(null);
  };

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName || !routeLetter || !routeNumber) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (trimmedName.length > 200) {
      toast.error("Nome muito longo (máximo 200 caracteres)");
      return;
    }
    if (!/^[A-Z]+$/.test(routeLetter)) {
      toast.error("Letra de rota inválida");
      return;
    }
    const routeNum = parseInt(routeNumber);
    if (isNaN(routeNum) || routeNum < 1 || routeNum > 24) {
      toast.error("Número de rota inválido (1-24)");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("queue_drivers").insert({
      full_name: trimmedName,
      route_letter: routeLetter,
      route_number: routeNum,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar motorista");
    } else {
      refetch();
      toast.success(`${fullName} adicionado à fila`);
      setFullName("");
      setRouteLetter("");
      setRouteNumber("");
      setScannerInput("");
      setDriverNotFound(false);
      // Focus back on scanner input after saving
      const scannerEl = document.querySelector<HTMLInputElement>('[data-scanner-input]');
      scannerEl?.focus();
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <QrCode className="h-6 w-6" />
              Check-in de Motorista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Scanner QR Code (formato: NOME;LETRA;NÚMERO)
              </label>
              <Input
                placeholder="Escaneie o QR Code aqui..."
                value={scannerInput}
                onChange={(e) => handleScannerInput(e.target.value)}
                data-scanner-input
                autoFocus
              />
            </div>

            {driverNotFound && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Motorista não consta na base de hoje.</strong> Verifique o ID ou preencha manualmente.
                </AlertDescription>
              </Alert>
            )}

            <div className="border-t border-border pt-4">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Nome Completo
              </label>
              <Input
                ref={nameInputRef}
                placeholder="Nome completo do motorista"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Rota (Letra)
                </label>
                <Select value={routeLetter} onValueChange={setRouteLetter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Letra" />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTERS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Rota (Número)
                </label>
                <Select value={routeNumber} onValueChange={setRouteNumber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Número" />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMBERS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full text-lg h-12"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar na Fila"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Motoristas na Fila
              </span>
              <span className="text-primary text-2xl font-bold">{drivers.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum motorista na fila</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {drivers.map((d, i) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
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
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(d.checked_in_at), "HH:mm", { locale: ptBR })}
                      </div>
                      {d.status === "waiting" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={removingId === d.id}
                          onClick={() => handleRemove(d.id, d.full_name)}
                          title="Remover da fila"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
