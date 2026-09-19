import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatBRL, formatDate } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Car } from "@phosphor-icons/react";

const STATUS = {
  pending_payment: { l: "Aguardando pagamento", c: "bg-amber-100 text-amber-800" },
  confirmed: { l: "Confirmada", c: "bg-blue-100 text-blue-800" },
  checked_in: { l: "Em uso", c: "bg-orange-100 text-orange-800" },
  completed: { l: "Concluída", c: "bg-green-100 text-green-800" },
  cancelled: { l: "Cancelada", c: "bg-neutral-200 text-neutral-700" },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/bookings/mine").then(({ data }) => setBookings(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 pb-24" data-testid="my-bookings">
      <span className="overline text-[hsl(210,100%,22%)]">Minhas reservas</span>
      <h1 className="font-display text-3xl md:text-4xl font-black mt-1">Suas viagens</h1>

      {loading && <div className="mt-8 text-muted-foreground">Carregando...</div>}
      {!loading && !bookings.length && (
        <div className="mt-10 border border-dashed border-border p-10 text-center">
          <Car size={40} className="mx-auto text-neutral-400" />
          <p className="mt-4 text-muted-foreground">Você ainda não fez reservas.</p>
          <Link to="/buscar" className="inline-block mt-4 text-[hsl(210,100%,22%)] font-medium">Encontrar um carro →</Link>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {bookings.map((b) => {
          const s = STATUS[b.status] || { l: b.status, c: "" };
          return (
            <Link
              key={b.id}
              to={`/reserva/${b.id}`}
              data-testid={`booking-${b.id}`}
              className="grid grid-cols-[100px_1fr_auto] gap-4 items-center border border-border p-3 hover:border-[hsl(210,100%,22%)] transition-colors"
            >
              <img src={b.vehicle_snapshot.photo} alt="" className="w-full aspect-square object-cover" />
              <div>
                <p className="font-display font-bold">{b.vehicle_snapshot.brand} {b.vehicle_snapshot.model}</p>
                <p className="text-sm text-muted-foreground">{formatDate(b.start_date)} → {formatDate(b.end_date)}</p>
                <p className="text-xs text-muted-foreground">{b.vehicle_snapshot.city}</p>
              </div>
              <div className="text-right">
                <Badge className={s.c}>{s.l}</Badge>
                <p className="mt-1 font-bold text-[hsl(210,100%,22%)] numeric">{formatBRL(b.pricing.total)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
