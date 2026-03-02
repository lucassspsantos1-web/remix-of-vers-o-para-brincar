import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface QueueDriver {
  id: string;
  full_name: string;
  route_letter: string;
  route_number: number;
  checked_in_at: string;
  status: string;
}

export function useQueueDrivers() {
  const [drivers, setDrivers] = useState<QueueDriver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = useCallback(async () => {
    const { data } = await supabase
      .from("queue_drivers")
      .select("*")
      .eq("status", "waiting")
      .is("bench_number", null)
      .order("checked_in_at", { ascending: true });
    setDrivers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useRealtimeSubscription({
    table: "queue_drivers",
    onEvent: fetchDrivers,
    channelName: "rt-queue-drivers",
  });

  const removeDriverLocally = (driverId: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== driverId));
  };

  return { drivers, loading, refetch: fetchDrivers, removeDriverLocally };
}
