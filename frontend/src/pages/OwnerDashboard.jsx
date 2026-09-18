import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatBRL, formatDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, CheckCircle, CurrencyDollar, Star } from "@phosphor-icons/react";

const STATUS = {
  pending_payment: "Aguardando pagto",
  confirmed: "Confirmada",
  checked_in: "Em uso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default function OwnerDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    Promise.all([
      api.get("/vehicles/mine/list"),
      api.get("/bookings/mine"),
    ]).then(([v, b]) => { setVehicles(v.data); setBookings(b.data); });
  }, []);

  const totalEarnings = bookings
    .filter((b) => ["confirmed", "checked_in", "completed"].includes(b.status))
    .reduce((s, b) => s + (b.pricing?.owner_amount || 0), 0);
  const completed = bookings.filter((b) => b.status === "completed").length;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-24" data-testid="owner-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="overline text-[hsl(22,100%,50%)]">Painel do proprietário</span>
          <h1 className="font-display text-3xl md:text-4xl font-black mt-1">Sua frota</h1>
        </div>
        <Button asChild className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)]" data-testid="btn-add-vehicle">
          <Link to="/anuncie"><Plus size={16} className="mr-1" />Cadastrar veículo</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[
          { l: "Veículos", v: vehicles.length, i: Car },
          { l: "Reservas", v: bookings.length, i: CheckCircle },
          { l: "Concluídas", v: completed, i: Star },
          { l: "Faturamento", v: formatBRL(totalEarnings), i: CurrencyDollar },
        ].map((s, i) => (
          <div key={i} className="border border-border p-5 bg-white">
            <s.i size={22} weight="duotone" className="text-[hsl(22,100%,50%)]" />
            <p className="mt-3 text-xs overline text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-black numeric">{s.v}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display text-xl font-bold mt-10 mb-3">Meus veículos</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <Link key={v.id} to={`/veiculo/${v.id}`} className="border border-border overflow-hidden card-hover" data-testid={`owner-veh-${v.id}`}>
            <img src={v.photos?.[0]} alt="" className="w-full aspect-[4/3] object-cover" />
            <div className="p-4">
              <p className="font-display font-bold">{v.brand} {v.model}</p>
              <p className="text-xs text-muted-foreground">{v.year} · {v.city}</p>
              <p className="mt-2 font-bold text-[hsl(22,100%,50%)]">{formatBRL(v.daily_price)}/dia</p>
            </div>
          </Link>
        ))}
        {vehicles.length === 0 && (
          <div className="col-span-full border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">Você ainda não anunciou veículos.</p>
            <Button asChild className="mt-4 bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)]"><Link to="/anuncie">Cadastrar primeiro veículo</Link></Button>
          </div>
        )}
      </div>

      <h2 className="font-display text-xl font-bold mt-10 mb-3">Reservas recentes</h2>
      <div className="border border-border">
        {bookings.length === 0 && <p className="p-6 text-muted-foreground text-sm">Nenhuma reserva ainda.</p>}
        {bookings.slice(0, 10).map((b) => (
          <Link key={b.id} to={`/reserva/${b.id}`} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center p-4 border-b border-border last:border-0 hover:bg-neutral-50" data-testid={`owner-book-${b.id}`}>
            <div>
              <p className="font-medium">{b.vehicle_snapshot.brand} {b.vehicle_snapshot.model}</p>
              <p className="text-xs text-muted-foreground">{b.renter_name} · {formatDate(b.start_date)} → {formatDate(b.end_date)}</p>
            </div>
            <Badge variant="outline">{STATUS[b.status] || b.status}</Badge>
            <span className="font-bold numeric">{formatBRL(b.pricing?.owner_amount)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
