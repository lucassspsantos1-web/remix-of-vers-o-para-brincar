import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface Volumoso {
  id: string;
  route_letter: string;
  route_number: number;
  quantity: number;
  observation: string | null;
  status: string;
  bench_number: number | null;
  cage_number: number | null;
  retired_at: string | null;
  created_at: string;
}

export function useVolumosos() {
  const [volumosos, setVolumosos] = useState<Volumoso[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVolumosos = useCallback(async () => {
    const { data } = await supabase
      .from("volumosos")
      .select("*")
      .order("created_at", { ascending: false });
    setVolumosos((data as Volumoso[]) || []);
    setLoading(false);
  }, []);

  useRealtimeSubscription({
    table: "volumosos",
    onEvent: fetchVolumosos,
    channelName: "rt-volumosos",
  });

  return { volumosos, loading, refetch: fetchVolumosos };
}

export function useRouteVolumosos(routeLetter: string, routeNumber: number) {
  const [volumosos, setVolumosos] = useState<Volumoso[]>([]);

  const fetchRouteVolumosos = useCallback(async () => {
    if (!routeLetter || !routeNumber) return;
    const { data } = await supabase
      .from("volumosos")
      .select("*")
      .eq("route_letter", routeLetter)
      .eq("route_number", routeNumber)
      .in("status", ["disponivel", "em_separacao"]);
    setVolumosos((data as Volumoso[]) || []);
  }, [routeLetter, routeNumber]);

  useRealtimeSubscription({
    table: "volumosos",
    onEvent: fetchRouteVolumosos,
    channelName: `rt-vol-${routeLetter}-${routeNumber}`,
  });

  useEffect(() => {
    fetchRouteVolumosos();
  }, [fetchRouteVolumosos]);

  return { volumosos, refetch: fetchRouteVolumosos };
}
