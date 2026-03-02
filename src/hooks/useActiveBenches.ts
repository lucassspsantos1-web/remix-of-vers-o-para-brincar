import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

function getSessionId(): string {
  let id = sessionStorage.getItem("bench_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("bench_session_id", id);
  }
  return id;
}

// Polling interval in ms for active benches revalidation
const POLL_INTERVAL_MS = 5000;

export function useActiveBenches() {
  const [activeBenches, setActiveBenches] = useState<number[]>([]);
  const [myBench, setMyBench] = useState<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionId = getSessionId();

  // Lightweight fetch: no cleanup RPC here (done inside claim_bench)
  const fetchActive = useCallback(async () => {
    const { data } = await supabase
      .from("active_benches")
      .select("bench_number, session_id");
    const rows = data || [];
    setActiveBenches(rows.map((r: any) => r.bench_number));
    // Check if we still own our bench
    const mine = rows.find((r: any) => r.session_id === sessionId);
    setMyBench(mine ? mine.bench_number : null);
  }, [sessionId]);

  // Realtime subscription for immediate updates
  useRealtimeSubscription({
    table: "active_benches",
    onEvent: fetchActive,
    channelName: "rt-active-benches",
  });

  // Initial fetch
  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  // Periodic polling every 5s as fallback (realtime may miss events)
  useEffect(() => {
    pollRef.current = setInterval(fetchActive, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchActive]);

  // Heartbeat: update last_seen every 10s to keep bench alive
  useEffect(() => {
    if (myBench === null) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }
    const beat = () => {
      supabase
        .from("active_benches")
        .update({ last_seen: new Date().toISOString() } as any)
        .eq("session_id", sessionId)
        .then();
    };
    beat(); // immediate
    heartbeatRef.current = setInterval(beat, 10000);
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [myBench, sessionId]);

  /**
   * Atomically claim a bench via backend function.
   * The `claim_bench` RPC uses pg_advisory_xact_lock to serialize
   * concurrent attempts, making it safe against race conditions.
   */
  const claimBench = async (bench: number): Promise<boolean> => {
    const { data, error } = await supabase.rpc("claim_bench" as any, {
      p_bench_number: bench,
      p_session_id: sessionId,
    });

    if (error || data === false) {
      // Backend denied: bench is occupied by another session
      await fetchActive(); // refresh UI immediately
      return false;
    }

    setMyBench(bench);
    await fetchActive();
    return true;
  };

  const releaseBench = async (bench: number) => {
    // Delete only this session's bench to avoid releasing others'
    await supabase
      .from("active_benches")
      .delete()
      .eq("bench_number", bench)
      .eq("session_id", sessionId);
    setMyBench(null);
    await fetchActive();
  };

  // Force release any bench regardless of session (for dashboard admin use)
  const forceReleaseBench = async (bench: number) => {
    await supabase
      .from("active_benches")
      .delete()
      .eq("bench_number", bench);
    // Also release any driver being served at this bench
    await supabase
      .from("queue_drivers")
      .update({ status: "finalizado", bench_number: null })
      .eq("bench_number", bench)
      .eq("status", "em_atendimento");
    if (myBench === bench) setMyBench(null);
    await fetchActive();
  };

  return { activeBenches, myBench, claimBench, releaseBench, forceReleaseBench, sessionId };
}

