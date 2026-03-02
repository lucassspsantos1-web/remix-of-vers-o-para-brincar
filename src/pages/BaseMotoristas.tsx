import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, AlertTriangle, CheckCircle, FileSpreadsheet } from "lucide-react";
import NavBar from "@/components/NavBar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedDriver {
  id_motorista: string;
  nome: string;
  rota: string;
  tipo_veiculo: string | null;
}

export default function BaseMotoristas() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedDriver[]>([]);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<{ date: string; count: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate("/login");
    }
  }, [authLoading, session, navigate]);

  // Load last import info from database on mount

  // Load last import info from database on mount
  useEffect(() => {
    const loadLastImport = async () => {
      const { data } = await supabase
        .from("motoristas_base_dia")
        .select("data_importacao")
        .order("data_importacao", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const { count } = await supabase
          .from("motoristas_base_dia")
          .select("*", { count: "exact", head: true });

        setLastImport({
          date: data.data_importacao,
          count: count || 0,
        });
      }
    };
    loadLastImport();
  }, []);

  const parseCSV = (text: string): ParsedDriver[] => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Auto-detect delimiter: comma or semicolon
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";

    const header = firstLine.split(delimiter).map((h) => h.trim().toLowerCase());
    const idIdx = header.findIndex((h) => h === "driver id" || h === "id_motorista");
    const nameIdx = header.findIndex((h) => h === "driver name" || h === "nome");
    const routeIdx = header.findIndex((h) => h === "corridor/cage" || h === "corridor" || h === "cage" || h === "rota");
    const vehicleIdx = header.findIndex((h) => h === "vehicle type" || h === "vehicle" || h === "tipo_veiculo");

    if (idIdx === -1 || nameIdx === -1 || routeIdx === -1) {
      toast.error("Colunas obrigatórias não encontradas: Driver ID, Driver name, Corridor/Cage");
      return [];
    }

    return lines.slice(1).map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim());
      return {
        id_motorista: (cols[idIdx] || "").substring(0, 200),
        nome: (cols[nameIdx] || "").substring(0, 200),
        rota: (cols[routeIdx] || "").substring(0, 200),
        tipo_veiculo: vehicleIdx !== -1 ? (cols[vehicleIdx] || "").substring(0, 200) || null : null,
      };
    }).filter((d) => d.id_motorista && d.nome && d.rota);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setPreview(parsed);
      if (parsed.length === 0) {
        toast.error("Nenhum motorista válido encontrado no arquivo");
      }
    };
    reader.readAsText(f, "UTF-8");
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);

    try {
      // 1. Delete all existing records
      const { error: delError } = await supabase.from("motoristas_base_dia").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delError) throw delError;

      // 2. Insert new records in batches of 500
      const now = new Date().toISOString();
      const batches = [];
      for (let i = 0; i < preview.length; i += 500) {
        batches.push(preview.slice(i, i + 500));
      }

      for (const batch of batches) {
        const { error: insError } = await supabase.from("motoristas_base_dia").insert(
          batch.map((d) => ({
            id_motorista: d.id_motorista,
            nome: d.nome,
            rota: d.rota,
            tipo_veiculo: d.tipo_veiculo,
            data_importacao: now,
          }))
        );
        if (insError) throw insError;
      }

      setLastImport({ date: now, count: preview.length });
      toast.success(`${preview.length} motoristas importados com sucesso!`);
      setFile(null);
      setPreview([]);
    } catch (err: any) {
      toast.error("Erro na importação: " + (err.message || "erro desconhecido"));
    } finally {
      setImporting(false);
    }
  };

  if (authLoading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto p-4 max-w-3xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileSpreadsheet className="h-6 w-6" />
              Base de Motoristas do Dia
            </CardTitle>
            <CardDescription>
              Importe a planilha CSV com os motoristas do dia. Formato: delimitador <code>;</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> A importação substitui TODA a base anterior. Todos os registros existentes serão removidos.
              </AlertDescription>
            </Alert>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Arquivo CSV (delimitador ;)
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Colunas esperadas: <strong>Driver ID</strong> ; <strong>Driver name</strong> ; <strong>Corridor/Cage</strong> ; Vehicle Type (opcional)
              </p>
            </div>

            {preview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Pré-visualização: <strong>{preview.length}</strong> motoristas encontrados
                  </span>
                  <Button onClick={handleImport} disabled={importing} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {importing ? "Importando..." : "Importar e Substituir Base"}
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">Rota</th>
                        <th className="text-left p-2">Veículo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 50).map((d, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-2">{d.id_motorista}</td>
                          <td className="p-2">{d.nome}</td>
                          <td className="p-2">{d.rota}</td>
                          <td className="p-2">{d.tipo_veiculo || "—"}</td>
                        </tr>
                      ))}
                      {preview.length > 50 && (
                        <tr><td colSpan={4} className="p-2 text-center text-muted-foreground">... e mais {preview.length - 50} registros</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {lastImport && (
              <div className="flex items-center gap-2 text-sm text-primary bg-secondary p-3 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                Última importação: {format(new Date(lastImport.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — {lastImport.count} motoristas
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
