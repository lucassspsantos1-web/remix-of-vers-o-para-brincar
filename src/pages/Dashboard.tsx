import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardContent from "@/components/dashboard/DashboardContent";

export default function Dashboard() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login", { replace: true });
    }
  }, [loading, session, navigate]);

  // Block rendering entirely until auth is resolved
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  // No session = no render, redirect will fire
  if (!session) {
    return null;
  }

  // Only mount content (and its data-fetching hooks) after session is confirmed
  return <DashboardContent signOut={signOut} />;
}
