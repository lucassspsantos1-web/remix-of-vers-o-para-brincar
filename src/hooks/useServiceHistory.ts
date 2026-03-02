import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceRecord {
  id: string;
  driver_name: string;
  route_letter: string;
  route_number: number;
  bench_number: number;
  checked_in_at: string;
  called_at: string;
  released: boolean;
  released_at: string | null;
}

const PAGE_SIZE = 50;

export function useServiceHistory(dateFilter?: string) {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchRecords = useCallback(async (currentPage = 0) => {
    setLoading(true);

    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("service_history")
      .select("*", { count: "exact" })
      .eq("released", true)
      .order("called_at", { ascending: false })
      .range(from, to);

    if (dateFilter) {
      const start = `${dateFilter}T00:00:00`;
      const end = `${dateFilter}T23:59:59`;
      query = query.gte("called_at", start).lte("called_at", end);
    }

    const { data, count } = await query;
    setRecords(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [dateFilter]);

  useEffect(() => {
    setPage(0);
    fetchRecords(0);

    const channel = supabase
      .channel("history-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_history" },
        () => fetchRecords(0)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFilter, fetchRecords]);

  const goToPage = (newPage: number) => {
    setPage(newPage);
    fetchRecords(newPage);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return { records, loading, total, page, totalPages, goToPage, refetch: () => fetchRecords(page) };
}

/** Fetches ALL released records for a given date for CSV export */
export async function fetchAllForExport(dateFilter: string): Promise<ServiceRecord[]> {
  const start = `${dateFilter}T00:00:00`;
  const end = `${dateFilter}T23:59:59`;

  const { data } = await supabase
    .from("service_history")
    .select("*")
    .eq("released", true)
    .gte("called_at", start)
    .lte("called_at", end)
    .order("called_at", { ascending: false });

  return data || [];
}
