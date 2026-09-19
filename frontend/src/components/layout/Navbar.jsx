import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Car, User, SignOut, ChartBar, Plus } from "@phosphor-icons/react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const showHeroTransparent = loc.pathname === "/";
  const isOwner = user?.role === "owner";
  const isRenter = user?.role === "renter";
  const isAdmin = user?.role === "admin";

  return (
    <header
      data-testid="global-navbar"
      className={`sticky top-0 z-40 w-full border-b ${
        showHeroTransparent ? "glass border-white/20" : "bg-white border-border"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-md bg-[hsl(210,100%,22%)] flex items-center justify-center transition-transform group-hover:rotate-3">
            <Car weight="fill" size={22} className="text-[hsl(180,90%,60%)]" />
          </div>
          <span className="font-display text-2xl font-black tracking-tight text-[hsl(210,100%,22%)]">
            Drive<span className="text-[hsl(180,90%,45%)]">Hub</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {/* Owners don't rent — hide search link for pure owners */}
          {!isOwner && (
            <Link to="/buscar" data-testid="nav-search" className="hover:text-[hsl(210,100%,22%)] transition-colors">
              Encontrar carro
            </Link>
          )}
          {isOwner && (
            <>
              <Link to="/proprietario" data-testid="nav-owner" className="hover:text-[hsl(210,100%,22%)] transition-colors">Meus veículos</Link>
              <Link to="/anuncie" data-testid="nav-add-veh" className="hover:text-[hsl(210,100%,22%)] transition-colors">Adicionar veículo</Link>
            </>
          )}
          {isRenter && (
            <Link to="/minhas-reservas" data-testid="nav-my-bookings" className="hover:text-[hsl(210,100%,22%)] transition-colors">Minhas reservas</Link>
          )}
          {isAdmin && (
            <>
              <Link to="/admin" data-testid="nav-admin" className="hover:text-[hsl(210,100%,22%)] transition-colors">Admin</Link>
              <Link to="/buscar" data-testid="nav-search-admin" className="hover:text-[hsl(210,100%,22%)] transition-colors">Veículos</Link>
            </>
          )}
          <Link to="/como-funciona" data-testid="nav-how" className="hover:text-[hsl(210,100%,22%)] transition-colors">Como funciona</Link>
        </nav>

        <div className="flex items-center gap-2">
          {!user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => nav("/cadastro")}
              data-testid="btn-become-owner"
              className="hidden md:inline-flex"
            >
              <Plus size={16} className="mr-1" /> Anunciar carro
            </Button>
          )}
          {user && <NotificationBell />}
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
                {isRenter && (
                  <DropdownMenuItem onClick={() => nav("/minhas-reservas")} data-testid="menu-bookings">
                    <Car className="mr-2" size={16} /> Reservas
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <DropdownMenuItem onClick={() => nav("/proprietario")} data-testid="menu-owner">
                    <ChartBar className="mr-2" size={16} /> Painel proprietário
                  </DropdownMenuItem>
                )}
                {isAdmin && (
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
                className="bg-[hsl(210,100%,22%)] hover:bg-[hsl(210,100%,15%)] text-white"
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
