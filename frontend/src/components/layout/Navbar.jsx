import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Car, User, SignOut, ChartBar, House, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const showHeroTransparent = loc.pathname === "/";

  return (
    <header
      data-testid="global-navbar"
      className={`sticky top-0 z-40 w-full border-b ${
        showHeroTransparent ? "glass border-white/20" : "bg-white border-border"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-md bg-[hsl(22,100%,50%)] flex items-center justify-center transition-transform group-hover:rotate-3">
            <Car weight="fill" size={22} className="text-white" />
          </div>
          <span className="font-display text-2xl font-black tracking-tight">
            LOCAFACIL
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/buscar" data-testid="nav-search" className="hover:text-[hsl(22,100%,50%)] transition-colors">Encontrar carro</Link>
          {user && user.role === "owner" && (
            <Link to="/proprietario" data-testid="nav-owner" className="hover:text-[hsl(22,100%,50%)] transition-colors">Meus veículos</Link>
          )}
          {user && user.role === "renter" && (
            <Link to="/minhas-reservas" data-testid="nav-my-bookings" className="hover:text-[hsl(22,100%,50%)] transition-colors">Minhas reservas</Link>
          )}
          {user && user.role === "admin" && (
            <Link to="/admin" data-testid="nav-admin" className="hover:text-[hsl(22,100%,50%)] transition-colors">Admin</Link>
          )}
          <Link to="/como-funciona" data-testid="nav-how" className="hover:text-[hsl(22,100%,50%)] transition-colors">Como funciona</Link>
        </nav>

        <div className="flex items-center gap-2">
          {user && user.role !== "owner" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => nav("/anuncie")}
              data-testid="btn-become-owner"
              className="hidden md:inline-flex"
            >
              <Plus size={16} className="mr-1" /> Anunciar carro
            </Button>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="user-menu-trigger">
                  <User size={18} className="mr-1" />
                  {user.name?.split(" ")[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav("/perfil")} data-testid="menu-profile">
                  <User className="mr-2" size={16} /> Meu perfil
                </DropdownMenuItem>
                {user.role === "renter" && (
                  <DropdownMenuItem onClick={() => nav("/minhas-reservas")} data-testid="menu-bookings">
                    <Car className="mr-2" size={16} /> Reservas
                  </DropdownMenuItem>
                )}
                {user.role === "owner" && (
                  <DropdownMenuItem onClick={() => nav("/proprietario")} data-testid="menu-owner">
                    <ChartBar className="mr-2" size={16} /> Painel proprietário
                  </DropdownMenuItem>
                )}
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => nav("/admin")} data-testid="menu-admin">
                    <ChartBar className="mr-2" size={16} /> Painel admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                  <SignOut className="mr-2" size={16} /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => nav("/login")} data-testid="btn-login">
                Entrar
              </Button>
              <Button
                size="sm"
                onClick={() => nav("/cadastro")}
                data-testid="btn-signup"
                className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
              >
                Criar conta
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
