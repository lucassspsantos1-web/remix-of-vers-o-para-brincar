import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeSubscriptionOptions {
  table: string;
  onEvent: () => void;
  channelName?: string;
  /** Fallback poll interval in ms (default: 15000). Set to 0 to disable. */
  pollInterval?: number;
}

export function useRealtimeSubscription({
  table,
  onEvent,
  channelName,
  pollInterval = 30000,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    cleanup();

    // Use unique channel name to avoid stale channel reuse
    const name = `${channelName || `rt-${table}`}-${Date.now()}`;
    const channel = supabase
      .channel(name)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          onEventRef.current();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          retryCountRef.current = 0;
          onEventRef.current();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          const delay = Math.min(
            2000 * Math.pow(2, retryCountRef.current),
            30000
          );
          retryCountRef.current += 1;
          retryTimeoutRef.current = setTimeout(() => {
            subscribe();
          }, delay);
        }
      });

    channelRef.current = channel;

    // Fallback poll to catch any missed realtime events
    if (pollInterval > 0) {
      pollRef.current = setInterval(() => {
        onEventRef.current();
      }, pollInterval);
    }
  }, [table, channelName, cleanup, pollInterval]);

  // Refetch on tab visibility change (handles silent disconnects)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        onEventRef.current();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    subscribe();
    return cleanup;
  }, [subscribe, cleanup]);
}
