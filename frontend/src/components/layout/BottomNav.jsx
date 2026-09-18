import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { House, MagnifyingGlass, Car, User, ChartBar } from "@phosphor-icons/react";

export default function BottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  const items = [
    { to: "/", label: "Início", icon: House, id: "bnav-home" },
    { to: "/buscar", label: "Buscar", icon: MagnifyingGlass, id: "bnav-search" },
    user?.role === "owner"
      ? { to: "/proprietario", label: "Meus", icon: Car, id: "bnav-owner" }
      : { to: "/minhas-reservas", label: "Reservas", icon: Car, id: "bnav-bookings" },
    { to: user ? "/perfil" : "/login", label: user ? "Perfil" : "Entrar", icon: User, id: "bnav-profile" },
  ];
  if (user?.role === "admin") {
    items[2] = { to: "/admin", label: "Admin", icon: ChartBar, id: "bnav-admin" };
  }
  return (
    <nav
      data-testid="bottom-nav"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {items.map((it) => {
          const active = loc.pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.id}
              to={it.to}
              data-testid={it.id}
              className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? "text-[hsl(22,100%,50%)]" : "text-neutral-500"
              }`}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
