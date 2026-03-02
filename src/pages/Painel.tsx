import { useState, useCallback, useRef, useEffect } from "react";
import { useQueueDrivers } from "@/hooks/useQueueDrivers";
import { useCalledDrivers, CalledDriver } from "@/hooks/useCalledDrivers";
import { unlockAudio, playAlertSound, stopAllAudio } from "@/lib/alertSound";
import { announceDriver, cancelSpeech } from "@/lib/speech";
import NavBar from "@/components/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Users, Clock, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Painel() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("painel-sound") === "true";
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("painel-volume");
    return saved ? parseFloat(saved) : 0.6;
  });
  const soundEnabledRef = useRef(soundEnabled);
  const volumeRef = useRef(volume);
  const announceQueueRef = useRef<CalledDriver[]>([]);
  const isAnnouncingRef = useRef(false);
  const tabVisibleRef = useRef(!document.hidden);
  const announcedIdsRef = useRef<Set<string>>(new Set());
  soundEnabledRef.current = soundEnabled;
  volumeRef.current = volume;

  useEffect(() => {
    const handler = () => {
      tabVisibleRef.current = !document.hidden;
      // If tab became visible and there are queued announcements, process them
      if (!document.hidden && announceQueueRef.current.length > 0) {
        processQueue();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const processQueue = useCallback(async () => {
    // Guard: only one processing loop at a time
    if (isAnnouncingRef.current) return;
    isAnnouncingRef.current = true;

    while (announceQueueRef.current.length > 0) {
      // Abort if sound was disabled or tab is hidden
      if (!soundEnabledRef.current || !tabVisibleRef.current) {
        announceQueueRef.current = [];
        break;
      }

      const next = announceQueueRef.current.shift()!;

      // Play chime and fully await it before any speech
      playAlertSound(volumeRef.current);
      // Wait for chime to finish (~900ms) before speaking
      await new Promise<void>(r => setTimeout(r, 950));

      // Only announce if sound still enabled
      if (soundEnabledRef.current && next.bench_number) {
        await announceDriver(next.full_name, next.bench_number);
        // Short gap between announcements
        await new Promise<void>(r => setTimeout(r, 600));
      }
    }

    isAnnouncingRef.current = false;
  }, []);

  const handleNewCall = useCallback((driver: CalledDriver) => {
    if (!soundEnabledRef.current) return;
    // Deduplicate: never announce the same driver ID twice
    if (announcedIdsRef.current.has(driver.id)) return;
    if (announceQueueRef.current.some(d => d.id === driver.id)) return;
    announcedIdsRef.current.add(driver.id);
    announceQueueRef.current.push(driver);
    if (tabVisibleRef.current) {
      processQueue();
    }
  }, [processQueue]);

  const { drivers } = useQueueDrivers();
  const { calledDrivers } = useCalledDrivers(handleNewCall);

  const toggleSound = () => {
    if (!soundEnabled) {
      unlockAudio();
      playAlertSound(volume);
      setSoundEnabled(true);
      localStorage.setItem("painel-sound", "true");
    } else {
      setSoundEnabled(false);
      localStorage.setItem("painel-sound", "false");
      // Stop all audio immediately and clear the pending queue
      stopAllAudio();
      cancelSpeech();
      announceQueueRef.current = [];
    }
  };

  const handleVolumeChange = ([v]: number[]) => {
    setVolume(v);
    localStorage.setItem("painel-volume", String(v));
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between max-w-5xl">
          <h1 className="text-xl font-bold text-primary">Painel de Chamadas</h1>
          <div className="flex items-center gap-3">
            {soundEnabled && (
              <div className="flex items-center gap-2 w-28">
                <VolumeX className="h-4 w-4 text-muted-foreground shrink-0" />
                <Slider
                  value={[volume]}
                  min={0.1}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
                <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            )}
            <Button
              variant={soundEnabled ? "default" : "outline"}
              onClick={toggleSound}
              className="gap-2"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4" /> Som Ativo
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" /> Ativar Som
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-5xl space-y-6">
        {/* Called drivers - highlight */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Megaphone className="h-5 w-5" />
              Motoristas Chamados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calledDrivers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                Nenhum motorista sendo atendido no momento
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {calledDrivers.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl bg-primary/15 border-2 border-primary/50 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <p className="font-extrabold text-2xl sm:text-3xl">{d.full_name}</p>
                    <p className="text-base text-muted-foreground mt-1">
                      Rota {d.route_letter}-{d.route_number}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-bold bg-primary text-primary-foreground px-3 py-1 rounded-md">
                        Bancada {d.bench_number}
                      </span>
                      {d.called_at && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(d.called_at), "HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Fila de Espera
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {drivers.length} motorista{drivers.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">Fila vazia</p>
            ) : (
              <div className="space-y-2">
                {drivers.map((d, i) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-primary font-bold text-lg w-8">
                        {i + 1}º
                      </span>
                      <div>
                        <p className="font-medium">{d.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Rota {d.route_letter}-{d.route_number}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(d.checked_in_at), "HH:mm", { locale: ptBR })}
                    </span>
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
