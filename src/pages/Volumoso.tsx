import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVolumosos } from "@/hooks/useVolumosos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Package, Plus, CheckCircle, Clock, Trash2, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NavBar from "@/components/NavBar";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 24 }, (_, i) => i + 1);

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  disponivel: { label: "Disponível", variant: "default" },
  em_separacao: { label: "Em Separação", variant: "secondary" },
  retirado: { label: "Retirado", variant: "outline" },
};

export default function Volumoso() {
  const { volumosos, loading, refetch } = useVolumosos();

  const [routeLetter, setRouteLetter] = useState("");
  const [routeNumber, setRouteNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [hasQuantity, setHasQuantity] = useState(false);
  const [observation, setObservation] = useState("");
  const [cageNumber, setCageNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("active");
  const [search, setSearch] = useState("");

  const handleSave = async () => {
    if (!routeLetter || !routeNumber) {
      toast.error("Preencha letra e número da rota");
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
    const qty = quantity ? parseInt(quantity) : 1;
    if (isNaN(qty) || qty < 1) {
      toast.error("Quantidade inválida");
      return;
    }
    if (observation && observation.length > 500) {
      toast.error("Observação muito longa (máximo 500 caracteres)");
      return;
    }
    const cage = cageNumber ? parseInt(cageNumber) : null;
    if (cage !== null && (isNaN(cage) || cage < 1 || cage > 24)) {
      toast.error("Gaiola inválida (1-24)");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("volumosos").insert({
      route_letter: routeLetter,
      route_number: routeNum,
      quantity: qty,
      observation: observation || null,
      cage_number: cage,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Erro ao cadastrar volumoso");
      console.error(error);
    } else {
      toast.success("Volumoso cadastrado com sucesso");
      refetch();
      setRouteLetter("");
      setRouteNumber("");
      setQuantity("");
      setHasQuantity(false);
      setCageNumber("");
    }
  };

  const handleMarkRetired = async (id: string) => {
    const { error } = await supabase
      .from("volumosos")
      .update({ status: "retirado", retired_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao marcar como retirado");
    } else {
      toast.success("Volumoso marcado como retirado");
      refetch();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("volumosos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover volumoso");
    } else {
      toast.success("Volumoso removido");
      refetch();
    }
  };

  const handleExportCSV = () => {
    const header = "Rota Letra,Rota Número,Quantidade,Status,Observação,Bancada,Criado em,Retirado em";
    const rows = filtered.map((v) => {
      const createdAt = format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
      const retiredAt = v.retired_at ? format(new Date(v.retired_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "";
      const statusLabel = STATUS_MAP[v.status]?.label || v.status;
      const obs = (v.observation || "").replace(/"/g, '""');
      return `${v.route_letter},${v.route_number},${v.quantity},"${statusLabel}","${obs}",${v.bench_number ?? ""},${createdAt},${retiredAt}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volumosos_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado");
  };

  const filtered = volumosos
    .filter((v) => {
      if (filter === "active") return v.status !== "retirado";
      if (filter === "retirado") return v.status === "retirado";
      return true;
    })
    .filter((v) => {
      if (!search.trim()) return true;
      const q = search.trim().toUpperCase();
      const routeStr = `${v.route_letter}-${v.route_number}`;
      const routeStr2 = `${v.route_letter}${v.route_number}`;
      return routeStr.includes(q) || routeStr2.includes(q) || v.route_letter.includes(q);
    })
    .sort((a, b) => {
      const letterCmp = a.route_letter.localeCompare(b.route_letter);
      if (letterCmp !== 0) return letterCmp;
      return a.route_number - b.route_number;
    });

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto p-4 max-w-2xl">
        {/* Cadastro */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Plus className="h-5 w-5" />
              Cadastrar Volumoso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasQuantity"
                  checked={hasQuantity}
                  onCheckedChange={(checked) => {
                    setHasQuantity(!!checked);
                    if (!checked) setQuantity("");
                  }}
                />
                <label htmlFor="hasQuantity" className="text-sm font-medium text-muted-foreground cursor-pointer">
                  Informar quantidade de volumosos
                </label>
              </div>
              {hasQuantity && (
                <Input
                  type="number"
                  min="1"
                  placeholder="Quantidade"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Gaiola (opcional)
              </label>
              <Input
                type="number"
                min="1"
                max="24"
                placeholder="Ex: 5"
                value={cageNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setCageNumber(val);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Observação (opcional)
              </label>
              <Textarea
                placeholder="Ex: Caixa grande, frágil..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </div>

            <Button
              className="w-full h-12 text-lg gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              <Package className="h-5 w-5" />
              {saving ? "Salvando..." : "Adicionar Volumoso"}
            </Button>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Volumosos
                <span className="text-primary text-xl font-bold">({filtered.reduce((sum, v) => sum + (v.quantity || 1), 0)} vol.)</span>
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="retirado">Retirados</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por rota (ex: A, B-3, C12)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum volumoso encontrado</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((v) => {
                  const statusInfo = STATUS_MAP[v.status] || STATUS_MAP.disponivel;
                  return (
                    <div
                      key={v.id}
                      className="flex flex-col justify-between p-3 rounded-lg bg-secondary border border-border"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-lg">
                            {v.route_letter}-{v.route_number}
                          </span>
                          <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {v.quantity > 1 ? `${v.quantity} vol.` : "1 vol."}
                        </p>
                        {v.observation && (
                          <p className="text-xs text-muted-foreground truncate" title={v.observation}>
                            {v.observation}
                          </p>
                        )}
                        {v.cage_number && (
                          <p className="text-xs font-medium text-primary">
                            Gaiola {v.cage_number}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(v.created_at), "HH:mm", { locale: ptBR })}
                          {v.bench_number && ` • B${v.bench_number}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {v.status !== "retirado" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkRetired(v.id)}
                            className="flex-1 gap-1 h-7 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Retirado
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(v.id)}
                          className="h-7 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
