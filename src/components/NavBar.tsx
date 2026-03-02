import { Link, useLocation } from "react-router-dom";
import { QrCode, Monitor, Package, LayoutDashboard, Tv, FileSpreadsheet } from "lucide-react";

const links = [
  { to: "/", label: "Check-in", icon: QrCode },
  { to: "/bancada", label: "Bancada", icon: Monitor },
  { to: "/volumoso", label: "Volumoso", icon: Package },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/painel", label: "Painel", icon: Tv },
  { to: "/base-motoristas", label: "Base", icon: FileSpreadsheet },
];

export default function NavBar({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <span className="text-xl font-bold text-primary">🚛 FilaCarga</span>
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {children}
        </div>
      </div>
    </nav>
  );
}
