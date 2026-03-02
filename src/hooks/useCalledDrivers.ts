import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface CalledDriver {
  id: string;
  full_name: string;
  route_letter: string;
  route_number: number;
  bench_number: number | null;
  called_at: string | null;
  status: string;
}

/**
 * Tracks drivers currently being served (em_atendimento).
 * Returns the list + a flag for new calls detected since last check.
 */
export function useCalledDrivers(onNewCall?: (driver: CalledDriver) => void) {
  const [calledDrivers, setCalledDrivers] = useState<CalledDriver[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const onNewCallRef = useRef(onNewCall);
  onNewCallRef.current = onNewCall;
  const fetchingRef = useRef(false);
  const pendingRef = useRef(false);

  const fetchCalled = useCallback(async () => {
    // Debounce: if already fetching, mark pending and return
    if (fetchingRef.current) {
      pendingRef.current = true;
      return;
    }
    fetchingRef.current = true;

    const { data } = await supabase
      .from("queue_drivers")
      .select("*")
      .eq("status", "em_atendimento")
      .order("called_at", { ascending: false });

    const drivers: CalledDriver[] = (data || []).map((d: any) => ({
      id: d.id,
      full_name: d.full_name,
      route_letter: d.route_letter,
      route_number: d.route_number,
      bench_number: d.bench_number,
      called_at: d.called_at,
      status: d.status,
    }));

    // Detect new calls (only after initial load to avoid sound on page load)
    if (initialLoadDone.current) {
      for (const driver of drivers) {
        if (!knownIdsRef.current.has(driver.id)) {
          onNewCallRef.current?.(driver);
        }
      }
    }

    // Update known IDs
    knownIdsRef.current = new Set(drivers.map((d) => d.id));
    initialLoadDone.current = true;
    setCalledDrivers(drivers);

    fetchingRef.current = false;
    // If a fetch was requested while we were busy, do one more
    if (pendingRef.current) {
      pendingRef.current = false;
      fetchCalled();
    }
  }, []);

  useRealtimeSubscription({
    table: "queue_drivers",
    onEvent: fetchCalled,
    channelName: "rt-painel-called",
    pollInterval: 10000,
  });

  return { calledDrivers };
}
