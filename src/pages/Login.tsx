import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import NavBar from "@/components/NavBar";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("adminlp13@filacarga");
  const [password, setPassword] = useState("shopee3130");
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Erro no login", description: "E-mail ou senha inválidos.", variant: "destructive" });
    } else {
      navigate("/dashboard");
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="flex items-center justify-center p-4" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-primary/20 w-fit mb-2">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">🚛 FilaCarga</CardTitle>
            <p className="text-sm text-muted-foreground">Acesso ao Dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gestor@filacarga.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Aguarde..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
