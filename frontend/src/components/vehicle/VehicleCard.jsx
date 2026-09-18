import { Link } from "react-router-dom";
import { Star, ShieldCheck, MapPin, Users, GasPump } from "@phosphor-icons/react";
import { formatBRL } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const CAT_LABELS = {
  economico: "Econômico", suv: "SUV", sedan: "Sedan", premium: "Premium",
  minivan: "7 lugares", hatch: "Hatch", pickup: "Picape", ev: "Elétrico", hybrid: "Híbrido",
};

export default function VehicleCard({ v }) {
  const photo = (v.photos && v.photos[0]) || "https://images.pexels.com/photos/12579276/pexels-photo-12579276.jpeg";
  return (
    <Link
      to={`/veiculo/${v.id}`}
      data-testid={`vehicle-card-${v.id}`}
      className="group block border border-border bg-white overflow-hidden card-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        <img
          src={photo}
          alt={`${v.brand} ${v.model}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-white/95 text-neutral-900 font-medium">{CAT_LABELS[v.category] || v.category}</Badge>
          {v.verified && (
            <Badge className="bg-[hsl(155,100%,33%)] text-white flex items-center gap-1">
              <ShieldCheck weight="fill" size={12} /> Verificado
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3 bg-[hsl(22,100%,50%)] text-white px-3 py-1.5 text-sm font-bold font-display">
          {formatBRL(v.daily_price)}<span className="text-xs font-medium opacity-90">/dia</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base leading-tight">
              {v.brand} {v.model}
            </h3>
            <p className="text-xs text-muted-foreground">{v.year} · {v.version}</p>
          </div>
          <div className="flex items-center gap-1 text-sm shrink-0">
            <Star weight="fill" className="text-amber-500" size={14} />
            <span className="font-medium">{(v.rating_avg || 0).toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({v.rating_count || 0})</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin size={13} />{v.city}, {v.state}</span>
          <span className="flex items-center gap-1"><Users size={13} />{v.seats}</span>
          <span className="flex items-center gap-1"><GasPump size={13} />{v.transmission === "automatic" ? "Auto" : "Manual"}</span>
        </div>
      </div>
    </Link>
  );
}
